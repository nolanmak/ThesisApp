import React, { useState, useEffect, useMemo } from 'react';
import { Activity, RefreshCw, AlertCircle, ChevronUp, ChevronDown, Settings, Calendar, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface StockMetric {
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
  [key: string]: any;
}

interface APIResponse {
  metrics: StockMetric[];
  timestamp?: string;
  status?: string;
}

interface ColumnConfig {
  key: string;
  label: string;
  width?: number;
  sortable?: boolean;
  type?: 'text' | 'number' | 'percentage' | 'currency';
  colorCode?: 'beats' | 'performance';
}

const RealTimeGrid: React.FC = () => {
  const { user } = useAuth();
  const [stockData, setStockData] = useState<StockMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('ticker');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  // API configuration using environment variables
  const API_BASE = import.meta.env.VITE_RESEARCH_API_BASE_URL;
  const API_KEY = import.meta.env.VITE_USER_PROFILE_API_KEY;
  const METRICS_ENDPOINT = `${API_BASE}/metrics`;

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

  // Initialize column order
  useEffect(() => {
    if (columnOrder.length === 0) {
      setColumnOrder(defaultColumns.map(col => col.key));
    }
  }, []);

  const fetchMetrics = async () => {
    if (!user?.email) {
      setError('User authentication required');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      const response = await fetch(METRICS_ENDPOINT, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: APIResponse = await response.json();
      console.log('Metrics API response:', data);

      if (data.metrics && Array.isArray(data.metrics)) {
        setStockData(data.metrics);
      } else {
        console.log('Unexpected API response format, using fallback data');
        setStockData([]);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMetrics();
  }, [user?.email]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [user?.email]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchMetrics();
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

  const sortedData = useMemo(() => {
    if (!stockData.length) return [];
    
    return [...stockData].sort((a, b) => {
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
  }, [stockData, sortColumn, sortDirection]);

  const orderedColumns = useMemo(() => {
    return columnOrder.map(key => defaultColumns.find(col => col.key === key)).filter(Boolean) as ColumnConfig[];
  }, [columnOrder]);

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
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-full mx-auto">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-500" size={24} />
            <div>
              <h1 className="text-lg sm:text-xl font-medium text-neutral-900 dark:text-neutral-100">
                Real Time Grid
              </h1>
              {lastUpdated && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={showWatchlistOnly}
                onChange={(e) => setShowWatchlistOnly(e.target.checked)}
                className="rounded border-neutral-300 dark:border-neutral-600 text-blue-500 focus:ring-blue-500"
              />
              Watchlist Only
            </label>
            
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-neutral-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm border border-neutral-300 dark:border-neutral-600 rounded-md px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>
          
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            {sortedData.length} stocks
          </div>
        </div>
      </div>

      {/* Content */}
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
                <Activity className="text-neutral-500" size={32} />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                No Metrics Available
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                No real-time metrics data found. The API may be returning an empty dataset.
              </p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Refresh Data
              </button>
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
                      className={`px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-r border-neutral-200 dark:border-neutral-700 ${
                        index === 0 ? 'sticky left-0 bg-neutral-50 dark:bg-neutral-800 z-20' : ''
                      }`}
                      style={{ width: column.width }}
                    >
                      {column.sortable ? (
                        <button
                          onClick={() => handleSort(column.key)}
                          className="flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-200"
                        >
                          {column.label}
                          {sortColumn === column.key && (
                            sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          )}
                        </button>
                      ) : (
                        column.label
                      )}
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
  );
};

export default RealTimeGrid;