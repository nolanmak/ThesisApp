import React, { useState, useEffect } from 'react';
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
  // State to hold the deduplicated messages
  const [deduplicatedMessages, setDeduplicatedMessages] = useState<Message[]>([]);

  // Use useEffect to filter out duplicate messages for the same ticker
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    // Create a map to track the first message for each ticker
    const tickerMessageMap = new Map<string, Message>();
    
    // Sort messages by timestamp (newest first) before deduplication
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Process messages to keep only the first one per ticker
    sortedMessages.forEach(message => {
      // For each ticker, we want to keep at most 2 messages:
      // 1. One with a link (typically the first announcement)
      // 2. One with processed data from the report
      
      const key = message.ticker;
      const existingMessage = tickerMessageMap.get(key);
      
      // If we don't have a message for this ticker yet, add it
      if (!existingMessage) {
        tickerMessageMap.set(key, message);
      } 
      // If we already have a message for this ticker
      else {
        // If current message has a link and existing doesn't, or vice versa, keep both
        const hasLink = !!message.link;
        const existingHasLink = !!existingMessage.link;
        
        // If they have different link status (one has link, other doesn't), 
        // we want to keep both as they serve different purposes
        if (hasLink !== existingHasLink) {
          // Store as a special key to keep both messages
          tickerMessageMap.set(`${key}-${hasLink ? 'link' : 'data'}`, message);
        }
        // If both have the same link status, keep the newer one (which should be first in our sorted array)
        // This is already handled by the initial set operation
      }
    });
    
    // Convert the map values back to an array and sort by timestamp
    const deduplicated = Array.from(tickerMessageMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    setDeduplicatedMessages(deduplicated);
  }, [messages]);

  if (loading && (!messages || messages.length === 0)) {
    return (
      <div className="bg-white p-6 rounded-md shadow-md border border-neutral-100 text-center">
        <p className="text-neutral-500">Loading messages...</p>
      </div>
    );
  }

  if ((!deduplicatedMessages || deduplicatedMessages.length === 0)) {
    return (
      <div className="bg-white p-6 rounded-md shadow-md border border-neutral-100 text-center">
        <p className="text-neutral-500">No messages found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[calc(100vh-120px)] overflow-auto scrollbar-hide">
      {deduplicatedMessages.map((message) => (
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
              {message.link && (
                <div className="mt-2">
                  <a 
                    href={message.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-800 hover:underline"
                  >
                    {message.ticker}
                  </a>
                </div>
              )}
            </div>
          )}
          
          {isExpanded(message.message_id) && (
            <div className="text-neutral-700 whitespace-pre-wrap markdown-content mt-1 text-xs">
              {message.discord_message}
              {message.link && (
                <div className="mt-2">
                  <a 
                    href={message.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-800 hover:underline"
                  >
                    {message.ticker}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MessagesList;
