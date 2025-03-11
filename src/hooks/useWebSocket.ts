import { useState, useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocket';
import { Message } from '../types';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onMessage?: (message: Message) => void;
  onConnectionChange?: (connected: boolean) => void;
  persistConnection?: boolean; // New option to persist connection across unmounts
}

interface UseWebSocketResult {
  connected: boolean;
  reconnecting: boolean;
  enabled: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => boolean;
  enable: () => void;
  disable: () => void;
}

// Track if any component is currently using the WebSocket
// This helps prevent unnecessary disconnects when multiple components share the connection
let activeWebSocketUsers = 0;

/**
 * Custom hook for using WebSocket connections
 */
export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketResult => {
  const { 
    autoConnect = true,
    onMessage,
    onConnectionChange,
    persistConnection = false // Default to false for backward compatibility
  } = options;
  
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [enabled, setEnabled] = useState(websocketService.isWebSocketEnabled());
  
  // Use refs to track component mount state
  const isMounted = useRef(true);
  const disconnectTimeoutRef = useRef<number | null>(null);

  // Increment active users on mount
  useEffect(() => {
    activeWebSocketUsers++;
    
    return () => {
      // Decrement active users on unmount
      activeWebSocketUsers--;
    };
  }, []);

  // Handle connection status changes
  const handleConnectionChange = useCallback((isConnected: boolean) => {
    if (!isMounted.current) return;
    
    setConnected(isConnected);
    
    if (!isConnected && connected) {
      // Only set reconnecting if we were previously connected and now disconnected
      setReconnecting(true);
    } else if (isConnected) {
      setReconnecting(false);
    }
    
    if (onConnectionChange) {
      onConnectionChange(isConnected);
    }
  }, [onConnectionChange, connected]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (enabled) {
      // Clear any pending disconnect timeout
      if (disconnectTimeoutRef.current !== null) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
      
      websocketService.connect();
    }
  }, [enabled]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    // Clear any existing timeout
    if (disconnectTimeoutRef.current !== null) {
      clearTimeout(disconnectTimeoutRef.current);
      disconnectTimeoutRef.current = null;
    }
    
    // Only actually disconnect if this is the last component using the WebSocket
    // or if persistConnection is false
    if (activeWebSocketUsers <= 1 && !persistConnection) {
      websocketService.disconnect();
    }
  }, [persistConnection]);

  // Enable WebSocket functionality
  const enable = useCallback(() => {
    websocketService.enable();
    setEnabled(true);
  }, []);

  // Disable WebSocket functionality
  const disable = useCallback(() => {
    websocketService.disable();
    setEnabled(false);
    setConnected(false);
    setReconnecting(false);
  }, []);

  // Send a message to the WebSocket server
  const sendMessage = useCallback((message: any): boolean => {
    return websocketService.sendMessage(message);
  }, []);

  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Auto-connect if enabled
    if (autoConnect && enabled) {
      connect();
    }

    // Subscribe to connection status changes
    const connectionUnsubscribe = websocketService.subscribeToConnectionStatus(handleConnectionChange);
    
    // Subscribe to messages if onMessage handler is provided
    let messageUnsubscribe = () => {};
    if (onMessage) {
      messageUnsubscribe = websocketService.subscribeToMessages(onMessage);
    }

    // Cleanup on unmount
    return () => {
      // Mark component as unmounted
      isMounted.current = false;
      
      // First unsubscribe from all events
      connectionUnsubscribe();
      messageUnsubscribe();
      
      // Only disconnect if autoConnect was enabled (we're managing the connection)
      // and we're not persisting the connection
      if (autoConnect) {
        // Use a longer timeout (2 seconds) before disconnecting
        // This allows time for component remounts without triggering rapid reconnects
        disconnectTimeoutRef.current = window.setTimeout(() => {
          // Double-check that we're still the last user before disconnecting
          if (activeWebSocketUsers <= 0 && !persistConnection) {
            disconnect();
          }
          disconnectTimeoutRef.current = null;
        }, 2000);
      }
    };
  }, [autoConnect, connect, disconnect, handleConnectionChange, onMessage, enabled, persistConnection]);

  return {
    connected,
    reconnecting,
    enabled,
    connect,
    disconnect,
    sendMessage,
    enable,
    disable
  };
};

export default useWebSocket;
