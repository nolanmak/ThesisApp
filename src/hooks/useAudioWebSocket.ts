import { useState, useEffect, useCallback, useRef } from 'react';
import audioWebsocketService, { AudioNotification } from '../services/audioWebsocket';

interface UseAudioWebSocketOptions {
  autoConnect?: boolean;
  onAudioNotification?: (notification: AudioNotification) => void;
  onConnectionChange?: (connected: boolean) => void;
  persistConnection?: boolean;
}

interface UseAudioWebSocketResult {
  connected: boolean;
  reconnecting: boolean;
  enabled: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: Record<string, unknown>) => boolean;
  enable: () => void;
  disable: () => void;
  lastNotification: AudioNotification | null;
}

// Track if any component is currently using the Audio WebSocket
let activeAudioWebSocketUsers = 0;

/**
 * Custom hook for using Audio WebSocket connections
 */
export const useAudioWebSocket = (options: UseAudioWebSocketOptions = {}): UseAudioWebSocketResult => {
  const { 
    autoConnect = true,
    onAudioNotification,
    onConnectionChange,
    persistConnection = false
  } = options;
  
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [enabled, setEnabled] = useState(audioWebsocketService.isWebSocketEnabled());
  const [lastNotification, setLastNotification] = useState<AudioNotification | null>(null);
  
  // Use refs to track component mount state
  const isMounted = useRef(true);
  const disconnectTimeoutRef = useRef<number | null>(null);

  // Increment active users on mount
  useEffect(() => {
    activeAudioWebSocketUsers++;
    
    return () => {
      // Decrement active users on unmount
      activeAudioWebSocketUsers--;
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

  // Handle audio notifications
  const handleAudioNotification = useCallback((notification: AudioNotification) => {
    if (!isMounted.current) {
      return;
    }
    
    setLastNotification(notification);
    
    if (onAudioNotification) {
      try {
        onAudioNotification(notification);
      } catch (error) {
        console.error("[AUDIO HOOK] Callback error:", error);
      }
    }
  }, [onAudioNotification]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (enabled) {
      // Clear any pending disconnect timeout
      if (disconnectTimeoutRef.current !== null) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
      
      audioWebsocketService.connect();
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
    if (activeAudioWebSocketUsers <= 1 && !persistConnection) {
      audioWebsocketService.disconnect();
    }
  }, [persistConnection]);

  // Enable WebSocket functionality
  const enable = useCallback(() => {
    // Update local state first to prevent race conditions
    setEnabled(true);
    audioWebsocketService.enable();
  }, []);

  // Disable WebSocket functionality
  const disable = useCallback(() => {
    // Update local state first to prevent race conditions
    setEnabled(false);
    setConnected(false);
    setReconnecting(false);
    audioWebsocketService.disable();
  }, []);

  // Send a message to the WebSocket server
  const sendMessage = useCallback((message: Record<string, unknown>): boolean => {
    return audioWebsocketService.sendMessage(message);
  }, []);

  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Auto-connect if enabled
    if (autoConnect && enabled) {
      connect();
    }

    // Subscribe to connection status changes
    const connectionUnsubscribe = audioWebsocketService.subscribeToConnectionStatus(handleConnectionChange);
    
    // Subscribe to audio notifications if handler is provided
    let notificationUnsubscribe = () => {};
    if (onAudioNotification) {
      notificationUnsubscribe = audioWebsocketService.subscribeToAudioNotifications(handleAudioNotification);
    }

    // Cleanup on unmount
    return () => {
      // Mark component as unmounted
      isMounted.current = false;
      
      // First unsubscribe from all events
      connectionUnsubscribe();
      notificationUnsubscribe();
      
      // Only disconnect if autoConnect was enabled (we're managing the connection)
      // and we're not persisting the connection
      if (autoConnect) {
        // Use a longer timeout (2 seconds) before disconnecting
        // This allows time for component remounts without triggering rapid reconnects
        disconnectTimeoutRef.current = window.setTimeout(() => {
          // Double-check that we're still the last user before disconnecting
          if (activeAudioWebSocketUsers <= 0 && !persistConnection) {
            disconnect();
          }
          disconnectTimeoutRef.current = null;
        }, 2000);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, enabled, persistConnection]); // Removed callbacks from deps to prevent re-mounting

  return {
    connected,
    reconnecting,
    enabled,
    connect,
    disconnect,
    sendMessage,
    enable,
    disable,
    lastNotification
  };
};

export default useAudioWebSocket;
