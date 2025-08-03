import { useState, useEffect, useCallback, useRef } from 'react';
import { getMessages } from '../../../services/api';
import { Message } from '../../../types';
import { toast } from 'react-toastify';
import { useWebSocket } from '../../../hooks/useWebSocket';

interface MessagesDataState {
  messages: Message[];
  loading: boolean;
  refreshing: boolean;
  searchTicker: string;
}

const useMessagesData = (initialSearchTicker: string = '') => {
  const [state, setState] = useState<MessagesDataState>({
    messages: [],
    loading: true,
    refreshing: false,
    searchTicker: initialSearchTicker
  });

  const convertToEasternTime = useCallback((utcTimestamp: string): string => {
    return new Date(utcTimestamp).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }, []);

  // Handle new WebSocket messages
  const handleNewMessage = useCallback((newMessage: Message) => {
    console.log('New message received via WebSocket:', newMessage);
    
    setState(prev => {
      const exists = prev.messages.some(msg => msg.message_id === newMessage.message_id);
      if (exists) {
        console.log('Message already exists, not adding duplicate');
        return prev;
      }
      
      if (originalMessagesRef.current.length > 0) {
        const existsInOriginal = originalMessagesRef.current.some((msg: Message) => msg.message_id === newMessage.message_id);
        if (!existsInOriginal) {
          originalMessagesRef.current = [...originalMessagesRef.current, newMessage]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      }
      
      if (prev.searchTicker !== '' && newMessage.ticker && !newMessage.ticker.toLowerCase().includes(prev.searchTicker.toLowerCase())) {
        toast.info(`New message received for ${newMessage.ticker}`);
        return prev;
      }
      
      const updatedMessages = [...prev.messages, newMessage]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      toast.info(`New message received for ${newMessage.ticker}`);
      
      return {
        ...prev,
        messages: updatedMessages
      };
    });
  }, []);

  // Handle WebSocket connection changes
  const handleConnectionChange = useCallback(() => {
    // Optional callback for connection status changes
  }, []);

  // Use the WebSocket hook
  const { 
    connected, 
    reconnecting, 
    enabled,
    enable: enableWebSocket,
    disable: disableWebSocket
  } = useWebSocket({
    onMessage: handleNewMessage,
    onConnectionChange: handleConnectionChange,
    persistConnection: true // Keep connection alive when component unmounts
  });

  // Toggle WebSocket connection
  const toggleEnabled = useCallback(() => {
    if (enabled) {
      disableWebSocket();
    } else {
      enableWebSocket();
    }
  }, [enabled, enableWebSocket, disableWebSocket]);

  // Fetch messages
  const fetchMessages = useCallback(async (bypassCache: boolean = false) => {
    try {
      // Set appropriate loading state
      setState(prev => ({
        ...prev,
        loading: !prev.messages.length, // Only show full page loading on initial load
        refreshing: bypassCache && prev.messages.length > 0 // Show refreshing indicator for subsequent loads
      }));
      
      const fetchedMessages = await getMessages(bypassCache);
      
      // Sort messages by timestamp (newest first)
      const sortedMessages = fetchedMessages.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setState(prev => ({
        ...prev,
        messages: sortedMessages,
        loading: false,
        refreshing: false
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch messages');
      setState(prev => ({ ...prev, loading: false, refreshing: false }));
    }
  }, []);



  // Store original messages when fetched
  useEffect(() => {
    if (state.messages.length > 0 && state.searchTicker === '' && originalMessagesRef.current.length === 0) {
      originalMessagesRef.current = [...state.messages];
    }
  }, [state.messages, state.searchTicker]);

  // Handle manual refresh with toast notification
  const handleRefreshWithToast = useCallback((bypassCache: boolean = true) => {
    fetchMessages(bypassCache); // Bypass cache to get fresh data
    toast.info('Feed refreshed');
  }, [fetchMessages]);

  // Track original unfiltered messages
  const originalMessagesRef = useRef<Message[]>([]);

  // Update search term for messages with better handling to prevent re-render loops
  const updateSearchTicker = useCallback((searchTerm: string) => {
    setState(prev => {
      // If this is the first time we're setting a search term, store the original messages
      if (originalMessagesRef.current.length === 0 && prev.messages.length > 0) {
        originalMessagesRef.current = [...prev.messages];
      }
      
      // If search term is empty, restore original messages
      if (searchTerm === '') {
        return {
          ...prev,
          searchTicker: '',
          messages: originalMessagesRef.current
        };
      }
      
      // Otherwise filter the original messages
      const filteredMessages = originalMessagesRef.current.filter((message: Message) => 
        message.ticker && message.ticker.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return {
        ...prev,
        searchTicker: searchTerm,
        messages: filteredMessages
      };
    });
  }, []);

  // Fetch messages on initial load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages: state.messages || [],
    loading: state.loading,
    refreshing: state.refreshing,
    searchTicker: state.searchTicker,
    connected,
    reconnecting,
    enabled,
    enableWebSocket,
    disableWebSocket,
    convertToEasternTime,
    fetchMessages: handleRefreshWithToast,
    updateSearchTicker,
    toggleEnabled
  };
};

export default useMessagesData;
