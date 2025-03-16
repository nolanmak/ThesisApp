import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getHistoricalMetricsByTickerAndDate,
  updateHistoricalMetrics,
  createHistoricalMetrics
} from '../../../services/api';
import { EarningsItem, HistoricalMetrics } from '../../../types';
import { toast } from 'react-toastify';

const useMetricsData = (earningsItems: EarningsItem[] = []) => {
  const [metricsMap, setMetricsMap] = useState<Record<string, boolean>>({});
  const [currentItem, setCurrentItem] = useState<EarningsItem | null>(null);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  // Check if metrics exist for a ticker and date
  const checkMetricsExist = useCallback(async (ticker: string, date: string) => {
    if (!ticker || !date) return false;
    
    try {
      const metrics = await getHistoricalMetricsByTickerAndDate(ticker, date);
      const hasMetrics = metrics !== null && Object.keys(metrics).length > 0;
      return hasMetrics;
    } catch (error) {
      console.error('Error checking metrics:', error);
      // Don't fail - just assume no metrics exist
      return false;
    }
  }, []);

  // Fetch metrics status for all active items
  const fetchMetricsStatus = useCallback(async (items: EarningsItem[]) => {
    const metricsStatusMap: Record<string, boolean> = {};
    
    for (const item of items) {
      if (item.is_active) {
        const key = `${item.ticker}-${item.date}`;
        metricsStatusMap[key] = await checkMetricsExist(item.ticker, item.date);
      }
    }
    
    setMetricsMap(metricsStatusMap);
  }, [checkMetricsExist]);

  // Handle opening metrics modal
  const handleOpenMetricsModal = useCallback(async (item: EarningsItem) => {
    setCurrentItem(item);
    setShowMetricsModal(true);
    
    return item;
  }, []);

  // Handle metrics form submission
  const submitMetrics = useCallback(async (data: HistoricalMetrics) => {
    if (!currentItem) return false;

    try {
      // Add ticker and date to the metrics object
      const metricsData = {
        ...data,
        ticker: currentItem.ticker,
        date: currentItem.date
      };

      // Check if metrics exist
      const existingMetrics = await getHistoricalMetricsByTickerAndDate(currentItem.ticker, currentItem.date);
      
      if (existingMetrics && Object.keys(existingMetrics).length > 0) {
        // Update existing metrics
        await updateHistoricalMetrics(metricsData);
        toast.success(`Updated metrics for ${currentItem.ticker}`);
      } else {
        // Create new metrics
        await createHistoricalMetrics(metricsData);
        toast.success(`Added metrics for ${currentItem.ticker}`);
      }

      // Update metrics map
      setMetricsMap(prev => ({
        ...prev,
        [`${currentItem.ticker}-${currentItem.date}`]: true
      }));

      // Close modal
      setShowMetricsModal(false);
      return true;
    } catch (error) {
      console.error('Error submitting metrics:', error);
      toast.error('Failed to save metrics');
      return false;
    }
  }, [currentItem]);

  // Load metrics status when earnings items change
  useEffect(() => {
    if (earningsItems.length > 0) {
      fetchMetricsStatus(earningsItems);
    }
  }, [earningsItems, fetchMetricsStatus]);

  return {
    metricsMap,
    currentItem,
    showMetricsModal,
    setShowMetricsModal,
    handleOpenMetricsModal,
    submitMetrics,
    fetchMetricsStatus,
    checkMetricsExist,
    metricsExist: (ticker: string, date: string) => {
      const key = `${ticker}-${date}`;
      return Boolean(metricsMap[key]);
    }
  };
};

export default useMetricsData;
