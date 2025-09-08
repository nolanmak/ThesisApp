import React from 'react';
import { User, Bot, AlertCircle } from 'lucide-react';

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    timestamp: Date;
    isUser: boolean;
    error?: boolean;
    metadata?: {
      query_type?: string;
      sources_count?: number;
      context_used?: boolean;
    };
  };
  convertToEasternTime?: (utcTimestamp: string) => string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, convertToEasternTime }) => {
  const formatTime = (timestamp: Date) => {
    if (convertToEasternTime) {
      return convertToEasternTime(timestamp.toISOString());
    }
    return timestamp.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className={`flex gap-3 sm:gap-4 ${message.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
        message.isUser 
          ? 'bg-blue-500 text-white' 
          : message.error
          ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
      }`}>
        {message.isUser ? (
          <User size={14} className="sm:w-4 sm:h-4" />
        ) : message.error ? (
          <AlertCircle size={14} className="sm:w-4 sm:h-4" />
        ) : (
          <Bot size={14} className="sm:w-4 sm:h-4" />
        )}
      </div>

      {/* Message content - mobile optimized */}
      <div className="flex-1 max-w-none">
        <div className={`${
          message.isUser
            ? 'bg-blue-500 text-white rounded-2xl rounded-br-sm shadow-sm'
            : message.error
            ? 'bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-800 rounded-2xl rounded-tl-sm shadow-sm'
            : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 rounded-2xl rounded-tl-sm shadow-sm'
        } px-3 sm:px-4 py-2.5 sm:py-3`}>
          <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
        
        {/* Timestamp and metadata - mobile optimized */}
        <div className={`text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 sm:mt-2 ${
          message.isUser ? 'text-right' : 'text-left'
        }`}>
          <div className="mb-1">{formatTime(message.timestamp)}</div>
          {!message.isUser && message.metadata && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {message.metadata.sources_count && (
                <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs">
                  {message.metadata.sources_count} sources
                </span>
              )}
              {message.metadata.query_type && (
                <span className="bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs">
                  {message.metadata.query_type}
                </span>
              )}
              {message.metadata.context_used && (
                <span className="bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs">
                  Context used
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;