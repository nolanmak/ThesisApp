import React, { useEffect, useState, useRef } from 'react';
import { Message } from '../../../types';
import { ExternalLink, BarChart2 } from 'lucide-react';

interface MessagesListProps {
  messages: Message[];
  loading: boolean;
  isMobile?: boolean;
  convertToEasternTime: (utcTimestamp: string) => string;
  onSelectMessage?: (message: Message) => void;
}

type MetricItem = {
  label: string;
  text: string;
};

// Component for message preview - supports both standard text and structured metrics display
const StaticPreview: React.FC<{ 
  content: { [key: string]: MetricItem[] } | null; 
  isMobile?: boolean;
  key?: string;
}> = ({ content, isMobile = false, key }) => {
  // If it's metrics data, render a structured layout
  if (content) {
    return (
      <div key={key}
        style={{
          backgroundColor: '#f0f9ff', // Light blue background
          border: '1px solid #bfdbfe', // Light blue border
          borderRadius: '4px',
          padding: isMobile ? '5px 8px' : '3px 8px', // Reduced padding to match text preview
          margin: '2px 0',
          minHeight: isMobile ? '24px' : '20px',
          maxHeight: isMobile ? '100px' : '80px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center', // Center align for consistent height
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div key={key} style={{ 
          display: 'flex', 
          flexDirection: 'row', // Always use row to ensure single line
          flexWrap: 'nowrap',
          gap: '8px', 
          alignItems: 'center',
          width: '100%',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}>
          {/* Modified condition to handle both messages with and without estimates */}
          {content ? (
            <div style={{ display: 'flex', flexDirection: 'column', flexWrap: 'nowrap', gap: '8px', alignItems: 'start' }}>
              {Object.keys(content)
              .slice(0, 3)
              .map((key, index) => (
                <div key={index} style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0
                }}>
                  <div key={index} style={{ fontWeight: 'bold', fontSize: '.7rem', color:"#1e40af"}}>{key}:</div>
                  {content[key]
                  .map((metric: MetricItem, index: number) => (
                    <>
                    {metric.text && <div key={index} style={{ fontWeight: '500', fontSize: '.7rem', color: '#1e40af'}}>{metric.text}</div>}
                    </>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '4px', color: '#1e40af', fontSize: '.7rem', textAlign: 'center' }}>
              No metrics available
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div key={key}
      style={{
        backgroundColor: '#f0f9ff',
        border: '1px solid #bfdbfe',
        borderRadius: '4px',
        padding: isMobile ? '5px 8px' : '3px 8px',
        margin: '2px 0',
        minHeight: isMobile ? '24px' : '20px',
        maxHeight: isMobile ? '100px' : '80px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div key={key}
        style={{
          color: '#1e40af',
          fontWeight: '500',
          fontSize: isMobile ? '.8rem' : '.7rem',
          lineHeight: '1.4',
          width: '100%',
          whiteSpace: isMobile ? 'pre-wrap' : 'nowrap',
          overflow: 'hidden',
          textOverflow: isMobile ? 'clip' : 'ellipsis',
          wordBreak: isMobile ? 'break-word' : 'normal'
        }}
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

  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [searchMessageTicker, setSearchMessageTicker] = useState<string>('');
  const [deduplicatedMessages, setDeduplicatedMessages] = useState<Message[]>([]);
  
  const allSeenMessageIdsRef = useRef<Set<string>>(new Set());
  const prevMessagesRef = useRef<Message[]>([]);
  const initialLoadCompletedRef = useRef<boolean>(false);
  
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

    // Create a map to track the first message for each ticker
    const tickerMessageMap = new Map<string, Message>();
    
    // Sort messages by timestamp (newest first) before deduplication
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    sortedMessages.forEach(message => {
      
      const key = message.ticker + message.quarter + message.year;
      const existingMessage = tickerMessageMap.get(key);
      
      if (!existingMessage) {
        tickerMessageMap.set(key, message);
      } 
      else {
        const hasLink = !!message.link;
        const existingHasLink = !!existingMessage.link;
        
        if (hasLink !== existingHasLink) {
          tickerMessageMap.set(`${key}-${hasLink ? 'link' : 'data'}`, message);
        }
      }
    });
    
    const deduplicated = Array.from(tickerMessageMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    setDeduplicatedMessages(deduplicated);
  }, [messages]);

  const checkItemValNotNull = (value: string): boolean => {
    return value != null && value != undefined && value != '' && value != 'N/A'
  }

  const createMetricText = (item: any, label: string): string | null => {
    const actual = item.actual
    const low = item.low
    const high = item.high
    if (checkItemValNotNull(actual) || (checkItemValNotNull(low) && checkItemValNotNull(high))) {
      let text = ''
      if (checkItemValNotNull(low) && checkItemValNotNull(high)) {
        text = `${label}: ${low} - ${high}`
      }
      else {
        text = `${label}: ${actual}`
      }
      const expected = item.expected
      if (checkItemValNotNull(expected)) {
        text += ` vs ${expected} (${item.delta}) ${item.indicator}`
      }
      return text
    }
    return null
  };

  const ParseMessagePayload = (message: Message): { [key: string]: MetricItem[] } | null => {
    if (!message.discord_message || message.report_data?.link) return null;

    let metrics: { [key: string]: MetricItem[] } = {};
    
    try {
      const jsonData = JSON.parse(message.discord_message);
      
      if (jsonData.current_quarter_vs_expected) {
        const currentQuarterData = jsonData.current_quarter_vs_expected;
        let currentQuarterMetrics: MetricItem[] = [];
        if (currentQuarterData.sales != null && currentQuarterData.sales != undefined && currentQuarterData.sales != '') {
          let label = 'Sales'
          if (typeof currentQuarterData.sales === 'string') {
            currentQuarterMetrics.push(
              {
                label: label,
                text: currentQuarterData.sales
              }
            );
          }
          else {
            const currentQuarterSalesData = currentQuarterData.sales;
            let text = createMetricText(currentQuarterSalesData, label)
            if (text) {
              currentQuarterMetrics.push(
                {
                  label: label,
                  text: text
                }
              );
            }
          }
        }
        
        if (currentQuarterData.eps != null && currentQuarterData.eps != undefined && currentQuarterData.eps != '' && currentQuarterData.eps != 'N/A') {  
          let label = 'EPS'
          if (typeof currentQuarterData.eps === 'string') {
            currentQuarterMetrics.push(
              {
                label: label,
                text: currentQuarterData.eps
              }
            );
          }
          else {
            const currentQuarterEPSData = currentQuarterData.eps;
            let text = createMetricText(currentQuarterEPSData, label)
            if (text) {
              currentQuarterMetrics.push(
                {
                  label: label,
                  text: text
                }
              );
            }
          }
        }
        if (currentQuarterMetrics.length > 0) {
          metrics["Current Quarter"] = currentQuarterMetrics;
        }
      }

      if (jsonData.next_quarter_vs_expected) {
        let nextQuarterData = jsonData.next_quarter_vs_expected;
        let nextQuarterMetrics: MetricItem[] = [];
        if (nextQuarterData.sales != null && nextQuarterData.sales != undefined && nextQuarterData.sales != '') {
          let label = 'Sales'
          if (typeof nextQuarterData.sales === 'string') {
            nextQuarterMetrics.push(
              {
                label: label,
                text: nextQuarterData.sales
              }
            );
          }
          else {
            const nextQuarterSalesData = nextQuarterData.sales;
            let text = createMetricText(nextQuarterSalesData, label)
            if (text) {
              nextQuarterMetrics.push(
                {
                  label: label,
                  text: text
                }
              );
            }
          }
        }
        
        if (nextQuarterData.eps != null && nextQuarterData.eps != undefined && nextQuarterData.eps != '') {
          let label = 'EPS'
          if (typeof nextQuarterData.eps === 'string') {
            nextQuarterMetrics.push(
              {
                label: label,
                text: nextQuarterData.eps
              }
            );
          }
          else {
            const nextQuarterEPSData = nextQuarterData.eps;
            let text = createMetricText(nextQuarterEPSData, label)
            if (text) {
              nextQuarterMetrics.push(
                {
                  label: label,
                  text: text
                }
              );
            }
          }
        }
        if (nextQuarterMetrics.length > 0) {
          metrics["Next Quarter"] = nextQuarterMetrics;
        }
      }

      if (jsonData.current_year_vs_expected) {
        const currentYearData = jsonData.current_year_vs_expected;
        let currentYearMetrics: MetricItem[] = [];
        if (currentYearData.sales != null && currentYearData.sales != undefined && currentYearData.sales != '') {
          let label = 'Sales'
          if (typeof currentYearData.sales === 'string') {
            currentYearMetrics.push(
              {
                label: label,
                text: currentYearData.sales
              }
            );
          }
          else {
            const currentYearSalesData = currentYearData.sales;
            let text = createMetricText(currentYearSalesData, label)
            if (text) {
              currentYearMetrics.push(
                {
                  label: label,
                  text: text
                }
              );
            }
          }
        }
        
        if (currentYearData.eps != null && currentYearData.eps != undefined && currentYearData.eps != '') {
          let label = 'EPS'
          if (typeof currentYearData.eps === 'string') {
            currentYearMetrics.push(
              {
                label: label,
                text: currentYearData.eps
              }
            );
          }
          else {
            const currentYearEPSData = currentYearData.eps;
            let text = createMetricText(currentYearEPSData, label)
            if (text) {
              currentYearMetrics.push(
                {
                  label: label,
                  text: text
                }
              );
            }
          }
        }
        if (currentYearMetrics.length > 0) {
          metrics["Current Year"] = currentYearMetrics;
        }
      }

      if (jsonData.historical_growth_qoq) {
        const historicalGrowthData = jsonData.historical_growth_qoq;
        let historicalGrowthMetrics: MetricItem[] = [];
        if (historicalGrowthData.sales_qoq != null && historicalGrowthData.sales_qoq != undefined && historicalGrowthData.sales_qoq != '') {
          let label = 'Sales Growth QoQ'
          if (typeof historicalGrowthData.sales_qoq === 'string') {
            historicalGrowthMetrics.push({
                label: label,
                text: historicalGrowthData.sales_qoq,
            });
          }
          else {
            const historicalGrowthSalesData = historicalGrowthData.sales_qoq;
            let text = createMetricText(historicalGrowthSalesData, label)
            if (text) {
              historicalGrowthMetrics.push(
                {
                  label: label,
                  text: text
                }
              );
            }
          }
        }
        if (historicalGrowthData.eps_qoq != null && historicalGrowthData.eps_qoq != undefined && historicalGrowthData.eps_qoq != '') {
          let label = 'EPS Growth QoQ'
          if (typeof historicalGrowthData.eps_qoq === 'string') {
            historicalGrowthMetrics.push({
                label: label,
                text: historicalGrowthData.eps_qoq,
            });
          }
          else {
            const historicalGrowthEPSData = historicalGrowthData.eps_qoq;
            let text = createMetricText(historicalGrowthEPSData, label)
            if (text) {
              historicalGrowthMetrics.push(
                {
                  label: label,
                  text: text
                }
              );
            }
          }
        }
        if (historicalGrowthMetrics.length > 0) {
          metrics["Historical Growth"] = historicalGrowthMetrics;
        }
      }
    } catch {
      console.log('Unable to parse metrics for message');
    }
    return metrics
  };
  
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
                  key={index}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MessagesList;
