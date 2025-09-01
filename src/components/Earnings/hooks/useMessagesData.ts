import { useState, useEffect, useCallback, useRef } from 'react';
import { getMessages, PaginatedMessageResponse } from '../../../services/api';
import { Message } from '../../../types';
import { toast } from 'react-toastify';
import { useWebSocket } from '../../../hooks/useWebSocket';

interface MessagesDataState {
  messages: Message[];
  loading: boolean;
  refreshing: boolean;
  searchTicker: string;
  hasMoreMessages: boolean;
  nextKey?: string;
  loadingMore: boolean;
}

const useMessagesData = (initialSearchTicker: string = '') => {
  const [state, setState] = useState<MessagesDataState>({
    messages: [],
    loading: true,
    refreshing: false,
    searchTicker: initialSearchTicker,
    hasMoreMessages: false,
    nextKey: undefined,
    loadingMore: false
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
  const fetchMessages = useCallback(async (bypassCache: boolean = false, resetMessages: boolean = true) => {
    try {
      // Set appropriate loading state
      setState(prev => ({
        ...prev,
        loading: resetMessages && !prev.messages.length, // Only show full page loading on initial load
        refreshing: bypassCache && prev.messages.length > 0 && resetMessages // Show refreshing indicator for subsequent loads
      }));
      
      const response: PaginatedMessageResponse = await getMessages(bypassCache);
      const { messages: fetchedMessages, next_key } = response;
      
      // Sort messages by timestamp (newest first)
      const sortedMessages = fetchedMessages.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setState(prev => ({
        ...prev,
        messages: resetMessages ? sortedMessages : [...prev.messages, ...sortedMessages],
        loading: false,
        refreshing: false,
        hasMoreMessages: !!next_key,
        nextKey: next_key
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch messages');
      setState(prev => ({ ...prev, loading: false, refreshing: false }));
    }
  }, []);

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!state.hasMoreMessages || state.loadingMore || !state.nextKey) {
      return;
    }

    try {
      setState(prev => ({ ...prev, loadingMore: true }));
      
      const response: PaginatedMessageResponse = await getMessages(true, 50, state.nextKey);
      const { messages: fetchedMessages, next_key } = response;
      
      // Sort messages by timestamp (newest first)
      const sortedMessages = fetchedMessages.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, ...sortedMessages],
        loadingMore: false,
        hasMoreMessages: !!next_key,
        nextKey: next_key
      }));
      
      // Update original messages ref
      if (originalMessagesRef.current.length > 0) {
        const originalIds = new Set(originalMessagesRef.current.map(msg => msg.message_id));
        const newOriginalMessages = sortedMessages.filter(msg => !originalIds.has(msg.message_id));
        if (newOriginalMessages.length > 0) {
          originalMessagesRef.current = [...originalMessagesRef.current, ...newOriginalMessages]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      toast.error('Failed to load more messages');
      setState(prev => ({ ...prev, loadingMore: false }));
    }
  }, [state.hasMoreMessages, state.loadingMore, state.nextKey]);

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

  // Set up continuous polling for new messages
  useEffect(() => {
    const POLLING_INTERVAL = 3000; // 3 seconds
    let pollingInterval: number;
    
    const startPolling = () => {
      pollingInterval = window.setInterval(async () => {
        // Only poll if we're not currently loading/refreshing and have messages already
        if (!state.loading && !state.refreshing && state.messages.length > 0) {
          try {
            // Fetch new messages silently (no toast notification)
            const response: PaginatedMessageResponse = await getMessages(true); // bypass cache
            const { messages: fetchedMessages } = response;
            
            // Sort messages by timestamp (newest first)
            const sortedMessages = fetchedMessages.sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            
            setState(prev => {
              // Check if we have any new messages by comparing message IDs
              const currentIds = new Set(prev.messages.map(msg => msg.message_id));
              const newMessages = sortedMessages.filter(msg => !currentIds.has(msg.message_id));
              
              if (newMessages.length > 0) {
                console.log(`Found ${newMessages.length} new messages via polling`);
                // Update original messages ref if we have new messages
                if (originalMessagesRef.current.length > 0) {
                  const originalIds = new Set(originalMessagesRef.current.map(msg => msg.message_id));
                  const newOriginalMessages = sortedMessages.filter(msg => !originalIds.has(msg.message_id));
                  if (newOriginalMessages.length > 0) {
                    originalMessagesRef.current = [...originalMessagesRef.current, ...newOriginalMessages]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                  }
                }
                
                // Apply search filter to new messages if needed
                let filteredMessages = sortedMessages;
                if (prev.searchTicker !== '') {
                  filteredMessages = sortedMessages.filter((message: Message) => 
                    message.ticker && message.ticker.toLowerCase().includes(prev.searchTicker.toLowerCase())
                  );
                }
                
                return {
                  ...prev,
                  messages: filteredMessages
                };
              }
              
              return prev;
            });
          } catch (error) {
            console.error('Error during polling:', error);
            // Don't show error toast for polling failures to avoid spam
          }
        }
      }, POLLING_INTERVAL);
    };

    // Start polling after initial load
    if (!state.loading && state.messages.length > 0) {
      startPolling();
    }

    // Cleanup interval on unmount or dependency change
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [state.loading, state.refreshing, state.messages.length, state.searchTicker]);

  return {
    messages: state.messages || [],
    loading: state.loading,
    refreshing: state.refreshing,
    searchTicker: state.searchTicker,
    hasMoreMessages: state.hasMoreMessages,
    loadingMore: state.loadingMore,
    connected,
    reconnecting,
    enabled,
    enableWebSocket,
    disableWebSocket,
    convertToEasternTime,
    fetchMessages: handleRefreshWithToast,
    loadMoreMessages,
    updateSearchTicker,
    toggleEnabled
  };
};

export default useMessagesData;
