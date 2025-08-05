import React, { useEffect, useState, useRef } from 'react';
import { Message, MetricItem } from '../../../types';
import { ExternalLink, BarChart2 } from 'lucide-react';
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
        bg-sky-50 border border-sky-200 rounded flex items-center w-full max-w-full box-border overflow-hidden my-[2px]
        ${isMobile
          ? 'py-[5px] px-[8px] min-h-6 max-h-[100px]'
          : 'py-[3px] px-[8px] min-h-[20px] max-h-[80px]'}
      `}
      >
        <div key={previewKey} className="flex flex-row flex-nowrap gap-2 items-center w-full overflow-hidden whitespace-nowrap">
          {content ? (
            <div key={previewKey} className="flex flex-col flex-nowrap gap-2 items-start">
              {Object.keys(content)
              .filter((key) => ['Current Quarter', 'Next Quarter', 'Historical Growth', 'Current Year', 'Next Year'].includes(key))
              .slice(0, 3)
              .map((key, index) => (
                <div key={`${key}-${index}`} className="flex items-center gap-1 flex-shrink-0">
                  <div className="font-bold text-[0.7rem] text-blue-800">{key}:</div>
                  {content[key]
                  .map((metric: MetricItem, itemIndex: number) => (
                    <React.Fragment key={`${key}-metric-${itemIndex}`}>
                    {typeof metric === 'string' ? (
                      <div className="font-medium text-[0.7rem] text-blue-800">{metric}</div>
                    ) : metric.text ? (
                      <div className="font-medium text-[0.7rem] text-blue-800">{metric.text}</div>
                    ) : null}
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div key={previewKey} className="text-blue-800 font-medium text-[0.7rem] text-center">No metrics available</div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div key={previewKey}
      className={`bg-sky-50 border border-sky-200 rounded flex items-center w-full max-w-full box-border overflow-hidden my-[2px]
      ${isMobile
        ? 'py-[5px] px-[8px] min-h-6 max-h-[100px]'
        : 'py-[3px] px-[8px] min-h-[20px] max-h-[80px]'}`}
    >
      <div key={previewKey} className={`
          text-blue-800 font-medium w-full overflow-hidden leading-[1.4]
          ${isMobile
            ? 'text-[0.8rem] whitespace-pre-wrap text-clip break-words'
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
}) => {
  const { user } = useAuth();
  const { watchlist: userWatchlist } = useWatchlist();
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [searchMessageTicker, setSearchMessageTicker] = useState<string>('');
  const [deduplicatedMessages, setDeduplicatedMessages] = useState<Message[]>([]);
  
  const allSeenMessageIdsRef = useRef<Set<string>>(new Set());
  const prevMessagesRef = useRef<Message[]>([]);
  const initialLoadCompletedRef = useRef<boolean>(false);
  
  // Extract unique ticker symbols from messages released in the last 24 hours for market data
  const uniqueTickers = React.useMemo(() => {
    const tickerSet = new Set<string>();
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    deduplicatedMessages.forEach(message => {
      if (message.ticker && message.timestamp) {
        const messageTime = new Date(message.timestamp);
        // Only include tickers from messages in the last 24 hours
        if (messageTime >= twentyFourHoursAgo && !isNaN(messageTime.getTime())) {
          tickerSet.add(message.ticker);
        }
      }
    });
    
    const uniqueTickerArray = Array.from(tickerSet);
    // Keep only Alpaca-related logging
    if (uniqueTickerArray.length > 0) {
      console.log('🔄 Alpaca market data subscriptions:', uniqueTickerArray.sort().join(', '));
    }
    
    return uniqueTickerArray;
  }, [deduplicatedMessages]);

  const { marketData, isConnected, resetAllCumulativeVolume } = useAlpacaMarketData(uniqueTickers);
  
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
    if (!tickData || !isConnected) {
      return null;
    }
    
    return (
      <span className="text-xs text-neutral-500 ml-2">
        • Vol: {formatVolume(tickData.cumulativeVolume)}
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
    
    // Track PM messages through filtering process

    // First pass: filter out invalid timestamps, then filter by watchlist if available
    let validMessages = messages.filter(message => {
      const messageTimestamp = new Date(message.timestamp);
      return !isNaN(messageTimestamp.getTime());
    });


    // Filter by watchlist if user has one and is authenticated
    if (user?.email && userWatchlist.length > 0) {
      const filteredMessages = validMessages.filter(message => {
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
      const messageType = message.link ? 'link' : 'analysis';
      const messageTimestamp = new Date(message.timestamp);
      const messageDate = messageTimestamp.toISOString().split('T')[0];
      const key = `${message.ticker}-${messageDate}-${messageType}`;
      
      // Only keep the first occurrence (earliest) of each unique key
      if (!uniqueMessagesMap.has(key)) {
        uniqueMessagesMap.set(key, message);
        addedMessages.push({
          ticker: message.ticker,
          messageType,
          date: messageDate,
          timestamp: messageTimestamp.toISOString(),
          message
        });
      } else {
        skippedMessages.push({
          ticker: message.ticker,
          messageType,
          date: messageDate,
          timestamp: messageTimestamp.toISOString(),
          reason: `Duplicate ${messageType} for same date`,
          message
        });
      }
    });

    // Message processing completed
    
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
      const initialMessageIds = new Set(messages.map(msg => msg.message_id));
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
    
    // Find truly new messages - ones we've never seen before in any state
    const genuinelyNewMessages = messages.filter(msg => !allSeenMessageIdsRef.current.has(msg.message_id));
    
    // Update our record of all seen message IDs
    messages.forEach(msg => {
      allSeenMessageIdsRef.current.add(msg.message_id);
    });
    
    // Get IDs of genuinely new messages
    const genuinelyNewMessageIds = genuinelyNewMessages.map(msg => msg.message_id);
    
    // If we have new messages, add them to the set and set a timer to remove them
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
        <p className="text-neutral-500">
          {searchMessageTicker ? `No messages found for "${searchMessageTicker}"` : "No messages found"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Market Data Controls */}
      {uniqueTickers.length > 0 && (
        <div className="bg-white border-b border-neutral-100 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-neutral-600">
                {isConnected ? 'Market data connected' : 'Market data disconnected'}
              </span>
            </div>
            <button
              onClick={resetAllCumulativeVolume}
              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
              title="Reset session volume tracking for all symbols"
            >
              Reset Volume
            </button>
          </div>
        </div>
      )}
      
      <div 
        className="max-h-[calc(100vh-120px)] overflow-auto scrollbar-hide"
        style={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden'
        }}
      >
      {deduplicatedMessages.map((message, index) => (
        <div 
          key={message.message_id}
          className={`bg-white py-2 px-2 border-b transition-colors hover:bg-neutral-50 ${
            newMessageIds.has(message.message_id) 
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
          {message.link ? (
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
                    className="flex items-center space-x-1 px-1.5 py-0.5 text-xs"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: '2px 6px',
                      width: 'auto',
                      maxWidth: isMobile ? 'calc(100% - 30px)' : '100%',
                      boxSizing: 'border-box',
                      overflowX: 'hidden'
                    }}
                  >
                    <span 
                      className="font-medium text-neutral-800"
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {message.ticker}
                    </span>
                    
                    {message.company_name && (
                      <span
                        className="text-neutral-500"
                        style={{
                          maxWidth: isMobile ? '60px' : '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {message.company_name}
                      </span>
                    )}
                    
                    <span className="text-neutral-600 mx-1">
                      Q{message.quarter}
                    </span>
                  </div>
                  
                  <span className="text-xs text-neutral-500 ml-1">
                    {convertToEasternTime(message.timestamp)}
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
                    className="flex items-center space-x-1 px-1.5 py-0.5 text-xs"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: '2px 6px',
                      width: 'auto',
                      maxWidth: isMobile ? 'calc(100% - 30px)' : '100%',
                      boxSizing: 'border-box',
                      overflowX: 'hidden'
                    }}
                  >
                    <span 
                      className="font-bold text-neutral-800"
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {message.ticker}
                    </span>

                    {message.company_name && (
                      <span 
                        className="text-neutral-500"
                        style={{
                          maxWidth: isMobile ? '60px' : '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {message.company_name}
                      </span>
                    )}

                    <span className="text-neutral-600 mx-1">
                      Q{message.quarter}
                    </span>
                  </div>

                  <span className="text-xs text-neutral-500 ml-1">
                    {convertToEasternTime(message.timestamp)}
                  </span>
                  <InlineVolume ticker={message.ticker} />
                  <div
                    className="inline-flex items-center justify-center w-5 h-5 bg-primary-50 text-primary-600 rounded-full hover:bg-primary-100 transition-colors"
                    style={{
                      alignSelf: undefined,
                      marginTop: '0',
                      marginLeft: '4px',
                    }}
                  >
                    <BarChart2 size={14} />
                  </div>
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
      </div>
    </div>
  );
};

export default MessagesList;
