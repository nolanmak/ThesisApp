import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Activity, RefreshCw, AlertCircle, ChevronUp, ChevronDown, Settings, Calendar, Filter, Eye, EyeOff, Search, GripVertical, Save, Bookmark, Edit3, Plus, AlertTriangle } from 'lucide-react';
import { useMetricsData } from '../../hooks/useGlobalData';
import { useWatchlist } from '../../hooks/useWatchlist';
import AnalysisPanel from '../Earnings/ui/AnalysisPanel';
import useGlobalData from '../../hooks/useGlobalData';
import { Message } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getUserProfile, updateUserProfile, UserProfile } from '../../services/api';

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
  // Use global metrics data instead of local fetching
  const {
    metricsData: stockData,
    metricsLoading: isLoading,
    metricsError: error,
    metricsLastUpdated: lastUpdated,
    refreshMetrics: handleRefresh
  } = useMetricsData();

  // Use watchlist data for filtering
  const { watchlist } = useWatchlist();

  // Get messages and websocket data for the analysis panel
  const {
    messages,
    convertToEasternTime,
    earningsItems
  } = useGlobalData();

  // User authentication for views
  const { user } = useAuth();

  const [sortColumn, setSortColumn] = useState<string>('ticker');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [dateRange, setDateRange] = useState<{start: string; end: string}>({start: '', end: ''});
  const [tempDateRange, setTempDateRange] = useState<{start: string; end: string}>({start: '', end: ''});
  const [scheduledTickers, setScheduledTickers] = useState<string[]>([]);
  const [dateFilterLoading, setDateFilterLoading] = useState<boolean>(false);
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

  // Define column configuration
  const defaultColumns: ColumnConfig[] = [
    { key: 'ticker', label: 'Ticker', width: 80, sortable: true, type: 'text' },
    { key: 'industry', label: 'Industry', width: 200, sortable: true, type: 'text' },
    { key: '$eps0', label: 'Current EPS', width: 100, sortable: true, type: 'number', colorCode: 'beats' },
    { key: '$eps1', label: 'EPS -1Q', width: 100, sortable: true, type: 'number', colorCode: 'beats' },
    { key: '$eps2', label: 'EPS -2Q', width: 100, sortable: true, type: 'number', colorCode: 'beats' },
    { key: '$eps3', label: 'EPS -3Q', width: 100, sortable: true, type: 'number', colorCode: 'beats' },
    { key: '$eps4', label: 'EPS -4Q', width: 100, sortable: true, type: 'number', colorCode: 'beats' },
    { key: 'nextfyepsmean', label: 'Next FY EPS', width: 120, sortable: true, type: 'number' },
    { key: 'peexclxorttm', label: 'P/E Ratio', width: 100, sortable: true, type: 'number' },
    { key: 'pr2bookq', label: 'P/B Ratio', width: 100, sortable: true, type: 'number' },
    { key: 'salesa', label: 'Sales (Annual)', width: 140, sortable: true, type: 'currency' },
    { key: '$salesqest', label: 'Sales Est Q', width: 120, sortable: true, type: 'currency' },
    { key: 'sharesq', label: 'Shares Q', width: 120, sortable: true, type: 'number' },
    { key: '#institution', label: 'Institutions', width: 120, sortable: true, type: 'number' },
    { key: 'gmgn%q', label: 'Gross Margin %', width: 140, sortable: true, type: 'percentage', colorCode: 'performance' },
    { key: 'projpenextfy', label: 'Proj P/E Next FY', width: 140, sortable: true, type: 'number' },
  ];

  // Searchable columns (subset of default columns that make sense to search)
  const searchableColumns = useMemo(() => [
    { key: 'ticker', label: 'Ticker' },
    { key: 'industry', label: 'Industry' },
    { key: '$eps0', label: 'Current EPS' },
    { key: '$eps1', label: 'EPS -1Q' },
    { key: '$eps2', label: 'EPS -2Q' },
    { key: '$eps3', label: 'EPS -3Q' },
    { key: '$eps4', label: 'EPS -4Q' },
    { key: 'nextfyepsmean', label: 'Next FY EPS' },
    { key: 'peexclxorttm', label: 'P/E Ratio' },
    { key: 'pr2bookq', label: 'P/B Ratio' },
    { key: 'salesa', label: 'Sales (Annual)' },
    { key: 'gmgn%q', label: 'Gross Margin %' },
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
    if (columnOrder.length === 0) {
      setColumnOrder(defaultColumns.map(col => col.key));
    }
    if (visibleColumns.size === 0) {
      setVisibleColumns(new Set(defaultColumns.map(col => col.key)));
      setColumnVisibility(initialColumnVisibility);
    }
    // Initialize column widths with defaults
    if (Object.keys(columnWidths).length === 0) {
      const initialWidths: Record<string, number> = {};
      defaultColumns.forEach(col => {
        initialWidths[col.key] = col.width || 100;
      });
      setColumnWidths(initialWidths);
    }
  }, [initialColumnVisibility, columnWidths]);

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
        
        // Set current view if there's a default one
        const defaultView = (profile.settings.gridViews as GridView[]).find(view => view.isDefault);
        if (defaultView) {
          setCurrentViewId(defaultView.id);
          applyView(defaultView);
        }
      }
    } catch (error) {
      console.error('Failed to load user views:', error);
    } finally {
      setViewsLoading(false);
    }
  }, [user?.email]);

  const saveView = useCallback(async (view: GridView, isUpdate: boolean = false) => {
    if (!user?.email) return;
    
    try {
      const profile = await getUserProfile(user.email);
      const currentViews = (profile?.settings?.gridViews as GridView[]) || [];
      
      let updatedViews;
      if (isUpdate) {
        updatedViews = currentViews.map(v => v.id === view.id ? view : v);
      } else {
        // If this is marked as default, unmark other default views
        if (view.isDefault) {
          currentViews.forEach(v => v.isDefault = false);
        }
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
      setCurrentViewId(view.id);
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
    
    // Apply column order
    if (settings.columnOrder) {
      setColumnOrder(settings.columnOrder);
    }
    
    // Apply visible columns
    if (settings.visibleColumns) {
      const visibleSet = new Set(settings.visibleColumns);
      setVisibleColumns(visibleSet);
      
      // Also update columnVisibility state
      const visibility = { ...initialColumnVisibility };
      Object.keys(visibility).forEach(key => {
        visibility[key] = visibleSet.has(key);
      });
      setColumnVisibility(visibility);
    }
    
    // Apply column widths
    if (settings.columnWidths) {
      setColumnWidths(settings.columnWidths);
    }
    
    // Apply sorting
    if (settings.sortColumn && settings.sortDirection) {
      setSortColumn(settings.sortColumn);
      setSortDirection(settings.sortDirection);
    }
    
    // Apply watchlist toggle
    setShowWatchlistOnly(settings.showWatchlistOnly || false);
    
    // Apply search
    setSearchValue(settings.searchValue || '');
    setSearchColumn(settings.searchColumn || 'ticker');
    
    // Apply date range if available
    if (settings.startDate || settings.endDate) {
      const newRange = {
        start: settings.startDate || '',
        end: settings.endDate || ''
      };
      // Show loading immediately when applying view with date range
      setDateFilterLoading(true);
      setDateRange(newRange);
      setTempDateRange(newRange);
    }
    
    setCurrentViewId(view.id);
  }, [initialColumnVisibility]);

  const getCurrentViewSettings = useCallback(() => {
    return {
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
    const existingView = savedViews.find(v => v.id === viewId);
    if (!existingView) return;
    
    const updatedView: GridView = {
      ...existingView,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await saveView(updatedView, true);
  }, [savedViews, saveView]);

  const saveCurrentAsView = useCallback(async (name: string, description?: string, isDefault?: boolean) => {
    await createNewView(name, description, isDefault);
  }, [createNewView]);

  // Load user views on mount (placed after function definitions)
  useEffect(() => {
    if (user?.email) {
      loadUserViews();
    }
  }, [user?.email, loadUserViews]);

  // Start date filtering loading when date range changes
  useEffect(() => {
    if (dateRange.start || dateRange.end) {
      // Date fetching starts - turn loading to true
      setDateFilterLoading(true);
    } else {
      // No date range - turn loading to false immediately
      setDateFilterLoading(false);
      setScheduledTickers([]);
    }
  }, [dateRange.start, dateRange.end]);

  // Perform actual filtering and stop loading when data is available
  useEffect(() => {
    if ((dateRange.start || dateRange.end) && earningsItems.length > 0) {
      // Filter earnings data that's already loaded in memory
      const filteredEarnings = earningsItems.filter(earning => {
        const earningDate = earning.date;
        
        // Check start date
        if (dateRange.start && earningDate < dateRange.start) {
          return false;
        }
        
        // Check end date (or use start date as end if only start is provided)
        const endDate = dateRange.end || dateRange.start;
        if (endDate && earningDate > endDate) {
          return false;
        }
        
        return true;
      });
      
      const tickers = filteredEarnings.map(earning => earning.ticker.toUpperCase());
      setScheduledTickers(tickers);
      
      // Filtering stops - turn loading to false
      setDateFilterLoading(false);
    }
  }, [dateRange.start, dateRange.end, earningsItems]);

  // No need for local API fetching - data comes from GlobalDataProvider

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
        if (numValue > 0) return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200';
        if (numValue < 0) return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200';
        return 'bg-gray-50 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200';
      case 'performance':
        if (numValue > 50) return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200';
        if (numValue < 20) return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200';
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200';
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
    
    const value = stock[columnKey];
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
    
    // Filter by date range (scheduled earnings) if dates are selected
    if ((dateRange.start || dateRange.end) && scheduledTickers.length > 0) {
      filteredData = filteredData.filter(stock => 
        scheduledTickers.includes(stock.ticker.toUpperCase())
      );
    }
    
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
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
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
  }, [stockData, sortColumn, sortDirection, showWatchlistOnly, watchlist, searchValue, searchColumn, matchesSearch, dateRange.start, dateRange.end, scheduledTickers]);

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
    return columnOrder
      .map(key => defaultColumns.find(col => col.key === key))
      .filter(Boolean)
      .filter(col => visibleColumns.has(col!.key)) as ColumnConfig[];
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

  // Fetch ticker-specific messages
  const fetchTickerMessages = useCallback(async (ticker: string) => {
    setTickerMessagesLoading(true);
    try {
      // Import the API function from your existing services
      const { getMessages } = await import('../../services/api');
      
      // Use the existing getMessages function with ticker search
      const data = await getMessages(50, undefined, ticker.toUpperCase());
      
      // Use the same message type logic as AnalysisPanel
      const getMessageType = (message: Message): string => {
        if (message.link || message.report_data?.link || 
            message.source?.toLowerCase() === 'link' || 
            message.type?.toLowerCase() === 'link') return 'report';
        if (message.source === 'transcript_analysis') return 'transcript';
        if (message.source === 'sentiment_analysis' || message.sentiment_additional_metrics) return 'sentiment';
        if (message.source === 'fundamentals_analysis') return 'fundamentals';
        return 'earnings';
      };

      // Group by message type and get the newest for each type
      const messagesByType: Record<string, Message> = {};
      
      if (data.messages && Array.isArray(data.messages)) {
        data.messages.forEach((message: Message) => {
          const messageType = getMessageType(message);
          
          // If we don't have a message of this type yet, or this message is newer
          if (!messagesByType[messageType] || 
              new Date(message.timestamp) > new Date(messagesByType[messageType].timestamp)) {
            messagesByType[messageType] = message;
          }
        });
      }
      
      // Convert to array and sort by timestamp (newest first)
      const newestMessages = Object.values(messagesByType).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setTickerMessages(newestMessages);
      
      // Set the first (newest) message as selected for the analysis panel
      if (newestMessages.length > 0) {
        setSelectedMessage(newestMessages[0]);
      } else {
        // No messages found - set to null so fundamentals tab will show by default
        setSelectedMessage(null);
      }
      
      console.log(`✅ Found ${newestMessages.length} unique message types for ${ticker}:`, 
        newestMessages.map(m => `${getMessageType(m)} (${m.timestamp})`));
      
    } catch (error) {
      console.error('Error fetching ticker messages:', error);
      setTickerMessages([]);
      setSelectedMessage(null);
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
      <div className="flex-1 min-h-0">
        <div 
          className="flex h-full"
          style={{
            flexDirection: isMobile ? 'column' : 'row'
          }}
        >
          {/* Grid panel */}
          <div 
            style={{
              width: isMobile ? '100%' : '65%',
              display: isMobile && showAnalysisPanel ? 'none' : 'flex',
              flexDirection: 'column',
              marginRight: isMobile ? 0 : '1rem',
              height: '100%',
              minHeight: 0
            }}
            className="bg-white dark:bg-neutral-900"
          >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center justify-between max-w-full mx-auto">
                <div className="flex items-center gap-3">
                  <Activity className="text-blue-500" size={24} />
                  <h1 className="text-lg sm:text-xl font-medium text-neutral-900 dark:text-neutral-100">
                    Real Time Grid
                  </h1>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="relative" ref={columnToggleRef}>
                    <button
                      onClick={() => setShowColumnToggle(!showColumnToggle)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Toggle columns"
                    >
                      <Settings size={16} />
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
                      className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Manage views"
                    >
                      <Bookmark size={16} />
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
                                  {!view.isDefault && (
                                    <button
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to delete the view "${view.name}"?`)) {
                                          deleteView(view.id);
                                        }
                                      }}
                                      className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                                      title="Delete view"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        
                        {savedViews.length > 0 && (
                          <div className="p-2 border-t border-neutral-200 dark:border-neutral-700 text-xs text-neutral-500 dark:text-neutral-400">
                            {savedViews.length} saved view{savedViews.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex-shrink-0 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-2">
              <div className="flex items-center justify-between max-w-full mx-auto">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
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
                  
                  <div className="flex items-center gap-2 relative" ref={datePickerRef}>
                    <Calendar size={16} className="text-neutral-500" />
                    <button
                      onClick={handleDatePickerOpen}
                      className="text-sm border border-neutral-300 dark:border-neutral-600 rounded-md px-3 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:border-neutral-400 dark:hover:border-neutral-500 flex items-center gap-2 min-w-[200px] justify-between"
                      disabled={dateFilterLoading}
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
                    
                    {dateFilterLoading && (
                      <RefreshCw size={14} className="animate-spin text-neutral-500" />
                    )}
                    
                    {(dateRange.start || dateRange.end) && !dateFilterLoading && (
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
                
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  {sortedData.length} stocks
                  {showWatchlistOnly && (
                    <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      Watchlist ({watchlist.length})
                    </span>
                  )}
                  {(dateRange.start || dateRange.end) && scheduledTickers.length > 0 && (
                    <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                      Earnings ({scheduledTickers.length})
                    </span>
                  )}
                  {searchValue.trim() && (
                    <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                      Filtered
                    </span>
                  )}
                  {selectedTicker && (
                    <span className={`ml-2 text-xs px-2 py-1 rounded flex items-center gap-1 ${
                      tickerMessages.length === 0 && !tickerMessagesLoading
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                    }`}>
                      {tickerMessagesLoading && <RefreshCw size={12} className="animate-spin" />}
                      Selected: {selectedTicker}
                      {tickerMessages.length === 0 && !tickerMessagesLoading && (
                        <span className="text-xs opacity-75">(Fundamentals)</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-hidden">
              {dateFilterLoading ? (
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
                  : (dateRange.start || dateRange.end) && scheduledTickers.length === 0
                    ? "No Earnings Found"
                    : showWatchlistOnly 
                      ? "No Watchlist Stocks Found" 
                      : "No Metrics Available"
                }
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                {searchValue.trim()
                  ? `No stocks match "${searchValue}" in ${searchableColumns.find(col => col.key === searchColumn)?.label || 'Ticker'}.`
                  : (dateRange.start || dateRange.end) && scheduledTickers.length === 0
                    ? `No earnings announcements found for the selected date range.`
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
          <div className="overflow-auto h-full">
            <div className="min-w-full">
            <table className="border-collapse" style={{ width: 'auto', minWidth: '100%' }}>
              <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10">
                <tr>
                  {orderedColumns.map((column, index) => (
                    <th
                      key={column.key}
                      className={`px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-r border-neutral-200 dark:border-neutral-700 select-none transition-colors group ${
                        index === 0 ? 'sticky left-0 bg-neutral-50 dark:bg-neutral-800 z-20' : ''
                      } ${
                        draggedColumn === column.key 
                          ? 'opacity-50' 
                          : dragOverColumn === column.key 
                            ? 'bg-blue-100 dark:bg-blue-900/30' 
                            : ''
                      } relative`}
                      style={{ 
                        width: getColumnWidth(column.key, column.width),
                        maxWidth: getColumnWidth(column.key, column.width),
                        minWidth: getColumnWidth(column.key, column.width)
                      }}
                      onDragOver={(e) => handleDragOver(e, column.key)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, column.key)}
                    >
                      <div 
                        className={`flex items-center gap-2 ${!isMobile ? 'cursor-move hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded px-1 -mx-1' : ''}`}
                        draggable={!isMobile}
                        onDragStart={(e) => handleDragStart(e, column.key)}
                        onDragEnd={handleDragEnd}
                      >
                        {!isMobile && (
                          <GripVertical 
                            size={12} 
                            className="text-neutral-400 dark:text-neutral-500 flex-shrink-0" 
                          />
                        )}
                        <div className="flex items-center gap-1 flex-1">
                          {column.sortable ? (
                            <button
                              onClick={() => handleSort(column.key)}
                              className="flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-200"
                            >
                              <span className="truncate">{column.label}</span>
                              {sortColumn === column.key && (
                                sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                              )}
                            </button>
                          ) : (
                            <span className="truncate">{column.label}</span>
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
                      const value = stock[column.key];
                      const cellColor = getCellColor(value, column.colorCode);
                      
                      return (
                        <td
                          key={column.key}
                          className={`px-3 py-2 whitespace-nowrap text-sm border-r border-neutral-200 dark:border-neutral-700 ${cellColor} ${
                            colIndex === 0 ? 'sticky left-0 bg-white dark:bg-neutral-900 z-10 font-medium' : ''
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
            )}
                </>
              )}
            </div>
          </div>
          
          {/* Analysis panel */}
          <AnalysisPanel
            selectedMessage={selectedMessage}
            isMobile={isMobile}
            showAnalysisPanel={showAnalysisPanel}
            convertToEasternTime={convertToEasternTime}
            handleCloseAnalysisPanel={handleCloseAnalysisPanel}
            setFeedbackModalOpen={setFeedbackModalOpen}
            messages={selectedTicker ? tickerMessages : messages}
            selectedTicker={selectedTicker}
            tickerMessagesLoading={tickerMessagesLoading}
          />
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