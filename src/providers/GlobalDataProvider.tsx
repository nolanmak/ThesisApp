import React, { createContext, useMemo, useState, useCallback, useEffect } from 'react';
import useMessagesData from '../components/Earnings/hooks/useMessagesData';
import useEarningsData from '../components/Calendar/hooks/useEarningsData';
import { Message, EarningsItem } from '../types';
import { CompanyNameData } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Stock metrics interface
export interface StockMetric {
  ticker: string;
  industry: string;
  pr2bookq: number | string;
  $salesqestnextq: number | string;
  sharesq: number | string;
  projpenextfy: number | string;
  $eps4: number | string;
  $eps3: number | string;
  $eps2: number | string;
  $eps1: number | string;
  $eps0: number | string;
  peexclxorttm: number | string;
  '#institution': number | string;
  nextfyepsmean: number | string;
  nextqepsmean: number | string;
  nextfyeps13wkago: number | string;
  curfyeps13wkago: number | string;
  projpecurfy: number | string;
  salesa: number | string;
  nextfysalesmean: number | string;
  pr2salesq: number | string;
  $salesqest: number | string;
  curfysalesmean: number | string;
  id: string;
  'gmgn%q': number | string;
  curfyepsmean: number | string;
  nextfysales13wkago: number | string;
  curqepsmean: number | string;
  // Additional fields for new column structure
  $qeps0?: number | string; // Current quarter EPS actual
  $qeps1?: number | string; // Previous quarter EPS actual
  $qeps2?: number | string; // 2 quarters ago EPS actual
  $qeps3?: number | string; // 3 quarters ago EPS actual
  $qeps4?: number | string; // 4 quarters ago EPS actual
  $salesa1?: number | string; // Previous quarter revenue actual
  $salesa2?: number | string; // 2 quarters ago revenue actual
  $salesa3?: number | string; // 3 quarters ago revenue actual
  $salesa4?: number | string; // 4 quarters ago revenue actual
  $salesa5?: number | string; // 5 quarters ago revenue actual
  // New enriched fields from scheduling data
  company_name?: string; // Company name from scheduling data
  last_earnings_date?: string; // Last earnings date from scheduling data
  link_timestamp?: string; // Timestamp when earnings link was released (ISO format)
  scheduled_dates?: string[]; // Array of scheduled dates in range
  [key: string]: any;
}

// Define the context shape
interface GlobalDataContextType {
  // Messages data
  messages: Message[]; // Will now contain enriched messages
  messagesLoading: boolean;
  messagesRefreshing: boolean;
  messagesHasMore: boolean;
  messagesLoadingMore: boolean;
  webSocketConnected: boolean;
  webSocketReconnecting: boolean;
  webSocketEnabled: boolean;
  refreshMessages: (bypassCache?: boolean) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
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
  
  // Metrics data
  metricsData: StockMetric[];
  metricsLoading: boolean;
  metricsError: string | null;
  metricsLastUpdated: Date | null;
  refreshMetrics: (startDate?: string, endDate?: string) => Promise<void>;
  
  // Company names data
  companyNames: Record<string, CompanyNameData>;
  fetchCompanyNamesForDate: (date: string) => Promise<void>;
  companyNamesLoading: boolean;
}

// Create the context with default values
export const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

// Provider component
export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // State for search terms - these will be updated via the exposed methods
  const [searchMessageTicker, setSearchMessageTicker] = useState('');
  const searchTicker = '';
  const filterActive = null;
  const releaseTime = null;
  
  // Company names state
  const [companyNames] = useState<Record<string, CompanyNameData>>({});
  const [companyNamesLoading, setCompanyNamesLoading] = useState(false);
  
  // Metrics data state
  const [metricsData, setMetricsData] = useState<StockMetric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metricsLastUpdated, setMetricsLastUpdated] = useState<Date | null>(null);

  // API configuration for metrics
  const API_BASE = import.meta.env.VITE_RESEARCH_API_BASE_URL;
  const API_KEY = import.meta.env.VITE_USER_PROFILE_API_KEY;
  const METRICS_ENDPOINT = `${API_BASE}/metrics`;
  
  // Initialize data hooks with persistent connection
  const {
    messages: rawMessages, // Rename original messages
    loading: messagesLoading,
    refreshing: messagesRefreshing,
    hasMoreMessages: messagesHasMore,
    loadingMore: messagesLoadingMore,
    connected: webSocketConnected,
    reconnecting: webSocketReconnecting,
    enabled: webSocketEnabled,
    fetchMessages: fetchMessagesFromHook,
    loadMoreMessages: loadMoreMessagesFromHook,
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

  // Function to fetch metrics data with optional date filtering
  const fetchMetrics = useCallback(async (startDate?: string, endDate?: string) => {
    if (!user?.email) {
      return;
    }

    try {
      setMetricsError(null);

      // Prepare request body with date filtering
      const requestBody: { start_date?: string; end_date?: string } = {};
      if (startDate) {
        requestBody.start_date = startDate;
        requestBody.end_date = endDate || startDate; // If single day, use same date for end
      }

      const response = await fetch(METRICS_ENDPOINT, {
        method: Object.keys(requestBody).length > 0 ? 'POST' : 'GET',
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
        ...(Object.keys(requestBody).length > 0 && { body: JSON.stringify(requestBody) })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.metrics && Array.isArray(data.metrics)) {
        setMetricsData(data.metrics);
        setMetricsLastUpdated(new Date());
      } else {
        setMetricsData([]);
      }
    } catch (err) {
      setMetricsError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    }
  }, [user?.email, METRICS_ENDPOINT, API_KEY]);

  const refreshMetrics = useCallback(async (startDate?: string, endDate?: string) => {
    setMetricsLoading(true);
    await fetchMetrics(startDate, endDate);
    setMetricsLoading(false);
  }, [fetchMetrics]);

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
    } finally {
      setCompanyNamesLoading(false);
    }
    */
    
    // Just set loading to false since we're not making the call
    setCompanyNamesLoading(false);
  }, []);

  // Initial metrics load when user is authenticated
  useEffect(() => {
    if (user?.email) {
      refreshMetrics();
    }
  }, [user?.email, refreshMetrics]);

  // Auto-refresh metrics every 2 minutes (without date filtering for background refresh)
  useEffect(() => {
    if (!user?.email) return;

    const interval = setInterval(() => {
      fetchMetrics(); // No date params for background refresh - gets all data
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [user?.email, fetchMetrics]);

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
    messagesHasMore,
    messagesLoadingMore,
    webSocketConnected,
    webSocketReconnecting,
    webSocketEnabled,
    refreshMessages: async (bypassCache?: boolean) => {
      // Call the fetchMessages function from the hook
      fetchMessagesFromHook();
      return Promise.resolve();
    },
    loadMoreMessages: async () => {
      // Call the loadMoreMessages function from the hook
      loadMoreMessagesFromHook();
      return Promise.resolve();
    },
    toggleWebSocket,
    updateMessagesSearchTicker: (searchTerm: string) => {
      setSearchMessageTicker(searchTerm);
      updateMessagesSearchTicker(searchTerm);
    },
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
    
    // Metrics data
    metricsData,
    metricsLoading,
    metricsError,
    metricsLastUpdated,
    refreshMetrics,
    
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
