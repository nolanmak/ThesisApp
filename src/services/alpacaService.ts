export interface TickData {
  symbol: string;
  close: number;
  high: number;
  low: number;
  numberOfTrades: number;
  open: number;
  timestamp: Date;
  volume: number; // Latest volume from this update
  cumulativeVolume: number; // Running total of all volume
  volumeWeightedAverage: number;
}

export interface AlpacaConfig {
  key: string;
  secret: string;
  paper: boolean;
}

// Alpaca WebSocket message interfaces
interface AlpacaTrade {
  T: 't'; // message type
  S: string; // symbol
  p: number; // price
  s: number; // size
  t: string; // timestamp
  i: number; // trade ID
  x: string; // exchange
  z: string; // tape
  c: string[]; // conditions
}

interface AlpacaQuote {
  T: 'q'; // message type
  S: string; // symbol
  bx: string; // bid exchange
  bp: number; // bid price
  bs: number; // bid size
  ax: string; // ask exchange
  ap: number; // ask price
  as: number; // ask size
  t: string; // timestamp
  c: string[]; // conditions
  z: string; // tape
}

interface AlpacaBar {
  T: 'b'; // message type
  S: string; // symbol
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  t: string; // timestamp
  n: number; // number of trades
  vw: number; // volume weighted average price
}

interface AlpacaSubscriptionMessage {
  T: 'subscription';
  trades: string[];
  quotes: string[];
  bars: string[];
  updatedBars: string[];
  dailyBars: string[];
  statuses: string[];
  lulds: string[];
  corrections: string[];
  cancelErrors: string[];
}

interface AlpacaErrorMessage {
  T: 'error';
  code: number;
  msg: string;
}

interface AlpacaSuccessMessage {
  T: 'success';
  msg: string;
}

type AlpacaMessage = AlpacaTrade | AlpacaQuote | AlpacaBar | AlpacaSubscriptionMessage | AlpacaErrorMessage | AlpacaSuccessMessage;

class AlpacaService {
  private socket: WebSocket | null = null;
  private subscribers: Map<string, Set<(data: TickData) => void>> = new Map();
  private symbols: Set<string> = new Set();
  private isConnecting = false;
  private isManualClose = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private reconnectDelay = 2000;
  private connectionFailures = 0;
  private maxConsecutiveFailures = 3;
  private isEnabled = true;
  private pingInterval: number | null = null;
  private pingTimeout: number | null = null;
  private lastPongTime = 0;
  private pingIntervalTime = 30000; // 30 seconds
  private pingTimeoutTime = 10000; // 10 seconds
  private pendingSubscriptions: Set<string> = new Set();
  private isAuthenticated = false;
  
  // Track cumulative volume and trade counts for each symbol
  private cumulativeVolume: Map<string, number> = new Map();
  private cumulativeTrades: Map<string, number> = new Map();
  private sessionStartTime: Map<string, Date> = new Map();

  constructor() {
    this.initializeFromEnv();
  }

  private initializeFromEnv(): void {
    // For proxy connection, we don't need Alpaca credentials in the frontend
    // The proxy handles authentication with Alpaca
    console.log('Alpaca service initialized for proxy connection');
    this.connect();
  }

  public enable(): void {
    if (!this.isEnabled) {
      this.isEnabled = true;
      console.log('Alpaca WebSocket functionality enabled');
      this.connect();
    }
  }

  public disable(): void {
    if (this.isEnabled) {
      this.isEnabled = false;
      console.log('Alpaca WebSocket functionality disabled');
      this.disconnect();
    }
  }

  private getWebSocketUrl(): string {
    // Use proxy WebSocket endpoint instead of direct Alpaca connection
    const proxyUrl = import.meta.env.VITE_ALPACA_PROXY_WS_URL;
    if (proxyUrl) {
      return proxyUrl;
    }
    // Fallback to hardcoded proxy URL if env var not set
    return 'ws://IRAuto-Alpac-6P4vTH9n3JEA-1469477952.us-east-1.elb.amazonaws.com/ws';
  }

  public connect(): void {
    if (!this.isEnabled) {
      console.log('Alpaca WebSocket is disabled, not connecting');
      return;
    }

    if (this.isConnecting) {
      console.log('Alpaca WebSocket already connecting, skipping duplicate connect attempt');
      return;
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('Alpaca WebSocket already connected');
      return;
    }

    if (this.socket?.readyState === WebSocket.CONNECTING) {
      console.log('Alpaca WebSocket already in connecting state');
      return;
    }

    this.isConnecting = true;
    this.isManualClose = false;

    // If there's an existing socket, close it and wait before creating new one
    if (this.socket) {
      console.log('Closing existing Alpaca WebSocket before creating new connection');
      try {
        if (this.socket.readyState === WebSocket.OPEN || 
            this.socket.readyState === WebSocket.CONNECTING) {
          this.socket.close(1000, 'Reconnecting'); // Proper close code
        }
      } catch (e) {
        console.error('Error closing existing Alpaca socket:', e);
      }
      this.socket = null;

      // Wait for the connection to fully close before creating a new one
      setTimeout(() => this.createConnection(), 1000);
      return;
    }

    this.createConnection();
  }

  private createConnection(): void {
    if (!this.isEnabled) {
      this.isConnecting = false;
      return;
    }

    try {
      console.log('Creating new Alpaca WebSocket connection');
      this.socket = new WebSocket(this.getWebSocketUrl());
      
      this.socket.onopen = () => {
        console.log('Alpaca proxy WebSocket connection established');
        this.reconnectAttempts = 0;
        this.connectionFailures = 0;
        this.reconnectDelay = 2000;
        this.isConnecting = false;
        
        // For proxy connection, assume we're authenticated after successful connection
        // The proxy handles Alpaca authentication internally
        this.isAuthenticated = true;
        this.startPingInterval();
        this.subscribeToSymbols();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle both single messages and arrays of messages
          if (Array.isArray(data)) {
            // Alpaca format: array of messages
            data.forEach(message => this.handleMessage(message));
          } else {
            // Proxy might send single messages
            this.handleMessage(data);
          }
        } catch (error) {
          console.error('Error parsing Alpaca proxy WebSocket message:', error);
          console.error('Raw message data:', event.data);
        }
      };

      this.socket.onerror = (error) => {
        console.error('Alpaca WebSocket error:', error);
        this.isConnecting = false;
        this.isAuthenticated = false;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts - 1) {
          console.error('Alpaca WebSocket connection failing repeatedly');
        }
      };

      this.socket.onclose = (event) => {
        console.log(`Alpaca WebSocket connection closed: ${event.code} ${event.reason}`);
        this.isConnecting = false;
        this.isAuthenticated = false;
        this.clearPingInterval();

        if (!this.isManualClose && this.isEnabled) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Failed to create Alpaca WebSocket connection:', error);
      this.isConnecting = false;
      this.isAuthenticated = false;
      this.attemptReconnect();
    }
  }

  private authenticate(): void {
    // Authentication is handled by the proxy server
    // This method is kept for compatibility but does nothing
    console.log('Authentication handled by proxy server');
  }

  private handleMessage(message: any): void {
    // Handle proxy message format
    if (message.type) {
      switch (message.type) {
        case 'connected':
          console.log('Alpaca proxy WebSocket connected:', message.message);
          break;

        case 'subscription_updated':
          console.log('Alpaca subscription confirmed:', message.symbols);
          break;

        case 'trade':
          this.handleProxyTradeMessage(message);
          break;

        case 'pong':
          console.log('Alpaca proxy pong received');
          break;

        case 'error':
          console.error('Alpaca proxy WebSocket error:', message.message);
          break;

        default:
          console.log('Unhandled proxy message type:', message.type, message);
      }
      return;
    }

    // Handle native Alpaca message format (fallback)
    switch (message.T) {
      case 'success':
        console.log('Alpaca WebSocket success:', message.msg);
        break;

      case 'error':
        console.error('Alpaca WebSocket error:', message.code, message.msg);
        break;

      case 'subscription':
        console.log('Alpaca subscription confirmed:', message);
        break;

      case 't': // trade
        this.handleTradeMessage(message);
        break;

      case 'q': // quote
        this.handleQuoteMessage(message);
        break;

      case 'b': // bar
        this.handleBarMessage(message);
        break;

      default:
        console.log('Unhandled Alpaca message type:', message);
    }
  }

  private handleProxyTradeMessage(trade: any): void {
    // Handle proxy trade message format
    // Update cumulative volume and trades
    const currentVolume = this.cumulativeVolume.get(trade.symbol) || 0;
    const currentTrades = this.cumulativeTrades.get(trade.symbol) || 0;
    const newCumulativeVolume = currentVolume + trade.size;
    const newCumulativeTrades = currentTrades + 1;
    
    this.cumulativeVolume.set(trade.symbol, newCumulativeVolume);
    this.cumulativeTrades.set(trade.symbol, newCumulativeTrades);
    
    // Set session start time if not already set
    if (!this.sessionStartTime.has(trade.symbol)) {
      this.sessionStartTime.set(trade.symbol, new Date());
    }

    const tickData: TickData = {
      symbol: trade.symbol,
      close: trade.price,
      high: trade.price, // Single trade doesn't have high/low, use price
      low: trade.price,
      numberOfTrades: newCumulativeTrades,
      open: trade.price,
      timestamp: new Date(trade.timestamp),
      volume: trade.size, // Volume from this specific trade
      cumulativeVolume: newCumulativeVolume, // Running total
      volumeWeightedAverage: trade.price
    };

    this.notifySubscribers(trade.symbol, tickData);
  }

  private handleTradeMessage(trade: AlpacaTrade): void {
    // Update cumulative volume and trades
    const currentVolume = this.cumulativeVolume.get(trade.S) || 0;
    const currentTrades = this.cumulativeTrades.get(trade.S) || 0;
    const newCumulativeVolume = currentVolume + trade.s;
    const newCumulativeTrades = currentTrades + 1;
    
    this.cumulativeVolume.set(trade.S, newCumulativeVolume);
    this.cumulativeTrades.set(trade.S, newCumulativeTrades);
    
    // Set session start time if not already set
    if (!this.sessionStartTime.has(trade.S)) {
      this.sessionStartTime.set(trade.S, new Date());
    }

    const tickData: TickData = {
      symbol: trade.S,
      close: trade.p,
      high: trade.p, // Single trade doesn't have high/low, use price
      low: trade.p,
      numberOfTrades: newCumulativeTrades,
      open: trade.p,
      timestamp: new Date(trade.t),
      volume: trade.s, // Volume from this specific trade
      cumulativeVolume: newCumulativeVolume, // Running total
      volumeWeightedAverage: trade.p
    };

    this.notifySubscribers(trade.S, tickData);
  }

  private handleQuoteMessage(quote: AlpacaQuote): void {
    // For quotes, we don't accumulate volume since these aren't actual trades
    // We'll use the existing cumulative volume if available
    const existingCumulativeVolume = this.cumulativeVolume.get(quote.S) || 0;
    const existingCumulativeTrades = this.cumulativeTrades.get(quote.S) || 0;
    
    // For quotes, we'll use the bid/ask sizes as the current "volume" but not accumulate it
    const currentQuoteVolume = quote.bs + quote.as;
    const midPrice = (quote.bp + quote.ap) / 2;
    
    const tickData: TickData = {
      symbol: quote.S,
      close: midPrice,
      high: Math.max(quote.bp, quote.ap),
      low: Math.min(quote.bp, quote.ap),
      numberOfTrades: existingCumulativeTrades, // Use existing trade count
      open: midPrice,
      timestamp: new Date(quote.t),
      volume: currentQuoteVolume, // Current quote volume (not accumulated)
      cumulativeVolume: existingCumulativeVolume, // Existing cumulative from trades
      volumeWeightedAverage: midPrice
    };

    this.notifySubscribers(quote.S, tickData);
  }

  private handleBarMessage(bar: AlpacaBar): void {
    // Update cumulative volume with the bar's volume
    const currentVolume = this.cumulativeVolume.get(bar.S) || 0;
    const currentTrades = this.cumulativeTrades.get(bar.S) || 0;
    const newCumulativeVolume = currentVolume + bar.v;
    const newCumulativeTrades = currentTrades + bar.n;
    
    this.cumulativeVolume.set(bar.S, newCumulativeVolume);
    this.cumulativeTrades.set(bar.S, newCumulativeTrades);
    
    // Set session start time if not already set
    if (!this.sessionStartTime.has(bar.S)) {
      this.sessionStartTime.set(bar.S, new Date());
    }

    const tickData: TickData = {
      symbol: bar.S,
      close: bar.c,
      high: bar.h,
      low: bar.l,
      numberOfTrades: newCumulativeTrades,
      open: bar.o,
      timestamp: new Date(bar.t),
      volume: bar.v, // Volume from this specific bar
      cumulativeVolume: newCumulativeVolume, // Running total
      volumeWeightedAverage: bar.vw
    };

    this.notifySubscribers(bar.S, tickData);
  }

  private notifySubscribers(symbol: string, data: TickData): void {
    const symbolSubscribers = this.subscribers.get(symbol);
    if (symbolSubscribers) {
      symbolSubscribers.forEach(callback => callback(data));
    }
  }

  private subscribeToSymbols(): void {
    if (!this.isAuthenticated || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.log('Not ready to subscribe - storing symbols for later');
      return;
    }

    if (this.symbols.size === 0) {
      console.log('No symbols to subscribe to');
      return;
    }

    const symbolsArray = Array.from(this.symbols);
    console.log('Subscribing to Alpaca symbols:', symbolsArray);

    const subscribeMessage = {
      type: 'subscribe',
      symbols: symbolsArray
    };

    this.socket.send(JSON.stringify(subscribeMessage));
  }

  public subscribe(symbols: string | string[], callback: (data: TickData) => void): () => void {
    const symbolsArray = Array.isArray(symbols) ? symbols : [symbols];

    // Add to subscribers and symbols to track
    symbolsArray.forEach(symbol => {
      if (!this.subscribers.has(symbol)) {
        this.subscribers.set(symbol, new Set());
        // Initialize cumulative tracking for new symbols
        this.cumulativeVolume.set(symbol, 0);
        this.cumulativeTrades.set(symbol, 0);
        this.sessionStartTime.set(symbol, new Date());
      }
      this.subscribers.get(symbol)?.add(callback);
      this.symbols.add(symbol);
    });

    // If authenticated, subscribe immediately
    if (this.isAuthenticated) {
      this.subscribeToSymbols();
    } else if (!this.isConnecting && this.isEnabled) {
      // Not connected, try to connect
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      symbolsArray.forEach(symbol => {
        const symbolSubscribers = this.subscribers.get(symbol);
        if (symbolSubscribers) {
          symbolSubscribers.delete(callback);
          if (symbolSubscribers.size === 0) {
            this.subscribers.delete(symbol);
            this.symbols.delete(symbol);
            // Clean up cumulative tracking
            this.cumulativeVolume.delete(symbol);
            this.cumulativeTrades.delete(symbol);
            this.sessionStartTime.delete(symbol);
            // TODO: Could implement unsubscribe from WebSocket here
          }
        }
      });
    };
  }

  public async fetchInitialData(symbols: string[]): Promise<void> {
    // For WebSocket, we don't need to fetch initial data separately
    // The real-time stream will provide the data
    console.log('WebSocket will provide real-time data for symbols:', symbols);
  }

  // Add method to reset cumulative volume for a symbol or all symbols
  public resetCumulativeVolume(symbol?: string): void {
    if (symbol) {
      this.cumulativeVolume.set(symbol, 0);
      this.cumulativeTrades.set(symbol, 0);
      this.sessionStartTime.set(symbol, new Date());
      console.log(`Reset cumulative volume for ${symbol}`);
    } else {
      // Reset all symbols
      for (const sym of this.symbols) {
        this.cumulativeVolume.set(sym, 0);
        this.cumulativeTrades.set(sym, 0);
        this.sessionStartTime.set(sym, new Date());
      }
      console.log('Reset cumulative volume for all symbols');
    }
  }

  // Get cumulative volume stats for a symbol
  public getCumulativeStats(symbol: string): { volume: number; trades: number; sessionStart: Date | null } | null {
    if (!this.symbols.has(symbol)) {
      return null;
    }
    
    return {
      volume: this.cumulativeVolume.get(symbol) || 0,
      trades: this.cumulativeTrades.get(symbol) || 0,
      sessionStart: this.sessionStartTime.get(symbol) || null
    };
  }

  public disconnect(): void {
    this.isManualClose = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.clearPingInterval();

    if (this.socket) {
      try {
        if (this.socket.readyState === WebSocket.OPEN || 
            this.socket.readyState === WebSocket.CONNECTING) {
          console.log(`Closing Alpaca WebSocket in state: ${this.socket.readyState}`);
          this.socket.close();
        }
      } catch (e) {
        console.error('Error closing Alpaca socket:', e);
      }
      this.socket = null;
    }
    
    this.isAuthenticated = false;
    
    // Note: We don't reset cumulative volume on disconnect - 
    // this preserves the session data across reconnections
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  public isWebSocketEnabled(): boolean {
    return this.isEnabled;
  }

  private attemptReconnect(): void {
    if (this.isManualClose || !this.isEnabled) {
      console.log('Manual close or disabled, not attempting to reconnect');
      return;
    }
    
    this.connectionFailures++;
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached for Alpaca WebSocket`);
      this.disable();
      return;
    }

    this.reconnectAttempts++;
    
    // Longer delays to avoid rapid reconnection
    const baseDelay = Math.max(5000, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
    const jitter = Math.random() * 0.3 * baseDelay;
    const delay = Math.min(60000, baseDelay + jitter);
    
    console.log(`Attempting to reconnect Alpaca WebSocket in ${Math.round(delay / 1000)} seconds (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = window.setTimeout(() => {
      console.log(`Executing Alpaca WebSocket reconnection attempt ${this.reconnectAttempts}`);
      this.connect();
    }, delay);
  }

  private startPingInterval(): void {
    this.clearPingInterval();
    this.lastPongTime = Date.now();
    
    // Note: Alpaca doesn't require explicit pings - the server sends heartbeats
    // But we can still monitor connection health
    this.pingInterval = window.setInterval(() => {
      this.checkConnectionHealth();
    }, this.pingIntervalTime);
  }
  
  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
  }
  
  private checkConnectionHealth(): void {
    if (!this.isConnected()) {
      this.clearPingInterval();
      return;
    }
    
    // If we haven't received any data in a while, consider the connection stale
    const timeSinceLastData = Date.now() - this.lastPongTime;
    if (timeSinceLastData > this.pingIntervalTime * 2) {
      console.warn('Alpaca WebSocket appears stale, reconnecting');
      if (this.socket) {
        this.socket.close();
      }
    }
  }
}

export const alpacaService = new AlpacaService();
export default alpacaService;