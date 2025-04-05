import { useState, useEffect, useCallback } from 'react';
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



  // Update search term for messages
  const updateSearchTicker = useCallback((searchTerm: string) => {
    setState(prev => ({ ...prev, searchTicker: searchTerm }));
  }, []);

  // Handle manual refresh with toast notification
  const handleRefreshWithToast = useCallback(() => {
    fetchMessages(true); // Bypass cache to get fresh data
    toast.info('Feed refreshed');
  }, [fetchMessages]);

  // Track original unfiltered messages
  const [originalMessages, setOriginalMessages] = useState<Message[]>([]);

  // Store original messages when fetched
  useEffect(() => {
    if (state.messages.length > 0 && state.searchTicker === '') {
      setOriginalMessages(state.messages);
    }
  }, [state.messages, state.searchTicker]);

  // Apply filters when search ticker changes
  useEffect(() => {
    if (state.searchTicker !== '') {
      // Filter from original messages to avoid filtering already filtered results
      const filteredMessages = originalMessages.filter(message => 
        message.ticker.toLowerCase().includes(state.searchTicker.toLowerCase())
      );
      
      setState(prev => ({ ...prev, messages: filteredMessages }));
    } else if (originalMessages.length > 0) {
      // If search is cleared, restore original messages
      setState(prev => ({ ...prev, messages: originalMessages }));
    }
  }, [state.searchTicker, originalMessages]);

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
