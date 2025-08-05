import React, { createContext, useMemo, useState, useCallback } from 'react';
import useMessagesData from '../components/Earnings/hooks/useMessagesData';
import useEarningsData from '../components/Calendar/hooks/useEarningsData';
import { Message, EarningsItem } from '../types';
import { CompanyNameData } from '../services/api';

// Define the context shape
interface GlobalDataContextType {
  // Messages data
  messages: Message[]; // Will now contain enriched messages
  messagesLoading: boolean;
  messagesRefreshing: boolean;
  webSocketConnected: boolean;
  webSocketReconnecting: boolean;
  webSocketEnabled: boolean;
  refreshMessages: (bypassCache?: boolean) => Promise<void>;
  toggleWebSocket: () => void;
  updateMessagesSearchTicker: (searchTerm: string) => void;
  convertToEasternTime: (utcTimestamp: string) => string;
  
  // Earnings data
  earningsItems: EarningsItem[];
  filteredEarningsItems: EarningsItem[];
  earningsLoading: boolean;
  refreshEarningsItems: (bypassCache?: boolean) => Promise<void>;
  handleToggleActive: (item: EarningsItem) => Promise<void>;
  handleToggleWireActive: (item: EarningsItem) => Promise<void>;
  handleToggleIRActive: (item: EarningsItem) => Promise<void>;
  addEarningsItem: (data: EarningsItem) => Promise<boolean>;
  updateEarningsFilters: (
    searchTicker?: string,
    filterActive?: boolean | null,
    selectedDate?: string,
    releaseTime?: string | null
  ) => void;
  
  // Company names data
  companyNames: Record<string, CompanyNameData>;
  fetchCompanyNamesForDate: (date: string) => Promise<void>;
  companyNamesLoading: boolean;
}

// Create the context with default values
export const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

// Provider component
export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with empty search terms - we'll update these via the exposed methods
  const searchMessageTicker = '';
  const searchTicker = '';
  const filterActive = null;
  const releaseTime = null;
  
  // Company names state
  const [companyNames] = useState<Record<string, CompanyNameData>>({});
  const [companyNamesLoading, setCompanyNamesLoading] = useState(false);
  
  // Initialize data hooks with persistent connection
  const {
    messages: rawMessages, // Rename original messages
    loading: messagesLoading,
    refreshing: messagesRefreshing,
    connected: webSocketConnected,
    reconnecting: webSocketReconnecting,
    enabled: webSocketEnabled,
    fetchMessages: fetchMessagesFromHook,
    toggleEnabled: toggleWebSocket,
    updateSearchTicker: updateMessagesSearchTicker,
    convertToEasternTime,
  } = useMessagesData(searchMessageTicker);

  const {
    earningsItems,
    filteredEarningsItems,
    loading: earningsLoading,
    fetchEarningsItems: fetchEarningsItemsFromHook,
    handleToggleActive,
    handleToggleWireActive,
    handleToggleIRActive,
    addEarningsItem,
    updateFilters: updateEarningsFilters
  } = useEarningsData(searchTicker, filterActive, releaseTime);

  // Create a map from ticker to company name from earningsItems
  const tickerToNameMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    earningsItems.forEach(item => {
      if (item.ticker && item.company_name) {
        map[item.ticker] = item.company_name;
      }
    });
    return map;
  }, [earningsItems]);

  // Function to fetch company names for all tickers on a specific date
  const fetchCompanyNamesForDate = useCallback(async () => {
    // TEMPORARILY DISABLED - API calls failing with CORS errors
    /*
    try {
      setCompanyNamesLoading(true);
      
      // Get all tickers for the selected date
      const tickersForDate = earningsItems
        .filter(item => item.date === date)
        .map(item => item.ticker);
      
      
      if (tickersForDate.length === 0) {
        return;
      }
      
      // Filter out tickers we already have data for
      const tickersToFetch = tickersForDate.filter(ticker => !companyNames[ticker]);
      
      
      if (tickersToFetch.length === 0) {
        return;
      }
      
      
      // Fetch company names for all tickers
      const companyNamesData = await getBatchCompanyNames(tickersToFetch);
      
      
      // Update state with new company names
      setCompanyNames(prev => {
        const updated = { ...prev };
        companyNamesData.forEach(data => {
          updated[data.ticker] = data;
        });
        return updated;
      });
      
    } catch (error) {
      console.error('❌ Error fetching company names for date:', error);
    } finally {
      setCompanyNamesLoading(false);
    }
    */
    
    // Just set loading to false since we're not making the call
    setCompanyNamesLoading(false);
  }, []);

  // Enrich messages with company names
  const messages = useMemo(() => {
    const enriched = rawMessages.map(message => ({
      ...message,
      company_name: tickerToNameMap[message.ticker] || undefined
    }));
    return enriched;
  }, [rawMessages, tickerToNameMap]);

  // Provide the context value
  const contextValue: GlobalDataContextType = {
    // Messages data
    messages, // Provide the enriched messages
    messagesLoading,
    messagesRefreshing,
    webSocketConnected,
    webSocketReconnecting,
    webSocketEnabled,
    refreshMessages: async (bypassCache?: boolean) => {
      // Call the fetchMessages function from the hook
      fetchMessagesFromHook(bypassCache);
      return Promise.resolve();
    },
    toggleWebSocket,
    updateMessagesSearchTicker,
    convertToEasternTime,
    
    // Earnings data
    earningsItems,
    filteredEarningsItems,
    earningsLoading,
    refreshEarningsItems: async (bypassCache?: boolean) => {
      fetchEarningsItemsFromHook(bypassCache);
      return Promise.resolve();
    },
    handleToggleActive,
    handleToggleWireActive,
    handleToggleIRActive,
    addEarningsItem,
    updateEarningsFilters: (searchTicker?: string, filterActive?: boolean | null, selectedDate?: string, releaseTime?: string | null) => {
      updateEarningsFilters(searchTicker, filterActive, selectedDate, releaseTime);
    },
    
    // Company names data
    companyNames,
    fetchCompanyNamesForDate,
    companyNamesLoading
  };

  return (
    <GlobalDataContext.Provider value={contextValue}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export default GlobalDataProvider;
