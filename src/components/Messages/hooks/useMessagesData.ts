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
      
      // Add the new message to original messages as well
      if (originalMessagesRef.current.length > 0) {
        // Check if it exists in original messages
        const existsInOriginal = originalMessagesRef.current.some((msg: Message) => msg.message_id === newMessage.message_id);
        if (!existsInOriginal) {
          originalMessagesRef.current = [...originalMessagesRef.current, newMessage]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      }
      
      // If we're filtering, only add the message if it matches the filter
      if (prev.searchTicker !== '' && !newMessage.ticker.toLowerCase().includes(prev.searchTicker.toLowerCase())) {
        // Don't add to filtered view, but still show notification
        toast.info(`New message received for ${newMessage.ticker}`);
        return prev;
      }
      
      // Add the new message and sort by timestamp (newest first)
      const updatedMessages = [...prev.messages, newMessage]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Show a toast notification for the new message
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
      
      console.log('Raw messages from API:', fetchedMessages.map(msg => ({
        ticker: msg.ticker,
        timestamp: msg.timestamp,
        formatted_time: convertToEasternTime(msg.timestamp),
        has_link: !!msg.link,
        message_id: msg.message_id
      })));
      
      // Check specifically for April 2025 messages in raw data
      const april2025Messages = fetchedMessages.filter(msg => {
        const date = new Date(msg.timestamp);
        return date.getFullYear() === 2025 && date.getMonth() === 3; // April is month 3 (0-indexed)
      });
      
      console.log('April 2025 Messages in raw data:', april2025Messages.map(msg => ({
        ticker: msg.ticker,
        timestamp: msg.timestamp,
        formatted_time: convertToEasternTime(msg.timestamp),
        has_link: !!msg.link,
        message_id: msg.message_id
      })));
      
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
  const handleRefreshWithToast = useCallback(() => {
    fetchMessages(true); // Bypass cache to get fresh data
    toast.info('Feed refreshed');
  }, [fetchMessages, convertToEasternTime]);

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
        message.ticker.toLowerCase().includes(searchTerm.toLowerCase())
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
    createMessagePreview,
    fetchMessages: handleRefreshWithToast,
    updateSearchTicker,
    toggleEnabled
  };
};

export default useMessagesData;
