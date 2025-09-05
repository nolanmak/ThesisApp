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

  // Handle new WebSocket messages with backend search context
  const handleNewMessage = useCallback((newMessage: Message) => {
    setState(prev => {
      const exists = prev.messages.some(msg => msg.message_id === newMessage.message_id);
      if (exists) {
        return prev;
      }
      
      // Check if new message matches current search filter
      if (prev.searchTicker !== '' && newMessage.ticker && 
          !newMessage.ticker.toLowerCase().includes(prev.searchTicker.toLowerCase())) {
        // Message doesn't match search filter, just notify but don't add to current view
        toast.info(`New message received for ${newMessage.ticker} (outside current search)`);
        return prev;
      }
      
      // Add message to current view if it matches search or no search is active
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

  // Fetch messages with optional search parameters
  const fetchMessages = useCallback(async (bypassCache: boolean = false, resetMessages: boolean = true, searchTerm?: string) => {
    try {
      // Set appropriate loading state
      setState(prev => ({
        ...prev,
        loading: resetMessages && !prev.messages.length, // Only show full page loading on initial load
        refreshing: bypassCache && prev.messages.length > 0 && resetMessages // Show refreshing indicator for subsequent loads
      }));
      
      // Use backend search if searchTerm is provided, otherwise get all messages
      const response: PaginatedMessageResponse = await getMessages(
        bypassCache, 
        50, // limit
        undefined, // lastKey
        searchTerm // hybrid search parameter (searches both ticker and company name)
      );
      const { messages: fetchedMessages, next_key } = response;
      
      // Log search results for debugging
      if (searchTerm) {
        console.log(`Search results for "${searchTerm}": ${fetchedMessages.length} messages, hasMore: ${!!next_key}`);
      }
      
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
      
      // Pass current search term to maintain search context during pagination
      const response: PaginatedMessageResponse = await getMessages(
        true, // bypassCache
        50, // limit
        state.nextKey, // lastKey
        state.searchTicker || undefined // searchTerm (hybrid search)
      );
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
      
      // Note: No need to track original messages since backend handles search filtering
    } catch (error) {
      console.error('Error loading more messages:', error);
      toast.error('Failed to load more messages');
      setState(prev => ({ ...prev, loadingMore: false }));
    }
  }, [state.hasMoreMessages, state.loadingMore, state.nextKey, state.searchTicker]);

  // Note: No longer need to store original messages since backend handles search

  // Handle manual refresh with toast notification
  const handleRefreshWithToast = useCallback((bypassCache: boolean = true) => {
    fetchMessages(bypassCache); // Bypass cache to get fresh data
    toast.info('Feed refreshed');
  }, [fetchMessages]);

  // Note: No longer need originalMessagesRef since we use backend search

  // Update search term for messages using backend search
  const updateSearchTicker = useCallback((searchTerm: string) => {
    setState(prev => ({
      ...prev,
      searchTicker: searchTerm,
      loading: true, // Show loading while searching
      // Reset pagination when search changes
      nextKey: undefined,
      hasMoreMessages: false
    }));

    // If search is being cleared, restore from cache if possible, otherwise fetch fresh
    if (!searchTerm || searchTerm.trim() === '') {
      // Clearing search - try to restore original cached state
      fetchMessages(false, true, undefined); // Don't bypass cache on clear
    } else {
      // Performing new search - bypass cache
      fetchMessages(true, true, searchTerm);
    }
  }, [fetchMessages]);

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
            // Respect current search context during polling
            const response: PaginatedMessageResponse = await getMessages(
              true, // bypass cache
              50, // limit
              undefined, // lastKey
              state.searchTicker || undefined // maintain hybrid search context
            );
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
                // For backend search, just replace the messages since backend handles filtering
                return {
                  ...prev,
                  messages: sortedMessages
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
