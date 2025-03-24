import React, { useState, useEffect } from 'react';
import { EarningsItem, HistoricalMetrics, CompanyConfig } from '../../types';
import useEarningsData from './hooks/useEarningsData';
import useMessagesData from './hooks/useMessagesData';
import useMetricsData from './hooks/useMetricsData';
import useConfigData from './hooks/useConfigData';
import EarningsList from './ui/EarningsList';
import MessagesList from './ui/MessagesList';
import SearchFilters from './ui/SearchFilters';
import WebSocketStatus from './ui/WebSocketStatus';
import EarningsModal from './modals/EarningsModal';
import MetricsModal from './modals/MetricsModal';
import ConfigModal from './modals/ConfigModal';

const Messages: React.FC = () => {
  // Date filter state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Search states
  const [searchTicker, setSearchTicker] = useState<string>('');
  const [searchMessageTicker, setSearchMessageTicker] = useState<string>('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Custom hooks
  const {
    earningsItems,
    filteredEarningsItems,
    loading: earningsLoading,
    addEarningsItem,
    handleToggleActive,
    updateFilters,
    fetchEarningsItems: refreshEarningsData
  } = useEarningsData(searchTicker, filterActive);

  const {
    messages,
    loading: messagesLoading,
    expandedMessages,
    refreshing,
    connected: webSocketConnected,
    reconnecting: webSocketReconnecting,
    enabled: webSocketEnabled,
    toggleExpand,
    fetchMessages: refreshMessages,
    toggleEnabled,
    isExpanded,
    updateSearchTicker: setMessagesSearchTicker,
    convertToEasternTime,
    createMessagePreview
  } = useMessagesData(searchMessageTicker);

  const {
    metricsMap,
    currentItem: selectedMetricsItem,
    showMetricsModal,
    handleOpenMetricsModal,
    setShowMetricsModal,
    submitMetrics,
    metricsExist
  } = useMetricsData(earningsItems, selectedDate);

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

  const handleMessageSearchChange = (value: string) => {
    setSearchMessageTicker(value);
    setMessagesSearchTicker(value);
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
      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-120px)]">
        {/* Left side - Earnings list - 3/4 of the page */}
        <div className="w-full md:w-4/5 bg-white p-6 rounded-md shadow-md border border-neutral-100 flex flex-col overflow-hidden">
          
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

        {/* Right side - Messages - 1/4 of the page */}
        <div className="w-full md:w-1/5 flex flex-col">
          
          <WebSocketStatus
            searchMessageTicker={searchMessageTicker}
            refreshing={refreshing}
            enabled={webSocketEnabled}
            connected={webSocketConnected}
            reconnecting={webSocketReconnecting}
            onSearchChange={handleMessageSearchChange}
            onRefresh={refreshMessages}
            onToggleWebSocket={toggleEnabled}
          />
          
          <MessagesList
            messages={messages}
            loading={messagesLoading}
            expandedMessages={expandedMessages}
            onToggleExpand={toggleExpand}
            convertToEasternTime={convertToEasternTime}
            createMessagePreview={createMessagePreview}
            isExpanded={isExpanded}
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

export default Messages;
