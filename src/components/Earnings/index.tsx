import React, { useState, useEffect } from 'react';
import MessagesList from './ui/MessagesList';
import WebSocketStatus from './ui/WebSocketStatus';
import { Message } from '../../types';
import useGlobalData from '../../hooks/useGlobalData';
import { X } from 'lucide-react';

const Messages: React.FC = () => {
  // Search state 
  const [searchMessageTicker, setSearchMessageTicker] = useState<string>('');
  // Selected message for analysis
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  // Flag to track if initial message has been set
  const [initialMessageSet, setInitialMessageSet] = useState<boolean>(false);
  // State to track if the device is mobile
  const [isMobile, setIsMobile] = useState(false);
  // State to track if analysis panel is visible on mobile
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  
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

  // Use global data provider instead of local hook
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

  // Set the initial message on first load when messages are available
  useEffect(() => {
    // Only run this effect if we haven't set the initial message yet
    // and if we have messages and they're not loading
    if (!initialMessageSet && messages.length > 0 && !messagesLoading) {
      // Find the most recent analysis message (without a link)
      const analysisMessages = messages.filter(msg => !msg.link);
      
      if (analysisMessages.length > 0) {
        // Sort by timestamp (newest first)
        const sortedAnalysisMessages = [...analysisMessages].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        // Set the most recent analysis message
        setSelectedMessage(sortedAnalysisMessages[0]);
      } else if (messages.length > 0) {
        // If no analysis messages, just use the most recent message
        const sortedMessages = [...messages].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setSelectedMessage(sortedMessages[0]);
      }
      
      // Mark that we've set the initial message
      setInitialMessageSet(true);
    }
  }, [messages, messagesLoading, initialMessageSet]);

  // Handlers for search
  const handleMessageSearchChange = (value: string) => {
    setSearchMessageTicker(value);
    setMessagesSearchTicker(value);
  };

  // Handler for message selection
  const handleMessageSelect = (message: Message) => {
    setSelectedMessage(message);
    // On mobile, show the analysis panel when a message is selected
    if (isMobile) {
      setShowAnalysisPanel(true);
    }
  };
  
  // Handler to close analysis panel on mobile
  const handleCloseAnalysisPanel = () => {
    setShowAnalysisPanel(false);
  };

  return (
    <div className="space-y-6">
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
          />
          
          <MessagesList
            messages={messages}
            loading={messagesLoading}
            convertToEasternTime={convertToEasternTime}
            onSelectMessage={handleMessageSelect}
          />
        </div>
        
        {/* Analysis panel */}
        <div 
          style={{
            width: isMobile ? '100%' : '35%',
            display: (isMobile && !showAnalysisPanel) ? 'none' : 'flex',
            flexDirection: 'column',
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.375rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            border: '1px solid #f1f1f1',
            height: isMobile ? '100%' : undefined,
            position: isMobile ? 'absolute' : 'relative',
            top: isMobile ? 0 : undefined,
            left: isMobile ? 0 : undefined,
            right: isMobile ? 0 : undefined,
            bottom: isMobile ? 0 : undefined,
            zIndex: isMobile ? 10 : undefined
          }}
        >
          {selectedMessage ? (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div 
                className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200"
                style={{
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                  gap: isMobile ? '8px' : undefined
                }}
              >
                <div 
                  className="flex items-center space-x-2"
                  style={{
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    gap: isMobile ? '8px' : undefined,
                    width: isMobile ? 'calc(100% - 30px)' : undefined
                  }}
                >
                  <div 
                    className="flex items-center bg-primary-50 px-3 py-1 rounded-md"
                    style={{
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      padding: isMobile ? '6px 10px' : undefined,
                      width: isMobile ? '100%' : 'auto'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="font-medium text-primary-700">{selectedMessage.ticker}</span>
                      <span className="mx-1 text-neutral-400">|</span>
                      <span className="text-neutral-600">Q{selectedMessage.quarter}</span>
                    </div>
                    {selectedMessage.company_name && isMobile && (
                      <span 
                        className="text-xs text-neutral-500"
                        style={{
                          marginTop: '2px',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {selectedMessage.company_name}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-neutral-500">
                    {convertToEasternTime(selectedMessage.timestamp)}
                  </span>
                </div>
                
                {/* Close button for mobile */}
                {isMobile && (
                  <button 
                    onClick={handleCloseAnalysisPanel}
                    className="text-neutral-500 hover:text-neutral-700"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: '#f3f4f6'
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-auto">
                
                {!selectedMessage.link && (
                  <div className="prose max-w-none overflow-x-hidden">
                    <div 
                      className="text-neutral-800 whitespace-pre-wrap markdown-content break-words overflow-wrap-anywhere"
                      style={{
                        fontSize: isMobile ? '0.875rem' : '0.75rem',
                        lineHeight: isMobile ? '1.5' : undefined
                      }}
                    >
                      {(() => {
                        // Try to parse the discord_message as JSON
                        try {
                          const jsonData = JSON.parse(selectedMessage.discord_message);
                          // If it has a message property, return just that part
                          if (jsonData && jsonData.message) {
                            return jsonData.message;
                          }
                          // Otherwise, stringify the JSON with formatting for readability
                          return JSON.stringify(jsonData, null, 2);
                        } catch {
                          // Not JSON, return as is
                          return selectedMessage.discord_message;
                        }
                      })()}
                    </div>
                  </div>
                )}
                {selectedMessage.link && (
                  <div className="pt-4 border-neutral-200">
                    <a 
                      href={selectedMessage.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100 transition-colors"
                      style={{
                        display: 'inline-flex',
                        padding: isMobile ? '10px 16px' : undefined,
                        fontSize: isMobile ? '0.9rem' : undefined
                      }}
                    >
                      <span>View {selectedMessage.ticker} Report</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-500">
              <p>Select a message to view analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;