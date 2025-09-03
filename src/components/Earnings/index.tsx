import React, { useState, useEffect } from 'react';
import MessagesList from './ui/MessagesList';
import WebSocketStatus from './ui/WebSocketStatus';
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