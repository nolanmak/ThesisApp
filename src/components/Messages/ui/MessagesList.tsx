import React, { useState, useEffect } from 'react';
import { Message } from '../../../types';
import { ExternalLink, BarChart2 } from 'lucide-react';
import MessageAnalysisModal from '../modals/MessageAnalysisModal';

interface MessagesListProps {
  messages: Message[];
  loading: boolean;
  convertToEasternTime: (utcTimestamp: string) => string;
}

const MessagesList: React.FC<MessagesListProps> = ({
  messages = [],
  loading,
  convertToEasternTime
}) => {
  // State for the analysis modal
  const [showAnalysisModal, setShowAnalysisModal] = useState<boolean>(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
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

  // Function to open the analysis modal
  const openAnalysisModal = (message: Message) => {
    console.log('Opening analysis modal for message:', message);
    setSelectedMessage(message);
    setShowAnalysisModal(true);
  };

  // Function to close the analysis modal
  const closeAnalysisModal = () => {
    setShowAnalysisModal(false);
    setSelectedMessage(null);
  };

  return (
    <>
      <div className="space-y-3 max-h-[calc(100vh-120px)] overflow-auto scrollbar-hide">
        {deduplicatedMessages.map((message) => (
          <div 
            key={message.message_id}
            className="bg-white p-3 rounded-md shadow-md border border-neutral-100 hover:border-primary-200 transition-colors"
          >
            {message.link ? (
              /* Link message - show on a single line like analysis messages */
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <a 
                    href={message.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {message.ticker}
                  </a>
                  <span className="text-xs text-neutral-600">Q{message.quarter}</span>
                  <span className="text-xs text-neutral-500">
                    {convertToEasternTime(message.timestamp)}
                  </span>
                </div>
                
                <a 
                  href={message.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs px-2 py-1 bg-primary-50 text-primary-600 rounded hover:bg-primary-100 transition-colors"
                >
                  <ExternalLink size={12} className="mr-1" />
                  <span>View Report</span>
                </a>
              </div>
            ) : (
              /* Analysis message - simplified with just header and analysis button */
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-medium text-neutral-800">
                    {message.ticker}
                  </h3>
                  <div className="flex items-center bg-primary-50 px-2 py-0.5 rounded-md text-xs">
                    <span className="font-medium text-primary-700">{message.ticker}</span>
                    <span className="mx-1 text-neutral-400">|</span>
                    <span className="text-neutral-600">Q{message.quarter}</span>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {convertToEasternTime(message.timestamp)}
                  </span>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openAnalysisModal(message);
                  }}
                  className="inline-flex items-center text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded hover:bg-primary-100 transition-colors"
                >
                  <BarChart2 size={12} className="mr-1" />
                  <span>Analysis</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Analysis Modal */}
      <MessageAnalysisModal
        show={showAnalysisModal}
        onClose={closeAnalysisModal}
        message={selectedMessage}
        convertToEasternTime={convertToEasternTime}
      />
    </>
  );
};

export default MessagesList;
