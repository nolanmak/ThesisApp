import React, { useState, useEffect } from 'react';
import { EarningsItem } from '../../types';
import useConfigData from './hooks/useConfigData';
import EarningsList from './ui/EarningsList';
import SearchFilters from './ui/SearchFilters';
import EarningsModal from './modals/EarningsModal';
import ConfigModal from './modals/ConfigModal';
import useGlobalData from '../../hooks/useGlobalData';

const Calendar: React.FC = () => {
  // Date filter state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Search states
  const [searchTicker, setSearchTicker] = useState<string>('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Use global data provider instead of local hook
  const {
    filteredEarningsItems,
    earningsLoading,
    addEarningsItem,
    handleToggleActive,
    updateEarningsFilters: updateFilters
  } = useGlobalData();
  
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
            onOpenConfigModal={handleOpenConfigModal}
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

export default Calendar;
