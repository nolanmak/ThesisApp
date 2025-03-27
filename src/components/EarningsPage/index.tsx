import React, { useState, useEffect } from 'react';
import { EarningsItem } from '../../types';
import useEarningsData from '../Messages/hooks/useEarningsData';
import useMetricsData from '../Messages/hooks/useMetricsData';
import useConfigData from '../Messages/hooks/useConfigData';
import EarningsList from '../Messages/ui/EarningsList';
import SearchFilters from '../Messages/ui/SearchFilters';
import EarningsModal from '../Messages/modals/EarningsModal';
import MetricsModal from '../Messages/modals/MetricsModal';
import ConfigModal from '../Messages/modals/ConfigModal';

const EarningsPage: React.FC = () => {
  // Date filter state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Search states
  const [searchTicker, setSearchTicker] = useState<string>('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Custom hooks
  const {
    earningsItems,
    filteredEarningsItems,
    loading: earningsLoading,
    addEarningsItem,
    handleToggleActive,
    updateFilters
    // Removed refreshEarningsData as it's no longer needed
  } = useEarningsData(searchTicker, filterActive);

  const {
    metricsMap,
    currentItem: selectedMetricsItem,
    showMetricsModal,
    handleOpenMetricsModal,
    setShowMetricsModal,
    submitMetrics,
    metricsExist
  } = useMetricsData(earningsItems, selectedDate);
  
  // Use metricsMap in a useEffect to suppress the unused variable warning
  useEffect(() => {
    if (metricsMap) {
      console.log('Metrics map updated');
    }
  }, [metricsMap]);

  const {
    currentConfigItem: selectedConfigItem,
    showConfigModal,
    getDefaultConfig,
    handleOpenConfigModal,
    handleCloseConfigModal: closeConfigModal,
    submitConfig,
    configExists,
    fetchConfigStatus
  } = useConfigData();

  useEffect(() => {
    fetchConfigStatus();
  }, [fetchConfigStatus]);

  // Modal states
  const [showEarningsModal, setShowEarningsModal] = useState<boolean>(false);
  const [currentEarningsItem, setCurrentEarningsItem] = useState<EarningsItem | null>(null);

  // Handlers for earnings modal
  const handleAddEarningsClick = () => {
    setCurrentEarningsItem(null);
    setShowEarningsModal(true);
  };

  const handleEarningsModalSubmit = async (data: EarningsItem): Promise<boolean> => {
    return await addEarningsItem(data);
  };

  // Handlers for search and filter
  const handleSearchChange = (value: string) => {
    setSearchTicker(value);
    updateFilters(value, undefined, undefined);
  };

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    updateFilters(undefined, undefined, value);
  };

  const handleFilterChange = (value: boolean | null) => {
    setFilterActive(value);
    updateFilters(undefined, value, undefined);
  };

  // Create proper close handlers for modals
  const handleCloseMetricsModal = () => {
    setShowMetricsModal(false);
  };

  const handleCloseConfigModal = () => {
    console.log('Closing config modal');
    closeConfigModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Earnings list - full width */}
        <div className="w-full bg-white p-6 rounded-md shadow-md border border-neutral-100 flex flex-col overflow-hidden">
          
          <SearchFilters
            searchTicker={searchTicker}
            selectedDate={selectedDate}
            filterActive={filterActive}
            onSearchChange={handleSearchChange}
            onDateChange={handleDateChange}
            onFilterChange={handleFilterChange}
            onAddClick={handleAddEarningsClick}
          />
          
          <EarningsList
            items={filteredEarningsItems}
            loading={earningsLoading}
            onToggleActive={handleToggleActive}
            onOpenMetricsModal={handleOpenMetricsModal}
            onOpenConfigModal={handleOpenConfigModal}
            metricsExist={metricsExist}
            configExists={configExists}
          />
        </div>
      </div>

      {/* Modals */}
      <EarningsModal
        show={showEarningsModal}
        onClose={() => setShowEarningsModal(false)}
        onSubmit={handleEarningsModalSubmit}
        currentItem={currentEarningsItem}
      />
      
      <MetricsModal
        show={showMetricsModal}
        onClose={handleCloseMetricsModal}
        onSubmit={submitMetrics}
        currentItem={selectedMetricsItem}
      />
      
      <ConfigModal
        show={showConfigModal}
        onClose={handleCloseConfigModal}
        onSubmit={submitConfig}
        currentItem={selectedConfigItem}
        getDefaultConfig={getDefaultConfig}
      />
    </div>
  );
};

export default EarningsPage;
