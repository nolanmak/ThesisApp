import { useState, useEffect, useCallback } from 'react';
import { 
  getEarningsItems, 
  updateEarningsItem, 
  createEarningsItem
} from '../../../services/api';
import { EarningsItem } from '../../../types';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

interface EarningsDataState {
  earningsItems: EarningsItem[];
  filteredEarningsItems: EarningsItem[];
  loading: boolean;
  searchTicker: string;
  filterActive: boolean | null;
  selectedDate: string;
  releaseTime: string | null;
}

const useEarningsData = (
  initialSearchTicker: string = '', 
  initialFilterActive: boolean | null = null,
  initialReleaseTime: string | null = null
) => {
  const [state, setState] = useState<EarningsDataState>({
    earningsItems: [],
    filteredEarningsItems: [],
    loading: true,
    searchTicker: initialSearchTicker,
    filterActive: initialFilterActive,
    selectedDate: format(new Date(), 'yyyy-MM-dd'),
    releaseTime: initialReleaseTime
  });

  // Fetch earnings items
  const fetchEarningsItems = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const items = await getEarningsItems();
      setState(prev => ({
        ...prev,
        earningsItems: items,
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching earnings items:', error);
      toast.error('Failed to fetch earnings items');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Handle toggling active status for an earnings item
  const handleToggleActive = useCallback(async (item: EarningsItem) => {
    try {
      const updatedItem = { ...item, is_active: !item.is_active };
      await updateEarningsItem(updatedItem);
      
      setState(prev => ({
        ...prev,
        earningsItems: prev.earningsItems.map(i => 
          i.ticker === item.ticker && i.date === item.date ? updatedItem : i
        )
      }));
      
      toast.success(`${item.ticker} is now ${!item.is_active ? 'active' : 'inactive'}`);
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to update item');
    }
  }, []);

  // Add new earnings item
  const addEarningsItem = useCallback(async (data: EarningsItem) => {
    try {
      // Format the date to YYYY-MM-DD
      const formattedDate = format(new Date(data.date), 'yyyy-MM-dd');
      const newItem = {
        ...data,
        date: formattedDate,
        is_active: data.is_active || false,
      };
      
      await createEarningsItem(newItem);
      setState(prev => ({
        ...prev,
        earningsItems: [...prev.earningsItems, newItem]
      }));
      toast.success(`Added ${newItem.ticker} for ${formattedDate}`);
      return true;
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('Failed to add item');
      return false;
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((
    searchTicker?: string,
    filterActive?: boolean | null,
    selectedDate?: string,
    releaseTime?: string | null
  ) => {
    setState(prev => ({
      ...prev,
      ...(searchTicker !== undefined ? { searchTicker } : {}),
      ...(filterActive !== undefined ? { filterActive } : {}),
      ...(selectedDate !== undefined ? { selectedDate } : {}),
      ...(releaseTime !== undefined ? { releaseTime } : {})
    }));
  }, []);

  // Apply filters to earnings items
  useEffect(() => {
    setState(prev => ({
      ...prev,
      filteredEarningsItems: prev.earningsItems.filter(item => {
        const matchesDate = item.date === prev.selectedDate;
        
        // More robust string type check
        const searchTickerStr = typeof prev.searchTicker === 'string' ? prev.searchTicker : '';
        const searchLower = searchTickerStr.toLowerCase();
        
        // Check if search starts with $ to search only by ticker
        const isTickerOnlySearch = searchTickerStr.startsWith('$');
        // If starts with $, remove it for the actual search
        const searchTermLower = isTickerOnlySearch ? searchLower.substring(1) : searchLower;
        
        // Search in ticker only if starts with $, otherwise search in both ticker and company name
        const matchesSearch = searchTickerStr === '' || 
          item.ticker.toLowerCase().includes(searchTermLower) || 
          (!isTickerOnlySearch && item.company_name && item.company_name.toLowerCase().includes(searchTermLower));
          
        const matchesActive = prev.filterActive === null || 
          item.is_active === prev.filterActive;
        
        const matchesReleaseTime = prev.releaseTime === null || 
          item.release_time === prev.releaseTime;
        
        return matchesDate && matchesSearch && matchesActive && matchesReleaseTime;
      })
    }));
  }, [state.earningsItems, state.searchTicker, state.filterActive, state.selectedDate, state.releaseTime]);

  // Initial data fetch
  useEffect(() => {
    fetchEarningsItems();
  }, [fetchEarningsItems]);

  return {
    earningsItems: state.earningsItems,
    filteredEarningsItems: state.filteredEarningsItems,
    loading: state.loading,
    searchTicker: state.searchTicker,
    filterActive: state.filterActive,
    selectedDate: state.selectedDate,
    releaseTime: state.releaseTime,
    fetchEarningsItems,
    handleToggleActive,
    addEarningsItem,
    updateFilters
  };
};

export default useEarningsData;
