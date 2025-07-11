import React, { useState, useEffect } from 'react';
import MessagesList from './ui/MessagesList';
import WebSocketStatus from './ui/WebSocketStatus';
import AnalysisPanel from './ui/AnalysisPanel';
import FeedbackModal from './ui/FeedbackModal';
import { Message } from '../../types';
import useGlobalData from '../../hooks/useGlobalData';
import { useAudioWebSocket } from '../../hooks/useAudioWebSocket';

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
    webSocketConnected,
    webSocketReconnecting,
    webSocketEnabled,
    refreshMessages,
    toggleWebSocket: toggleEnabled,
    updateMessagesSearchTicker: setMessagesSearchTicker,
    convertToEasternTime
  } = useGlobalData();

  // Audio WebSocket integration
  const {
    connected: audioConnected,
    reconnecting: audioReconnecting,
    enabled: audioEnabled,
    lastNotification,
    enable: enableAudio,
    disable: disableAudio
  } = useAudioWebSocket({
    onAudioNotification: (notification) => {
      console.log('Audio notification received:', notification);
      // Refresh messages when audio notification received
      refreshMessages();
    },
    onConnectionChange: (connected) => {
      console.log('Audio WebSocket connection status:', connected);
    }
  });

  const handleToggleAudio = () => {
    if (audioEnabled) {
      disableAudio();
    } else {
      enableAudio();
    }
  };

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
    <div className="space-y-6">
      {/* Feedback Modal */}
      {feedbackModalOpen && selectedMessage && (
        <FeedbackModal 
          isOpen={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
          message={selectedMessage}
          convertToEasternTime={convertToEasternTime}
        />
      )}
      <div 
        className="flex h-[calc(100vh-120px)]"
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
            height: isMobile ? '100%' : undefined
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
            audioEnabled={audioEnabled}
            audioConnected={audioConnected}
            audioReconnecting={audioReconnecting}
            onToggleAudio={handleToggleAudio}
          />
          
          <MessagesList
            messages={messages}
            loading={messagesLoading}
            convertToEasternTime={convertToEasternTime}
            onSelectMessage={handleMessageSelect}
            isMobile={isMobile}
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
        />
      </div>
      
      {/* Disclaimer banner (bottom) */}
      <div className="bg-gray-50 text-gray-700 px-12 py-3 text-xs leading-tight rounded-md border border-gray-200 mt-6 text-center">
        <b>Disclaimer:</b> This platform offers information and suggestions solely for educational purposes and should not be considered a replacement for professional financial advice. We cover stock investments without guaranteeing the completeness, accuracy, reliability, or suitability of the information, which may incorporate data from third-party sources. Investing in stocks and other financial instruments carries risks, such as potential loss of principal. Users should independently verify all information and consult qualified professionals tailored to their unique financial situations and investment goals. Our content and services are provided "as is," with no express or implied warranties. We are not responsible for any losses or damages resulting from the use of our services. This disclaimer may change; users are encouraged to review it periodically. Using our services indicates acceptance of these terms.
      </div>
    </div>
  );
};



export default Messages;