import { useContext } from 'react';
import { GlobalDataContext } from '../providers/GlobalDataProvider';

/**
 * Custom hook to use the global data context
 * This provides access to proactively loaded data from the GlobalDataProvider
 */
export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (context === undefined) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
};

/**
 * Convenience hook for just metrics data
 * Returns only the metrics-related data and functions from the global context
 */
export const useMetricsData = () => {
  const {
    metricsData,
    metricsLoading,
    metricsError,
    metricsLastUpdated,
    refreshMetrics
  } = useGlobalData();

  return {
    metricsData,
    metricsLoading,
    metricsError,
    metricsLastUpdated,
    refreshMetrics
  };
};

export default useGlobalData;
