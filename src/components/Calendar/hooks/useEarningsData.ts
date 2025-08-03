import { useState, useEffect, useCallback } from "react";
import {
  getEarningsItems,
  updateEarningsItem,
  createEarningsItem,
} from "../../../services/api";
import { EarningsItem } from "../../../types";
import { toast } from "react-toastify";
import { format } from "date-fns";

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
  initialSearchTicker: string = "",
  initialFilterActive: boolean | null = null,
  initialReleaseTime: string | null = null
) => {
  const [state, setState] = useState<EarningsDataState>({
    earningsItems: [],
    filteredEarningsItems: [],
    loading: true,
    searchTicker: initialSearchTicker,
    filterActive: initialFilterActive,
    selectedDate: format(new Date(), "yyyy-MM-dd"),
    releaseTime: initialReleaseTime,
  });

  // Fetch earnings items (can be called to refresh after bulk uploads)
  const fetchEarningsItems = useCallback(
    async (bypassCache: boolean = false) => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const items = await getEarningsItems(bypassCache);
        
        // Log IRActive values from database - only for today's date
        const todayItems = items.filter(item => item.date === '2025-08-04');
        console.log(`📊 Fetched ${todayItems.length} earnings items for 2025-08-04:`);
        todayItems.forEach(item => {
          if (item.IRActive !== undefined) {
            console.log(`   ${item.ticker}: IRActive = ${item.IRActive} (type: ${typeof item.IRActive})`);
          }
        });
        
        setState((prev) => ({
          ...prev,
          earningsItems: items,
          loading: false,
        }));
      } catch (error) {
        console.error("Error fetching earnings items:", error);
        toast.error("Failed to fetch earnings items");
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    []
  );

  // Handle toggling active status for an earnings item
  const handleToggleActive = useCallback(async (item: EarningsItem) => {
    try {
      const updatedItem = {
        ...item,
        is_active: !item.is_active,
        // Set WireActive and IRActive to true when activating a stock
        WireActive: !item.is_active ? true : normalizeBooleanValue(item.WireActive),
        IRActive: !item.is_active ? true : normalizeBooleanValue(item.IRActive),
      };
      await updateEarningsItem(updatedItem);

      // Update local state instead of refetching
      setState((prev) => ({
        ...prev,
        earningsItems: prev.earningsItems.map((i) =>
          i.ticker === item.ticker && i.date === item.date ? updatedItem : i
        ),
      }));

      toast.success(
        `${item.ticker} is now ${!item.is_active ? "active" : "inactive"}`
      );
    } catch (error) {
      console.error("Failed to update item:", error);
      toast.error("Failed to update item");
    }
  }, []);

  // Helper function to normalize boolean/string values
  const normalizeBooleanValue = (value: boolean | string | undefined): boolean => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  };

  // Handle toggling just WireActive
  const handleToggleWireActive = useCallback(async (item: EarningsItem) => {
    try {
      const currentWireActive = normalizeBooleanValue(item.WireActive);
      const updatedItem = {
        ...item, // Include all existing properties
        WireActive: !currentWireActive, // Only toggle WireActive
      };
      await updateEarningsItem(updatedItem);

      // Update local state instead of refetching
      setState((prev) => ({
        ...prev,
        earningsItems: prev.earningsItems.map((i) =>
          i.ticker === item.ticker && i.date === item.date ? updatedItem : i
        ),
      }));

      toast.success(
        `${item.ticker} Wire is now ${!currentWireActive ? "active" : "inactive"}`
      );
    } catch (error) {
      console.error("Failed to update WireActive:", error);
      toast.error("Failed to update Wire status");
    }
  }, []);

  // Handle toggling just IRActive
  const handleToggleIRActive = useCallback(async (item: EarningsItem) => {
    try {
      console.log(`🔍 IRActive toggle for ${item.ticker}:`);
      console.log(`   Raw IRActive value:`, item.IRActive, `(type: ${typeof item.IRActive})`);
      
      const currentIRActive = normalizeBooleanValue(item.IRActive);
      console.log(`   Normalized IRActive:`, currentIRActive);
      console.log(`   Will toggle to:`, !currentIRActive);
      
      const updatedItem = {
        ...item, // Include all existing properties
        IRActive: !currentIRActive, // Only toggle IRActive
      };
      await updateEarningsItem(updatedItem);

      // Update local state instead of refetching
      setState((prev) => ({
        ...prev,
        earningsItems: prev.earningsItems.map((i) =>
          i.ticker === item.ticker && i.date === item.date ? updatedItem : i
        ),
      }));

      toast.success(
        `${item.ticker} IR is now ${!currentIRActive ? "active" : "inactive"}`
      );
    } catch (error) {
      console.error("Failed to update IRActive:", error);
      toast.error("Failed to update IR status");
    }
  }, []);

  // Add new earnings item
  const addEarningsItem = useCallback(async (data: EarningsItem) => {
    try {
      // Format the date to YYYY-MM-DD
      const formattedDate = format(new Date(data.date), "yyyy-MM-dd");
      const newItem = {
        ...data,
        date: formattedDate,
        is_active: data.is_active || false,
      };

      await createEarningsItem(newItem);

      // Add to local state instead of refetching
      setState((prev) => ({
        ...prev,
        earningsItems: [...prev.earningsItems, newItem],
      }));

      toast.success(`Added ${newItem.ticker} for ${formattedDate}`);
      return true;
    } catch (error) {
      console.error("Failed to add item:", error);
      toast.error("Failed to add item");
      return false;
    }
  }, []);

  // Update filters
  const updateFilters = useCallback(
    (
      searchTicker?: string,
      filterActive?: boolean | null,
      selectedDate?: string,
      releaseTime?: string | null
    ) => {
      setState((prev) => ({
        ...prev,
        ...(searchTicker !== undefined ? { searchTicker } : {}),
        ...(filterActive !== undefined ? { filterActive } : {}),
        ...(selectedDate !== undefined ? { selectedDate } : {}),
        ...(releaseTime !== undefined ? { releaseTime } : {}),
      }));
    },
    []
  );

  // Function to apply filters immediately
  const applyFilters = useCallback(() => {
    setState((prev) => {
      // First, get items for the selected date
      const itemsForDate = prev.earningsItems.filter(
        (item) => item.date === prev.selectedDate
      );

      // Then apply other filters only to those items
      const filtered = itemsForDate.filter((item) => {
        const searchTickerStr =
          typeof prev.searchTicker === "string" ? prev.searchTicker : "";
        const searchLower = searchTickerStr.toLowerCase();

        const isTickerOnlySearch = searchTickerStr.startsWith("$");
        const searchTermLower = isTickerOnlySearch
          ? searchLower.substring(1)
          : searchLower;

        const matchesSearch =
          searchTickerStr === "" ||
          item.ticker.toLowerCase().includes(searchTermLower) ||
          (!isTickerOnlySearch &&
            item.company_name &&
            item.company_name.toLowerCase().includes(searchTermLower));

        // Handle is_active filtering
        const matchesActive =
          prev.filterActive === null ||
          (prev.filterActive === true && Boolean(item.is_active)) ||
          (prev.filterActive === false && !item.is_active);

        const matchesReleaseTime =
          prev.releaseTime === null || item.release_time === prev.releaseTime;

        return matchesSearch && matchesActive && matchesReleaseTime;
      });

      return {
        ...prev,
        filteredEarningsItems: filtered,
      };
    });
  }, []);

  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters();
  }, [
    state.earningsItems,
    state.searchTicker,
    state.filterActive,
    state.selectedDate,
    state.releaseTime,
    applyFilters,
  ]);

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
    handleToggleWireActive,
    handleToggleIRActive,
    addEarningsItem,
    updateFilters,
  };
};

export default useEarningsData;
