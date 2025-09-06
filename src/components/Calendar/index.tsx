import React, { useState, useEffect } from 'react';
import { EarningsItem, Message } from '../../types';
import useConfigData from './hooks/useConfigData';
import EarningsList from './ui/EarningsList';
import SearchFilters from './ui/SearchFilters';
import EarningsModal from './modals/EarningsModal';
import ConfigModal from './modals/ConfigModal';
import AdminMessagesList from './ui/AdminMessagesList';
import AnalysisPanel from '../Earnings/ui/AnalysisPanel';
import FeedbackModal from '../Earnings/ui/FeedbackModal';
import useGlobalData from '../../hooks/useGlobalData';

// Helper function to get local date in YYYY-MM-DD format
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  
  // Date filter state - now using local time
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());

  // Search states
  const [searchTicker, setSearchTicker] = useState<string>('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [releaseTime, setReleaseTime] = useState<string | null>(null);

  // Analysis panel states - must be declared before useEffect that uses them
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState<boolean>(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState<boolean>(false);
  const [initialMessageSet, setInitialMessageSet] = useState<boolean>(false);

  // Use global data provider instead of local hook
  const {
    filteredEarningsItems,
    earningsLoading,
    addEarningsItem,
    handleToggleActive,
    handleToggleWireActive,
    handleToggleIRActive,
    updateEarningsFilters: updateFilters,
    fetchCompanyNamesForDate,
    refreshEarningsItems,
    refreshMessages,
    // Add messages data for the unfiltered feed
    messages,
    messagesLoading,
    messagesHasMore,
    messagesLoadingMore,
    loadMoreMessages,
    convertToEasternTime
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

  // Set initial message when messages are loaded
  useEffect(() => {
    if (!initialMessageSet && messages.length > 0 && !messagesLoading) {
      const analysisMessages = messages.filter(msg => !msg.link);
      
      if (analysisMessages.length > 0) {
        const sortedAnalysisMessages = [...analysisMessages].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setSelectedMessage(sortedAnalysisMessages[0]);
      } else if (messages.length > 0) {
        const sortedMessages = [...messages].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setSelectedMessage(sortedMessages[0]);
      }
      
      setInitialMessageSet(true);
    }
  }, [messages, messagesLoading, initialMessageSet]);

  // Modal states
  const [showEarningsModal, setShowEarningsModal] = useState<boolean>(false);
  const [currentEarningsItem, setCurrentEarningsItem] = useState<EarningsItem | null>(null);
  
  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

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
    closeConfigModal();
  };

  // Handler for message selection
  const handleMessageSelect = (message: Message) => {
    setSelectedMessage(message);
    if (isMobile) {
      setShowAnalysisPanel(true);
    }
  };
  
  const handleCloseAnalysisPanel = () => {
    setShowAnalysisPanel(false);
  };

  // Handler for cache refresh
  const handleRefreshCache = async () => {
    try {
      setIsRefreshing(true);
      
      // Refresh both earnings and messages data with cache bypass
      await Promise.all([
        refreshEarningsItems(true),
        refreshMessages(true)
      ]);
      
      // Also refresh company names for current date
      if (selectedDate) {
        await fetchCompanyNamesForDate(selectedDate);
      }
      
    } catch (error) {
      console.error('❌ Error refreshing cache:', error);
    } finally {
      setIsRefreshing(false);
    }
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
          className="w-full bg-white dark:bg-neutral-800 rounded-md shadow-md border border-neutral-100 dark:border-neutral-700 flex flex-col overflow-hidden"
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
            onRefreshClick={handleRefreshCache}
            isRefreshing={isRefreshing}
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

        {/* Unfiltered Messages Feed with Analysis Panel */}
        <div 
          className="w-full bg-white dark:bg-neutral-800 rounded-md shadow-md border border-neutral-100 dark:border-neutral-700 mt-6"
          style={{
            padding: isMobile ? '12px 8px' : '24px',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflowX: 'hidden',
            height: '600px' // Fixed height for the split view
          }}
        >
          <div className="h-full flex flex-col">
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
              Messages Feed & Analysis
            </h3>
            
            <div 
              className="flex-1 flex"
              style={{
                flexDirection: isMobile ? 'column' : 'row',
                minHeight: 0
              }}
            >
              {/* Messages list panel */}
              <div 
                style={{
                  width: isMobile ? '100%' : '65%',
                  display: isMobile && showAnalysisPanel ? 'none' : 'flex',
                  flexDirection: 'column',
                  marginRight: isMobile ? 0 : '1rem',
                  minHeight: 0
                }}
              >
                <AdminMessagesList
                  messages={messages}
                  loading={messagesLoading}
                  isMobile={isMobile}
                  convertToEasternTime={convertToEasternTime}
                  hasMoreMessages={messagesHasMore}
                  loadingMore={messagesLoadingMore}
                  onLoadMore={loadMoreMessages}
                  onSelectMessage={handleMessageSelect}
                />
              </div>
              
              {/* Analysis panel */}
              <AnalysisPanel
                selectedMessage={selectedMessage}
                isMobile={isMobile}
                showAnalysisPanel={showAnalysisPanel}
                convertToEasternTime={convertToEasternTime}
                handleCloseAnalysisPanel={handleCloseAnalysisPanel}
                setFeedbackModalOpen={setFeedbackModalOpen}
                messages={messages}
              />
            </div>
          </div>
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

      {/* Feedback Modal */}
      {feedbackModalOpen && selectedMessage && (
        <FeedbackModal 
          isOpen={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
          message={selectedMessage}
          convertToEasternTime={convertToEasternTime}
        />
      )}
    </div>
  );
};

export default Calendar;
