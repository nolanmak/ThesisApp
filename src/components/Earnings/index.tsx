import React, { useState, useEffect } from 'react';
import MessagesList from './ui/MessagesList';
import WebSocketStatus from './ui/WebSocketStatus';
import { Message } from '../../types';
import useGlobalData from '../../hooks/useGlobalData';

const Messages: React.FC = () => {
  // Search state 
  const [searchMessageTicker, setSearchMessageTicker] = useState<string>('');
  // Selected message for analysis
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  // Flag to track if initial message has been set
  const [initialMessageSet, setInitialMessageSet] = useState<boolean>(false);

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
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-row h-[calc(100vh-120px)]">
        {/* Messages - 50% width, left aligned */}
        <div className="w-[65%] flex flex-col mr-4">
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
        
        {/* Right side content area - 50% width */}
        <div className="w-[35%] flex flex-col bg-white p-6 rounded-md shadow-md border border-neutral-100">
          {selectedMessage ? (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center bg-primary-50 px-3 py-1 rounded-md">
                    <span className="font-medium text-primary-700">{selectedMessage.ticker}</span>
                    <span className="mx-1 text-neutral-400">|</span>
                    <span className="text-neutral-600">Q{selectedMessage.quarter}</span>
                  </div>
                  <span className="text-sm text-neutral-500">
                    {convertToEasternTime(selectedMessage.timestamp)}
                  </span>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-auto">
                <div className="prose max-w-none overflow-x-hidden">
                  <div className="text-neutral-800 whitespace-pre-wrap markdown-content break-words overflow-wrap-anywhere text-sm">
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
                  
                  {selectedMessage.link && (
                    <div className="mt-4 pt-4 border-t border-neutral-200">
                      <a 
                        href={selectedMessage.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100 transition-colors"
                      >
                        <span>View {selectedMessage.ticker} Report</span>
                      </a>
                    </div>
                  )}
                </div>
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