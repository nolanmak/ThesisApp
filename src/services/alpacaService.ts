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
  twentyDayAvgVolume?: number; // 20-day average daily volume
  volumePercentageOfAvg?: number; // Percentage of current volume vs 20-day avg
  isHighVolumeSignal?: boolean; // True if > 20% of 20-day average (buy signal)
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
  '20_day_avg_volume'?: number; // Added: 20-day average daily volume
  volume_percentage_of_avg?: number; // Added: Percentage of current volume vs 20-day avg
  is_high_volume_signal?: boolean; // Added: True if > 20% of 20-day average (buy signal)
  conditions?: string[];
  exchange?: string;
}

interface VolumeDataMessage {
  type: 'volume_data';
  ticker: string;
  cumulative_volume: number;
  mode: 'live_after_hours' | 'historical';
  '20_day_avg_volume'?: number; // Added: 20-day average daily volume
  volume_percentage_of_avg?: number; // Added: Percentage of current volume vs 20-day avg
  is_high_volume_signal?: boolean; // Added: True if > 20% of 20-day average (buy signal)
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
  private reconnectDelay = 500; // Faster initial reconnect
  private lastConnectionAttempt = 0;
  private minConnectionInterval = 3000; // Increased to 3000ms for better stability
  private connectionFailures = 0;
  private maxConsecutiveFailures = 3;
  private isEnabled = true;
  private pingInterval: number | null = null;
  private pingTimeout: number | null = null;
  private lastPongTime = 0;
  private pingIntervalTime = 45000; // 45 seconds - less aggressive
  private pingTimeoutTime = 15000; // 15 seconds - more lenient
  private pendingSubscriptions: Set<string> = new Set();
  private isAuthenticated = false;
  private connectionEstablishTimeout: number | null = null;
  private isEagerConnection = false; // Flag to enable proactive connection
  private marketCloseCheckInterval: number | null = null;
  private periodicMarketCheckInterval: number | null = null;
  
  // Track cumulative volume and trade counts for each symbol
  private cumulativeVolume: Map<string, number> = new Map();
  private cumulativeTrades: Map<string, number> = new Map();
  private sessionStartTime: Map<string, Date> = new Map();

  constructor() {
    this.initializeFromEnv();
    // Start monitoring for market close time (4 PM EST/EDT)
    this.startMarketCloseMonitoring();
  }

  private initializeFromEnv(): void {
    // For proxy connection, we don't need Alpaca credentials in the frontend
    // The proxy handles authentication with Alpaca
    console.log('Alpaca service initialized for proxy connection. Enabled:', this.isEnabled);
    // Enable eager connection for volume tracking
    this.isEagerConnection = true;
  }

  /**
   * Check if current time is at or after 4 PM EST/EDT (market close)
   * Handles daylight saving time automatically and works in any timezone
   */
  private isAfterMarketClose(): boolean {
    const now = new Date();
    
    // Create a date object for today at 4 PM in New York timezone
    const todayAt4PM = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    todayAt4PM.setHours(16, 0, 0, 0); // 4:00:00 PM exactly
    
    // Get current time in New York timezone
    const nowInNY = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    return nowInNY >= todayAt4PM;
  }

  /**
   * Get time until 4 PM EST/EDT in milliseconds
   * Returns 0 if already past 4 PM today, or ms until 4 PM tomorrow
   */
  private getTimeUntilMarketClose(): number {
    const now = new Date();
    
    // Get current time in New York timezone
    const nowInNY = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    // Create target time (4 PM today in NY timezone)
    const targetTime = new Date(nowInNY);
    targetTime.setHours(16, 0, 0, 0);
    
    // If we're past 4 PM today, set target to 4 PM tomorrow
    if (nowInNY >= targetTime) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    // Convert back to local timezone for calculation
    const targetInLocal = new Date(targetTime.toLocaleString("en-US", {timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone}));
    
    return Math.max(0, targetInLocal.getTime() - now.getTime());
  }

  /**
   * Start monitoring for market close time and connect when appropriate
   */
  private startMarketCloseMonitoring(): void {
    if (!this.isEnabled) {
      return;
    }
    
    const checkMarketClose = () => {
      if (this.isAfterMarketClose()) {
        // It's after 4 PM EST/EDT, start connection if not already connected
        if (!this.isConnected() && this.isEnabled && !this.isConnecting) {
          console.log('🕐 Market closed (4 PM EST/EDT reached), starting volume data connection');
          this.isEagerConnection = true;
          this.connect();
        }
      } else {
        // Not yet 4 PM, schedule check for when market closes
        const timeUntil4PM = this.getTimeUntilMarketClose();
        const hours = Math.floor(timeUntil4PM / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntil4PM % (1000 * 60 * 60)) / (1000 * 60));
        
        console.log(`📅 Market not yet closed. Will start volume tracking in ${hours}h ${minutes}m (at 4 PM EST/EDT)`);
        
        // Clear existing timeout
        if (this.marketCloseCheckInterval) {
          clearTimeout(this.marketCloseCheckInterval);
        }
        
        // Schedule connection for market close time
        this.marketCloseCheckInterval = window.setTimeout(() => {
          console.log('🔔 Market close time reached, starting volume connection');
          this.isEagerConnection = true;
          this.connect();
          
          // Continue monitoring (for next day)
          this.startMarketCloseMonitoring();
        }, timeUntil4PM);
      }
    };
    
    // Initial check
    checkMarketClose();
    
    // Start periodic check every 30 minutes to ensure we don't miss market close
    // This handles edge cases like browser sleep, timezone changes, or long-running sessions
    this.startPeriodicMarketCheck();
  }

  /**
   * Start periodic checks (every 30 minutes) to ensure we don't miss market close
   * This provides a safety net in case the main timeout mechanism fails
   */
  private startPeriodicMarketCheck(): void {
    // Clear any existing periodic check
    if (this.periodicMarketCheckInterval) {
      clearInterval(this.periodicMarketCheckInterval);
    }
    
    // Check every 30 minutes
    this.periodicMarketCheckInterval = window.setInterval(() => {
      if (!this.isEnabled) {
        return;
      }
      
      console.log('🔄 Periodic market close check (every 30min safety check)');
      
      // If we should be connected but aren't, start connection
      if (this.isAfterMarketClose() && !this.isConnected() && !this.isConnecting) {
        console.log('⚠️ Periodic check detected missed market close - connecting now');
        this.isEagerConnection = true;
        this.connect();
      }
      
      // If our scheduled timeout seems to have been missed, restart monitoring
      if (!this.isAfterMarketClose() && !this.marketCloseCheckInterval) {
        console.log('⚠️ Periodic check detected missing market close schedule - restarting monitoring');
        this.startMarketCloseMonitoring();
      }
    }, 30 * 60 * 1000); // 30 minutes in milliseconds
  }

  public enable(): void {
    if (!this.isEnabled) {
      this.isEnabled = true;
      console.log('Alpaca WebSocket functionality enabled');
      this.startMarketCloseMonitoring();
    }
  }

  // Warm up the connection for faster volume data access
  public warmConnection(): void {
    if (this.isEnabled && !this.isConnected() && !this.isConnecting) {
      console.log('🔥 Warming WebSocket connection for volume data');
      this.connect();
    }
  }

  public disable(): void {
    if (this.isEnabled) {
      this.isEnabled = false;
      console.log('Alpaca WebSocket functionality disabled');
      
      // Clear market close monitoring
      if (this.marketCloseCheckInterval) {
        clearTimeout(this.marketCloseCheckInterval);
        this.marketCloseCheckInterval = null;
      }
      
      // Clear periodic market check
      if (this.periodicMarketCheckInterval) {
        clearInterval(this.periodicMarketCheckInterval);
        this.periodicMarketCheckInterval = null;
      }
      
      this.disconnect();
    }
  }

  private getWebSocketUrl(): string {
    // Use proxy WebSocket endpoint from environment variable
    const proxyUrl = import.meta.env.VITE_ALPACA_PROXY_WS_URL;
    
    if (!proxyUrl) {
      throw new Error('VITE_ALPACA_PROXY_WS_URL environment variable is required');
    }
    
    let finalUrl = proxyUrl;
    
    // If running in production (served over HTTPS), ensure we use WSS
    if (window.location.protocol === 'https:' && finalUrl.startsWith('ws://')) {
      finalUrl = finalUrl.replace('ws://', 'wss://');
    }
    
    console.log('🌐 Alpaca WebSocket URL from env:', finalUrl);
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
      // For volume data, allow more frequent attempts if not currently connecting
      if (this.isConnecting) {
        return;
      }
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
      setTimeout(() => this.createConnection(), 300); // Faster cleanup
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
      
      // Clear any existing socket first
      if (this.socket) {
        this.socket.onopen = null;
        this.socket.onmessage = null;
        this.socket.onerror = null;
        this.socket.onclose = null;
      }
      
      this.socket = new WebSocket(wsUrl);
      console.log('WebSocket created, readyState:', this.socket.readyState);
      
      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        console.error('🚨 Alpaca WebSocket connection timeout - connection never opened');
        if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
          console.log('Closing timed-out connection and retrying');
          this.socket.close();
          this.isConnecting = false;
          if (!this.isManualClose && this.isEnabled) {
            this.attemptReconnect();
          }
        }
      }, 10000); // 10 second timeout
      
      this.socket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('🚀 Alpaca proxy WebSocket connection established to:', wsUrl);
        this.reconnectAttempts = 0;
        this.connectionFailures = 0;
        this.reconnectDelay = 500; // Reset to initial fast delay
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
        
        // Subscribe to symbols immediately - connection is stable after onopen
        this.subscribeToSymbols();
        
        // Request initial data for all subscribed symbols after connection
        if (this.symbols.size > 0) {
          setTimeout(() => {
            console.log('Fetching initial data for all symbols after connection:', Array.from(this.symbols));
            this.fetchInitialData(Array.from(this.symbols));
          }, 200); // Wait for subscription to be processed
        }
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
        console.error('🚨 Error event details:', {
          type: error.type,
          target: error.target,
          currentTarget: error.currentTarget
        });
        console.error('🚨 WebSocket state at error:', {
          readyState: this.socket?.readyState,
          readyStateText: this.getReadyStateText(this.socket?.readyState),
          url: this.socket?.url,
          isConnecting: this.isConnecting,
          reconnectAttempts: this.reconnectAttempts
        });
        this.isConnecting = false;
        this.isAuthenticated = false;
        
        // Don't wait for onclose, start reconnection immediately for faster recovery
        if (!this.isManualClose && this.isEnabled) {
          this.attemptReconnect();
        }
      };

      this.socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log(`❌ Alpaca WebSocket connection closed: ${event.code} ${event.reason}`);
        console.log('🔍 Close event details:', {
          wasClean: event.wasClean,
          code: event.code,
          codeDescription: this.getCloseCodeDescription(event.code),
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
      volumeWeightedAverage: trade.price,
      twentyDayAvgVolume: trade['20_day_avg_volume'], // Include 20-day average if available
      volumePercentageOfAvg: trade.volume_percentage_of_avg, // Percentage vs 20-day avg
      isHighVolumeSignal: trade.is_high_volume_signal // Buy signal if > 20%
    };

    this.notifySubscribers(trade.symbol, tickData);
  }

  private handleVolumeDataMessage(volumeData: VolumeDataMessage): void {
    console.log('📊 Complete Volume Data received for', volumeData.ticker, '- Volume:', volumeData.cumulative_volume, '20-day avg:', volumeData['20_day_avg_volume']);
    
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
      volumeWeightedAverage: 0,
      twentyDayAvgVolume: volumeData['20_day_avg_volume'], // Include 20-day average if available
      volumePercentageOfAvg: volumeData.volume_percentage_of_avg, // Percentage vs 20-day avg
      isHighVolumeSignal: volumeData.is_high_volume_signal // Buy signal if > 20%
    };

    // Always notify subscribers - this is initial volume data they need
    const symbolSubscribers = this.subscribers.get(volumeData.ticker);
    if (symbolSubscribers && symbolSubscribers.size > 0) {
      console.log(`Notifying ${symbolSubscribers.size} subscribers for ${volumeData.ticker} with volume data`);
      this.notifySubscribers(volumeData.ticker, tickData);
    } else {
      console.log(`No subscribers found for ${volumeData.ticker}, storing data for later`);
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

    // Handle connection and subscription more reliably
    if (this.isAuthenticated && this.isConnected()) {
      // Already connected, subscribe immediately
      this.subscribeToSymbols();
      // Wait a bit before requesting initial data to ensure subscription is processed
      setTimeout(() => this.fetchInitialData(symbolsArray), 100);
    } else if (!this.isConnecting) {
      // Not connected and not connecting, start connection
      console.log('Starting connection to subscribe to symbols:', symbolsArray);
      this.connect();
    }
    // If already connecting, symbols are in pendingSubscriptions and will be handled on connect

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
    if (!this.isConnected()) {
      console.warn('Cannot fetch initial data - WebSocket not connected, will retry when connected');
      return;
    }
    
    if (symbols.length === 0) {
      console.log('No symbols to fetch initial data for');
      return;
    }
    
    // Request initial volume data from backend for the provided symbols
    console.log('Fetching initial volume data for symbols:', symbols);
    
    // Add retry logic for failed requests
    try {
      this.requestVolumeDataForSymbols(symbols);
      
      // Set a timeout to retry if no data received
      setTimeout(() => {
        symbols.forEach(symbol => {
          if (!this.cumulativeVolume.has(symbol) || this.cumulativeVolume.get(symbol) === 0) {
            console.log('Retrying volume data request for:', symbol);
            this.requestVolumeData(symbol);
          }
        });
      }, 2000);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
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

    if (this.connectionEstablishTimeout) {
      clearTimeout(this.connectionEstablishTimeout);
      this.connectionEstablishTimeout = null;
    }

    if (this.marketCloseCheckInterval) {
      clearTimeout(this.marketCloseCheckInterval);
      this.marketCloseCheckInterval = null;
    }

    if (this.periodicMarketCheckInterval) {
      clearInterval(this.periodicMarketCheckInterval);
      this.periodicMarketCheckInterval = null;
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

  /**
   * Get market close status information
   */
  public getMarketCloseStatus(): {
    isAfterMarketClose: boolean;
    timeUntilMarketClose: number;
    nextMarketCloseTime: string;
  } {
    const isAfterMarketClose = this.isAfterMarketClose();
    const timeUntilMarketClose = this.getTimeUntilMarketClose();
    
    // Calculate next market close time
    const now = new Date();
    const nextClose = new Date(now.getTime() + timeUntilMarketClose);
    const nextMarketCloseTime = nextClose.toLocaleString("en-US", {
      timeZone: "America/New_York",
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    
    return {
      isAfterMarketClose,
      timeUntilMarketClose,
      nextMarketCloseTime
    };
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
    
    // Progressive delays but cap at 10 seconds for real-time data
    const baseDelay = Math.min(10000, this.reconnectDelay * Math.pow(1.2, Math.min(this.reconnectAttempts - 1, 5))); // Smaller exponential growth, cap at 10s
    const jitter = Math.random() * 0.1 * baseDelay; // Small jitter
    const delay = Math.min(10000, baseDelay + jitter); // Never wait more than 10 seconds
    
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
    
    // Adaptive health checks based on connection stability
    const checkInterval = this.reconnectAttempts > 3 ? this.pingIntervalTime * 2 : this.pingIntervalTime;
    this.pingInterval = window.setInterval(() => {
      this.checkConnectionHealth();
    }, checkInterval);
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
  
  private getReadyStateText(state?: number): string {
    switch (state) {
      case WebSocket.CONNECTING: return 'CONNECTING (0)';
      case WebSocket.OPEN: return 'OPEN (1)';
      case WebSocket.CLOSING: return 'CLOSING (2)';
      case WebSocket.CLOSED: return 'CLOSED (3)';
      default: return `UNKNOWN (${state})`;
    }
  }
  
  private getCloseCodeDescription(code: number): string {
    switch (code) {
      case 1000: return 'Normal Closure';
      case 1001: return 'Going Away';
      case 1002: return 'Protocol Error';
      case 1003: return 'Unsupported Data';
      case 1005: return 'No Status Received';
      case 1006: return 'Abnormal Closure';
      case 1007: return 'Invalid frame payload data';
      case 1008: return 'Policy Violation';
      case 1009: return 'Message Too Big';
      case 1010: return 'Mandatory Extension';
      case 1011: return 'Internal Server Error';
      case 1015: return 'TLS Handshake';
      default: return 'Unknown';
    }
  }
  
  private checkConnectionHealth(): void {
    if (!this.isConnected()) {
      this.clearPingInterval();
      return;
    }
    
    // More lenient health check - only disconnect if we haven't received data for much longer
    const timeSinceLastData = Date.now() - this.lastPongTime;
    const healthCheckThreshold = this.pingIntervalTime * 3; // 2.25 minutes - more stable
    
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