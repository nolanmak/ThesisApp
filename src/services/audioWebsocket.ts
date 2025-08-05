import { toast } from "react-toastify";
import { AUDIO_WS_ENDPOINT } from "./api";

// Event types
export type AudioNotification = {
  type: string;
  timestamp: string;
  data: {
    message_id: string;
    audio_url: string;
    bucket: string;
    key: string;
    content_type: string;
    size: number;
    metadata: Record<string, string>;
  };
};

// WebSocket event handlers
export type AudioMessageHandler = (notification: AudioNotification) => void;
export type ConnectionStatusHandler = (status: boolean) => void;

// Audio WebSocket service class
class AudioWebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: AudioMessageHandler[] = [];
  private connectionStatusHandlers: ConnectionStatusHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private reconnectDelay = 2000; // Start with 2 seconds
  private isConnecting = false;
  private isManualClose = false;
  private isEnabled = false; // Flag to enable/disable WebSocket functionality
  private lastConnectionAttempt = 0;
  private minConnectionInterval = 5000; // 5 seconds minimum between connection attempts
  private watchlistFilter: string[] = []; // Watchlist filter for notifications

  // Enable WebSocket functionality
  public enable(): void {
    if (!this.isEnabled) {
      this.isEnabled = true;
      this.connect();
    }
  }

  // Disable WebSocket functionality
  public disable(): void {
    if (this.isEnabled) {
      this.isEnabled = false;
      this.disconnect();

      // Notify all handlers that the connection is disabled
      this.notifyConnectionStatus(false);
    }
  }

  // Check if WebSocket functionality is enabled
  public isWebSocketEnabled(): boolean {
    return this.isEnabled;
  }

  // Set watchlist filter for notifications
  public setWatchlistFilter(watchlist: string[]): void {
    this.watchlistFilter = watchlist.map(ticker => ticker.toUpperCase());
  }

  // Get current watchlist filter
  public getWatchlistFilter(): string[] {
    return [...this.watchlistFilter];
  }

  // Check if a ticker is in the watchlist (returns true if no watchlist filter is set)
  private isTickerInWatchlist(ticker: string): boolean {
    if (this.watchlistFilter.length === 0) {
      return true; // No filter means all tickers are allowed
    }
    return this.watchlistFilter.includes(ticker.toUpperCase());
  }

  // Connect to WebSocket
  public connect(): void {
    // Don't attempt to connect if WebSocket is disabled
    if (!this.isEnabled) {
      return;
    }

    // Prevent connection attempts that are too frequent
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionAttempt;

    if (timeSinceLastAttempt < this.minConnectionInterval) {
      console.log(
        `Connection attempt too frequent (${timeSinceLastAttempt}ms since last attempt), minimum interval is ${this.minConnectionInterval}ms`
      );
      return;
    }

    // Don't attempt to connect if we're already connecting or connected
    if (this.isConnecting) {
      return;
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.socket?.readyState === WebSocket.CONNECTING) {
      return;
    }

    // Update the last connection attempt timestamp
    this.lastConnectionAttempt = now;
    this.isConnecting = true;
    this.isManualClose = false;

    try {
      // Close any existing socket before creating a new one
      if (this.socket) {
        try {
          // Only attempt to close if the socket is in a state that can be closed
          if (
            this.socket.readyState === WebSocket.OPEN ||
            this.socket.readyState === WebSocket.CONNECTING
          ) {
            console.log(
              `Closing existing Audio WebSocket in state: ${this.socket.readyState}`
            );
            this.socket.close();
          }
        } catch (e) {
          console.error("Error closing existing audio socket:", e);
        }
        // Set to null regardless of close success
        this.socket = null;
      }

      console.log(
        "[AUDIO WS] 🔗 Creating new Audio WebSocket connection to:",
        AUDIO_WS_ENDPOINT
      );
      this.socket = new WebSocket(AUDIO_WS_ENDPOINT);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 2000; // Reset reconnect delay
        this.isConnecting = false;

        // Notify of connection
        this.notifyConnectionStatus(true);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle any message that has audio_url, regardless of type
          if (data.type === "new_audio" || data.audio_url || (data.data && data.data.audio_url)) {
            
            // Transform if needed
            let audioNotification = data;
            if (data.audio_url && !data.type) {
              // Transform direct audio message to proper format
              audioNotification = {
                type: "new_audio",
                timestamp: data.timestamp || new Date().toISOString(),
                data: {
                  message_id: data.message_id || 'audio-' + Date.now(),
                  audio_url: data.audio_url,
                  bucket: data.bucket || 'unknown-bucket',
                  key: data.key || data.message_id || 'unknown-key',
                  content_type: data.content_type || 'audio/mp3',
                  size: data.size || 0,
                  metadata: {
                    ticker: data.company_name || data.ticker || 'UNKNOWN',
                    ...data.metadata
                  }
                }
              };
            }
            
            // Check watchlist filter before notifying handlers
            const ticker = audioNotification.data?.metadata?.ticker || audioNotification.data?.metadata?.company_name || 'UNKNOWN';
            if (this.isTickerInWatchlist(ticker)) {
              console.log("[AUDIO WS] ✅ Audio notification allowed by watchlist for ticker:", ticker);
              this.notifyMessageHandlers(audioNotification);
            } else {
              console.log("[AUDIO WS] ❌ Audio notification filtered out by watchlist for ticker:", ticker, "Watchlist:", this.watchlistFilter);
            }
          } else {
            console.warn(
              "[AUDIO WS] ❌ Received message with unknown format. Expected 'new_audio' or audio_url, got:",
              { type: data.type, hasAudioUrl: !!data.audio_url, keys: Object.keys(data) },
              "Full message:",
              data
            );
          }
        } catch (error) {
          console.error("[AUDIO WS] 💥 Error parsing message:", error, "Raw data:", event.data);
        }
      };

      this.socket.onerror = (error) => {
        console.error("Audio WebSocket error:", error);


        this.isConnecting = false;

        // Check if we've had too many consecutive errors
        if (this.reconnectAttempts >= this.maxReconnectAttempts - 1) {
          toast.error(
            `Audio WebSocket connection failed after ${this.maxReconnectAttempts} attempts. Check that the endpoint ${AUDIO_WS_ENDPOINT} is correct and accessible.`,
            { autoClose: 10000 }
          );
        }

        this.notifyConnectionStatus(false);
      };

      this.socket.onclose = (event) => {
        this.isConnecting = false;
        this.notifyConnectionStatus(false);

        // Don't attempt to reconnect if manually closed
        if (!this.isManualClose) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error("Failed to create Audio WebSocket connection:", error);
      this.isConnecting = false;
      this.notifyConnectionStatus(false);
      this.attemptReconnect();
    }
  }

  // Disconnect from WebSocket
  public disconnect(): void {
    this.isManualClose = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      try {
        // Only attempt to close if the socket is in a state that can be closed
        if (
          this.socket.readyState === WebSocket.OPEN ||
          this.socket.readyState === WebSocket.CONNECTING
        ) {
          console.log(
            `Closing Audio WebSocket in state: ${this.socket.readyState}`
          );
          this.socket.close();
        } else {
          console.log(
            `Not closing Audio WebSocket - already in state: ${this.socket.readyState}`
          );
        }
      } catch (e) {
        console.error("Error closing audio socket:", e);
      }
      this.socket = null;
    }

    this.notifyConnectionStatus(false);
  }

  // Send a message to the WebSocket server - primarily for future use or testing
  public sendMessage(message: Record<string, unknown>): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("Cannot send message, Audio WebSocket not connected");
      return false;
    }

    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("Error sending message to Audio WebSocket:", error);
      return false;
    }
  }

  // Subscribe to audio notifications
  public subscribeToAudioNotifications(
    handler: AudioMessageHandler
  ): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  // Subscribe to connection status events
  public subscribeToConnectionStatus(
    handler: ConnectionStatusHandler
  ): () => void {
    this.connectionStatusHandlers.push(handler);

    // Immediately notify the new handler of the current connection status
    if (this.socket?.readyState === WebSocket.OPEN) {
      handler(true);
    } else {
      handler(false);
    }

    return () => {
      this.connectionStatusHandlers = this.connectionStatusHandlers.filter(
        (h) => h !== handler
      );
    };
  }

  // Notify all message handlers
  private notifyMessageHandlers(notification: AudioNotification): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(notification);
      } catch (error) {
        console.error("[AUDIO WS] Handler error:", error);
      }
    });
  }

  // Notify all connection status handlers
  private notifyConnectionStatus(isConnected: boolean): void {
    this.connectionStatusHandlers.forEach((handler) => handler(isConnected));
  }

  // Attempt to reconnect with exponential backoff
  private attemptReconnect(): void {
    if (this.isManualClose) {
      console.log("Manual close, not attempting to reconnect");
      return;
    }

    this.reconnectAttempts += 1;
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.log(
        `Maximum reconnect attempts (${this.maxReconnectAttempts}) reached, giving up`
      );
      return;
    }

    // Calculate delay with exponential backoff (2^n seconds)
    const delay = Math.min(
      30000,
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1)
    );
    console.log(
      `Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`
    );

    // Clear any existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = window.setTimeout(() => {
      console.log(
        `Attempting to reconnect to Audio WebSocket (attempt ${this.reconnectAttempts})`
      );
      this.connect();
      this.reconnectTimeout = null;
    }, delay);
  }
}

// Create singleton instance
export const audioWebsocketService = new AudioWebSocketService();

export default audioWebsocketService;
