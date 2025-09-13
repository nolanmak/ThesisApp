import React, { useState, useEffect, useRef } from 'react';
import MessagesList from './ui/MessagesList';
import WebSocketStatus from './ui/WebSocketStatus';
import WatchlistToggle from './ui/WatchlistToggle';
import AnalysisPanel from './ui/AnalysisPanel';
import FeedbackModal from './ui/FeedbackModal';
import { Message } from '../../types';
import useGlobalData from '../../hooks/useGlobalData';

const Messages: React.FC = () => {
  const [searchMessageTicker, setSearchMessageTicker] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [initialMessageSet, setInitialMessageSet] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Refs for tracking message changes (similar to RealTimeGrid pattern)
  const prevMessagesRef = useRef<Message[]>([]);
  const initialLoadCompletedRef = useRef<boolean>(false);
  
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const {
    messages,
    messagesLoading,
    messagesRefreshing: refreshing,
    messagesHasMore,
    messagesLoadingMore,
    webSocketConnected,
    webSocketReconnecting,
    webSocketEnabled,
    refreshMessages,
    loadMoreMessages,
    toggleWebSocket: toggleEnabled,
    updateMessagesSearchTicker: setMessagesSearchTicker,
    convertToEasternTime
  } = useGlobalData();


  // Set initial message after first load
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

  // Set initial messages after first load (similar to RealTimeGrid pattern)
  useEffect(() => {
    if (!messagesLoading && messages.length > 0 && !initialLoadCompletedRef.current) {
      prevMessagesRef.current = [...messages];
      initialLoadCompletedRef.current = true;
      console.log(`📋 Earnings: Initial load completed with ${messages.length} messages`);
    }
  }, [messagesLoading, messages]);

  // Detect new messages for real-time auto-selection (similar to RealTimeGrid pattern)
  useEffect(() => {
    // Skip this effect until initial load is completed
    if (!initialLoadCompletedRef.current || !messages || messages.length === 0) return;
    
    // Find genuinely new messages (following MessagesList pattern)
    const prevMessageIds = new Set(prevMessagesRef.current.map(msg => msg.message_id || msg.id));
    
    const genuinelyNewMessages = messages.filter(msg => {
      const msgId = msg.message_id || msg.id;
      const isNewToState = !prevMessageIds.has(msgId);
      const messageTime = new Date(msg.timestamp).getTime();
      const isRecentMessage = messageTime > (Date.now() - 2 * 60 * 1000); // Last 2 minutes
      
      // Only consider it truly new if it's new to our state AND is a very recent message
      return isNewToState && isRecentMessage;
    });
    
    // If we have genuinely new messages, auto-select the newest one from ANY ticker
    if (genuinelyNewMessages.length > 0) {
      console.log(`🆕 Earnings: Found ${genuinelyNewMessages.length} genuinely new messages`);
      
      // Sort all new messages by timestamp (newest first) and select the newest one
      const newestMessage = genuinelyNewMessages.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
      
      console.log(`🎯 Earnings: Auto-selecting newest message from ANY ticker (${newestMessage.ticker}):`, newestMessage.message_id?.substring(0, 8) || newestMessage.id?.substring(0, 8));
      
      // Update selected message to the newest one from any ticker
      setSelectedMessage(newestMessage);
      
      // Show analysis panel on mobile if a new message is selected
      if (isMobile) {
        setShowAnalysisPanel(true);
      }
    }
    
    // Update the previous messages ref
    prevMessagesRef.current = messages;
  }, [messages, isMobile]);

  const handleMessageSearchChange = (value: string) => {
    setSearchMessageTicker(value);
    setMessagesSearchTicker(value);
  };

  const handleMessageSelect = (message: Message) => {
    setSelectedMessage(message);
    if (isMobile) {
      setShowAnalysisPanel(true);
    }
  };
  
  const handleCloseAnalysisPanel = () => {
    setShowAnalysisPanel(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Feedback Modal */}
      {feedbackModalOpen && selectedMessage && (
        <FeedbackModal 
          isOpen={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
          message={selectedMessage}
          convertToEasternTime={convertToEasternTime}
        />
      )}
      
      {/* Main earnings content */}
      <div className="flex-1 min-h-0">
        <div 
          className="flex h-full"
          style={{
            flexDirection: isMobile ? 'column' : 'row'
          }}
        >
          {/* Messages panel */}
          <div 
            style={{
              width: isMobile ? '100%' : '65%',
              display: isMobile && showAnalysisPanel ? 'none' : 'flex',
              flexDirection: 'column',
              marginRight: isMobile ? 0 : '1rem',
              height: '100%',
              minHeight: 0
            }}
          >
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
            
            <WatchlistToggle />
            
            <MessagesList
              messages={messages}
              loading={messagesLoading}
              convertToEasternTime={convertToEasternTime}
              onSelectMessage={handleMessageSelect}
              isMobile={isMobile}
              hasMoreMessages={messagesHasMore}
              loadingMore={messagesLoadingMore}
              onLoadMore={loadMoreMessages}
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
      
      {/* Disclaimer banner (bottom) - positioned at bottom of page */}
      <div className="bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 px-4 py-3 text-xs leading-tight rounded-md border border-gray-200 dark:border-neutral-700 mt-4 text-center flex-shrink-0">
        <b>Disclaimer:</b> This platform offers information and suggestions solely for educational purposes and should not be considered a replacement for professional financial advice. We cover stock investments without guaranteeing the completeness, accuracy, reliability, or suitability of the information, which may incorporate data from third-party sources. Investing in stocks and other financial instruments carries risks, such as potential loss of principal. Users should independently verify all information and consult qualified professionals tailored to their unique financial situations and investment goals. Our content and services are provided "as is," with no express or implied warranties. We are not responsible for any losses or damages resulting from the use of our services. This disclaimer may change; users are encouraged to review it periodically. Using our services indicates acceptance of these terms.
      </div>
    </div>
  );
};



export default Messages;