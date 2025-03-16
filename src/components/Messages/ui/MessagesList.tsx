import React from 'react';
import { Message } from '../../../types';
import { ChevronUp, ChevronDown, Loader } from 'lucide-react';

interface MessagesListProps {
  messages: Message[];
  loading: boolean;
  expandedMessages: Record<string, boolean>;
  onToggleExpand: (messageId: string) => void;
  convertToEasternTime: (utcTimestamp: string) => string;
  createMessagePreview: (content: string, maxLength?: number) => string;
  isExpanded: (messageId: string) => boolean;
}

const MessagesList: React.FC<MessagesListProps> = ({
  messages = [],
  loading,
  expandedMessages,
  onToggleExpand,
  convertToEasternTime,
  createMessagePreview,
  isExpanded
}) => {
  if (loading && (!messages || messages.length === 0)) {
    return (
      <div className="bg-white p-6 rounded-md shadow-md border border-neutral-100 text-center">
        <p className="text-neutral-500">Loading messages...</p>
      </div>
    );
  }

  if ((!messages || messages.length === 0)) {
    return (
      <div className="bg-white p-6 rounded-md shadow-md border border-neutral-100 text-center">
        <p className="text-neutral-500">No messages found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[calc(100vh-120px)] overflow-auto scrollbar-hide">
      {messages
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map((message) => (
        <div 
          key={message.message_id}
          className="bg-white p-3 rounded-md shadow-md border border-neutral-100"
        >
          <div 
            className="flex justify-between items-start cursor-pointer"
            onClick={() => onToggleExpand(message.message_id)}
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
                  onToggleExpand(message.message_id);
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
  );
};

export default MessagesList;
