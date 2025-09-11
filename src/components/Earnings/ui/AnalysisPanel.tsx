import React, { useState, useEffect, useMemo } from 'react';
import { Message } from '../../../types';
import { ThumbsDown, X } from 'lucide-react';
import { ParseMessagePayload, ParseTranscriptMessage, ParseTranscriptData, ParseSentimentMessage, ParseSentimentData, ParseSwingAnalysisData } from '../utils/messageUtils';

interface AnalysisPanelProps {
  selectedMessage: Message | null;
  isMobile: boolean;
  showAnalysisPanel: boolean;
  convertToEasternTime: (utcTimestamp: string) => string;
  handleCloseAnalysisPanel: () => void;
  setFeedbackModalOpen: (open: boolean) => void;
  messages?: Message[]; // Add messages prop to access all messages for tab filtering
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  selectedMessage,
  isMobile,
  showAnalysisPanel,
  convertToEasternTime,
  handleCloseAnalysisPanel,
  setFeedbackModalOpen,
  messages = []
}) => {
  const [activeTab, setActiveTab] = useState<string>('earnings');
  
  // Get message type for tab identification
  const getMessageType = (message: Message): string => {
    if (message.link) return 'link';
    if (message.source === 'transcript_analysis') return 'transcript';
    if (message.source === 'sentiment_analysis' || message.sentiment_additional_metrics) return 'sentiment';
    return 'earnings';
  };

  // Find related messages for the same ticker, quarter, and year
  const relatedMessages = useMemo(() => {
    if (!selectedMessage) return {};
    
    const related = messages.filter(msg => {
      if (msg.ticker !== selectedMessage.ticker) return false;
      if (msg.link) return false; // Exclude link messages from tabs
      if (msg.quarter !== selectedMessage.quarter) return false;
      if (msg.year !== selectedMessage.year) return false;
      
      return true;
    });
    
    // Group by message type
    const grouped: Record<string, Message> = {};
    related.forEach(msg => {
      const type = getMessageType(msg);
      if (!grouped[type] || new Date(msg.timestamp) < new Date(grouped[type].timestamp)) {
        grouped[type] = msg; // Keep the earliest message of each type
      }
    });
    
    return grouped;
  }, [selectedMessage, messages]);

  // Available tabs based on related messages
  const availableTabs = useMemo(() => {
    const tabs = [];
    if (relatedMessages.earnings) tabs.push({ 
      id: 'earnings', 
      label: 'Earnings', 
      message: relatedMessages.earnings,
      colors: {
        active: 'bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200',
        inactive: 'text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200 hover:bg-sky-50 dark:hover:bg-sky-900/30'
      }
    });
    if (relatedMessages.sentiment) tabs.push({ 
      id: 'sentiment', 
      label: 'Sentiment', 
      message: relatedMessages.sentiment,
      colors: {
        active: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
        inactive: 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 hover:bg-green-50 dark:hover:bg-green-900/30'
      }
    });
    if (relatedMessages.transcript) tabs.push({ 
      id: 'transcript', 
      label: 'Transcript', 
      message: relatedMessages.transcript,
      colors: {
        active: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
        inactive: 'text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/30'
      }
    });
    return tabs;
  }, [relatedMessages]);

  // Current message to display based on active tab
  const currentMessage = useMemo(() => {
    const tabMessage = availableTabs.find(tab => tab.id === activeTab)?.message;
    return tabMessage || selectedMessage;
  }, [activeTab, availableTabs, selectedMessage]);

  // Reset active tab when selected message changes
  useEffect(() => {
    if (selectedMessage) {
      const messageType = getMessageType(selectedMessage);
      const availableTabIds = availableTabs.map(tab => tab.id);
      
      // Set to the selected message's type if available, otherwise first available tab
      if (availableTabIds.includes(messageType)) {
        setActiveTab(messageType);
      } else if (availableTabIds.length > 0) {
        setActiveTab(availableTabIds[0]);
      }
    }
  }, [selectedMessage, availableTabs]);

  const parsedMessage = currentMessage ? ParseMessagePayload(currentMessage) : null;
  const parsedTranscriptData = currentMessage ? ParseTranscriptData(currentMessage) : null;
  // Try new Bull/Bear format first, then fall back to legacy sentiment format
  const parsedSwingData = currentMessage ? ParseSwingAnalysisData(currentMessage) : null;
  const parsedSentimentData = parsedSwingData || (currentMessage ? ParseSentimentData(currentMessage) : null);

  return (
    <div 
    className={`
      ${isMobile
        ? showAnalysisPanel
          ? 'flex w-full h-full absolute inset-0 z-10'
          : 'hidden'
        : 'flex w-[35%] relative'}
      flex-col bg-white dark:bg-neutral-800 p-6 rounded-md shadow border border-[#f1f1f1] dark:border-neutral-700
    `}
    >
      {selectedMessage ? (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="pb-4 border-b border-neutral-200 dark:border-neutral-700 mb-4">
            {/* Title row */}
            <div 
              className="flex items-center justify-between mb-3"
              style={{
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                gap: isMobile ? '8px' : undefined
              }}
            >
              <div 
                className="flex items-center space-x-2"
                style={{
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                  gap: isMobile ? '8px' : undefined,
                  width: isMobile ? 'calc(100% - 30px)' : undefined
                }}
              >
                <div 
                  className="flex items-center bg-primary-50 dark:bg-primary-900/30 px-3 py-1 rounded-md"
                  style={{
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    padding: isMobile ? '6px 10px' : undefined,
                    width: isMobile ? '100%' : 'auto'
                  }}
                >
                  <div className="flex items-center">
                    <span className="font-medium text-primary-700 dark:text-primary-300">{selectedMessage.ticker}</span>
                    <span className="mx-1 text-neutral-400 dark:text-neutral-500">|</span>
                    <span className="text-neutral-600 dark:text-neutral-300">Q{selectedMessage.quarter}</span>
                  </div>
                  {selectedMessage.company_name && isMobile && (
                    <span 
                      className="text-xs text-neutral-500 dark:text-neutral-400"
                      style={{
                        marginTop: '2px',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {selectedMessage.company_name}
                    </span>
                  )}
                </div>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {convertToEasternTime(currentMessage?.timestamp || selectedMessage.timestamp)}
                </span>
                
                {/* Feedback icon */}
                <div 
                  className="ml-1 cursor-pointer hover:opacity-80 transition-opacity text-blue-500 dark:text-blue-400"
                  onClick={() => setFeedbackModalOpen(true)}
                  title="Provide feedback"
                >
                  <ThumbsDown size={16} />
                </div>
              </div>
              
              {/* Close button for mobile */}
              {isMobile && (
                <button 
                  onClick={handleCloseAnalysisPanel}
                  className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center justify-center w-[30px] h-[30px] rounded-full bg-neutral-200 dark:bg-neutral-700"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Tabs row - only show if multiple tabs available */}
            {availableTabs.length > 1 && (
              <div className="flex space-x-1 bg-neutral-100 dark:bg-neutral-700 rounded-lg p-1">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? `${tab.colors.active} shadow-sm`
                        : tab.colors.inactive
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto">
            {!currentMessage?.link && (
              <div
                className="text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap markdown-content break-words overflow-wrap-anywhere"
                style={{
                  fontSize: isMobile ? '0.875rem' : '0.75rem',
                  lineHeight: isMobile ? '1.5' : undefined,
                }}
              >
                {currentMessage?.source === 'transcript_analysis' ? (
                  // Display transcript analysis with structured data
                  <div className="space-y-4">
                    {/* Show just the preview text */}
                    <div className="text-purple-700 dark:text-purple-400 font-semibold mb-3">
                      {ParseTranscriptMessage(currentMessage) || '📊 Earnings Call Transcript Analysis'}
                    </div>
                    
                    {/* Display structured transcript data in human-readable format */}
                    {parsedTranscriptData && Object.keys(parsedTranscriptData).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(parsedTranscriptData).map(([section, items]) => (
                          <div key={section}>
                            <div className="text-purple-700 dark:text-purple-400 font-semibold mb-2">{section}</div>
                            <ul className="space-y-1 list-disc pl-5">
                              {items.map((item, idx) => (
                                <li key={idx} className="text-neutral-600 dark:text-neutral-300">
                                  {typeof item === 'string' ? item : item.text || item.label}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-neutral-500 dark:text-neutral-400 text-center p-4">
                        No transcript analysis data available
                      </div>
                    )}
                  </div>
                ) : (currentMessage?.source === 'sentiment_analysis' || currentMessage?.sentiment_additional_metrics) ? (
                  // Display sentiment analysis with structured data
                  <div className="space-y-4">
                    {/* Show the preview text */}
                    <div className="text-green-700 dark:text-green-400 font-semibold mb-3">
                      {ParseSentimentMessage(currentMessage) || '📈 Sentiment Analysis'}
                    </div>
                    
                    {/* Display structured sentiment data in human-readable format */}
                    {parsedSentimentData && Object.keys(parsedSentimentData).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(parsedSentimentData).map(([section, items]) => (
                          <div key={section}>
                            <div className="text-green-700 dark:text-green-400 font-semibold mb-2">{section}</div>
                            {['Key Quotes', 'Key Sentiment Drivers'].includes(section) ? (
                              <ul className="space-y-2 list-disc pl-5">
                                {items.map((item, idx) => (
                                  <li key={idx} className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                                    {typeof item === 'string' ? item : item.text || item.label}
                                  </li>
                                ))}
                              </ul>
                            ) : section === 'Sentiment Analysis' ? (
                              <div className="grid grid-cols-1 gap-3">
                                {items.map((item, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                                    <span className="font-medium text-green-800 dark:text-green-300">
                                      {typeof item === 'string' ? item : item.label}
                                    </span>
                                    <span className="text-green-700 dark:text-green-300 font-semibold">
                                      {typeof item === 'string' ? '' : item.text}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {items.map((item, idx: number) => (
                                  <div key={idx} className="flex flex-col gap-1 p-2 bg-gray-50 dark:bg-neutral-700 rounded border border-gray-200 dark:border-neutral-600">
                                    {typeof item === 'string' ? (
                                      <span className="text-neutral-600 dark:text-neutral-300">{item}</span>
                                    ) : (
                                      <>
                                        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{item.label}</span>
                                        <span className="text-neutral-600 dark:text-neutral-300 text-sm">{item.text}</span>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-neutral-500 dark:text-neutral-400 text-center p-4">
                        No sentiment analysis data available
                      </div>
                    )}
                  </div>
                ) : parsedMessage && Object.keys(parsedMessage).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(parsedMessage).map(([section, items]) => (
                      <div key={section}>
                        <div className="text-primary-700 dark:text-primary-400 font-semibold mb-2">{section}</div>
                        { ['Additional Metrics', 'Company Highlights'].includes(section) ? (
                          <ul className="space-y-1 list-disc pl-5">
                            {items.map((item, idx) => (
                              <li key={idx} className="text-neutral-600 dark:text-neutral-300">
                                {typeof item === 'string' ? item : item.text || item.label}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="space-y-1">
                          {items.map((item, idx: number) => (
                            <div key={idx} className="flex flex-wrap gap-2 items-center">
                              <span className="text-neutral-600 dark:text-neutral-300">
                                {typeof item === 'string' ? item : item.text || item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                        )
                        }
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-neutral-500 dark:text-neutral-400 text-center p-4">
                    No structured metrics available
                  </div>
                )}
              </div>
            )}

            {currentMessage?.link && (
              <div className="pt-4 border-neutral-200 dark:border-neutral-700">
                <a 
                  href={currentMessage.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                  style={{
                    display: 'inline-flex',
                    padding: isMobile ? '10px 16px' : undefined,
                    fontSize: isMobile ? '0.9rem' : undefined
                  }}
                >
                  <span>View {currentMessage.ticker} Report</span>
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-neutral-500 dark:text-neutral-400">
          <p>Select a message to view analysis</p>
        </div>
      )}
    </div>
  );
};



export default AnalysisPanel;
