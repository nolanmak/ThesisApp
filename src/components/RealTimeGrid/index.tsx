import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface MetricData {
  id: string;
  name: string;
  value: number | string;
  timestamp: string;
  status?: 'up' | 'down' | 'neutral';
  change?: number;
}

interface APIResponse {
  metrics: MetricData[];
  timestamp: string;
  status: string;
}

const RealTimeGrid: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // API configuration using environment variables
  const API_BASE = import.meta.env.VITE_RESEARCH_API_BASE_URL;
  const API_KEY = import.meta.env.VITE_USER_PROFILE_API_KEY;
  const METRICS_ENDPOINT = `${API_BASE}/metrics`;

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
        setMetrics(data.metrics);
      } else {
        // Fallback for different API response format
        console.log('Unexpected API response format, using fallback data');
        setMetrics([]);
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

  const formatValue = (value: number | string): string => {
    if (typeof value === 'number') {
      // Format large numbers with commas
      if (value > 1000) {
        return value.toLocaleString();
      }
      // Format decimals to 2 places
      if (value % 1 !== 0) {
        return value.toFixed(2);
      }
    }
    return String(value);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-neutral-600 dark:text-neutral-400';
    }
  };

  const getChangeIndicator = (change?: number) => {
    if (!change) return null;
    
    const isPositive = change > 0;
    return (
      <span className={`text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    );
  };

  if (isLoading && metrics.length === 0) {
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
        <div className="flex items-center justify-between max-w-7xl mx-auto">
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
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh metrics"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
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
          ) : metrics.length === 0 ? (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 sm:p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">
                      {metric.name}
                    </h3>
                    {metric.change !== undefined && getChangeIndicator(metric.change)}
                  </div>
                  
                  <div className="mb-3">
                    <p className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                      {formatValue(metric.value)}
                    </p>
                  </div>
                  
                  {metric.timestamp && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(metric.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTimeGrid;