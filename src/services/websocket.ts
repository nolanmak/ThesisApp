import { toast } from 'react-toastify';
import { Message } from '../types';

const WS_ENDPOINT = import.meta.env.VITE_WS_ENDPOINT;
// Event types
export type WebSocketEventType = 'message' | 'connection';

// WebSocket event handlers
export type MessageHandler = (message: Message) => void;
export type ConnectionStatusHandler = (status: boolean) => void;

// WebSocket service class
class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private connectionStatusHandlers: ConnectionStatusHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private reconnectDelay = 2000; // Start with 2 seconds
  private isConnecting = false;
  private isManualClose = false;
  private hasNotifiedConnected = false;
  private lastConnectionAttempt = 0;
  private minConnectionInterval = 5000; // Increased from 3000 to 5000 ms
  private connectionFailures = 0; // Track consecutive connection failures
  private maxConsecutiveFailures = 3; // Maximum consecutive failures before increasing backoff
  private isEnabled = true; // Flag to enable/disable WebSocket functionality
  private pingInterval: number | null = null;
  private pingTimeout: number | null = null;
  private lastPongTime = 0;
  private pingIntervalTime = 30000; // 30 seconds between pings
  private pingTimeoutTime = 10000; // 10 seconds to wait for pong response

  // Enable WebSocket functionality
  public enable(): void {
    if (!this.isEnabled) {
      this.isEnabled = true;
      console.log('WebSocket functionality enabled');
      this.connect();
    }
  }

  // Disable WebSocket functionality
  public disable(): void {
    if (this.isEnabled) {
      this.isEnabled = false;
      console.log('WebSocket functionality disabled');
      this.disconnect();
      
      // Notify all handlers that the connection is disabled
      this.notifyConnectionStatus(false);
    }
  }

  // Check if WebSocket functionality is enabled
  public isWebSocketEnabled(): boolean {
    return this.isEnabled;
  }

  // Connect to WebSocket
  public connect(): void {
    // Don't attempt to connect if WebSocket is disabled
    if (!this.isEnabled) {
      console.log('WebSocket is disabled, not connecting');
      return;
    }
    
    // Prevent connection attempts that are too frequent
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionAttempt;
    
    if (timeSinceLastAttempt < this.minConnectionInterval) {
      console.log(`Connection attempt too frequent (${timeSinceLastAttempt}ms since last attempt), minimum interval is ${this.minConnectionInterval}ms`);
      return;
    }
    
    // Don't attempt to connect if we're already connecting or connected
    if (this.isConnecting) {
      console.log('WebSocket already connecting, skipping duplicate connect attempt');
      return;
    }
    
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }
    
    if (this.socket?.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket already in connecting state');
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
          if (this.socket.readyState === WebSocket.OPEN || 
              this.socket.readyState === WebSocket.CONNECTING) {
            console.log(`Closing existing WebSocket in state: ${this.socket.readyState}`);
            this.socket.close();
          }
        } catch (e) {
          console.error('Error closing existing socket:', e);
        }
        // Set to null regardless of close success
        this.socket = null;
      }
      
      console.log('Creating new WebSocket connection');
      this.socket = new WebSocket(WS_ENDPOINT);

      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0;
        this.connectionFailures = 0; // Reset connection failures on successful connection
        this.reconnectDelay = 2000; // Reset reconnect delay
        this.isConnecting = false;
        
        // Only notify once per session unless disconnected
        if (!this.hasNotifiedConnected) {
          this.hasNotifiedConnected = true;
          this.notifyConnectionStatus(true);
        } else {
          // Still update the status without notification
          this.updateConnectionStatus(true);
        }
        
        // Start the ping interval
        this.startPingInterval();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          // Handle pong response
          if (data.type === 'pong' || data.action === 'pong') {
            this.handlePong();
            return;
          }
          
          // Handle different message formats
          if (data.message) {
            // Format: { message: Message }
            this.notifyMessageHandlers(data.message);
          } else if (data.body) {
            try {
              // Format: { body: string } where body is a JSON string
              const bodyData = JSON.parse(data.body);
              
              // Check if bodyData is a Message or contains a message property
              if (bodyData.message) {
                this.notifyMessageHandlers(bodyData.message);
              } else if (bodyData.message_id) {
                // bodyData itself is a Message
                this.notifyMessageHandlers(bodyData);
              } else {
                console.warn('Received WebSocket message with unknown format:', bodyData);
              }
            } catch (bodyError) {
              console.error('Error parsing WebSocket message body:', bodyError);
            }
          } else if (data.message_id) {
            // Format: Message (the data itself is the Message)
            this.notifyMessageHandlers(data);
          } else {
            console.warn('Received WebSocket message with unknown format:', data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        
        // Log additional details about the socket state
        console.log('WebSocket state at error:', {
          readyState: this.socket?.readyState,
          url: this.socket?.url,
          protocol: this.socket?.protocol,
          bufferedAmount: this.socket?.bufferedAmount
        });
        
        this.isConnecting = false;
        this.hasNotifiedConnected = false;
        
        // Check if we've had too many consecutive errors
        if (this.reconnectAttempts >= this.maxReconnectAttempts - 1) {
          toast.error('Connection to the message service is failing. The service may be temporarily unavailable.');
        }
        
        this.notifyConnectionStatus(false);
      };

      this.socket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        this.isConnecting = false;
        this.hasNotifiedConnected = false;
        this.notifyConnectionStatus(false);
        
        // Clear ping interval and timeout
        this.clearPingInterval();

        // Don't attempt to reconnect if manually closed
        if (!this.isManualClose) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.hasNotifiedConnected = false;
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

    // Clear ping interval and timeout
    this.clearPingInterval();

    if (this.socket) {
      try {
        // Only attempt to close if the socket is in a state that can be closed
        if (this.socket.readyState === WebSocket.OPEN || 
            this.socket.readyState === WebSocket.CONNECTING) {
          console.log(`Closing WebSocket in state: ${this.socket.readyState}`);
          this.socket.close();
        } else {
          console.log(`Not closing WebSocket - already in state: ${this.socket.readyState}`);
        }
      } catch (e) {
        console.error('Error closing socket:', e);
      }
      this.socket = null;
    }
    
    this.hasNotifiedConnected = false;
    this.notifyConnectionStatus(false);
  }

  // Subscribe to message events
  public subscribeToMessages(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  // Subscribe to connection status events
  public subscribeToConnectionStatus(handler: ConnectionStatusHandler): () => void {
    this.connectionStatusHandlers.push(handler);
    
    // Immediately notify the new handler of the current connection status
    if (this.socket?.readyState === WebSocket.OPEN) {
      handler(true);
    } else {
      handler(false);
    }
    
    return () => {
      this.connectionStatusHandlers = this.connectionStatusHandlers.filter(h => h !== handler);
    };
  }

  // Notify all message handlers
  private notifyMessageHandlers(message: Message): void {
    this.messageHandlers.forEach(handler => handler(message));
  }

  // Notify all connection status handlers
  private notifyConnectionStatus(isConnected: boolean): void {
    this.connectionStatusHandlers.forEach(handler => handler(isConnected));
  }
  
  // Update connection status without triggering reconnection logic
  private updateConnectionStatus(isConnected: boolean): void {
    this.connectionStatusHandlers.forEach(handler => handler(isConnected));
  }

  // Attempt to reconnect with exponential backoff
  private attemptReconnect(): void {
    if (this.isManualClose) {
      console.log('Manual close, not attempting to reconnect');
      return;
    }
    
    // Increment connection failures
    this.connectionFailures++;
    
    // If we've had too many consecutive failures, increase the minimum connection interval
    if (this.connectionFailures > this.maxConsecutiveFailures) {
      this.minConnectionInterval = Math.min(30000, this.minConnectionInterval * 1.5);
      console.log(`Increasing minimum connection interval to ${this.minConnectionInterval}ms due to consecutive failures`);
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached`);
      
      // Automatically disable WebSocket after too many failures
      this.disable();
      
      toast.error('Unable to connect to message service. Real-time updates have been disabled. You can re-enable them manually or refresh the page to try again.');
      return;
    }

    this.reconnectAttempts++;
    
    // More aggressive exponential backoff with jitter to prevent thundering herd
    const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% random jitter
    const delay = Math.min(60000, baseDelay + jitter); // Cap at 60 seconds
    
    console.log(`Attempting to reconnect in ${Math.round(delay / 1000)} seconds (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    // Clear any existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = window.setTimeout(() => {
      console.log(`Executing reconnection attempt ${this.reconnectAttempts}`);
      this.connect();
    }, delay);
  }

  // Check if WebSocket is connected
  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  // Send a message to the WebSocket server
  public sendMessage(message: any): boolean {
    if (!this.isConnected()) {
      console.error('Cannot send message: WebSocket is not connected');
      return false;
    }

    try {
      this.socket!.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  // Start ping interval to keep connection alive
  private startPingInterval(): void {
    // Clear any existing intervals/timeouts
    this.clearPingInterval();
    
    // Record the current time as the last pong time
    this.lastPongTime = Date.now();
    
    // Set up ping interval
    this.pingInterval = window.setInterval(() => {
      this.sendPing();
    }, this.pingIntervalTime);
  }
  
  // Clear ping interval and timeout
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
  
  // Send a ping message
  private sendPing(): void {
    if (!this.isConnected()) {
      this.clearPingInterval();
      return;
    }
    
    console.log('Sending ping to WebSocket server');
    
    try {
      this.socket!.send(JSON.stringify({ action: 'ping', timestamp: Date.now() }));
      
      // Set timeout for pong response
      if (this.pingTimeout) {
        clearTimeout(this.pingTimeout);
      }
      
      this.pingTimeout = window.setTimeout(() => {
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        
        // If we haven't received a pong in twice the ping interval, consider the connection dead
        if (timeSinceLastPong > this.pingIntervalTime * 2) {
          console.error('No pong response received, connection may be dead');
          
          // Close the socket to trigger reconnection
          if (this.socket) {
            this.socket.close();
          }
        }
      }, this.pingTimeoutTime);
    } catch (error) {
      console.error('Error sending ping:', error);
    }
  }
  
  // Handle pong response
  private handlePong(): void {
    console.log('Received pong from WebSocket server');
    this.lastPongTime = Date.now();
    
    // Clear the ping timeout
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

export default websocketService;
