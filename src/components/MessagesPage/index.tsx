import React, { useState } from 'react';
import useMessagesData from '../Messages/hooks/useMessagesData';
import MessagesList from '../Messages/ui/MessagesList';
import WebSocketStatus from '../Messages/ui/WebSocketStatus';

const MessagesPage: React.FC = () => {
  // Search state
  const [searchMessageTicker, setSearchMessageTicker] = useState<string>('');

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Messages - full width */}
        <div className="w-full flex flex-col bg-white p-6 rounded-md shadow-md border border-neutral-100">
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
    </div>
  );
};

export default MessagesPage;
