import React, { useState } from 'react';
import useMessagesData from '../Messages/hooks/useMessagesData';
import MessagesList from '../Messages/ui/MessagesList';
import WebSocketStatus from '../Messages/ui/WebSocketStatus';
import { Message } from '../../types';

const MessagesPage: React.FC = () => {
  // Search state
  const [searchMessageTicker, setSearchMessageTicker] = useState<string>('');
  // Selected message for analysis
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Custom hooks
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
        {/* Messages - 40% width, left aligned */}
        <div className="w-2/5 flex flex-col bg-white p-6 rounded-md shadow-md border border-neutral-100 mr-4">
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
            onSelectMessage={handleMessageSelect}
          />
        </div>
        
        {/* Right side content area - 60% width */}
        <div className="w-3/5 flex flex-col bg-white p-6 rounded-md shadow-md border border-neutral-100">
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
                <div className="prose max-w-none">
                  <div className="text-neutral-800 whitespace-pre-wrap markdown-content">
                    {selectedMessage.discord_message}
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

export default MessagesPage;
