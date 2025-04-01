import React, { useEffect, useState, useRef } from 'react';
import { Message } from '../../../types';
import { ExternalLink, BarChart2 } from 'lucide-react';

interface MessagesListProps {
  messages: Message[];
  loading: boolean;
  convertToEasternTime: (utcTimestamp: string) => string;
  onSelectMessage?: (message: Message) => void;
}

// Component for the scrolling ticker animation
const ScrollingPreview: React.FC<{ content: string }> = ({ content }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [animationDuration, setAnimationDuration] = useState(20); // Default duration in seconds
  
  useEffect(() => {
    if (containerRef.current && contentRef.current) {
      // Calculate animation duration based on content length
      // Longer content should scroll slower to ensure readability
      const contentWidth = contentRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      
      // Only animate if content is wider than container
      if (contentWidth > containerWidth) {
        // Calculate duration: longer text = longer duration
        // Base duration of 15 seconds for a standard length text
        const calculatedDuration = Math.max(15, (contentWidth / containerWidth) * 15);
        setAnimationDuration(calculatedDuration);
      } else {
        // No animation needed if content fits
        setAnimationDuration(0);
      }
    }
  }, [content]);

  // If no animation is needed, just show the static content
  if (animationDuration === 0) {
    return (
      <div className="text-xs text-neutral-700 font-medium bg-neutral-50 p-2 rounded">
        {content}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="overflow-hidden w-full bg-neutral-50 p-1 rounded border border-neutral-100"
      style={{ 
        height: '1.75rem',
        position: 'relative'
      }}
    >
      <div
        ref={contentRef}
        className="ticker-content"
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          position: 'absolute',
          left: '0',
          paddingLeft: '100%', // Start off-screen
        }}
      >
        <span className="text-xs text-neutral-700 font-medium">{content}</span>
      </div>
      <style>{`
        .ticker-content {
          animation: scrollText ${animationDuration}s linear infinite;
        }
        @keyframes scrollText {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
};

const MessagesList: React.FC<MessagesListProps> = ({
  messages = [],
  loading,
  convertToEasternTime,
  onSelectMessage
}) => {
  // State to hold the deduplicated messages
  const [deduplicatedMessages, setDeduplicatedMessages] = useState<Message[]>([]);
  // State to track new messages for highlighting
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  // Ref to track previous messages for comparison
  const prevMessagesRef = useRef<Message[]>([]);
  // Flag to track if initial load has completed
  const initialLoadCompletedRef = useRef<boolean>(false);

  // Helper function to create a preview of the message content
  const createMessagePreview = (message: Message): string => {
    if (!message.discord_message) return '';
    
    // Remove any markdown formatting
    const plainText = message.discord_message
      .replace(/\*\*/g, '') // Remove bold
      .replace(/\*/g, '')   // Remove italic
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`.*?`/g, '') // Remove inline code
      .replace(/\[.*?\]\(.*?\)/g, '') // Remove links
      .replace(/#/g, '') // Remove headings
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
      .trim();
    
    // For scrolling ticker, we want to use more of the content
    // but still keep it reasonable
    return plainText.length > 500 ? plainText.substring(0, 500) + '...' : plainText;
  };

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

  // Set initial messages after first load
  useEffect(() => {
    if (!loading && messages.length > 0 && !initialLoadCompletedRef.current) {
      // Set the initial messages as the baseline - these won't be highlighted
      prevMessagesRef.current = [...messages];
      initialLoadCompletedRef.current = true;
    }
  }, [loading, messages]);

  // Detect new messages and highlight them for 1 minute
  useEffect(() => {
    // Skip this effect until initial load is completed
    if (!initialLoadCompletedRef.current || !messages || messages.length === 0) return;
    
    // Find new messages by comparing with previous messages
    const prevMessageIds = new Set(prevMessagesRef.current.map(msg => msg.message_id));
    const currentNewMessageIds = messages
      .filter(msg => !prevMessageIds.has(msg.message_id))
      .map(msg => msg.message_id);
    
    // If we have new messages, add them to the set and set a timer to remove them
    if (currentNewMessageIds.length > 0) {
      setNewMessageIds(prev => {
        const updatedSet = new Set(prev);
        currentNewMessageIds.forEach(id => updatedSet.add(id));
        return updatedSet;
      });
      
      // For each new message, set a timeout to remove the highlight after 1 minute
      currentNewMessageIds.forEach(id => {
        setTimeout(() => {
          setNewMessageIds(prev => {
            const updatedSet = new Set(prev);
            updatedSet.delete(id);
            return updatedSet;
          });
        }, 60000); // 1 minute = 60000 milliseconds
      });
    }
    
    // Update the previous messages ref
    prevMessagesRef.current = messages;
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
          className={`bg-white p-3 rounded-md shadow-md hover:border-primary-200 transition-colors ${
            newMessageIds.has(message.message_id) 
              ? 'border-2 border-green-500' 
              : 'border border-neutral-100'
          }`}
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
            /* Analysis message with scrolling preview */
            <div className="flex flex-col">
              {/* Header with ticker and timestamp */}
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  {/* Removed redundant ticker display */}
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
                    if (onSelectMessage) {
                      onSelectMessage(message);
                    }
                  }}
                  className="inline-flex items-center text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded hover:bg-primary-100 transition-colors"
                >
                  <BarChart2 size={12} className="mr-1" />
                  <span>Analysis</span>
                </button>
              </div>
              
              {/* Scrolling preview of the message content */}
              {message.discord_message && (
                <ScrollingPreview content={createMessagePreview(message)} />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MessagesList;
