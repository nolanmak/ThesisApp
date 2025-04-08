import React, { createContext, useEffect } from 'react';
import useMessagesData from '../components/Earnings/hooks/useMessagesData';
import useEarningsData from '../components/Calendar/hooks/useEarningsData';
import { Message, EarningsItem } from '../types';

// Define the context shape
interface GlobalDataContextType {
  // Messages data
  messages: Message[];
  messagesLoading: boolean;
  messagesRefreshing: boolean;
  webSocketConnected: boolean;
  webSocketReconnecting: boolean;
  webSocketEnabled: boolean;
  refreshMessages: (bypassCache?: boolean) => Promise<void>;
  toggleWebSocket: () => void;
  updateMessagesSearchTicker: (searchTerm: string) => void;
  convertToEasternTime: (utcTimestamp: string) => string;
  createMessagePreview: (message: Message) => string;
  
  // Earnings data
  earningsItems: EarningsItem[];
  filteredEarningsItems: EarningsItem[];
  earningsLoading: boolean;
  refreshEarningsItems: () => Promise<void>;
  handleToggleActive: (item: EarningsItem) => Promise<void>;
  addEarningsItem: (data: EarningsItem) => Promise<boolean>;
  updateEarningsFilters: (
    searchTicker?: string,
    filterActive?: boolean | null,
    selectedDate?: string
  ) => void;
}

// Create the context with default values
export const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

// Provider component
export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with empty search terms - we'll update these via the exposed methods
  const searchMessageTicker = '';
  const searchTicker = '';
  const filterActive = null;
  
  // Initialize data hooks with persistent connection
  const {
    messages,
    loading: messagesLoading,
    refreshing: messagesRefreshing,
    connected: webSocketConnected,
    reconnecting: webSocketReconnecting,
    enabled: webSocketEnabled,
    fetchMessages: refreshMessages,
    toggleEnabled: toggleWebSocket,
    updateSearchTicker: updateMessagesSearchTicker,
    convertToEasternTime,
    createMessagePreview: originalCreateMessagePreview
  } = useMessagesData(searchMessageTicker);

  const {
    earningsItems,
    filteredEarningsItems,
    loading: earningsLoading,
    fetchEarningsItems: refreshEarningsItems,
    handleToggleActive,
    addEarningsItem,
    updateFilters: updateEarningsFilters
  } = useEarningsData(searchTicker, filterActive);

  // Wrapper for createMessagePreview to match expected interface
  const createMessagePreview = (message: Message): string => {
    if (message.discord_message) {
      return originalCreateMessagePreview(message.discord_message);
    }
    return '';
  };

  // Log when data is loaded
  useEffect(() => {
    if (!messagesLoading && messages.length > 0) {
      console.log('Messages data proactively loaded:', messages.length, 'messages');
    }
  }, [messagesLoading, messages]);

  useEffect(() => {
    if (!earningsLoading && earningsItems.length > 0) {
      console.log('Earnings data proactively loaded:', earningsItems.length, 'items');
    }
  }, [earningsLoading, earningsItems]);

  // Provide the context value
  const contextValue: GlobalDataContextType = {
    // Messages data
    messages,
    messagesLoading,
    messagesRefreshing,
    webSocketConnected,
    webSocketReconnecting,
    webSocketEnabled,
    refreshMessages: async (bypassCache?: boolean) => {
      refreshMessages(bypassCache === undefined ? true : bypassCache);
      return Promise.resolve();
    },
    toggleWebSocket,
    updateMessagesSearchTicker,
    convertToEasternTime,
    createMessagePreview,
    
    // Earnings data
    earningsItems,
    filteredEarningsItems,
    earningsLoading,
    refreshEarningsItems: async () => {
      refreshEarningsItems();
      return Promise.resolve();
    },
    handleToggleActive,
    addEarningsItem,
    updateEarningsFilters
  };

  return (
    <GlobalDataContext.Provider value={contextValue}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export default GlobalDataProvider;
