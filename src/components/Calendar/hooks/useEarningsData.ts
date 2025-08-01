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
    filteredEarningsItems: [],
    loading: true,
    searchTicker: initialSearchTicker,
    filterActive: initialFilterActive,
    selectedDate: format(new Date(), 'yyyy-MM-dd'),
    releaseTime: initialReleaseTime
  });

  // Fetch and filter earnings items
  const fetchAndFilterEarningsItems = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const items = await getEarningsItems();
      
      // Apply filters to fresh data
      const filtered = items.filter(item => {
        const matchesDate = item.date === state.selectedDate;
        
        const searchTickerStr = typeof state.searchTicker === 'string' ? state.searchTicker : '';
        const searchLower = searchTickerStr.toLowerCase();
        
        const isTickerOnlySearch = searchTickerStr.startsWith('$');
        const searchTermLower = isTickerOnlySearch ? searchLower.substring(1) : searchLower;
        
        const matchesSearch = searchTickerStr === '' || 
          item.ticker.toLowerCase().includes(searchTermLower) || 
          (!isTickerOnlySearch && item.company_name && item.company_name.toLowerCase().includes(searchTermLower));
          
        const matchesActive = state.filterActive === null || 
          item.is_active === state.filterActive;
        
        const matchesReleaseTime = state.releaseTime === null || 
          item.release_time === state.releaseTime;
        
        return matchesDate && matchesSearch && matchesActive && matchesReleaseTime;
      });

      setState(prev => ({
        ...prev,
        filteredEarningsItems: filtered,
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching earnings items:', error);
      toast.error('Failed to fetch earnings items');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.searchTicker, state.filterActive, state.selectedDate, state.releaseTime]);

  // Handle toggling active status for an earnings item
  const handleToggleActive = useCallback(async (item: EarningsItem) => {
    try {
      const updatedItem = { 
        ...item, 
        is_active: !item.is_active,
        // Set WireActive and IRActive to true when activating a stock
        WireActive: !item.is_active ? true : item.WireActive,
        IRActive: !item.is_active ? true : item.IRActive
      };
      await updateEarningsItem(updatedItem);
      
      // Refetch fresh data instead of updating state
      await fetchAndFilterEarningsItems();
      
      toast.success(`${item.ticker} is now ${!item.is_active ? 'active' : 'inactive'}`);
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to update item');
    }
  }, [fetchAndFilterEarningsItems]);

  // Handle toggling just WireActive
  const handleToggleWireActive = useCallback(async (item: EarningsItem) => {
    try {
      const updatedItem = { 
        ...item,                     // Include all existing properties 
        WireActive: !item.WireActive // Only toggle WireActive
      };
      await updateEarningsItem(updatedItem);
      
      // Refetch fresh data instead of updating state
      await fetchAndFilterEarningsItems();
      
      toast.success(`${item.ticker} Wire is now ${!item.WireActive ? 'active' : 'inactive'}`);
    } catch (error) {
      console.error('Failed to update WireActive:', error);
      toast.error('Failed to update Wire status');
    }
  }, [fetchAndFilterEarningsItems]);

  // Handle toggling just IRActive
  const handleToggleIRActive = useCallback(async (item: EarningsItem) => {
    try {
      const updatedItem = { 
        ...item,                   // Include all existing properties 
        IRActive: !item.IRActive   // Only toggle IRActive
      };
      await updateEarningsItem(updatedItem);
      
      // Refetch fresh data instead of updating state
      await fetchAndFilterEarningsItems();
      
      toast.success(`${item.ticker} IR is now ${!item.IRActive ? 'active' : 'inactive'}`);
    } catch (error) {
      console.error('Failed to update IRActive:', error);
      toast.error('Failed to update IR status');
    }
  }, [fetchAndFilterEarningsItems]);

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
      
      // Refetch fresh data instead of updating state
      await fetchAndFilterEarningsItems();
      
      toast.success(`Added ${newItem.ticker} for ${formattedDate}`);
      return true;
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('Failed to add item');
      return false;
    }
  }, [fetchAndFilterEarningsItems]);

  // Update filters and refetch data
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

  // Fetch fresh data when filters change
  useEffect(() => {
    fetchAndFilterEarningsItems();
  }, [fetchAndFilterEarningsItems]);

  return {
    earningsItems: state.filteredEarningsItems, // Return filtered items as earningsItems for compatibility
    filteredEarningsItems: state.filteredEarningsItems,
    loading: state.loading,
    searchTicker: state.searchTicker,
    filterActive: state.filterActive,
    selectedDate: state.selectedDate,
    releaseTime: state.releaseTime,
    fetchEarningsItems: fetchAndFilterEarningsItems,
    handleToggleActive,
    handleToggleWireActive,
    handleToggleIRActive,
    addEarningsItem,
    updateFilters
  };
};

export default useEarningsData;
