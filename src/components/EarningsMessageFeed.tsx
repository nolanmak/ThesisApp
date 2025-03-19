import React from 'react';
import { Message } from '../types';
import { Search, Loader, Wifi, WifiOff, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';

interface EarningsMessageFeedProps {
  messages: Message[];
  loading: boolean;
  refreshing: boolean;
  searchMessageTicker: string;
  setSearchMessageTicker: (value: string) => void;
  toggleExpand: (messageId: string) => void;
  isExpanded: (messageId: string) => boolean;
  handleRefreshWithToast: () => void;
  convertToEasternTime: (utcTimestamp: string) => string;
  createMessagePreview: (content: string, maxLength?: number) => string;
  connected: boolean;
  reconnecting: boolean;
  enabled: boolean;
  enableWebSocket: () => void;
  disableWebSocket: () => void;
  fetchMessages: (bypassCache?: boolean) => Promise<void>;
}

const EarningsMessageFeed: React.FC<EarningsMessageFeedProps> = ({
  messages,
  loading,
  refreshing,
  searchMessageTicker,
  setSearchMessageTicker,
  toggleExpand,
  isExpanded,
  handleRefreshWithToast,
  convertToEasternTime,
  createMessagePreview,
  connected,
  reconnecting,
  enabled,
  enableWebSocket,
  disableWebSocket,
  fetchMessages
}) => {
  return (
    <div className="w-full md:w-1/4 flex flex-col">
      <div className="mb-3 flex items-center">
        {/* Message search box */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <Search size={14} className="text-neutral-400" />
          </div>
          <input
            type="text"
            placeholder="Search messages"
            value={searchMessageTicker}
            onChange={(e) => setSearchMessageTicker(e.target.value)}
            className="pl-8 pr-16 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-xs h-8"
          />
          <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-1">
            {refreshing && (
              <div className="flex items-center text-primary-600">
                <Loader size={14} className="animate-spin" />
              </div>
            )}
            
            {/* Live button */}
            <button
              onClick={() => {
                if (enabled) {
                  disableWebSocket();
                  toast.info('Real-time updates disabled');
                } else {
                  enableWebSocket();
                  // Force a connection attempt after enabling
                  setTimeout(() => {
                    if (enabled) {
                      // This will trigger a connection attempt if the WebSocket is enabled
                      fetchMessages(true);
                    }
                  }, 100);
                  toast.info('Real-time updates enabled');
                }
              }}
              className={`flex items-center justify-center rounded-full w-6 h-6 transition-colors duration-150 ease-in-out ${
                enabled 
                  ? connected 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : reconnecting 
                      ? 'bg-amber-500 text-white hover:bg-amber-600' 
                      : 'bg-neutral-300 text-white hover:bg-neutral-400'
                  : 'bg-neutral-200 text-neutral-500 hover:bg-neutral-300'
              }`}
              title={enabled ? "Disable real-time updates" : "Enable real-time updates"}
            >
              {enabled ? (
                connected ? (
                  <Wifi size={12} />
                ) : (
                  reconnecting ? (
                    <Loader size={12} className="animate-spin" />
                  ) : (
                    <WifiOff size={12} />
                  )
                )
              ) : (
                <WifiOff size={12} />
              )}
            </button>
            
            {/* Refresh button */}
            <button
              onClick={handleRefreshWithToast}
              disabled={refreshing}
              className={`flex items-center justify-center rounded-full w-6 h-6 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors duration-150 ease-in-out shadow-sm ${
                refreshing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Refresh data"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 scrollbar-hide" style={{ maxHeight: 'calc(100vh - 165px)' }}>
        {loading && messages.length === 0 ? (
          <div className="bg-white p-6 rounded-md shadow-md border border-neutral-100 text-center">
            <p className="text-neutral-500">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-white p-6 rounded-md shadow-md border border-neutral-100 text-center">
            <p className="text-neutral-500">No messages found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map((message) => (
              <div 
                key={message.message_id}
                className="bg-white p-3 rounded-md shadow-md border border-neutral-100"
              >
                <div 
                  className="flex justify-between items-start cursor-pointer"
                  onClick={() => toggleExpand(message.message_id)}
                >
                  <h3 className="text-sm font-medium text-neutral-800">
                    {message.ticker}
                  </h3>
                  <div className="flex items-center">
                    <div className="flex items-center bg-primary-50 px-2 py-0.5 rounded-md text-xs">
                      <span className="font-medium text-primary-700">{message.ticker}</span>
                      <span className="mx-1 text-neutral-400">|</span>
                      <span className="text-neutral-600">Q{message.quarter}</span>
                    </div>
                    <button
                      className="p-0.5 ml-1 text-neutral-500 hover:text-primary-600 transition-colors"
                      title={isExpanded(message.message_id) ? "Collapse" : "Expand"}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the parent onClick
                        toggleExpand(message.message_id);
                      }}
                    >
                      {isExpanded(message.message_id) ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center text-xs text-neutral-500 mt-1 mb-1">
                  <span>{convertToEasternTime(message.timestamp)}</span>
                </div>
                
                {!isExpanded(message.message_id) && (
                  <div className="text-neutral-600 whitespace-pre-wrap mt-1 text-xs">
                    {createMessagePreview(message.discord_message, 80)}
                  </div>
                )}
                
                {isExpanded(message.message_id) && (
                  <div className="text-neutral-700 whitespace-pre-wrap markdown-content mt-1 text-xs">
                    {message.discord_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EarningsMessageFeed;
