import React from 'react';
import { Message } from '../../../types';
import { ExternalLink } from 'lucide-react';

interface AdminMessagesListProps {
  messages: Message[];
  loading: boolean;
  isMobile?: boolean;
  convertToEasternTime: (utcTimestamp: string) => string;
  hasMoreMessages?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onSelectMessage?: (message: Message) => void;
}

const AdminMessagesList: React.FC<AdminMessagesListProps> = ({
  messages = [],
  loading,
  isMobile,
  convertToEasternTime,
  hasMoreMessages = false,
  loadingMore = false,
  onLoadMore,
  onSelectMessage,
}) => {
  // Sort messages by timestamp (newest first) without any filtering
  const sortedMessages = React.useMemo(() => {
    return [...messages].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [messages]);

  if (loading && (!messages || messages.length === 0)) {
    return (
      <div className="bg-white dark:bg-neutral-800 p-6 rounded-md shadow-md border border-neutral-100 dark:border-neutral-700 text-center">
        <p className="text-neutral-500 dark:text-neutral-400">Loading messages...</p>
      </div>
    );
  }

  if ((!sortedMessages || sortedMessages.length === 0)) {
    return (
      <div className="bg-white dark:bg-neutral-800 p-6 rounded-md shadow-md border border-neutral-100 dark:border-neutral-700 text-center">
        <p className="text-neutral-500 dark:text-neutral-400">No messages found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          All Messages ({sortedMessages.length}) - Click to view analysis
        </p>
      </div>
      
      <div 
        className="flex-1 overflow-auto scrollbar-hide"
        style={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden'
        }}
      >
      {sortedMessages.map((message) => (
        <div 
          key={message.message_id}
          className="bg-white dark:bg-neutral-800 py-2 px-2 border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
          onClick={() => onSelectMessage && onSelectMessage(message)}
          style={{
            padding: isMobile ? '10px 8px' : undefined,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflowX: 'hidden',
          }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Ticker and company info */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-neutral-800 dark:text-neutral-100 text-sm">
                  {message.ticker}
                </span>
                {message.company_name && !isMobile && (
                  <span className="text-neutral-500 dark:text-neutral-400 text-xs truncate max-w-[200px]">
                    {message.company_name}
                  </span>
                )}
                <span className="text-neutral-600 dark:text-neutral-400 text-xs">
                  Q{message.quarter} {message.year}
                </span>
              </div>

              {/* Message type indicator */}
              <div className="flex items-center gap-1">
                {message.source === 'transcript_analysis' && (
                  <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-xs font-medium">
                    Transcript
                  </span>
                )}
                {(message.source === 'sentiment_analysis' || message.sentiment_additional_metrics) && (
                  <span className="bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs font-medium">
                    Sentiment
                  </span>
                )}
                {message.link && (
                  <span className="bg-sky-50 dark:bg-sky-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium">
                    Report
                  </span>
                )}
                {!message.link && !message.source && (
                  <span className="bg-neutral-50 dark:bg-neutral-900/30 text-neutral-800 dark:text-neutral-300 px-2 py-1 rounded text-xs font-medium">
                    Analysis
                  </span>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-neutral-500 dark:text-neutral-400 text-xs flex-shrink-0">
                {isMobile 
                  ? convertToEasternTime(message.timestamp).split(',')[1]?.trim() || convertToEasternTime(message.timestamp)
                  : convertToEasternTime(message.timestamp)
                }
              </span>
            </div>

            {/* External link icon for reports */}
            {message.link && (
              <div 
                className="inline-flex items-center justify-center w-5 h-5 bg-primary-50 text-primary-600 rounded-full hover:bg-primary-100 transition-colors ml-2"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent message selection when clicking link
                  window.open(message.link, '_blank', 'noopener,noreferrer');
                }}
              >
                <ExternalLink size={12} />
              </div>
            )}
          </div>
        </div>
      ))}
      
      {/* Load More Button */}
      {hasMoreMessages && (
        <div className="bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 px-4 py-3 text-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loadingMore ? 'Loading more messages...' : 'Load More Messages'}
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminMessagesList;