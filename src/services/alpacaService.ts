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

// Interfaces for potential future use
// interface AlpacaSubscriptionMessage {
//   T: 'subscription';
//   trades: string[];
//   quotes: string[];
//   bars: string[];
//   updatedBars: string[];
//   dailyBars: string[];
//   statuses: string[];
//   lulds: string[];
//   corrections: string[];
//   cancelErrors: string[];
// }

// interface AlpacaErrorMessage {
//   T: 'error';
//   code: number;
//   msg: string;
// }

// interface AlpacaSuccessMessage {
//   T: 'success';
//   msg: string;
// }

// Enhanced proxy message interfaces for new backend
interface ProxyTradeMessage {
  type: 'trade';
  symbol: string;
  price: number;
  size: number;
  timestamp: string;
  cumulative_volume?: number; // Added: Backend-provided cumulative volume
  after_hours_mode?: boolean; // Added: Indicates if in after-hours tracking mode
  conditions?: string[];
  exchange?: string;
}

interface VolumeDataMessage {
  type: 'volume_data';
  ticker: string;
  cumulative_volume: number;
  mode: 'live_after_hours' | 'historical';
  date?: string; // Present for historical data
  timestamp: string;
}

interface VolumeRequestMessage {
  type: 'get_volume';
  ticker: string;
}

// Type definition kept for potential future use
// type AlpacaMessage = AlpacaTrade | AlpacaQuote | AlpacaBar | AlpacaSubscriptionMessage | AlpacaErrorMessage | AlpacaSuccessMessage;

class AlpacaService {
  private socket: WebSocket | null = null;
  private subscribers: Map<string, Set<(data: TickData) => void>> = new Map();
  private symbols: Set<string> = new Set();
  private isConnecting = false;
  private isManualClose = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 50;
  private reconnectTimeout: number | null = null;
  private reconnectDelay = 2000;
  private lastConnectionAttempt = 0;
  private minConnectionInterval = 3000; // Increased to 3000ms to prevent connection spam
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
    console.log('Alpaca service initialized for proxy connection. Enabled:', this.isEnabled);
    // Don't auto-connect in constructor to avoid race conditions
    // Connection will be initiated when subscribe() is called
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
    let finalUrl = proxyUrl || 'ws://IRAuto-Alpac-6P4vTH9n3JEA-1469477952.us-east-1.elb.amazonaws.com/ws';
    
    // If running in production (served over HTTPS), ensure we use WSS
    if (window.location.protocol === 'https:' && finalUrl.startsWith('ws://')) {
      finalUrl = finalUrl.replace('ws://', 'wss://');
    }
    
    console.log('🌐 Alpaca WebSocket URL from env:', proxyUrl, '-> Final URL:', finalUrl);
    return finalUrl;
  }

  public connect(): void {
    console.log('🔌 Alpaca connect() called. Enabled:', this.isEnabled, 'Connecting:', this.isConnecting, 'Socket state:', this.socket?.readyState);
    if (!this.isEnabled) {
      console.log('Alpaca WebSocket is disabled, not connecting');
      return;
    }

    // Prevent connection attempts that are too frequent
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionAttempt;
    
    if (timeSinceLastAttempt < this.minConnectionInterval) {
      console.log(`Alpaca connection attempt too frequent (${timeSinceLastAttempt}ms since last attempt), minimum interval is ${this.minConnectionInterval}ms`);
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

    this.lastConnectionAttempt = now;
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
      const wsUrl = this.getWebSocketUrl();
      console.log('Creating new Alpaca WebSocket connection to:', wsUrl);
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('🚀 Alpaca proxy WebSocket connection established to:', wsUrl);
        this.reconnectAttempts = 0;
        this.connectionFailures = 0;
        this.reconnectDelay = 2000;
        console.log('✅ Alpaca WebSocket connected successfully to CloudFront');
        this.isConnecting = false;
        
        // For proxy connection, assume we're authenticated after successful connection
        // The proxy handles Alpaca authentication internally
        this.isAuthenticated = true;
        this.startPingInterval();
        
        // Resubscribe to any pending symbols
        if (this.pendingSubscriptions.size > 0) {
          console.log('Resubscribing to pending symbols after reconnection:', Array.from(this.pendingSubscriptions));
          this.pendingSubscriptions.forEach(symbol => this.symbols.add(symbol));
          this.pendingSubscriptions.clear();
        }
        
        // Subscribe to symbols after a brief delay to ensure connection is stable
        setTimeout(() => {
          this.subscribeToSymbols();
        }, 100);
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
        console.error('🚨 Alpaca WebSocket error:', error);
        console.error('🚨 WebSocket state at error:', {
          readyState: this.socket?.readyState,
          url: this.socket?.url,
          isConnecting: this.isConnecting,
          reconnectAttempts: this.reconnectAttempts
        });
        this.isConnecting = false;
        this.isAuthenticated = false;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts - 1) {
          console.error('❌ Alpaca WebSocket connection failing repeatedly');
        }
      };

      this.socket.onclose = (event) => {
        console.log(`❌ Alpaca WebSocket connection closed: ${event.code} ${event.reason}`);
        console.log('🔍 Close event details:', {
          wasClean: event.wasClean,
          code: event.code,
          reason: event.reason || 'No reason provided'
        });
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


  private handleMessage(message: Record<string, unknown>): void {
    // Update activity timestamp for any received message
    this.updateLastActivity();
    
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
          // Remove verbose logging for trades to reduce console clutter
          this.handleProxyTradeMessage(message as unknown as ProxyTradeMessage);
          break;

        case 'volume_data':
          this.handleVolumeDataMessage(message as unknown as VolumeDataMessage);
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
        this.handleTradeMessage(message as unknown as AlpacaTrade);
        break;

      case 'q': // quote
        this.handleQuoteMessage(message as unknown as AlpacaQuote);
        break;

      case 'b': // bar
        this.handleBarMessage(message as unknown as AlpacaBar);
        break;

      default:
        console.log('Unhandled Alpaca message type:', message);
    }
  }

  private handleProxyTradeMessage(trade: ProxyTradeMessage): void {
    // Handle enhanced proxy trade message format with backend cumulative volume
    
    // Use backend-provided cumulative volume if available, otherwise fall back to local tracking
    let cumulativeVolume: number;
    let cumulativeTrades: number;
    
    if (trade.cumulative_volume !== undefined) {
      // Backend provides cumulative volume (preferred)
      cumulativeVolume = trade.cumulative_volume;
      // Update local tracking to match backend
      this.cumulativeVolume.set(trade.symbol, cumulativeVolume);
      // Estimate trades (backend doesn't send trade count)
      cumulativeTrades = this.cumulativeTrades.get(trade.symbol) || 0;
      this.cumulativeTrades.set(trade.symbol, cumulativeTrades + 1);
    } else {
      // Fall back to local cumulative tracking
      const currentVolume = this.cumulativeVolume.get(trade.symbol) || 0;
      const currentTrades = this.cumulativeTrades.get(trade.symbol) || 0;
      cumulativeVolume = currentVolume + trade.size;
      cumulativeTrades = currentTrades + 1;
      
      this.cumulativeVolume.set(trade.symbol, cumulativeVolume);
      this.cumulativeTrades.set(trade.symbol, cumulativeTrades);
    }
    
    // Set session start time if not already set
    if (!this.sessionStartTime.has(trade.symbol)) {
      this.sessionStartTime.set(trade.symbol, new Date());
    }

    const tickData: TickData = {
      symbol: trade.symbol,
      close: trade.price,
      high: trade.price, // Single trade doesn't have high/low, use price
      low: trade.price,
      numberOfTrades: cumulativeTrades,
      open: trade.price,
      timestamp: new Date(trade.timestamp),
      volume: trade.size, // Volume from this specific trade
      cumulativeVolume: cumulativeVolume, // Backend or local cumulative total
      volumeWeightedAverage: trade.price
    };

    this.notifySubscribers(trade.symbol, tickData);
  }

  private handleVolumeDataMessage(volumeData: VolumeDataMessage): void {
    // Handle volume data response from backend
    console.log(`📊 Volume data received for ${volumeData.ticker}:`, volumeData);
    
    // Update local tracking with backend data
    this.cumulativeVolume.set(volumeData.ticker, volumeData.cumulative_volume);
    
    // Create TickData from volume data (for consistency with existing interface)
    const tickData: TickData = {
      symbol: volumeData.ticker,
      close: 0, // No price data in volume-only message
      high: 0,
      low: 0,
      numberOfTrades: this.cumulativeTrades.get(volumeData.ticker) || 0,
      open: 0,
      timestamp: new Date(volumeData.timestamp),
      volume: 0, // No individual trade volume
      cumulativeVolume: volumeData.cumulative_volume,
      volumeWeightedAverage: 0
    };

    // Only notify if we have subscribers for this symbol
    if (this.subscribers.has(volumeData.ticker)) {
      this.notifySubscribers(volumeData.ticker, tickData);
    }
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
      console.log('No symbols to subscribe to. Current symbols:', Array.from(this.symbols));
      console.log('Pending subscriptions:', Array.from(this.pendingSubscriptions));
      return;
    }

    const symbolsArray = Array.from(this.symbols);
    console.log('Subscribing to Alpaca symbols:', symbolsArray);

    const subscribeMessage = {
      type: 'subscribe',
      symbols: symbolsArray
    };

    this.socket.send(JSON.stringify(subscribeMessage));

    // Request initial volume data for subscribed symbols
    console.log('Requesting initial volume data for subscribed symbols');
    this.requestVolumeDataForSymbols(symbolsArray);
  }

  public subscribe(symbols: string | string[], callback: (data: TickData) => void): () => void {
    const symbolsArray = Array.isArray(symbols) ? symbols : [symbols];
    console.log('📊 Subscribe called with symbols:', symbolsArray, 'Service enabled:', this.isEnabled, 'Connected:', this.isConnected());

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

    // Add symbols to pending subscriptions for reconnection scenarios
    symbolsArray.forEach(symbol => this.pendingSubscriptions.add(symbol));

    // If authenticated, subscribe immediately
    if (this.isAuthenticated) {
      this.subscribeToSymbols();
    } else if (!this.isConnecting && this.isEnabled) {
      // Not connected, try to connect
      console.log('Starting connection to subscribe to symbols:', symbolsArray);
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
    // Request initial volume data from backend for the provided symbols
    console.log('Requesting initial volume data for symbols:', symbols);
    this.requestVolumeDataForSymbols(symbols);
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

  // Request volume data from backend for a specific ticker
  public requestVolumeData(ticker: string): void {
    if (!this.isConnected()) {
      console.warn('Cannot request volume data - WebSocket not connected');
      return;
    }

    const volumeRequest: VolumeRequestMessage = {
      type: 'get_volume',
      ticker: ticker.toUpperCase()
    };

    console.log('📊 Requesting volume data for:', ticker);
    this.socket!.send(JSON.stringify(volumeRequest));
  }

  // Request volume data for multiple tickers
  public requestVolumeDataForSymbols(tickers: string[]): void {
    tickers.forEach(ticker => this.requestVolumeData(ticker));
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
    
    // Never give up - always reset counter and continue trying
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Resetting reconnection counter after ${this.maxReconnectAttempts} attempts - continuing indefinitely for volume tracking`);
      this.reconnectAttempts = 0; // Reset counter to continue forever
    }

    this.reconnectAttempts++;
    
    // Progressive delays but never exceed 1 minute for real-time data
    const baseDelay = Math.min(60000, this.reconnectDelay * Math.pow(1.3, Math.min(this.reconnectAttempts - 1, 10))); // Cap exponential growth
    const jitter = Math.random() * 0.1 * baseDelay; // Small jitter
    const delay = Math.min(60000, baseDelay + jitter); // Never wait more than 1 minute
    
    console.log(`🔄 Reconnecting Alpaca WebSocket in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts}) - never giving up for volume tracking`);
    
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
    
    // Update last pong time whenever we receive any data
    this.updateLastActivity();
    
    // Less frequent health checks to avoid premature disconnections
    this.pingInterval = window.setInterval(() => {
      this.checkConnectionHealth();
    }, this.pingIntervalTime * 2); // Check every 60 seconds instead of 30
  }
  
  private updateLastActivity(): void {
    this.lastPongTime = Date.now();
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
    
    // More lenient health check - only disconnect if we haven't received data for much longer
    const timeSinceLastData = Date.now() - this.lastPongTime;
    const healthCheckThreshold = this.pingIntervalTime * 4; // 2 minutes instead of 1 minute
    
    if (timeSinceLastData > healthCheckThreshold) {
      console.warn(`Alpaca WebSocket appears stale (${Math.round(timeSinceLastData / 1000)}s since last activity), reconnecting`);
      if (this.socket) {
        this.socket.close();
      }
    }
  }
}

export const alpacaService = new AlpacaService();
export default alpacaService;