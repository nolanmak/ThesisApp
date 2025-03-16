import { useState, useEffect, useCallback } from 'react';
import { getMessages } from '../../../services/api';
import { Message } from '../../../types';
import { toast } from 'react-toastify';
import { useWebSocket } from '../../../hooks/useWebSocket';

interface MessagesDataState {
  messages: Message[];
  expandedMessages: Record<string, boolean>;
  loading: boolean;
  refreshing: boolean;
  searchTicker: string;
}

const useMessagesData = (initialSearchTicker: string = '') => {
  const [state, setState] = useState<MessagesDataState>({
    messages: [],
    expandedMessages: {},
    loading: true,
    refreshing: false,
    searchTicker: initialSearchTicker
  });

  // Function to convert UTC to Eastern Time (EST/EDT) with automatic daylight savings time handling
  const convertToEasternTime = useCallback((utcTimestamp: string): string => {
    // Create a date object from the UTC timestamp
    const date = new Date(utcTimestamp);
    
    // Format the date to Eastern Time (automatically handles EST/EDT transitions)
    // The America/New_York timezone will automatically adjust for daylight savings time
    return date.toLocaleString('en-US', {
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

  // Function to create a preview of the message content
  const createMessagePreview = useCallback((content: string, maxLength: number = 150): string => {
    if (!content) return '';
    
    // Remove any markdown symbols that might make the preview look odd
    const cleanContent = content.replace(/[#*_~`]/g, '');
    
    if (cleanContent.length <= maxLength) return cleanContent;
    
    // Find the last space before maxLength to avoid cutting words
    const lastSpaceIndex = cleanContent.substring(0, maxLength).lastIndexOf(' ');
    const cutoffIndex = lastSpaceIndex > 0 ? lastSpaceIndex : maxLength;
    
    return cleanContent.substring(0, cutoffIndex) + '...';
  }, []);

  // Handle new WebSocket messages
  const handleNewMessage = useCallback((newMessage: Message) => {
    console.log('New message received via WebSocket:', newMessage);
    
    setState(prev => {
      // Check if the message already exists by ID
      const exists = prev.messages.some(msg => msg.message_id === newMessage.message_id);
      if (exists) {
        console.log('Message already exists, not adding duplicate');
        return prev;
      }
      
      // Add the new message and sort by timestamp (newest first)
      const updatedMessages = [...prev.messages, newMessage]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Initialize as not expanded
      const updatedExpandedMessages = {
        ...prev.expandedMessages,
        [newMessage.message_id]: prev.expandedMessages[newMessage.message_id] || false
      };
      
      // Show a toast notification for the new message
      toast.info(`New message received for ${newMessage.ticker}`);
      
      return {
        ...prev,
        messages: updatedMessages,
        expandedMessages: updatedExpandedMessages
      };
    });
  }, []);

  // Handle WebSocket connection changes
  const handleConnectionChange = useCallback((connected: boolean) => {
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
      if (!state.messages.length) {
        // Only show full page loading on initial load
        setState(prev => ({ ...prev, loading: true }));
      } else if (bypassCache) {
        // Show refreshing indicator for subsequent loads
        setState(prev => ({ ...prev, refreshing: true }));
      }
      
      const fetchedMessages = await getMessages(bypassCache);
      
      // Sort messages by timestamp (newest first)
      const sortedMessages = fetchedMessages.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setState(prev => {
        // Set all messages to be collapsed by default
        const expandedState: Record<string, boolean> = {};
        sortedMessages.forEach(message => {
          // Preserve expanded state for existing messages
          if (prev.messages.some(m => m.message_id === message.message_id)) {
            expandedState[message.message_id] = prev.expandedMessages[message.message_id] || false;
          } else {
            expandedState[message.message_id] = false;
          }
        });

        return {
          ...prev,
          messages: sortedMessages,
          expandedMessages: expandedState,
          loading: false,
          refreshing: false
        };
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch messages');
      setState(prev => ({ ...prev, loading: false, refreshing: false }));
    }
  }, [state.messages.length]);

  // Toggle expanded state of a message
  const toggleExpand = useCallback((messageId: string) => {
    setState(prev => ({
      ...prev,
      expandedMessages: {
        ...prev.expandedMessages,
        [messageId]: !prev.expandedMessages[messageId]
      }
    }));
  }, []);

  // Update search term for messages
  const updateSearchTicker = useCallback((searchTerm: string) => {
    setState(prev => ({ ...prev, searchTicker: searchTerm }));
  }, []);

  // Handle manual refresh with toast notification
  const handleRefreshWithToast = useCallback(() => {
    fetchMessages(true); // Bypass cache to get fresh data
    toast.info('Feed refreshed');
  }, [fetchMessages]);

  // Apply filters when search ticker changes
  useEffect(() => {
    if (state.searchTicker !== '') {
      const filteredMessages = state.messages.filter(message => 
        message.ticker.toLowerCase().includes(state.searchTicker.toLowerCase())
      );
      
      setState(prev => ({ ...prev, messages: filteredMessages }));
    } else {
      // If search is cleared, fetch all messages again
      fetchMessages();
    }
  }, [state.searchTicker, fetchMessages]);

  // Fetch messages on initial load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages: state.messages || [],
    expandedMessages: state.expandedMessages,
    loading: state.loading,
    refreshing: state.refreshing,
    searchTicker: state.searchTicker,
    connected,
    reconnecting,
    enabled,
    enableWebSocket,
    disableWebSocket,
    convertToEasternTime,
    createMessagePreview,
    fetchMessages,
    toggleExpand,
    updateSearchTicker,
    handleRefreshWithToast,
    isExpanded: (messageId: string): boolean => Boolean(state.expandedMessages[messageId]),
    toggleEnabled
  };
};

export default useMessagesData;
