import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Activity, RefreshCw, AlertCircle, ChevronUp, ChevronDown, Settings, Calendar, Filter, Eye, EyeOff, Search, GripVertical } from 'lucide-react';
import { useMetricsData } from '../../hooks/useGlobalData';
import { useWatchlist } from '../../hooks/useWatchlist';
import AnalysisPanel from '../Earnings/ui/AnalysisPanel';
import useGlobalData from '../../hooks/useGlobalData';
import { Message } from '../../types';

interface ColumnConfig {
  key: string;
  label: string;
  width?: number;
  sortable?: boolean;
  type?: 'text' | 'number' | 'percentage' | 'currency';
  colorCode?: 'beats' | 'performance';
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
    convertToEasternTime
  } = useGlobalData();

  const [sortColumn, setSortColumn] = useState<string>('ticker');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const columnToggleRef = useRef<HTMLDivElement>(null);
  
  // Analysis panel state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [initialMessageSet, setInitialMessageSet] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  
  // Search state
  const [searchValue, setSearchValue] = useState<string>('');
  const [searchColumn, setSearchColumn] = useState<string>('ticker');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  
  // Drag and drop state
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

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

  // Initialize column order and visibility
  useEffect(() => {
    if (columnOrder.length === 0) {
      // Load saved column order or use default
      const savedOrder = localStorage.getItem('realTimeGrid-columnOrder');
      if (savedOrder) {
        const parsedOrder = JSON.parse(savedOrder);
        // Ensure all default columns are present and remove any that no longer exist
        const validOrder = parsedOrder.filter((key: string) => defaultColumns.some(col => col.key === key));
        const missingColumns = defaultColumns.filter(col => !validOrder.includes(col.key)).map(col => col.key);
        setColumnOrder([...validOrder, ...missingColumns]);
      } else {
        setColumnOrder(defaultColumns.map(col => col.key));
      }
    }
    if (visibleColumns.size === 0) {
      // Load saved preferences or show all columns by default
      const savedVisibility = localStorage.getItem('realTimeGrid-visibleColumns');
      if (savedVisibility) {
        setVisibleColumns(new Set(JSON.parse(savedVisibility)));
      } else {
        setVisibleColumns(new Set(defaultColumns.map(col => col.key)));
      }
    }
  }, []);

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
    };

    if (showColumnToggle || showSearchDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColumnToggle, showSearchDropdown]);

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
    
    // Filter by watchlist if enabled
    if (showWatchlistOnly && watchlist.length > 0) {
      filteredData = stockData.filter(stock => 
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
      // Save to localStorage
      localStorage.setItem('realTimeGrid-visibleColumns', JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  // Show/hide all columns
  const toggleAllColumns = useCallback((show: boolean) => {
    const newSet = show ? new Set(defaultColumns.map(col => col.key)) : new Set(['ticker']); // Always keep ticker visible
    setVisibleColumns(newSet);
    localStorage.setItem('realTimeGrid-visibleColumns', JSON.stringify([...newSet]));
  }, []);

  // Reset column order to default
  const resetColumnOrder = useCallback(() => {
    const defaultOrder = defaultColumns.map(col => col.key);
    setColumnOrder(defaultOrder);
    localStorage.setItem('realTimeGrid-columnOrder', JSON.stringify(defaultOrder));
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
  };

  // Dummy handler for feedback modal (not implemented in this context)
  const setFeedbackModalOpen = (open: boolean) => {
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
        // Save to localStorage
        localStorage.setItem('realTimeGrid-columnOrder', JSON.stringify(newOrder));
      }
    }
    
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
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
                          <button
                            onClick={resetColumnOrder}
                            className="w-full text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded hover:bg-orange-200 dark:hover:bg-orange-800"
                          >
                            Reset Column Order
                          </button>
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
                            <div className="text-xs text-neutral-400 dark:text-neutral-500">
                              💡 Drag column headers to reorder
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh metrics"
                  >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
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
                  
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-neutral-500" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="text-sm border border-neutral-300 dark:border-neutral-600 rounded-md px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                    />
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
                  {searchValue.trim() && (
                    <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                      Filtered
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-auto">
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
                  : showWatchlistOnly 
                    ? "No Watchlist Stocks Found" 
                    : "No Metrics Available"
                }
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                {searchValue.trim()
                  ? `No stocks match "${searchValue}" in ${searchableColumns.find(col => col.key === searchColumn)?.label || 'Ticker'}.`
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
          <div className="min-w-full">
            <table className="w-full border-collapse">
              <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10">
                <tr>
                  {orderedColumns.map((column, index) => (
                    <th
                      key={column.key}
                      draggable={!isMobile}
                      onDragStart={(e) => handleDragStart(e, column.key)}
                      onDragOver={(e) => handleDragOver(e, column.key)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, column.key)}
                      onDragEnd={handleDragEnd}
                      className={`px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-r border-neutral-200 dark:border-neutral-700 select-none transition-colors ${
                        index === 0 ? 'sticky left-0 bg-neutral-50 dark:bg-neutral-800 z-20' : ''
                      } ${
                        draggedColumn === column.key 
                          ? 'opacity-50' 
                          : dragOverColumn === column.key 
                            ? 'bg-blue-100 dark:bg-blue-900/30' 
                            : ''
                      } ${
                        !isMobile ? 'cursor-move hover:bg-neutral-100 dark:hover:bg-neutral-700' : ''
                      }`}
                      style={{ width: column.width }}
                    >
                      <div className="flex items-center gap-2">
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
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-700">
                {sortedData.map((stock, rowIndex) => (
                  <tr key={stock.ticker} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                    {orderedColumns.map((column, colIndex) => {
                      const value = stock[column.key];
                      const cellColor = getCellColor(value, column.colorCode);
                      
                      return (
                        <td
                          key={column.key}
                          className={`px-3 py-2 whitespace-nowrap text-sm border-r border-neutral-200 dark:border-neutral-700 ${cellColor} ${
                            colIndex === 0 ? 'sticky left-0 bg-white dark:bg-neutral-900 z-10 font-medium' : ''
                          }`}
                          style={{ width: column.width }}
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
            messages={messages}
          />
        </div>
      </div>
    </div>
  );
};

export default RealTimeGrid;