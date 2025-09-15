import React, { useEffect, useState, useRef } from 'react';
import { Message, MetricItem } from '../../../types';
import { ExternalLink } from 'lucide-react';
import { ParseMessagePayload } from '../utils/messageUtils';
import { useAlpacaMarketData } from '../../../hooks/useAlpacaMarketData';
import { useWatchlist } from '../../../hooks/useWatchlist';
import { useAuth } from '../../../contexts/AuthContext';

interface MessagesListProps {
  messages: Message[];
  loading: boolean;
  isMobile?: boolean;
  convertToEasternTime: (utcTimestamp: string) => string;
  onSelectMessage?: (message: Message) => void;
  hasMoreMessages?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

const StaticPreview: React.FC<{ 
  content: { [key: string]: MetricItem[] } | null; 
  isMobile?: boolean;
  previewKey?: number;
}> = ({ content, isMobile = false, previewKey }) => {
  if (content) {
    return (
      <div key={previewKey}
      className={`
        bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 rounded flex items-center w-full max-w-full box-border overflow-hidden my-[2px]
        ${isMobile
          ? 'py-[2px] px-[4px] min-h-4 max-h-[60px]'
          : 'py-[3px] px-[8px] min-h-[20px] max-h-[80px]'}
      `}
      >
        <div key={previewKey} className={`flex w-full overflow-hidden ${isMobile ? 'flex-col gap-0.5' : 'flex-row flex-nowrap gap-2 items-center whitespace-nowrap'}`}>
          {content ? (
            <div key={previewKey} className={`flex ${isMobile ? 'flex-col gap-0.5' : 'flex-col flex-nowrap gap-2'} items-start`}>
              {Object.keys(content)
              .filter((key) => ['Current Quarter', 'Next Quarter', 'Historical Growth', 'Current Year', 'Next Year'].includes(key))
              .slice(0, 3)
              .map((key, index) => (
                <div key={`${key}-${index}`} className={`flex items-center flex-shrink-0 ${isMobile ? 'gap-0.5 flex-nowrap whitespace-nowrap' : 'gap-1'}`}>
                  <div className={`font-bold text-blue-800 dark:text-blue-300 flex-shrink-0 ${isMobile ? 'text-[0.45rem]' : 'text-[0.7rem]'}`}>
                    {key}:
                  </div>
                  {content[key]
                  .map((metric: MetricItem, itemIndex: number) => (
                    <React.Fragment key={`${key}-metric-${itemIndex}`}>
                    {typeof metric === 'string' ? (
                      <div className={`font-medium text-blue-800 dark:text-blue-300 flex-shrink-0 ${isMobile ? 'text-[0.45rem]' : 'text-[0.7rem]'}`}>{metric}</div>
                    ) : metric.text ? (
                      <div className={`font-medium text-blue-800 dark:text-blue-300 flex-shrink-0 ${isMobile ? 'text-[0.45rem]' : 'text-[0.7rem]'}`}>{metric.text}</div>
                    ) : null}
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div key={previewKey} className={`text-blue-800 dark:text-blue-300 font-medium text-center ${isMobile ? 'text-[0.45rem]' : 'text-[0.7rem]'}`}>No metrics available</div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div key={previewKey}
      className={`bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 rounded flex items-center w-full max-w-full box-border overflow-hidden my-[2px]
      ${isMobile
        ? 'py-[2px] px-[4px] min-h-4 max-h-[60px]'
        : 'py-[3px] px-[8px] min-h-[20px] max-h-[80px]'}`}
    >
      <div key={previewKey} className={`
          text-blue-800 dark:text-blue-300 font-medium w-full overflow-hidden leading-[1.1]
          ${isMobile
            ? 'text-[0.45rem] whitespace-pre-wrap text-clip break-words'
            : 'text-[0.7rem] whitespace-nowrap truncate break-normal'}
        `}
      >
        {typeof content === 'string' ? content : ''}
      </div>
    </div>
  );
};

const MessagesList: React.FC<MessagesListProps> = ({
  messages = [],
  loading,
  isMobile,
  convertToEasternTime,
  onSelectMessage,
  hasMoreMessages = false,
  loadingMore = false,
  onLoadMore,
}) => {
  const { user } = useAuth();
  const { watchlist: userWatchlist } = useWatchlist();
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [searchMessageTicker, setSearchMessageTicker] = useState<string>('');
  const [deduplicatedMessages, setDeduplicatedMessages] = useState<Message[]>([]);
  
  const allSeenMessageIdsRef = useRef<Set<string>>(new Set());
  const prevMessagesRef = useRef<Message[]>([]);
  const initialLoadCompletedRef = useRef<boolean>(false);
  
  // Calculate 24 hours ago timestamp once
  const twentyFourHoursAgo = React.useMemo(() => {
    return Date.now() - 24 * 60 * 60 * 1000;
  }, []); // Only calculate once

  // Extract unique ticker symbols from messages released in the last 24 hours for market data
  const uniqueTickers = React.useMemo(() => {
    const tickerSet = new Set<string>();
    
    deduplicatedMessages.forEach(message => {
      if (message.ticker && message.timestamp) {
        const messageTime = new Date(message.timestamp).getTime();
        // Only include tickers from messages in the last 24 hours
        if (messageTime >= twentyFourHoursAgo && !isNaN(messageTime)) {
          tickerSet.add(message.ticker);
        }
      }
    });
    
    return Array.from(tickerSet).sort();
  }, [deduplicatedMessages, twentyFourHoursAgo]);

  const { marketData, isConnected } = useAlpacaMarketData(uniqueTickers);
  
  // Format volume for inline display
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toLocaleString();
  };

  // Create inline volume display component
  const InlineVolume: React.FC<{ ticker: string }> = ({ ticker }) => {
    const tickData = marketData[ticker];
    
    if (!tickData || !isConnected || tickData.cumulativeVolume === 0) {
      return null;
    }
    
    const volumeDisplay = formatVolume(tickData.cumulativeVolume);
    const hasPercentage = tickData.volumePercentageOfAvg !== undefined;
    
    return (
      <span className="text-xs text-neutral-500 ml-2">
        • {volumeDisplay}
        {hasPercentage && (
          <span className={`ml-1 font-medium ${
            tickData.volumePercentageOfAvg! >= 20 
              ? 'text-green-600' 
              : tickData.volumePercentageOfAvg! >= 10 
                ? 'text-yellow-600' 
                : 'text-neutral-500'
          }`}>
            ({tickData.volumePercentageOfAvg!.toFixed(1)}%)
          </span>
        )}
      </span>
    );
  };
  
  useEffect(() => {
    const searchParam = new URLSearchParams(window.location.search).get('search');
    if (searchParam) {
      setSearchMessageTicker(searchParam);
    }
  }, []);
  
  useEffect(() => {

    if (!messages || messages.length === 0) {
      setDeduplicatedMessages([]);
      return;
    }

    // Create a map for deduplication
    const uniqueMessagesMap = new Map<string, Message>();
    
    // First pass: filter out invalid timestamps
    let validMessages = messages.filter(message => {
      const messageTimestamp = new Date(message.timestamp);
      return !isNaN(messageTimestamp.getTime());
    });

    // Filter by watchlist only for new messages (after initial load)
    if (user?.email && userWatchlist.length > 0 && initialLoadCompletedRef.current) {
      // Only filter out new messages that aren't in watchlist
      const filteredMessages = validMessages.filter(message => {
        // If this is an existing message (already seen), keep it regardless of watchlist
        if (message.message_id && allSeenMessageIdsRef.current.has(message.message_id)) {
          return true;
        }
        // For new messages, apply watchlist filtering
        return userWatchlist.includes(message.ticker.toUpperCase());
      });
      
      validMessages = filteredMessages;
    }
    const sortedMessages = validMessages.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const skippedMessages: Array<{
      ticker: string;
      messageType: string;
      date: string;
      timestamp: string;
      reason: string;
      message: Message;
    }> = [];

    const addedMessages: Array<{
      ticker: string;
      messageType: string;
      date: string;
      timestamp: string;
      message: Message;
    }> = [];

    sortedMessages.forEach(message => {
      let messageType: string;
      if (message.link) {
        messageType = 'link';
      } else if (message.source === 'transcript_analysis') {
        messageType = 'transcript';
      } else if (message.source === 'sentiment_analysis' || message.sentiment_additional_metrics) {
        messageType = 'sentiment';
      } else {
        messageType = 'earnings'; // Changed from 'analysis' to match tab logic
      }
      
      const messageTimestamp = new Date(message.timestamp);
      // Use quarter and year instead of date for deduplication key
      const key = `${message.ticker}-Q${message.quarter}-${message.year}-${messageType}`;
      
      // Keep the earliest message for each unique key
      if (!uniqueMessagesMap.has(key)) {
        uniqueMessagesMap.set(key, message);
        addedMessages.push({
          ticker: message.ticker,
          messageType,
          date: `Q${message.quarter} ${message.year}`,
          timestamp: messageTimestamp.toISOString(),
          message
        });
      } else {
        // Compare timestamps and keep the earlier one
        const existingMessage = uniqueMessagesMap.get(key)!;
        const existingTimestamp = new Date(existingMessage.timestamp);
        
        if (messageTimestamp < existingTimestamp) {
          // This message is earlier, replace the existing one
          uniqueMessagesMap.set(key, message);
          
          skippedMessages.push({
            ticker: existingMessage.ticker,
            messageType,
            date: `Q${existingMessage.quarter} ${existingMessage.year}`,
            timestamp: existingTimestamp.toISOString(),
            reason: `Replaced by earlier ${messageType} for same quarter/year`,
            message: existingMessage
          });
        } else {
          // Existing message is earlier, skip this one
          skippedMessages.push({
            ticker: message.ticker,
            messageType,
            date: `Q${message.quarter} ${message.year}`,
            timestamp: messageTimestamp.toISOString(),
            reason: `Duplicate ${messageType} for same quarter/year (later timestamp)`,
            message
          });
        }
      }
    });
    
    // Get all unique messages and sort them by timestamp (newest first) for display
    const sortedDeduplicated = Array.from(uniqueMessagesMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    setDeduplicatedMessages(sortedDeduplicated);
  }, [messages, user?.email, userWatchlist]);

  // Set initial messages after first load
  useEffect(() => {
    if (!loading && messages.length > 0 && !initialLoadCompletedRef.current) {
      // Set the initial messages as the baseline - these won't be highlighted
      prevMessagesRef.current = [...messages];
      
      // Add all initial message IDs to the seen set
      const initialMessageIds = new Set(messages.map(msg => msg.message_id).filter((id): id is string => id !== undefined));
      allSeenMessageIdsRef.current = initialMessageIds;
      
      initialLoadCompletedRef.current = true;
    }
  }, [loading, messages]);
  
  // Update search term from props
  useEffect(() => {
    // Extract search term from WebSocketStatus component
    const searchParam = new URLSearchParams(window.location.search).get('search');
    if (searchParam) {
      setSearchMessageTicker(searchParam);
    }
  }, []);

  // Detect new messages and highlight them for 1 minute
  useEffect(() => {
    // Skip this effect until initial load is completed
    if (!initialLoadCompletedRef.current || !messages || messages.length === 0) return;
    
    // Find truly new messages - ones that are actually new compared to previous state
    // This ensures pagination messages (which existed before but weren't in our previous state) don't get highlighted
    const prevMessageIds = new Set(prevMessagesRef.current.map(msg => msg.message_id));
    
    // Find messages that are in current but not in previous (genuinely new messages)
    const genuinelyNewMessages = messages.filter(msg => {
      const isNewToState = !prevMessageIds.has(msg.message_id);
      const messageTime = new Date(msg.timestamp).getTime();
      const isRecentMessage = messageTime > (Date.now() - 2 * 60 * 1000); // Only messages from last 2 minutes
      
      // Only highlight if it's new to our state AND is a very recent message (likely from WebSocket)
      return isNewToState && isRecentMessage;
    });
    
    // Update our record of all seen message IDs (for all messages, not just recent ones)
    messages.forEach(msg => {
      if (msg.message_id) {
        allSeenMessageIdsRef.current.add(msg.message_id);
      }
    });
    
    // Get IDs of genuinely new recent messages
    const genuinelyNewMessageIds = genuinelyNewMessages.map(msg => msg.message_id).filter((id): id is string => id !== undefined);
    
    // If we have new recent messages, add them to the set and set a timer to remove them
    if (genuinelyNewMessageIds.length > 0) {
      setNewMessageIds(prev => {
        const updatedSet = new Set(prev);
        genuinelyNewMessageIds.forEach(id => updatedSet.add(id));
        return updatedSet;
      });
      
      // For each new message, set a timeout to remove the highlight after 1 minute
      genuinelyNewMessageIds.forEach(id => {
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

  // Debug message data structure
  useEffect(() => {
    // Focus on transcript messages specifically
    const transcriptMessages = deduplicatedMessages.filter(msg => msg.source === 'transcript_analysis');
    
    if (transcriptMessages.length > 0) {
      // Debug transcript messages if needed
    }
    
    // Count by source type for debugging
    const sourceTypeCounts = deduplicatedMessages.reduce((acc, msg) => {
      const source = msg.source || 'null';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
  }, [deduplicatedMessages]);

  if (loading && (!messages || messages.length === 0)) {
    return (
      <div className="bg-white dark:bg-neutral-800 p-6 rounded-md shadow-md border border-neutral-100 dark:border-neutral-700 text-center">
        <p className="text-neutral-500 dark:text-neutral-400">Loading messages...</p>
      </div>
    );
  }

  if ((!deduplicatedMessages || deduplicatedMessages.length === 0)) {
    return (
      <div className="bg-white dark:bg-neutral-800 p-6 rounded-md shadow-md border border-neutral-100 dark:border-neutral-700 text-center">
        <p className="text-neutral-500 dark:text-neutral-400">
          {searchMessageTicker ? `No messages found for "${searchMessageTicker}"` : "No messages found"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      
      <div 
        className="flex-1 overflow-auto scrollbar-hide"
        style={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden'
        }}
      >
      {deduplicatedMessages.map((message, index) => (
        <div 
          key={message.message_id || `message-${index}`}
          className={`bg-white dark:bg-neutral-800 py-2 px-2 border-b border-neutral-200 dark:border-neutral-700 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700 ${
            message.message_id && newMessageIds.has(message.message_id) 
              ? 'border-l-4 border-l-green-500' 
              : ''
            } ${!message.link ? 'cursor-pointer' : ''}`}
          onClick={() => onSelectMessage && onSelectMessage(message)}
          style={{
            padding: isMobile ? '10px 8px' : undefined,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflowX: 'hidden',
          }}
        >
          {message.source === 'transcript_analysis' ? (
            /* Transcript analysis message - single line layout */
            <div className="flex flex-col">
              <div
                className="flex justify-between items-center cursor-pointer transition-colors"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '0',
                  width: '100%',
                  maxWidth: '100%',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="flex items-center"
                  style={{
                   flexWrap: 'nowrap',
                    gap: '4px',
                    width: isMobile ? 'calc(100% - 30px)' : undefined,
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}
                >
                  {/* Ticker and company name */}
                  <div 
                    className={`flex items-center space-x-1 px-1.5 py-0.5 ${isMobile ? 'text-xs' : 'text-xs'}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: isMobile ? '4px 2px' : '2px 6px',
                      width: 'auto',
                      maxWidth: isMobile ? '40%' : '100%',
                      boxSizing: 'border-box',
                      overflowX: 'hidden'
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {/* <StockLogo ticker={message.ticker} size={16} /> */}
                      <span 
                        className={`font-bold text-neutral-800 dark:text-neutral-100 ${isMobile ? 'text-sm' : 'text-xs'}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {message.ticker}
                      </span>
                    </div>

                    {message.company_name && !isMobile && (
                      <span 
                        className="text-neutral-500 dark:text-neutral-400"
                        style={{
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {message.company_name}
                      </span>
                    )}

                    <span className={`text-neutral-600 dark:text-neutral-400 ${isMobile ? 'text-xs ml-1' : 'mx-1'}`}>
                      Q{message.quarter}{!isMobile && ` ${message.year}`}
                    </span>
                  </div>

                  <span className={`text-neutral-500 dark:text-neutral-400 ${isMobile ? 'text-xs flex-shrink-0' : 'text-xs ml-1'}`}>
                    {isMobile ? convertToEasternTime(message.timestamp).split(',')[1]?.trim() || convertToEasternTime(message.timestamp) : convertToEasternTime(message.timestamp)}
                  </span>
                  
                  {/* Inline transcript preview */}
                  <span className={`bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-2 py-1 rounded border border-purple-200 dark:border-purple-800 font-medium truncate flex-shrink-0 ${isMobile ? 'text-xs ml-1' : 'text-xs ml-2'}`}>
                    {isMobile ? 'Transcript' : 'Transcript analysis'}
                  </span>
                  
                  <InlineVolume ticker={message.ticker} />
                </div>
              </div>
            </div>
          ) : (message.source === 'sentiment_analysis' || message.sentiment_additional_metrics) ? (
            /* Sentiment analysis message - single line layout */
            <div className="flex flex-col">
              <div
                className="flex justify-between items-center cursor-pointer transition-colors"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '0',
                  width: '100%',
                  maxWidth: '100%',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="flex items-center"
                  style={{
                    flexWrap: 'nowrap',
                    gap: '4px',
                    width: isMobile ? 'calc(100% - 30px)' : undefined,
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}
                >
                  {/* Ticker and company name */}
                  <div 
                    className={`flex items-center space-x-1 px-1.5 py-0.5 ${isMobile ? 'text-xs' : 'text-xs'}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: isMobile ? '4px 2px' : '2px 6px',
                      width: 'auto',
                      maxWidth: isMobile ? '40%' : '100%',
                      boxSizing: 'border-box',
                      overflowX: 'hidden'
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {/* <StockLogo ticker={message.ticker} size={16} /> */}
                      <span 
                        className={`font-bold text-neutral-800 dark:text-neutral-100 ${isMobile ? 'text-sm' : 'text-xs'}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {message.ticker}
                      </span>
                    </div>

                    {message.company_name && !isMobile && (
                      <span 
                        className="text-neutral-500 dark:text-neutral-400"
                        style={{
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {message.company_name}
                      </span>
                    )}

                    <span className={`text-neutral-600 dark:text-neutral-400 ${isMobile ? 'text-xs ml-1' : 'mx-1'}`}>
                      Q{message.quarter}{!isMobile && ` ${message.year}`}
                    </span>
                  </div>

                  <span className={`text-neutral-500 dark:text-neutral-400 ${isMobile ? 'text-xs flex-shrink-0' : 'text-xs ml-1'}`}>
                    {isMobile ? convertToEasternTime(message.timestamp).split(',')[1]?.trim() || convertToEasternTime(message.timestamp) : convertToEasternTime(message.timestamp)}
                  </span>
                  
                  {/* Inline sentiment preview */}
                  <span className={`bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded border border-green-200 dark:border-green-800 font-medium truncate flex-shrink-0 ${isMobile ? 'text-xs ml-1' : 'text-xs ml-2'}`}>
                    {isMobile ? 'Sentiment' : 'Sentiment analysis'}
                  </span>
                  
                  <InlineVolume ticker={message.ticker} />
                </div>
              </div>
            </div>
          ) : message.link ? (
            /* Link message - show on a single line like analysis messages */
            <div className="flex flex-col">
              <div
                className="flex justify-between items-center cursor-pointer transition-colors"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '0',
                  width: '100%',
                  maxWidth: '100%',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="flex items-center"
                  style={{
                    flexWrap: 'nowrap',
                    gap: '4px',
                    width: isMobile ? 'calc(100% - 30px)' : undefined,
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}
                >
                  {/* Ticker and company name */}
                  <div 
                    className={`flex items-center space-x-1 px-1.5 py-0.5 ${isMobile ? 'text-xs' : 'text-xs'}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: isMobile ? '4px 2px' : '2px 6px',
                      width: 'auto',
                      maxWidth: isMobile ? '35%' : '100%',
                      boxSizing: 'border-box',
                      overflowX: 'hidden'
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {/* <StockLogo ticker={message.ticker} size={16} /> */}
                      <span 
                        className={`font-bold text-neutral-800 dark:text-neutral-100 ${isMobile ? 'text-sm' : 'text-xs'}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {message.ticker}
                      </span>
                    </div>
                    
                    {message.company_name && !isMobile && (
                      <span
                        className="text-neutral-500 dark:text-neutral-400"
                        style={{
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {message.company_name}
                      </span>
                    )}
                    
                    <span className={`text-neutral-600 dark:text-neutral-400 ${isMobile ? 'text-xs ml-1' : 'mx-1'}`}>
                      Q{message.quarter}{!isMobile && ` ${message.year}`}
                    </span>
                  </div>
                  
                  <span className={`text-neutral-500 dark:text-neutral-400 ${isMobile ? 'text-xs flex-shrink-0' : 'text-xs ml-1'}`}>
                    {isMobile ? convertToEasternTime(message.timestamp).split(',')[1]?.trim() || convertToEasternTime(message.timestamp) : convertToEasternTime(message.timestamp)}
                  </span>
                  
                  {/* Inline report preview */}
                  <span className={`bg-sky-50 dark:bg-sky-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded border border-sky-200 dark:border-sky-800 font-medium flex-shrink-0 ${isMobile ? 'text-xs ml-1' : 'text-xs ml-2'}`}>
                    Report released
                  </span>
                  
                  <InlineVolume ticker={message.ticker} />
                </div>
                <div
                  className="inline-flex items-center justify-center w-5 h-5 bg-primary-50 text-primary-600 rounded-full hover:bg-primary-100 transition-colors"
                  style={{
                    alignSelf: undefined,
                    marginTop: '0',
                    marginLeft: '4px',
                  }}
                >
                  <a href={message.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* Analysis message with static preview */
            <div
              className="flex flex-col transition-colors"
              style={{
                gap: isMobile ? '8px' : undefined,
                width: '100%',
                maxWidth: '100%',
                overflow: 'hidden',
              }}
            >
              <div
                className="flex justify-between items-center mb-1"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: undefined,
                  marginBottom: '4px',
                  width: '100%',
                  maxWidth: '100%',
                  overflow: 'hidden'
                }}
              >
                <div
                  className="flex items-center"
                  style={{
                    flexWrap: 'nowrap',
                    gap: '4px',
                    width: isMobile ? 'calc(100% - 30px)' : undefined,
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}
                >
                  {/* Ticker and company name */}
                  <div 
                    className={`flex items-center space-x-1 px-1.5 py-0.5 ${isMobile ? 'text-xs' : 'text-xs'}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: isMobile ? '4px 2px' : '2px 6px',
                      width: 'auto',
                      maxWidth: isMobile ? '40%' : '100%',
                      boxSizing: 'border-box',
                      overflowX: 'hidden'
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {/* <StockLogo ticker={message.ticker} size={16} /> */}
                      <span 
                        className={`font-bold text-neutral-800 dark:text-neutral-100 ${isMobile ? 'text-sm' : 'text-xs'}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {message.ticker}
                      </span>
                    </div>

                    {message.company_name && !isMobile && (
                      <span 
                        className="text-neutral-500 dark:text-neutral-400"
                        style={{
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {message.company_name}
                      </span>
                    )}

                    <span className={`text-neutral-600 dark:text-neutral-400 ${isMobile ? 'text-xs ml-1' : 'mx-1'}`}>
                      Q{message.quarter}{!isMobile && ` ${message.year}`}
                    </span>
                  </div>

                  <span className={`text-neutral-500 dark:text-neutral-400 ${isMobile ? 'text-xs flex-shrink-0' : 'text-xs ml-1'}`}>
                    {isMobile ? convertToEasternTime(message.timestamp).split(',')[1]?.trim() || convertToEasternTime(message.timestamp) : convertToEasternTime(message.timestamp)}
                  </span>
                  <InlineVolume ticker={message.ticker} />
                  {/* <div
                    className="inline-flex items-center justify-center w-5 h-5 bg-primary-50 text-primary-600 rounded-full hover:bg-primary-100 transition-colors"
                    style={{
                      alignSelf: undefined,
                      marginTop: '0',
                      marginLeft: '4px',
                    }}
                  >
                    <BarChart2 size={14} />
                  </div> */}
                </div>
              </div>

              {/* Static preview of the message content */}
              {message.discord_message && (
                <StaticPreview
                  content={ParseMessagePayload(message)}
                  isMobile={isMobile}
                  previewKey={index}
                />
              )}
            </div>
          )}
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

export default MessagesList;
