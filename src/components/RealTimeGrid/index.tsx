import React, { useState, useContext, useEffect, useMemo, useCallback, useRef } from 'react';
import { Activity, RefreshCw, AlertCircle, ChevronUp, ChevronDown, Settings, Calendar, Filter, Eye, EyeOff, Search, GripVertical, Bookmark, Edit3, Plus, Trash2 } from 'lucide-react';
// Removed useMetricsData import - now using local metrics fetching
import { useWatchlist } from '../../hooks/useWatchlist';
import AnalysisPanelGrid from './componets/AnalysisPanelGrid';
import useGlobalData from '../../hooks/useGlobalData';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Message } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getUserProfile, updateUserProfile, UserProfile } from '../../services/api';
import { StockMetric } from '../../providers/GlobalDataProvider';
import { CollapseContext } from '../../contexts/CollapseContext'

interface ColumnConfig {
  key: string;
  label: string;
  width?: number;
  sortable?: boolean;
  type?: 'text' | 'number' | 'percentage' | 'currency';
  colorCode?: 'beats' | 'performance';
}

interface GridView {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  settings: {
    columnOrder: string[];
    visibleColumns: string[];
    columnWidths: Record<string, number>;
    sortColumn: string;
    sortDirection: 'asc' | 'desc';
    showWatchlistOnly: boolean;
    searchValue: string;
    searchColumn: string;
    startDate?: string;
    endDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const RealTimeGrid: React.FC = () => {
  // Local metrics state instead of using GlobalDataProvider
  const [stockData, setStockData] = useState<StockMetric[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { isCollapsed, setIsCollapsed } = useContext(CollapseContext)

  // API configuration for local metrics fetching
  const API_BASE = import.meta.env.VITE_RESEARCH_API_BASE_URL;
  const API_KEY = import.meta.env.VITE_USER_PROFILE_API_KEY;
  const METRICS_ENDPOINT = `${API_BASE}/metrics`;

  // Use watchlist data for filtering
  const { watchlist } = useWatchlist();

  // Get messages and websocket data for the analysis panel
  const {
    messages: globalMessages,
    convertToEasternTime,
    earningsItems,
    messagesLoading: loading
  } = useGlobalData();

  // State for real-time messages from websocket
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);

  // Refs for tracking message changes (similar to MessagesList pattern)
  const prevMessagesRef = useRef<Message[]>([]);
  const initialLoadCompletedRef = useRef<boolean>(false);

  // Handle new real-time messages from websocket
  const handleNewWebSocketMessage = useCallback((newMessage: Message) => {
    console.log(`📨 RealTimeGrid: Received new websocket message for ${newMessage.ticker}:`, newMessage.message_id?.substring(0, 8) || newMessage.id?.substring(0, 8) || 'no-id');

    setRealtimeMessages(prev => {
      // Check if message already exists
      const exists = prev.some(msg => msg.message_id === newMessage.message_id || msg.id === newMessage.id);
      if (exists) {
        console.log(`⚠️ Message already exists, skipping duplicate`);
        return prev;
      }

      // Add new message and sort by timestamp (newest first)
      const updated = [...prev, newMessage].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      console.log(`✅ Added new message, total real-time messages: ${updated.length}`);
      return updated;
    });
  }, []);

  // Use WebSocket hook for real-time updates (status not shown in UI)
  useWebSocket({
    onMessage: handleNewWebSocketMessage,
    persistConnection: true // Keep connection alive for real-time updates
  });

  // Combine global messages and real-time messages
  const messages = useMemo(() => {
    const combined = [...globalMessages, ...realtimeMessages];

    // Remove duplicates based on message_id or id
    const seen = new Set();
    const unique = combined.filter(msg => {
      const id = msg.message_id || msg.id;
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });

    // Sort by timestamp (newest first)
    const sorted = unique.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    console.log(`📊 RealTimeGrid: Combined messages - Global: ${globalMessages.length}, Realtime: ${realtimeMessages.length}, Unique: ${sorted.length}`);

    return sorted;
  }, [globalMessages, realtimeMessages]);

  // User authentication for views
  const { user } = useAuth();

  // Local metrics fetching function
  const fetchMetrics = useCallback(async (startDate?: string, endDate?: string) => {
    if (!user?.email) {
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Prepare request body with date filtering
      const requestBody: { start_date?: string; end_date?: string } = {};
      if (startDate) {
        requestBody.start_date = startDate;
        requestBody.end_date = endDate || startDate; // If single day, use same date for end
      }

      // Debug: Log our request details
      const method = Object.keys(requestBody).length > 0 ? 'POST' : 'GET';
      console.log('📡 API REQUEST:', {
        method,
        url: METRICS_ENDPOINT,
        body: Object.keys(requestBody).length > 0 ? requestBody : 'none'
      });

      const response = await fetch(METRICS_ENDPOINT, {
        method,
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

      // Debug: Log API response structure (first item only)
      console.log('📥 API RESPONSE STRUCTURE:', {
        totalMetrics: data.metrics?.length || 0,
        responseKeys: Object.keys(data),
        firstItemKeys: data.metrics?.[0] ? Object.keys(data.metrics[0]) : 'no metrics',
        firstItemSample: data.metrics?.[0] ? {
          ticker: data.metrics[0].ticker || data.metrics[0].id,
          link_timestamp: data.metrics[0].link_timestamp,
          linkTimestamp: data.metrics[0].linkTimestamp,
          timestamp: data.metrics[0].timestamp
        } : 'no first item'
      });

      if (data.metrics && Array.isArray(data.metrics)) {
        // Log the new response structure for debugging
        console.log('📊 New API response structure:', {
          count: data.count,
          start_date: data.start_date,
          end_date: data.end_date,
          scheduled_tickers: data.scheduled_tickers,
          metrics_count: data.metrics.length
        });

        // The metrics are already enriched with company_name, last_earnings_date, etc.
        // Debug: Log first few items to see the actual data structure
        if (data.metrics && data.metrics.length > 0) {
          console.log('📊 Sample metrics data (first 3 items):', {
            count: data.metrics.length,
            sample: data.metrics.slice(0, 3).map(item => ({
              ticker: item.ticker,
              company_name: item.company_name,
              last_earnings_date: item.last_earnings_date,
              last_earnings_date_type: typeof item.last_earnings_date
            }))
          });
        }
        setStockData(data.metrics);
        setLastUpdated(new Date());
      } else {
        console.warn('⚠️ Invalid API response structure:', data);
        setStockData([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, METRICS_ENDPOINT, API_KEY]);

  // Handle refresh function
  const handleRefresh = useCallback(async (startDate?: string, endDate?: string) => {
    await fetchMetrics(startDate, endDate);
  }, [fetchMetrics]);

  const [sortColumn, setSortColumn] = useState<string>('ticker');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [dateRange, setDateRange] = useState<{start: string; end: string}>({start: '', end: ''});
  const [tempDateRange, setTempDateRange] = useState<{start: string; end: string}>({start: '', end: ''});
  // scheduledTickers state removed - backend now handles date filtering
  // dateFilterLoading state removed - now uses metricsLoading since backend handles date filtering
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const columnToggleRef = useRef<HTMLDivElement>(null);

  // Analysis panel state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [initialMessageSet, setInitialMessageSet] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [tickerMessages, setTickerMessages] = useState<Message[]>([]);
  const [tickerMessagesLoading, setTickerMessagesLoading] = useState<boolean>(false);

  // Search state
  const [searchValue, setSearchValue] = useState<string>('');
  const [searchColumn, setSearchColumn] = useState<string>('ticker');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Scroll synchronization refs
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  // Drag and drop state
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Column resizing state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState<number>(0);
  const [resizeStartWidth, setResizeStartWidth] = useState<number>(0);

  // Views state
  const [savedViews, setSavedViews] = useState<GridView[]>([]);

  // Scroll synchronization effect
  useEffect(() => {
    const headerContainer = headerScrollRef.current;
    const bodyContainer = bodyScrollRef.current;

    if (!headerContainer || !bodyContainer) return;

    const handleBodyScroll = () => {
      if (headerContainer.scrollLeft !== bodyContainer.scrollLeft) {
        headerContainer.scrollLeft = bodyContainer.scrollLeft;
      }
    };

    bodyContainer.addEventListener('scroll', handleBodyScroll);

    return () => {
      bodyContainer.removeEventListener('scroll', handleBodyScroll);
    };
  }, []);


  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [showEditViewModal, setShowEditViewModal] = useState(false);
  const [editingView, setEditingView] = useState<GridView | null>(null);
  const [viewsLoading, setViewsLoading] = useState(false);
  const viewsDropdownRef = useRef<HTMLDivElement>(null);

  // Date picker handlers (defined early to avoid initialization order issues)
  const handleDatePickerOpen = useCallback(() => {
    setTempDateRange(dateRange);
    setShowDatePicker(true);
  }, [dateRange]);

  const handleDatePickerApply = useCallback(() => {
    // Validate date range - start date must be before end date
    if (tempDateRange.start && tempDateRange.end && tempDateRange.start > tempDateRange.end) {
      // Swap dates if start is after end
      const swappedRange = {
        start: tempDateRange.end,
        end: tempDateRange.start
      };
      setTempDateRange(swappedRange);
      setDateRange(swappedRange);
    } else {
      setDateRange(tempDateRange);
    }
    setShowDatePicker(false);
  }, [tempDateRange]);

  const handleDatePickerCancel = useCallback(() => {
    setTempDateRange(dateRange);
    setShowDatePicker(false);
  }, [dateRange]);

  const handleDatePickerClear = useCallback(() => {
    const emptyRange = {start: '', end: ''};
    setTempDateRange(emptyRange);
    setDateRange(emptyRange);
    setShowDatePicker(false);
  }, []);

  // Calculate date restrictions (allow past earnings dates, block future dates)
  const getDateRestrictions = useCallback(() => {
    const today = new Date();

    return {
      maxDate: today.toISOString().split('T')[0] // Today's date
    };
  }, []);

  const { maxDate } = getDateRestrictions();

  // Utility function to get current date in Eastern Time (EST/EDT with DST handling)
  const getCurrentEasternDate = useCallback(() => {
    const now = new Date();
    // Convert to Eastern Time using Intl.DateTimeFormat
    const easternTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    // Convert MM/DD/YYYY to YYYY-MM-DD format
    const [month, day, year] = easternTime.split('/');
    return `${year}-${month}-${day}`;
  }, []);

  // Utility function to get date N days ago in Eastern Time
  const getEasternDateDaysAgo = useCallback((daysAgo: number) => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

    // Convert to Eastern Time
    const easternTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(pastDate);

    // Convert MM/DD/YYYY to YYYY-MM-DD format
    const [month, day, year] = easternTime.split('/');
    return `${year}-${month}-${day}`;
  }, []);

  // Default 7-day date range (last 7 days to today in Eastern Time)
  const getDefault7DayRange = useCallback(() => {
    return {
      start: getEasternDateDaysAgo(7),
      end: getCurrentEasternDate()
    };
  }, [getCurrentEasternDate, getEasternDateDaysAgo]);

  // Utility function to clean company names
  const cleanCompanyName = useCallback((name: string | undefined): string => {
    if (!name) return '';

    let cleaned = name.trim();

    // Remove "Common Stock" from the end
    cleaned = cleaned.replace(/\s+Common\s+Stock\s*$/i, '');

    // Remove everything from "American depositary" onwards (case insensitive)
    cleaned = cleaned.replace(/\s+American\s+depositary.*$/i, '');

    return cleaned.trim();
  }, []);

  // Define column configuration
  const defaultColumns: ColumnConfig[] = [
    { key: 'ticker', label: 'Ticker', width: 80, sortable: true, type: 'text' },
    { key: 'company_name', label: 'Company', width: 200, sortable: true, type: 'text' },
    { key: 'last_earnings_date', label: 'Last Earnings', width: 120, sortable: true, type: 'text' },
    { key: 'release_time', label: 'Release Time', width: 120, sortable: true, type: 'text' },
    // Current Quarter Earnings
    { key: '$eps0', label: 'EPS Estimate', width: 110, sortable: true, type: 'number' },
    { key: '$qeps0', label: 'EPS Actual', width: 110, sortable: true, type: 'number', colorCode: 'beats' },
    { key: 'eps_surprise_pct', label: 'Surprise %', width: 110, sortable: true, type: 'percentage', colorCode: 'beats' },
    { key: '$salesqest', label: 'Rev Est', width: 110, sortable: true, type: 'currency' },
    { key: '$salesa1', label: 'Rev Act', width: 110, sortable: true, type: 'currency' },
    { key: 'rev_surprise_pct', label: 'Surprise %', width: 110, sortable: true, type: 'percentage', colorCode: 'beats' },
    { key: 'qq_growth_pct', label: 'Q/Q Growth %', width: 110, sortable: true, type: 'percentage', colorCode: 'performance' },
    // Next Quarter
    { key: 'nextqepsmean', label: 'NQ EPS Est', width: 110, sortable: true, type: 'number' },
    { key: 'nq_eps_guide', label: 'NQ EPS Guide', width: 110, sortable: true, type: 'number' },
    { key: 'nq_eps_change_pct', label: 'NQ EPS % change', width: 130, sortable: true, type: 'percentage' },
    { key: '$salesqestnextq', label: 'NQ Rev Est', width: 110, sortable: true, type: 'currency' },
    { key: 'nq_rev_guide', label: 'NQ Rev Guide', width: 110, sortable: true, type: 'currency' },
    { key: 'nq_rev_change_pct', label: 'NQ Rev % change', width: 130, sortable: true, type: 'percentage' },
    // Current Year
    { key: 'curfyepsmean', label: 'CY EPS Est', width: 110, sortable: true, type: 'number' },
    { key: 'cy_eps_guide', label: 'CY EPS Est Prior', width: 120, sortable: true, type: 'number' },
    { key: 'cy_eps_change_pct', label: 'CY EPS % change', width: 130, sortable: true, type: 'percentage' },
    { key: 'curfysalesmean', label: 'CY Rev Est', width: 110, sortable: true, type: 'currency' },
    { key: 'cy_rev_guide', label: 'CY Rev Guide', width: 110, sortable: true, type: 'currency' },
    { key: 'cy_rev_change_pct', label: 'CY Rev % change', width: 130, sortable: true, type: 'percentage' },
  ];

  // Searchable columns (subset of default columns that make sense to search)
  const searchableColumns = useMemo(() => [
    { key: 'ticker', label: 'Ticker' },
    { key: 'company_name', label: 'Company' },
    { key: 'last_earnings_date', label: 'Last Earnings' },
    { key: 'release_time', label: 'Release Time' },
    { key: '$eps0', label: 'EPS Estimate' },
    { key: '$qeps0', label: 'EPS Actual' },
    { key: '$salesqest', label: 'Rev Est' },
    { key: '$salesa1', label: 'Rev Act' },
    { key: 'nextqepsmean', label: 'NQ EPS Est' },
    { key: '$salesqestnextq', label: 'NQ Rev Est' },
    { key: 'curfyepsmean', label: 'CY EPS Est' },
    { key: 'curfysalesmean', label: 'CY Rev Est' },
  ], []);

  // Initialize column visibility state
  const initialColumnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {};
    defaultColumns.forEach(col => {
      visibility[col.key] = true;
    });
    return visibility;
  }, []);

  // Initialize column order, visibility, and widths
  useEffect(() => {
    // Force initialize all columns
    console.log('🔧 Initializing columns:', defaultColumns.map(col => col.key));

    setColumnOrder(defaultColumns.map(col => col.key));
    setVisibleColumns(new Set(defaultColumns.map(col => col.key)));
    setColumnVisibility(initialColumnVisibility);

    // Initialize column widths with defaults
    const initialWidths: Record<string, number> = {};
    defaultColumns.forEach(col => {
      initialWidths[col.key] = col.width || 100;
    });
    setColumnWidths(initialWidths);

    console.log('✅ Columns initialized:', {
      order: defaultColumns.map(col => col.key),
      visible: defaultColumns.map(col => col.key),
      count: defaultColumns.length
    });
  }, []); // Run once on mount

  // Initial metrics load when user is authenticated (with default 7-day filter)
  useEffect(() => {
    if (user?.email && stockData.length === 0 && !isLoading) {
      // Apply default date filtering on initial load
      const defaultRange = getDefault7DayRange();
      console.log('📅 Initial load: Applying default 7-day date filter:', defaultRange);
      setDateRange(defaultRange);
      setTempDateRange(defaultRange);
      // fetchMetrics will be called by the dateRange change effect
    }
  }, [user?.email, stockData.length, isLoading, getDefault7DayRange]);

  // Apply default date filtering after views are loaded (or if no views exist)
  useEffect(() => {
    // Only apply default if we don't already have a date range and views are not loading
    if (!viewsLoading && !dateRange.start && !dateRange.end && stockData.length === 0) {
      // Check if user has views and if default view has date filtering
      const defaultView = savedViews.find(view => view.isDefault);
      const hasDateFiltering = defaultView?.settings?.startDate || defaultView?.settings?.endDate;

      // If no views exist or default view has no date filtering, apply 7-day default
      if (savedViews.length === 0 || !hasDateFiltering) {
        const defaultRange = getDefault7DayRange();
        console.log('📅 Post-views load: Applying default 7-day date filter:', defaultRange);
        setDateRange(defaultRange);
        setTempDateRange(defaultRange);
      }
    }
  }, [viewsLoading, savedViews, dateRange.start, dateRange.end, stockData.length, getDefault7DayRange]);

  // Mobile detection
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Set initial message for analysis panel
  useEffect(() => {
    if (!initialMessageSet && messages.length > 0) {
      const analysisMessages = messages.filter(msg => !msg.link);

      if (analysisMessages.length > 0) {
        const sortedAnalysisMessages = [...analysisMessages].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setSelectedMessage(sortedAnalysisMessages[0]);
      } else if (messages.length > 0) {
        const sortedMessages = [...messages].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setSelectedMessage(sortedMessages[0]);
      }

      setInitialMessageSet(true);
    }
  }, [messages, initialMessageSet]);

  // Set initial messages after first load (similar to MessagesList pattern)
  useEffect(() => {
    if (!loading && messages.length > 0 && !initialLoadCompletedRef.current) {
      prevMessagesRef.current = [...messages];
      initialLoadCompletedRef.current = true;
      console.log(`📋 RealTimeGrid: Initial load completed with ${messages.length} messages`);
    }
  }, [loading, messages]);

  // Detect new messages for real-time updates (similar to MessagesList pattern)
  useEffect(() => {
    // Skip this effect until initial load is completed
    if (!initialLoadCompletedRef.current || !messages || messages.length === 0) return;

    // Find genuinely new messages (following MessagesList pattern)
    const prevMessageIds = new Set(prevMessagesRef.current.map(msg => msg.message_id || msg.id));

    const genuinelyNewMessages = messages.filter(msg => {
      const msgId = msg.message_id || msg.id;
      const isNewToState = !prevMessageIds.has(msgId);
      const messageTime = new Date(msg.timestamp).getTime();
      const isRecentMessage = messageTime > (Date.now() - 2 * 60 * 1000); // Last 2 minutes

      // Only consider it truly new if it's new to our state AND is a very recent message
      return isNewToState && isRecentMessage;
    });

    // If we have genuinely new messages, auto-select the newest one from ANY ticker
    if (genuinelyNewMessages.length > 0) {
      console.log(`🆕 RealTimeGrid: Found ${genuinelyNewMessages.length} genuinely new messages`);

      // Sort all new messages by timestamp (newest first) and select the newest one
      const newestMessage = genuinelyNewMessages.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      console.log(`🎯 RealTimeGrid: Auto-selecting newest message from ANY ticker (${newestMessage.ticker}):`, newestMessage.message_id?.substring(0, 8) || newestMessage.id?.substring(0, 8));

      // Update selected message to the newest one from any ticker
      setSelectedMessage(newestMessage);

      // Also update the selected ticker to match the new message
      if (newestMessage.ticker) {
        console.log(`📍 RealTimeGrid: Switching selected ticker to ${newestMessage.ticker}`);
        setSelectedTicker(newestMessage.ticker);
        setShowAnalysisPanel(true); // Ensure analysis panel is visible

        // Note: fetchTickerMessages will be called automatically when selectedTicker changes
        // due to the existing useEffect that handles ticker selection
      }
    }

    // Update the previous messages ref
    prevMessagesRef.current = messages;
  }, [messages]);

  // Process ticker-specific messages for AnalysisPanel
  useEffect(() => {
    if (!selectedTicker) {
      setTickerMessages([]);
      return;
    }

    console.log(`🔍 RealTimeGrid: Processing messages for ticker: ${selectedTicker}`);

    // Filter messages for the selected ticker
    const tickerSpecificMessages = messages.filter(msg =>
      msg.ticker && msg.ticker.toUpperCase() === selectedTicker.toUpperCase()
    );

    console.log(`🎯 Found ${tickerSpecificMessages.length} messages for ${selectedTicker}`);

    if (tickerSpecificMessages.length === 0) {
      console.log(`⚠️ No messages found for ${selectedTicker}, clearing ticker messages`);
      setTickerMessages([]);
      return;
    }

    // Group messages by type and get the newest for each type
    const getMessageType = (message: Message): string => {
      if (message.link || message.report_data?.link ||
          message.source?.toLowerCase() === 'link' ||
          message.type?.toLowerCase() === 'link') return 'report';
      if (message.source === 'transcript_analysis') return 'transcript';
      if (message.source === 'sentiment_analysis' || message.sentiment_additional_metrics) return 'sentiment';
      if (message.source === 'fundamentals_analysis') return 'fundamentals';
      return 'earnings';
    };

    const messagesByType: Record<string, Message> = {};

    tickerSpecificMessages.forEach((message: Message) => {
      const messageType = getMessageType(message);

      // If we don't have a message of this type yet, or this message is newer
      if (!messagesByType[messageType] ||
          new Date(message.timestamp) > new Date(messagesByType[messageType].timestamp)) {
        messagesByType[messageType] = message;
      }
    });

    // Convert to array and sort by timestamp (newest first)
    const newestMessages = Object.values(messagesByType).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    console.log(`📈 Processed message types for ${selectedTicker}:`,
      newestMessages.map(msg => `${getMessageType(msg)}(${msg.message_id?.substring(0, 8) || msg.id?.substring(0, 8) || 'no-id'})`));

    // Update ticker messages for AnalysisPanel
    setTickerMessages(newestMessages);
  }, [selectedTicker, messages]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnToggleRef.current && !columnToggleRef.current.contains(event.target as Node)) {
        setShowColumnToggle(false);
      }
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (viewsDropdownRef.current && !viewsDropdownRef.current.contains(event.target as Node)) {
        setShowViewsDropdown(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        handleDatePickerCancel();
      }
    };

    if (showColumnToggle || showSearchDropdown || showViewsDropdown || showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColumnToggle, showSearchDropdown, showViewsDropdown, showDatePicker, handleDatePickerCancel]);

  // View management functions (defined before useEffects that use them)
  const loadUserViews = useCallback(async () => {
    if (!user?.email) return;

    try {
      setViewsLoading(true);
      const profile = await getUserProfile(user.email);
      if (profile?.settings?.gridViews) {
        setSavedViews(profile.settings.gridViews as GridView[]);

        console.log('📚 Loaded saved views, but NOT applying default to preserve new column structure');

        // DON'T auto-apply default view on load to preserve new column structure
        // The user can manually select a saved view if they want

        // Just set the current view ID if there's a default one, but don't apply it
        const defaultView = (profile.settings.gridViews as GridView[]).find(view => view.isDefault);
        if (defaultView) {
          console.log('ℹ️ Found default view but not applying:', defaultView.name);
          // setCurrentViewId(defaultView.id);
          // applyView(defaultView); // REMOVED - don't auto-apply
        }
      }
    } catch (error) {
      console.error('Failed to load user views:', error);
    } finally {
      setViewsLoading(false);
    }
  }, [user?.email]);

  const saveView = useCallback(async (view: GridView, isUpdate: boolean = false, setAsCurrent: boolean = true) => {
    if (!user?.email) return;

    try {
      const profile = await getUserProfile(user.email);
      const currentViews = (profile?.settings?.gridViews as GridView[]) || [];

      // If this view is marked as default, unmark other default views first
      if (view.isDefault) {
        const previousDefaults = currentViews.filter(v => v.isDefault && v.id !== view.id);
        if (previousDefaults.length > 0) {
          console.log('🔄 Unmarking previous default views:', previousDefaults.map(v => v.name));
        }
        currentViews.forEach(v => {
          if (v.id !== view.id) {
            v.isDefault = false;
          }
        });
        console.log('✅ Setting new default view:', view.name);
      }

      let updatedViews;
      if (isUpdate) {
        updatedViews = currentViews.map(v => v.id === view.id ? view : v);
      } else {
        updatedViews = [...currentViews, view];
      }

      const updatedProfile: UserProfile = {
        email: user.email,
        watchlist: profile?.watchlist,
        watchListOn: profile?.watchListOn,
        settings: {
          ...profile?.settings,
          gridViews: updatedViews
        }
      };

      await updateUserProfile(updatedProfile);
      setSavedViews(updatedViews);

      // Only set as current view if explicitly requested (not for auto-save)
      if (setAsCurrent) {
        setCurrentViewId(view.id);
      }
    } catch (error) {
      console.error('Failed to save view:', error);
    }
  }, [user?.email]);

  const deleteView = useCallback(async (viewId: string) => {
    if (!user?.email) return;

    try {
      const profile = await getUserProfile(user.email);
      const currentViews = (profile?.settings?.gridViews as GridView[]) || [];
      const updatedViews = currentViews.filter(v => v.id !== viewId);

      // Handle default view management after deletion
      const deletedView = currentViews.find(v => v.id === viewId);
      const remainingManualViews = updatedViews.filter(view => view.name !== AUTO_SAVE_VIEW_NAME);
      const autoSaveView = updatedViews.find(view => view.name === AUTO_SAVE_VIEW_NAME);

      // If we deleted a default view, we need to assign a new default
      if (deletedView?.isDefault) {
        console.log('🔄 Deleted view was default, reassigning default status');

        if (remainingManualViews.length > 0) {
          // Make the first remaining manual view the default
          remainingManualViews[0].isDefault = true;
          console.log('🎯 Making first remaining manual view default:', remainingManualViews[0].name);
        } else if (autoSaveView) {
          // No manual views left, make auto-save default
          autoSaveView.isDefault = true;
          console.log('🎯 Making auto-save view default (no manual views remain)');
        }
      }

      // If we're deleting the last manual view and auto-save exists but isn't default yet
      if (remainingManualViews.length === 0 && autoSaveView && !autoSaveView.isDefault) {
        console.log('🎯 Making auto-save view default after deleting last manual view');
        autoSaveView.isDefault = true;
      }

      const updatedProfile: UserProfile = {
        email: user.email,
        watchlist: profile?.watchlist,
        watchListOn: profile?.watchListOn,
        settings: {
          ...profile?.settings,
          gridViews: updatedViews
        }
      };

      await updateUserProfile(updatedProfile);
      setSavedViews(updatedViews);

      if (currentViewId === viewId) {
        setCurrentViewId(null);
      }
    } catch (error) {
      console.error('Failed to delete view:', error);
    }
  }, [user?.email, currentViewId]);

  const applyView = useCallback((view: GridView) => {
    const { settings } = view;

    console.log('🔄 Applying saved view:', view.name, 'with settings:', settings);

    // Apply column configurations if they exist and are valid
    console.log('🔍 View settings column data:', {
      hasColumnOrder: !!settings.columnOrder,
      hasVisibleColumns: !!settings.visibleColumns,
      hasColumnWidths: !!settings.columnWidths
    });

    // Apply column order if saved and valid
    if (settings.columnOrder && Array.isArray(settings.columnOrder)) {
      // Filter to only columns that exist in current defaultColumns
      const validColumnOrder = settings.columnOrder.filter(colKey =>
        defaultColumns.some(col => col.key === colKey)
      );
      if (validColumnOrder.length > 0) {
        console.log('✅ Applying saved column order:', validColumnOrder.slice(0, 5).join(', ') + '...');
        setColumnOrder(validColumnOrder);
      }
    }

    // Apply visible columns if saved and valid
    if (settings.visibleColumns && Array.isArray(settings.visibleColumns)) {
      // Filter to only columns that exist in current defaultColumns
      const validVisibleColumns = settings.visibleColumns.filter(colKey =>
        defaultColumns.some(col => col.key === colKey)
      );
      if (validVisibleColumns.length > 0) {
        console.log('✅ Applying saved visible columns:', validVisibleColumns.length, 'columns');
        setVisibleColumns(new Set(validVisibleColumns));
      }
    }

    // Apply column widths if saved and valid
    if (settings.columnWidths && typeof settings.columnWidths === 'object') {
      // Filter to only columns that exist in current defaultColumns
      const validColumnWidths: Record<string, number> = {};
      Object.entries(settings.columnWidths).forEach(([colKey, width]) => {
        if (defaultColumns.some(col => col.key === colKey) && typeof width === 'number') {
          validColumnWidths[colKey] = width;
        }
      });
      if (Object.keys(validColumnWidths).length > 0) {
        console.log('✅ Applying saved column widths:', Object.keys(validColumnWidths).length, 'columns');
        setColumnWidths(validColumnWidths);
      }
    }

    // Apply sorting
    if (settings.sortColumn && settings.sortDirection) {
      // Only apply if the sort column exists in our new columns
      const columnExists = defaultColumns.some(col => col.key === settings.sortColumn);
      if (columnExists) {
        setSortColumn(settings.sortColumn);
        setSortDirection(settings.sortDirection);
      } else {
        console.warn('⚠️ Saved sort column no longer exists:', settings.sortColumn);
      }
    }

    // Apply watchlist toggle
    setShowWatchlistOnly(settings.showWatchlistOnly || false);

    // Apply search column only if it exists
    const searchColumnExists = defaultColumns.some(col => col.key === (settings.searchColumn || 'ticker'));
    if (searchColumnExists) {
      setSearchColumn(settings.searchColumn || 'ticker');
    }
    setSearchValue(settings.searchValue || '');

    // Apply date range if available, otherwise use default 7-day range
    if (settings.startDate || settings.endDate) {
      const newRange = {
        start: settings.startDate || '',
        end: settings.endDate || ''
      };
      // Loading will be handled by handleRefresh/refreshMetrics when date range changes
      setDateRange(newRange);
      setTempDateRange(newRange);
    } else {
      // If view has no date filtering, apply default 7-day range
      const defaultRange = getDefault7DayRange();
      console.log('📅 View has no date filtering, applying default 7-day range:', defaultRange);
      setDateRange(defaultRange);
      setTempDateRange(defaultRange);
    }

    setCurrentViewId(view.id);

    console.log('✅ View applied with new column structure preserved');
  }, [getDefault7DayRange]);

  const getCurrentViewSettings = useCallback(() => {
    const settings = {
      columnOrder,
      visibleColumns: Array.from(visibleColumns),
      columnWidths,
      sortColumn,
      sortDirection,
      showWatchlistOnly,
      searchValue,
      searchColumn,
      startDate: dateRange.start,
      endDate: dateRange.end
    };
    console.log('🔍 getCurrentViewSettings called, returning:', {
      startDate: settings.startDate,
      endDate: settings.endDate,
      showWatchlistOnly: settings.showWatchlistOnly,
      searchValue: settings.searchValue,
      sortColumn: settings.sortColumn,
      sortDirection: settings.sortDirection,
      columnOrder: settings.columnOrder.slice(0, 5).join(', ') + '...',
      visibleColumnsCount: settings.visibleColumns.length,
      columnWidthsCount: Object.keys(settings.columnWidths).length
    });
    return settings;
  }, [columnOrder, visibleColumns, columnWidths, sortColumn, sortDirection, showWatchlistOnly, searchValue, searchColumn, dateRange.start, dateRange.end]);

  const createNewView = useCallback(async (name: string, description?: string, isDefault?: boolean) => {
    const newView: GridView = {
      id: `view_${Date.now()}`,
      name,
      description,
      isDefault,
      settings: getCurrentViewSettings(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveView(newView);
  }, [getCurrentViewSettings, saveView]);

  const updateExistingView = useCallback(async (viewId: string, updates: Partial<GridView>) => {
    console.log('🔧 updateExistingView called with:', { viewId, updates });
    const existingView = savedViews.find(v => v.id === viewId);
    if (!existingView) {
      console.error('❌ View not found with ID:', viewId);
      return;
    }

    console.log('🔍 Found existing view:', existingView.name);

    const updatedView: GridView = {
      ...existingView,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    console.log('📝 Updating view:', updatedView.name, 'with ID:', updatedView.id);
    console.log('🔍 Current view ID before update:', currentViewId);
    await saveView(updatedView, true, false); // isUpdate=true, setAsCurrent=false
    console.log('🔍 Current view ID after update:', currentViewId);
    console.log('✅ View update completed');
  }, [savedViews, saveView, currentViewId]);

  const saveCurrentAsView = useCallback(async (name: string, description?: string, isDefault?: boolean) => {
    await createNewView(name, description, isDefault);
  }, [createNewView]);

  // Auto-save functionality
  const AUTO_SAVE_VIEW_NAME = '🔄 Auto-saved';

  // Auto-save specific function that doesn't interfere with current view state
  const autoSaveView = useCallback(async (view: GridView, isUpdate: boolean = false) => {
    if (!user?.email) return;

    try {
      console.log('🔄 Auto-saving view to backend:', view.name);
      const profile = await getUserProfile(user.email);
      const currentViews = (profile?.settings?.gridViews as GridView[]) || [];

      let updatedViews;
      if (isUpdate) {
        updatedViews = currentViews.map(v => v.id === view.id ? view : v);
      } else {
        updatedViews = [...currentViews, view];
      }

      const updatedProfile: UserProfile = {
        email: user.email,
        watchlist: profile?.watchlist,
        watchListOn: profile?.watchListOn,
        settings: {
          ...profile?.settings,
          gridViews: updatedViews
        }
      };

      await updateUserProfile(updatedProfile);
      setSavedViews(updatedViews);
      console.log('✅ Auto-save API call completed successfully');
    } catch (error) {
      console.error('❌ Failed to auto-save view:', error);
    }
  }, [user?.email]);

  const autoSaveCurrentView = useCallback(async () => {
    if (!user?.email) {
      console.log('⚠️ Auto-save skipped: no user email');
      return;
    }

    if (savedViews.length === 0) {
      console.log('⚠️ Auto-save skipped: views not loaded yet');
      return;
    }

    try {
      const currentSettings = getCurrentViewSettings();
      console.log('🔄 Auto-saving current view state:', currentSettings);

      // Find existing auto-save view or create new one
      const existingAutoSave = savedViews.find(view => view.name === AUTO_SAVE_VIEW_NAME);

      if (existingAutoSave) {
        // Check if there are any manual views (non-auto-save views)
        const manualViews = savedViews.filter(view => view.name !== AUTO_SAVE_VIEW_NAME);
        const shouldBeDefault = manualViews.length === 0;

        if (shouldBeDefault && !existingAutoSave.isDefault) {
          console.log('🎯 Making auto-save view default since no other views exist');
        }

        // Update existing auto-save view
        console.log('📝 Updating existing auto-save view:', existingAutoSave.id);
        const updatedView: GridView = {
          ...existingAutoSave,
          settings: currentSettings,
          isDefault: shouldBeDefault,
          updatedAt: new Date().toISOString()
        };
        await autoSaveView(updatedView, true);
        console.log('✅ Auto-saved current view state successfully');
      } else {
        // Check if there are any manual views (non-auto-save views)
        const manualViews = savedViews.filter(view => view.name !== AUTO_SAVE_VIEW_NAME);
        const shouldBeDefault = manualViews.length === 0;

        if (shouldBeDefault) {
          console.log('🎯 Making auto-save view default since no other views exist');
        }

        // Create new auto-save view
        const newAutoSaveView: GridView = {
          id: `auto-save-${Date.now()}`,
          name: AUTO_SAVE_VIEW_NAME,
          description: 'Automatically saved view with your latest settings',
          isDefault: shouldBeDefault,
          settings: currentSettings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        console.log('➕ Creating new auto-save view:', newAutoSaveView);
        await autoSaveView(newAutoSaveView, false);
        console.log('✅ Created auto-save view successfully');
      }
    } catch (error) {
      console.error('❌ Failed to auto-save view:', error);
    }
  }, [user?.email, savedViews, getCurrentViewSettings, autoSaveView]);

  // Removed triggerAutoSave - now using direct useEffect approach

  // Load user views on mount (placed after function definitions)
  useEffect(() => {
    if (user?.email) {
      loadUserViews();
    }
  }, [user?.email, loadUserViews]);

  // Refresh metrics data when date range changes (backend date filtering)
  useEffect(() => {
    if (dateRange.start || dateRange.end) {
      // Call backend with date filtering - handleRefresh manages metricsLoading state
      console.log('🔄 Fetching metrics with date filter:', dateRange.start, 'to', dateRange.end);
      handleRefresh(dateRange.start, dateRange.end);
    } else {
      // Don't fetch all data when date range is empty - user should always have a date filter
      console.log('⚠️ No date range set - skipping metrics fetch to prevent loading all data');
    }
  }, [dateRange.start, dateRange.end, handleRefresh]);

  // Debug state changes
  useEffect(() => {
    console.log('🔄 State changed - Date range:', { start: dateRange.start, end: dateRange.end });
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    console.log('🔄 State changed - Watchlist filter:', showWatchlistOnly);
  }, [showWatchlistOnly]);

  useEffect(() => {
    console.log('🔄 State changed - Search:', { value: searchValue, column: searchColumn });
  }, [searchValue, searchColumn]);

  useEffect(() => {
    console.log('🔄 State changed - Sort:', { column: sortColumn, direction: sortDirection });
  }, [sortColumn, sortDirection]);

  useEffect(() => {
    console.log('🔄 State changed - Column order:', columnOrder.slice(0, 5).join(', ') + '...');
  }, [columnOrder]);

  useEffect(() => {
    console.log('🔄 State changed - Visible columns:', Array.from(visibleColumns).slice(0, 5).join(', ') + '...');
  }, [visibleColumns]);

  useEffect(() => {
    console.log('🔄 State changed - Column widths:', Object.keys(columnWidths).length, 'columns');
  }, [columnWidths]);

  // Simple auto-save that reacts to changes (debounced)
  useEffect(() => {
    // Don't auto-save during initial load or if no user
    if (!user?.email || savedViews.length === 0) return;

    console.log('🔄 Auto-save useEffect triggered with values:', {
      dateStart: dateRange.start,
      dateEnd: dateRange.end,
      watchlist: showWatchlistOnly,
      search: searchValue,
      columnOrder: columnOrder.slice(0, 3).join(',') + '...', // Show first 3 columns
      visibleColumnsCount: visibleColumns.size,
      columnWidthsCount: Object.keys(columnWidths).length
    });

    // Debounce the auto-save
    const timeoutId = setTimeout(() => {
      console.log('🔄 Auto-save timeout executing...');
      autoSaveCurrentView();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [
    // Only the actual values that should trigger auto-save
    dateRange.start,
    dateRange.end,
    sortColumn,
    sortDirection,
    showWatchlistOnly,
    searchValue,
    searchColumn,
    columnOrder,
    visibleColumns,
    columnWidths
    // Note: user.email and savedViews.length removed to prevent infinite loops
    // columnOrder, visibleColumns, columnWidths added back - should be stable now
  ]);

  // Auto-restore functionality - apply auto-saved view on initial load
  useEffect(() => {
    console.log('🔍 Auto-restore check:', {
      userEmail: user?.email,
      savedViewsLength: savedViews.length,
      currentViewId,
      stockDataLength: stockData.length,
      hasDefaultView: savedViews.some(view => view.isDefault === true),
      hasAutoSave: savedViews.find(view => view.name === AUTO_SAVE_VIEW_NAME) ? true : false,
      defaultViewName: savedViews.find(view => view.isDefault === true)?.name || 'none'
    });

    if (!user?.email || savedViews.length === 0) {
      console.log('⚠️ Auto-restore skipped: no user or no saved views');
      return;
    }

    // Only auto-restore if no view is currently applied and we haven't loaded data yet
    if (!currentViewId && stockData.length === 0) {
      // Priority 1: Look for default view first
      const defaultView = savedViews.find(view => view.isDefault === true);

      if (defaultView && defaultView.settings) {
        console.log('🎯 Auto-restoring default view:', defaultView.name, defaultView.settings);
        applyView(defaultView);
        return;
      }

      // Priority 2: Fall back to auto-save view if no default view
      const autoSaveView = savedViews.find(view => view.name === AUTO_SAVE_VIEW_NAME);
      if (autoSaveView && autoSaveView.settings) {
        console.log('🔄 Auto-restoring auto-save view (no default found):', autoSaveView.settings);
        applyView(autoSaveView);
        return;
      }

      console.log('⚠️ No default or auto-save view found with settings');
    } else {
      console.log('⚠️ Auto-restore skipped: view already applied or data loaded');
    }
  }, [user?.email, savedViews, currentViewId, stockData.length, AUTO_SAVE_VIEW_NAME, applyView]);

  // Auto-save cleanup is handled by the useEffect return function above

  // No need for local API fetching - data comes from GlobalDataProvider

  // Calculation functions for computed fields
  const calculateEpsSurprise = (actual: any, estimate: any): number | null => {
    const actualNum = parseFloat(String(actual));
    const estimateNum = parseFloat(String(estimate));

    if (isNaN(actualNum) || isNaN(estimateNum) || estimateNum === 0) return null;
    return ((actualNum - estimateNum) / Math.abs(estimateNum)) * 100;
  };

  const calculateRevenueSurprise = (actual: any, estimate: any): number | null => {
    const actualNum = parseFloat(String(actual));
    const estimateNum = parseFloat(String(estimate));

    if (isNaN(actualNum) || isNaN(estimateNum) || estimateNum === 0) return null;
    return ((actualNum - estimateNum) / estimateNum) * 100;
  };

  const calculateQQGrowth = (current: any, previous: any): number | null => {
    const currentNum = parseFloat(String(current));
    const previousNum = parseFloat(String(previous));

    if (isNaN(currentNum) || isNaN(previousNum) || previousNum === 0) return null;
    return ((currentNum - previousNum) / Math.abs(previousNum)) * 100;
  };

  const calculatePercentageChange = (current: any, previous: any): number | null => {
    const currentNum = parseFloat(String(current));
    const previousNum = parseFloat(String(previous));

    if (isNaN(currentNum) || isNaN(previousNum) || previousNum === 0) return null;
    return ((currentNum - previousNum) / Math.abs(previousNum)) * 100;
  };

  // Enhanced getValue function to handle computed fields
  const getValue = (stock: any, columnKey: string): any => {
    switch (columnKey) {
      case 'eps_surprise_pct':
        return calculateEpsSurprise(stock.$qeps0, stock.$eps0);
      case 'rev_surprise_pct':
        return calculateRevenueSurprise(stock.$salesa1, stock.$salesqest);
      case 'qq_growth_pct':
        return calculateQQGrowth(stock.$salesa1, stock.$salesa2);
      case 'nq_eps_change_pct':
        return calculatePercentageChange(stock.nextqepsmean, stock.$eps0);
      case 'nq_rev_change_pct':
        return calculatePercentageChange(stock.$salesqestnextq, stock.$salesqest);
      case 'cy_eps_change_pct':
        return calculatePercentageChange(stock.curfyepsmean, stock.nextfyeps13wkago);
      case 'cy_rev_change_pct':
        return calculatePercentageChange(stock.curfysalesmean, stock.nextfysales13wkago);
      // Map guidance fields to available data
      case 'nq_eps_guide':
        return stock.nextfyeps13wkago; // Use 13-week-ago next FY EPS as guidance baseline
      case 'nq_rev_guide':
        return stock.nextfysales13wkago; // Use 13-week-ago next FY sales as guidance baseline
      case 'cy_eps_guide':
        return stock.curfyeps13wkago; // Use 13-week-ago current FY EPS as guidance baseline
      case 'cy_rev_guide':
        return stock.curfysales13wkago; // Use 13-week-ago current FY sales as guidance baseline
      case 'company_name':
        return cleanCompanyName(stock.company_name);
      case 'last_earnings_date':
        // Handle last earnings date - if it's a valid date string, return it; otherwise return null for N/A display
        const dateValue = stock.last_earnings_date;
        if (!dateValue || dateValue === '' || dateValue === 'null' || dateValue === 'undefined') {
          return null; // This will be formatted as N/A
        }
        return dateValue; // Return the date string as-is (2025-06-16 format)

      case 'release_time':
        // Handle release time - convert to readable format
        const releaseTimeValue = stock.release_time;
        if (!releaseTimeValue || releaseTimeValue === '' || releaseTimeValue === 'null' || releaseTimeValue === 'undefined') {
          return null; // This will be formatted as N/A
        }

        // Convert release_time values to readable format
        switch (releaseTimeValue.toLowerCase()) {
          case 'before_market':
            return 'Before Market';
          case 'after_market':
            return 'After Market';
          default:
            return releaseTimeValue; // Return as-is for any other values
        }
      default:
        return stock[columnKey];
    }
  };

  const formatValue = (value: any, type: string = 'text'): string => {
    if (value === null || value === undefined || value === 'N/A' || value === '') {
      return 'N/A';
    }

    const numValue = parseFloat(String(value));

    switch (type) {
      case 'currency':
        if (isNaN(numValue)) return String(value);
        return numValue >= 1000 ? `$${(numValue / 1000).toFixed(1)}B` : `$${numValue.toFixed(2)}M`;
      case 'percentage':
        if (isNaN(numValue)) return String(value);
        return `${numValue.toFixed(2)}%`;
      case 'number':
        if (isNaN(numValue)) return String(value);
        return numValue >= 1000 ? numValue.toLocaleString() : numValue.toFixed(2);
      default:
        return String(value);
    }
  };

  const getCellColor = (value: any, colorCode?: string): string => {
    if (!colorCode || value === null || value === undefined || value === 'N/A' || value === '') {
      return '';
    }

    const numValue = parseFloat(String(value));
    if (isNaN(numValue)) return '';

    switch (colorCode) {
      case 'beats':
        // More obvious colors for earnings beats/misses with intensity levels
        if (numValue > 20) return 'bg-green-300 dark:bg-green-700/50 text-green-950 dark:text-green-50 border border-green-400';
        if (numValue > 0) return 'bg-green-200 dark:bg-green-800/40 text-green-900 dark:text-green-100';
        if (numValue < -20) return 'bg-red-300 dark:bg-red-700/50 text-red-950 dark:text-red-50 border border-red-400';
        if (numValue < 0) return 'bg-red-200 dark:bg-red-800/40 text-red-900 dark:text-red-100';
        return 'bg-gray-200 dark:bg-gray-700/40 text-gray-900 dark:text-gray-100';
      case 'performance':
        // More obvious colors for performance metrics with intensity levels
        if (numValue > 100) return 'bg-green-300 dark:bg-green-700/50 text-green-950 dark:text-green-50 border border-green-400';
        if (numValue > 50) return 'bg-green-200 dark:bg-green-800/40 text-green-900 dark:text-green-100';
        if (numValue < -20) return 'bg-red-300 dark:bg-red-700/50 text-red-950 dark:text-red-50 border border-red-400';
        if (numValue < 0) return 'bg-red-200 dark:bg-red-800/40 text-red-900 dark:text-red-100';
        if (numValue < 20) return 'bg-orange-200 dark:bg-orange-700/40 text-orange-900 dark:text-orange-100';
        return 'bg-yellow-200 dark:bg-yellow-700/40 text-yellow-900 dark:text-yellow-100';
      default:
        return '';
    }
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Search function that works with different column types
  const matchesSearch = useCallback((stock: any, searchTerm: string, columnKey: string) => {
    if (!searchTerm.trim()) return true;

    const value = getValue(stock, columnKey);
    if (value === null || value === undefined || value === 'N/A' || value === '') return false;

    const searchLower = searchTerm.toLowerCase().trim();
    const column = defaultColumns.find(col => col.key === columnKey);

    // Handle different column types
    switch (column?.type) {
      case 'text':
        return String(value).toLowerCase().includes(searchLower);

      case 'number':
      case 'currency':
      case 'percentage':
        const numValue = parseFloat(String(value));
        if (isNaN(numValue)) return false;

        // Check if search term is a number for exact/range matching
        const searchNum = parseFloat(searchTerm);
        if (!isNaN(searchNum)) {
          // Allow for range searches like ">5", "<10", ">=2.5"
          if (searchTerm.startsWith('>=')) {
            const threshold = parseFloat(searchTerm.substring(2));
            return !isNaN(threshold) && numValue >= threshold;
          } else if (searchTerm.startsWith('<=')) {
            const threshold = parseFloat(searchTerm.substring(2));
            return !isNaN(threshold) && numValue <= threshold;
          } else if (searchTerm.startsWith('>')) {
            const threshold = parseFloat(searchTerm.substring(1));
            return !isNaN(threshold) && numValue > threshold;
          } else if (searchTerm.startsWith('<')) {
            const threshold = parseFloat(searchTerm.substring(1));
            return !isNaN(threshold) && numValue < threshold;
          } else {
            // Exact match or contains
            return Math.abs(numValue - searchNum) < 0.01 || String(value).toLowerCase().includes(searchLower);
          }
        } else {
          // Text search in formatted value
          return String(value).toLowerCase().includes(searchLower);
        }

      default:
        return String(value).toLowerCase().includes(searchLower);
    }
  }, [defaultColumns]);

  const sortedData = useMemo(() => {
    if (!stockData.length) return [];

    let filteredData = stockData;

    // Backend now handles date filtering, so we don't need frontend scheduledTickers filtering

    // Filter by watchlist if enabled
    if (showWatchlistOnly && watchlist.length > 0) {
      filteredData = filteredData.filter(stock =>
        watchlist.includes(stock.ticker.toUpperCase())
      );
    }

    // Filter by search
    if (searchValue.trim()) {
      filteredData = filteredData.filter(stock =>
        matchesSearch(stock, searchValue, searchColumn)
      );
    }

    return [...filteredData].sort((a, b) => {
      const aValue = getValue(a, sortColumn);
      const bValue = getValue(b, sortColumn);

      // Handle null/undefined/N/A values
      if (aValue === 'N/A' || aValue === null || aValue === undefined) return 1;
      if (bValue === 'N/A' || bValue === null || bValue === undefined) return -1;

      const aNum = parseFloat(String(aValue));
      const bNum = parseFloat(String(bValue));

      let comparison = 0;
      if (!isNaN(aNum) && !isNaN(bNum)) {
        comparison = aNum - bNum;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [stockData, sortColumn, sortDirection, showWatchlistOnly, watchlist, searchValue, searchColumn, matchesSearch]);

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  }, []);

  // Show/hide all columns
  const toggleAllColumns = useCallback((show: boolean) => {
    const newSet = show ? new Set(defaultColumns.map(col => col.key)) : new Set(['ticker']); // Always keep ticker visible
    setVisibleColumns(newSet);
  }, []);

  // Reset column order to default
  const resetColumnOrder = useCallback(() => {
    const defaultOrder = defaultColumns.map(col => col.key);
    setColumnOrder(defaultOrder);
  }, []);

  // Reset column widths to defaults
  const resetColumnWidths = useCallback(() => {
    const defaultWidths: Record<string, number> = {};
    defaultColumns.forEach(col => {
      defaultWidths[col.key] = col.width || 100;
    });
    setColumnWidths(defaultWidths);
  }, []);

  const orderedColumns = useMemo(() => {
    const result = columnOrder
      .map(key => defaultColumns.find(col => col.key === key))
      .filter(Boolean)
      .filter(col => visibleColumns.has(col!.key)) as ColumnConfig[];

    console.log('🔍 Ordered columns calculation:', {
      columnOrder: columnOrder,
      visibleColumns: Array.from(visibleColumns),
      result: result.map(col => col.key),
      resultCount: result.length
    });

    return result;
  }, [columnOrder, visibleColumns]);

  // Analysis panel handlers
  const handleCloseAnalysisPanel = () => {
    setShowAnalysisPanel(false);
    setSelectedTicker(null);
    setTickerMessages([]);
    // Restore the original message selection if closing ticker-specific view
    if (!initialMessageSet && messages.length > 0) {
      const analysisMessages = messages.filter(msg => !msg.link);

      if (analysisMessages.length > 0) {
        const sortedAnalysisMessages = [...analysisMessages].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setSelectedMessage(sortedAnalysisMessages[0]);
      } else if (messages.length > 0) {
        const sortedMessages = [...messages].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setSelectedMessage(sortedMessages[0]);
      }
    }
  };

  // Dummy handler for feedback modal (not implemented in this context)
  const setFeedbackModalOpen = (_open: boolean) => {
    // Could be implemented later if needed
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, columnKey: string) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnKey);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnKey: string) => {
    e.preventDefault();
    const sourceColumnKey = e.dataTransfer.getData('text/plain');

    if (sourceColumnKey && sourceColumnKey !== targetColumnKey) {
      const newOrder = [...columnOrder];
      const sourceIndex = newOrder.indexOf(sourceColumnKey);
      const targetIndex = newOrder.indexOf(targetColumnKey);

      if (sourceIndex !== -1 && targetIndex !== -1) {
        // Remove source column and insert at target position
        newOrder.splice(sourceIndex, 1);
        newOrder.splice(targetIndex, 0, sourceColumnKey);

        setColumnOrder(newOrder);
      }
    }

    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Fetch ticker-specific messages (now supplementary to real-time websocket data)
  const fetchTickerMessages = useCallback(async (ticker: string) => {
    console.log(`🔍 Fetching API messages for ticker: ${ticker}`);
    setTickerMessagesLoading(true);
    try {
      // Import the API function from your existing services
      const { getMessages } = await import('../../services/api');

      // Use the existing getMessages function with ticker search
      const data = await getMessages(50, undefined, ticker.toUpperCase());

      console.log(`📡 API returned ${data.messages?.length || 0} messages for ${ticker}`);

      // Note: Don't set ticker messages directly here anymore since real-time websocket
      // handling will take care of processing and filtering messages
      // This is just to ensure we have the latest data from API to supplement websocket

      if (data.messages && data.messages.length > 0) {
        console.log(`✅ API fetch complete for ${ticker}, websocket will process messages`);
      } else {
        console.log(`⚠️ No messages found via API for ${ticker}`);
        // If no API messages found, clear the selected message
        setSelectedMessage(null);
      }

    } catch (error) {
      console.error('Error fetching ticker messages via API:', error);
      // Don't clear ticker messages here - let the websocket handling manage the state
    } finally {
      setTickerMessagesLoading(false);
    }
  }, []);

  // Handle row click to select ticker and fetch messages
  const handleTickerRowClick = useCallback(async (ticker: string) => {
    setSelectedTicker(ticker);
    setShowAnalysisPanel(true);
    await fetchTickerMessages(ticker);
  }, [fetchTickerMessages]);

  // Column resizing handlers
  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = getColumnWidth(columnKey, defaultColumns.find(col => col.key === columnKey)?.width);
    setIsResizing(columnKey);
    setResizeStartX(e.clientX);
    setResizeStartWidth(currentWidth);
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - resizeStartX;
    const newWidth = Math.max(40, resizeStartWidth + deltaX); // Minimum 40px width for readability

    setColumnWidths(prev => ({
      ...prev,
      [isResizing]: newWidth
    }));
  }, [isResizing, resizeStartX, resizeStartWidth]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(null);
  }, []);

  // Add global mouse event listeners for column resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; // Prevent text selection during resize

      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Helper function to get actual column width
  const getColumnWidth = (columnKey: string, defaultWidth?: number): number => {
    return columnWidths[columnKey] || defaultWidth || 100;
  };

  if (isLoading && stockData.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full mx-auto mb-4">
            <Activity className="text-blue-500 animate-pulse" size={32} />
          </div>
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            Loading Real Time Grid...
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            Fetching the latest metrics data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Main content with two-column layout */}
      <div className="flex-1 min-h-0 relative">

        <div className="absolute top-0 right-0 h-full z-10 w-[35%]">
        {/* Analysis panel */}
          <AnalysisPanelGrid
            selectedMessage={selectedMessage}
            isMobile={isMobile}
            showAnalysisPanel={showAnalysisPanel}
            convertToEasternTime={convertToEasternTime}
            handleCloseAnalysisPanel={handleCloseAnalysisPanel}
            setFeedbackModalOpen={setFeedbackModalOpen}
            messages={selectedTicker ? tickerMessages : messages}
            selectedTicker={selectedTicker}
          />
        </div>

        <div
          className="flex h-full"
          style={{
            flexDirection: isMobile ? 'column' : 'row',
          }}
        >
          {/* Grid panel */}
          <div
            style={{
              width: isMobile || isCollapsed ? '100%' : '62.5%',
              display: isMobile && showAnalysisPanel ? 'none' : 'flex',
              flexDirection: 'column',
              marginRight: isMobile ? 0 : '1rem',
              height: '100%',
              minHeight: 0,
            }}
            className="bg-white dark:bg-neutral-900"
          >
            {/* Compact Controls Header */}
            <div className="flex-shrink-0 border-b border-neutral-200 dark:border-neutral-800 px-3 sm:px-4 py-2">
                            {/* Search */}
                  <div className="flex items-center gap-2">
                    <div className="relative" ref={searchDropdownRef}>
                      <button
                        onClick={() => setShowSearchDropdown(!showSearchDropdown)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-600"
                      >
                        {searchableColumns.find(col => col.key === searchColumn)?.label || 'Ticker'}
                        <ChevronDown size={12} />
                      </button>

                      {showSearchDropdown && (
                        <div className="absolute left-0 top-full mt-1 w-40 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                          {searchableColumns.map((column) => (
                            <button
                              key={column.key}
                              onClick={() => {
                                setSearchColumn(column.key);
                                setShowSearchDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 ${
                                searchColumn === column.key
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                  : 'text-neutral-900 dark:text-neutral-100'
                              }`}
                            >
                              {column.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        placeholder={`Search in ${searchableColumns.find(col => col.key === searchColumn)?.label || 'Ticker'}...`}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="text-sm border border-neutral-300 dark:border-neutral-600 rounded-md pl-8 pr-3 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 w-48"
                      />
                    </div>
                  </div>


            </div>

            {/* Filters */}
            <div className="flex-shrink-0 border-b border-neutral-200 dark:border-neutral-800 px-3 sm:px-4 py-1">
              <div className="flex items-center justify-between max-w-full mx-auto">
                <div className="flex items-center gap-4 flex-wrap">

                  {/* Watchlist Toggle - First */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Watchlist Only</span>
                    <button
                      onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        showWatchlistOnly
                          ? 'bg-blue-500 dark:bg-blue-600'
                          : 'bg-neutral-300 dark:bg-neutral-600'
                      }`}
                      role="switch"
                      aria-checked={showWatchlistOnly}
                      aria-label="Toggle watchlist only filter"
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
                          showWatchlistOnly ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Date Range Picker - Second */}
                  <div className="flex items-center gap-2 relative" ref={datePickerRef}>
                    <Calendar size={16} className="text-neutral-500" />
                    <button
                      onClick={handleDatePickerOpen}
                      className="text-sm border border-neutral-300 dark:border-neutral-600 rounded-md px-3 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:border-neutral-400 dark:hover:border-neutral-500 flex items-center gap-2 min-w-[200px] justify-between"
                      disabled={isLoading}
                    >
                      <span className="text-left">
                        {dateRange.start && dateRange.end && dateRange.start !== dateRange.end
                          ? `${dateRange.start} to ${dateRange.end}`
                          : dateRange.start
                          ? dateRange.start
                          : 'Select earnings date'}
                      </span>
                      <ChevronDown size={14} className={`transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
                    </button>

                    {isLoading && (
                      <RefreshCw size={14} className="animate-spin text-neutral-500" />
                    )}

                    {(dateRange.start || dateRange.end) && !isLoading && (
                      <button
                        onClick={handleDatePickerClear}
                        className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                        title="Clear earnings date filter"
                      >
                        Clear
                      </button>
                    )}

                    {/* Date Range Picker Dropdown */}
                    {showDatePicker && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-lg p-4 z-50 min-w-[320px]">
                        <div className="space-y-3">
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                            Filter by earnings announcement date
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 w-16">From:</label>
                            <input
                              type="date"
                              value={tempDateRange.start}
                              onChange={(e) => setTempDateRange(prev => ({...prev, start: e.target.value}))}
                              max={maxDate}
                              className="text-sm border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex-1"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 w-16">To:</label>
                            <input
                              type="date"
                              value={tempDateRange.end}
                              onChange={(e) => setTempDateRange(prev => ({...prev, end: e.target.value}))}
                              max={maxDate}
                              className="text-sm border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex-1"
                            />
                          </div>
                          <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                            <div className="flex gap-2">
                              <button
                                onClick={handleDatePickerClear}
                                className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                              >
                                Clear All
                              </button>
                              <button
                                onClick={handleDatePickerCancel}
                                className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                              >
                                Cancel
                              </button>
                            </div>
                            <button
                              onClick={handleDatePickerApply}
                              className="text-xs bg-primary-500 hover:bg-primary-600 text-white px-3 py-1 rounded"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Column Settings - Third */}
                  <div className="relative" ref={columnToggleRef}>
                    <button
                      onClick={() => setShowColumnToggle(!showColumnToggle)}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Toggle columns"
                    >
                      <Settings size={14} />
                      Columns
                    </button>

                    {showColumnToggle && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                        <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              Column Settings
                            </span>
                            <button
                              onClick={() => setShowColumnToggle(false)}
                              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                            >
                              ×
                            </button>
                          </div>
                          <div className="flex gap-2 mb-3">
                            <button
                              onClick={() => toggleAllColumns(true)}
                              className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                            >
                              Show All
                            </button>
                            <button
                              onClick={() => toggleAllColumns(false)}
                              className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600"
                            >
                              Hide All
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={resetColumnOrder}
                              className="flex-1 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded hover:bg-orange-200 dark:hover:bg-orange-800"
                            >
                              Reset Order
                            </button>
                            <button
                              onClick={resetColumnWidths}
                              className="flex-1 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                            >
                              Reset Widths
                            </button>
                          </div>
                        </div>

                        <div className="p-2">
                          {defaultColumns.map((column) => (
                            <label
                              key={column.key}
                              className="flex items-center gap-3 px-2 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={visibleColumns.has(column.key)}
                                onChange={() => toggleColumnVisibility(column.key)}
                                disabled={column.key === 'ticker'} // Always keep ticker visible
                                className="rounded border-neutral-300 dark:border-neutral-600 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                              />
                              <div className="flex items-center gap-2 flex-1">
                                {visibleColumns.has(column.key) ? (
                                  <Eye size={14} className="text-blue-500" />
                                ) : (
                                  <EyeOff size={14} className="text-neutral-400" />
                                )}
                                <span className="text-sm text-neutral-900 dark:text-neutral-100">
                                  {column.label}
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>

                        <div className="p-2 border-t border-neutral-200 dark:border-neutral-700 text-xs text-neutral-500 dark:text-neutral-400">
                          <div className="mb-1">
                            {visibleColumns.size} of {defaultColumns.length} columns visible
                          </div>
                          {savedViews.find(view => view.name === AUTO_SAVE_VIEW_NAME) && (
                            <div className="text-xs text-green-600 dark:text-green-400 opacity-75 mb-1">
                              🔄 Auto-saved
                            </div>
                          )}
                          {!isMobile && (
                            <div className="text-xs text-neutral-400 dark:text-neutral-500 space-y-0.5">
                              <div>💡 Drag column headers to reorder</div>
                              <div>🔄 Drag right edge of headers to resize</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Views Dropdown */}
                  <div className="relative" ref={viewsDropdownRef}>
                    <button
                      onClick={() => setShowViewsDropdown(!showViewsDropdown)}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Manage views"
                    >
                      <Bookmark size={14} />
                      Views
                      {currentViewId && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">
                          {savedViews.find(v => v.id === currentViewId)?.name}
                        </span>
                      )}
                    </button>

                    {showViewsDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                        <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              Saved Views
                            </span>
                            <button
                              onClick={() => setShowViewsDropdown(false)}
                              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                            >
                              ×
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              setShowSaveViewModal(true);
                              setShowViewsDropdown(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                          >
                            <Plus size={14} />
                            Save Current View
                          </button>
                        </div>

                        <div className="p-2">
                          {viewsLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <RefreshCw size={16} className="animate-spin text-neutral-500" />
                              <span className="ml-2 text-sm text-neutral-500">Loading views...</span>
                            </div>
                          ) : savedViews.length === 0 ? (
                            <div className="text-center py-4">
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                                No saved views yet
                              </p>
                              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                                Create your first view by clicking "Save Current View"
                              </p>
                            </div>
                          ) : (
                            savedViews.map((view) => (
                              <div
                                key={view.id}
                                className={`flex items-center justify-between p-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700 ${
                                  currentViewId === view.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        applyView(view);
                                        setShowViewsDropdown(false);
                                      }}
                                      className="text-left flex-1"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium ${
                                          currentViewId === view.id
                                            ? 'text-blue-700 dark:text-blue-300'
                                            : 'text-neutral-900 dark:text-neutral-100'
                                        }`}>
                                          {view.name}
                                        </span>
                                        {view.isDefault && (
                                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded">
                                            Default
                                          </span>
                                        )}
                                      </div>
                                      {view.description && (
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                          {view.description}
                                        </p>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                  <button
                                    onClick={() => {
                                      setEditingView(view);
                                      setShowEditViewModal(true);
                                      setShowViewsDropdown(false);
                                    }}
                                    className="p-1 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400"
                                    title="Edit view"
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                  {view.name !== AUTO_SAVE_VIEW_NAME && (
                                    <button
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to delete the view "${view.name}"?\n\nThis action cannot be undone.`)) {
                                          deleteView(view.id);
                                          setShowViewsDropdown(false);
                                        }
                                      }}
                                      className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                      title="Delete view"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {savedViews.length > 0 && (
                          <div className="p-2 border-t border-neutral-200 dark:border-neutral-700 text-xs text-neutral-500 dark:text-neutral-400">
                            <div>{savedViews.length} saved view{savedViews.length !== 1 ? 's' : ''}</div>
                            {savedViews.find(view => view.name === AUTO_SAVE_VIEW_NAME) && (
                              <div className="text-green-600 dark:text-green-400 opacity-75 mt-1">
                                Auto-save enabled
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1">
              {isLoading && stockData.length === 0 ? (
                <div className="flex items-center justify-center h-full py-20">
                  <RefreshCw size={40} className="animate-spin text-blue-500" />
                </div>
              ) : (
                <>
        {error ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-4">
                <AlertCircle className="text-red-500" size={32} />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Error Loading Metrics
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                {error}
              </p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full mx-auto mb-4">
                {searchValue.trim() ? (
                  <Search className="text-neutral-500" size={32} />
                ) : showWatchlistOnly ? (
                  <Filter className="text-neutral-500" size={32} />
                ) : (
                  <Activity className="text-neutral-500" size={32} />
                )}
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                {searchValue.trim()
                  ? "No Search Results Found"
                  : (dateRange.start || dateRange.end) && sortedData.length === 0
                    ? "No Data for Date Range"
                    : showWatchlistOnly
                      ? "No Watchlist Stocks Found"
                      : "No Metrics Available"
                }
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                {searchValue.trim()
                  ? `No stocks match "${searchValue}" in ${searchableColumns.find(col => col.key === searchColumn)?.label || 'Ticker'}.`
                  : (dateRange.start || dateRange.end) && sortedData.length === 0
                    ? `No metrics data available for the selected date range.`
                    : showWatchlistOnly
                      ? `No stocks from your watchlist (${watchlist.length} symbols) are currently available in the metrics data.`
                      : "No real-time metrics data found. The API may be returning an empty dataset."
                }
              </p>
              <div className="flex gap-2 justify-center">
                {searchValue.trim() && (
                  <button
                    onClick={() => setSearchValue('')}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Clear Search
                  </button>
                )}
                {(dateRange.start || dateRange.end) && (
                  <button
                    onClick={handleDatePickerClear}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Clear Earnings Filter
                  </button>
                )}
                {showWatchlistOnly && (
                  <button
                    onClick={() => setShowWatchlistOnly(false)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Show All Stocks
                  </button>
                )}
                {!searchValue.trim() && !showWatchlistOnly && (
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Refresh Data
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex-col">
            <div ref={headerScrollRef} className="overflow-x-auto min-w-full sticky top-0 z-10 bg-neutral-50 [scrollbar-width:none]">
            <table className="border-collapse" style={{ width: 'auto', minWidth: '100%' }}>
              <thead>
                <tr>
                  {orderedColumns.map((column, index) => (
                    <th
                      key={column.key}
                      className={`px-2 py-2 ${
                        column.type === 'number' || column.type === 'currency' || column.type === 'percentage'
                          ? 'text-right'
                          : 'text-left'
                      } text-xs text-neutral-500 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-700 select-none transition-colors group sticky top-0 bg-neutral-50 dark:bg-neutral-800 ${
                        index === 0 ? 'sticky left-0 z-10' : 'z-10'
                      } ${
                        draggedColumn === column.key
                          ? 'opacity-50'
                          : dragOverColumn === column.key
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : ''
                      } sticky`}
                      style={{
                        width: getColumnWidth(column.key, column.width),
                        maxWidth: getColumnWidth(column.key, column.width),
                        minWidth: getColumnWidth(column.key, column.width),
                      }}
                      onDragOver={(e) => handleDragOver(e, column.key)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, column.key)}
                    >
                      <div
                        className={`sticky flex items-center gap-1 ${!isMobile ? 'cursor-move hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded px-1 -mx-1' : ''}`}
                        draggable={!isMobile}
                        onDragStart={(e) => handleDragStart(e, column.key)}
                        onDragEnd={handleDragEnd}
                        style={{ width: '100%', minWidth: 0 }}
                      >
                        {!isMobile && (
                          <GripVertical
                            size={10}
                            className="text-neutral-400 dark:text-neutral-500 flex-shrink-0"
                          />
                        )}
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          {column.sortable ? (
                            <button
                              onClick={() => handleSort(column.key)}
                              className="flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-200 min-w-0 flex-1 "
                              style={{ justifyContent: 'flex-start' }}
                            >
                              <span
                                className="text-xs whitespace-nowrap text-ellipsis"
                                style={{
                                  fontSize: 'clamp(9px, 0.8vw, 12px)',
                                  maxWidth: '100%',
                                  display: 'block'
                                }}
                                title={column.label}
                              >
                                {column.label}
                              </span>
                              {sortColumn === column.key && (
                                <div className="flex-shrink-0 ml-1">
                                  {sortDirection === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                </div>
                              )}
                            </button>
                          ) : (
                            <span
                              className="text-xs whitespace-nowrap text-ellipsis"
                              style={{
                                fontSize: 'clamp(9px, 0.8vw, 12px)',
                                maxWidth: '100%',
                                display: 'block'
                              }}
                              title={column.label}
                            >
                              {column.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Resize handle */}
                      {!isMobile && (
                        <div
                          className={`absolute right-0 top-0 bottom-0 w-3 cursor-col-resize transition-all duration-150 flex items-center justify-center ${
                            isResizing === column.key
                              ? 'bg-blue-500 bg-opacity-80 opacity-100'
                              : 'hover:bg-blue-400 hover:bg-opacity-50 opacity-0 hover:opacity-100 group-hover:opacity-40'
                          }`}
                          onMouseDown={(e) => handleResizeStart(e, column.key)}
                          style={{
                            right: '-1px', // Slightly extend past border
                            zIndex: 15
                          }}
                          title="Drag to resize column"
                        >
                          <div className={`w-0.5 h-6 bg-white transition-opacity ${
                            isResizing === column.key ? 'opacity-90' : 'opacity-60'
                          }`} />
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
            </div>

            <div ref={bodyScrollRef} className="overflow-x-auto">
              <div className="min-w-full">
                <table style={{ width: 'auto', minWidth: '100%' }}>
                  <tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-700">
                    {sortedData.map((stock) => (
                      <tr
                        key={stock.ticker}
                        className={`hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors ${
                          selectedTicker === stock.ticker
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                            : ''
                        }`}
                        onClick={() => handleTickerRowClick(stock.ticker)}
                        title={`Click to view analysis for ${stock.ticker}`}
                      >
                        {orderedColumns.map((column, colIndex) => {
                          const value = getValue(stock, column.key);
                          const cellColor = getCellColor(value, column.colorCode);

                          return (
                            <td
                              key={column.key}
                              className={`px-3 py-2 whitespace-nowrap text-sm border-r border-neutral-200 dark:border-neutral-700 ${cellColor} ${
                                colIndex === 0 ? 'bg-white dark:bg-neutral-900 z-10' : ''
                              } ${
                                column.type === 'number' || column.type === 'currency' || column.type === 'percentage'
                                  ? 'text-right'
                                  : 'text-left'
                              } overflow-hidden text-ellipsis`}
                              style={{
                                width: getColumnWidth(column.key, column.width),
                                maxWidth: getColumnWidth(column.key, column.width),
                                minWidth: getColumnWidth(column.key, column.width)
                              }}
                            >
                              {formatValue(value, column.type)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
            )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Save View Modal */}
      {showSaveViewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-4">
              Save Current View
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const name = formData.get('name') as string;
                const description = formData.get('description') as string;
                const isDefault = formData.get('isDefault') === 'on';

                if (name.trim()) {
                  saveCurrentAsView(name.trim(), description || undefined, isDefault);
                  setShowSaveViewModal(false);
                }
              }}
            >
              <div className="mb-4">
                <label htmlFor="viewName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  View Name *
                </label>
                <input
                  id="viewName"
                  name="name"
                  type="text"
                  required
                  maxLength={15}
                  placeholder="My Custom View"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="viewDescription" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  id="viewDescription"
                  name="description"
                  rows={2}
                  placeholder="What makes this view special..."
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isDefault"
                    className="rounded border-neutral-300 dark:border-neutral-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">
                    Set as default view
                  </span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSaveViewModal(false)}
                  className="flex-1 px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Save View
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit View Modal */}
      {showEditViewModal && editingView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-4">
              Edit View
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const name = formData.get('name') as string;
                const description = formData.get('description') as string;
                const isDefault = formData.get('isDefault') === 'on';

                if (name.trim()) {
                  updateExistingView(editingView.id, {
                    name: name.trim(),
                    description: description || undefined,
                    isDefault,
                    settings: getCurrentViewSettings()
                  });
                  setShowEditViewModal(false);
                  setEditingView(null);
                }
              }}
            >
              <div className="mb-4">
                <label htmlFor="editViewName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  View Name *
                </label>
                <input
                  id="editViewName"
                  name="name"
                  type="text"
                  required
                  maxLength={15}
                  defaultValue={editingView.name}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="editViewDescription" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  id="editViewDescription"
                  name="description"
                  rows={2}
                  defaultValue={editingView.description || ''}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isDefault"
                    defaultChecked={editingView.isDefault}
                    className="rounded border-neutral-300 dark:border-neutral-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">
                    Set as default view
                  </span>
                </label>
              </div>

              <div className="mb-6">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
                  <p>Current settings will be saved:</p>
                  <ul className="pl-4 space-y-0.5">
                    <li>• Column order, visibility and widths</li>
                    <li>• Sort: {sortColumn} ({sortDirection})</li>
                    <li>• Search: {searchColumn}</li>
                    <li>• Watchlist: {showWatchlistOnly ? 'On' : 'Off'}</li>
                    <li>• Date range: {dateRange.start || dateRange.end ?
                      `${dateRange.start || 'Any'} to ${dateRange.end || 'Any'}` : 'None'}</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditViewModal(false);
                    setEditingView(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Update View
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeGrid;
