import React, { useState, useEffect } from 'react';
import { EarningsItem } from '../../types';
import useConfigData from './hooks/useConfigData';
import EarningsList from './ui/EarningsList';
import SearchFilters from './ui/SearchFilters';
import EarningsModal from './modals/EarningsModal';
import ConfigModal from './modals/ConfigModal';
import useGlobalData from '../../hooks/useGlobalData';

const Calendar: React.FC = () => {
  // State to track if the device is mobile
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // Check if the device is mobile based on screen width
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  // Date filter state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Search states
  const [searchTicker, setSearchTicker] = useState<string>('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [releaseTime, setReleaseTime] = useState<string | null>(null);

  // Use global data provider instead of local hook
  const {
    filteredEarningsItems,
    earningsLoading,
    addEarningsItem,
    handleToggleActive,
    handleToggleWireActive,
    handleToggleIRActive,
    updateEarningsFilters: updateFilters,
    fetchCompanyNamesForDate
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

  // Fetch company names for the initial/current selected date
  useEffect(() => {
    if (selectedDate) {
      fetchCompanyNamesForDate(selectedDate);
    }
  }, [selectedDate, fetchCompanyNamesForDate]);

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
    updateFilters(value, undefined, undefined, undefined);
  };

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    // Keep the current filter active state when changing dates
    updateFilters(undefined, filterActive, value, undefined);
    // Fetch company names for the new date
    fetchCompanyNamesForDate(value);
  };

  const handleFilterChange = (value: boolean | null) => {
    setFilterActive(value);
    updateFilters(undefined, value, undefined, undefined);
  };

  const handleReleaseTimeChange = (value: string | null) => {
    setReleaseTime(value);
    updateFilters(undefined, undefined, undefined, value);
  };

  const handleCloseConfigModal = () => {
    console.log('Closing config modal');
    closeConfigModal();
  };

  return (
    <div 
      className="space-y-6"
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden'
      }}
    >
      <div 
        className="flex flex-col"
        style={{
          height: isMobile ? 'auto' : 'calc(100vh-120px)',
          minHeight: isMobile ? 'calc(100vh-120px)' : 'auto',
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden'
        }}
      >
        {/* Earnings list - full width */}
        <div 
          className="w-full bg-white rounded-md shadow-md border border-neutral-100 flex flex-col overflow-hidden"
          style={{
            padding: isMobile ? '12px 8px' : '24px',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflowX: 'hidden'
          }}
        >
          
          <SearchFilters
            searchTicker={searchTicker}
            selectedDate={selectedDate}
            filterActive={filterActive}
            releaseTime={releaseTime}
            onSearchChange={handleSearchChange}
            onDateChange={handleDateChange}
            onFilterChange={handleFilterChange}
            onReleaseTimeChange={handleReleaseTimeChange}
            onAddClick={handleAddEarningsClick}
            isMobile={isMobile}
          />
          
          <EarningsList
            items={filteredEarningsItems}
            loading={earningsLoading}
            onToggleActive={handleToggleActive}
            onToggleWireActive={handleToggleWireActive}
            onToggleIRActive={handleToggleIRActive}
            onOpenConfigModal={handleOpenConfigModal}
            configExists={configExists}
            isMobile={isMobile}
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
