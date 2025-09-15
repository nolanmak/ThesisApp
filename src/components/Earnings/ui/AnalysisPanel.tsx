import React, { useState, useEffect, useMemo } from 'react';
import { Message } from '../../../types';
import { ThumbsDown, X } from 'lucide-react';
import { ParseMessagePayload, ParseTranscriptMessage, ParseTranscriptData, ParseSentimentMessage, ParseSentimentData, ParseSwingAnalysisData } from '../utils/messageUtils';
import useGlobalData from '../../../hooks/useGlobalData';

interface AnalysisPanelProps {
  selectedMessage: Message | null;
  isMobile: boolean;
  showAnalysisPanel: boolean;
  convertToEasternTime: (utcTimestamp: string) => string;
  handleCloseAnalysisPanel: () => void;
  setFeedbackModalOpen: (open: boolean) => void;
  messages?: Message[]; // Add messages prop to access all messages for tab filtering
  selectedTicker?: string | null; // Add selected ticker from RealTimeGrid
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  selectedMessage,
  isMobile,
  showAnalysisPanel,
  convertToEasternTime,
  handleCloseAnalysisPanel,
  setFeedbackModalOpen,
  messages = [],
  selectedTicker = null
}) => {
  const [activeTab, setActiveTab] = useState<string>('earnings');
  const { metricsData } = useGlobalData();
  
  // Get message type for tab identification
  const getMessageType = (message: Message): string => {
    if (message.link || message.report_data?.link || 
        message.source?.toLowerCase() === 'link' || 
        message.type?.toLowerCase() === 'link') return 'report';
    if (message.source === 'transcript_analysis') return 'transcript';
    if (message.source === 'sentiment_analysis' || message.sentiment_additional_metrics) return 'sentiment';
    if (message.source === 'fundamentals_analysis') return 'fundamentals';
    return 'earnings';
  };

  // Get metrics for the selected ticker (prioritize selectedTicker from RealTimeGrid)
  const currentTicker = selectedTicker || selectedMessage?.ticker;
  const tickerMetrics = useMemo(() => {
    if (!currentTicker || !metricsData?.length) return null;
    return metricsData.find(metric => metric.ticker === currentTicker);
  }, [currentTicker, metricsData]);

  // Find related messages for the same ticker, quarter, and year
  const relatedMessages = useMemo(() => {

    if (!selectedMessage && !selectedTicker) {
      return {};
    }
    
    // If we have a selectedTicker but no selectedMessage, group all messages for that ticker
    const targetTicker = selectedTicker || selectedMessage?.ticker;
    if (!targetTicker) {
      return {};
    }

    // Filter messages by ticker
    const related = messages.filter(msg => {
      if (!msg.ticker) return false;
      return msg.ticker.toUpperCase() === targetTicker.toUpperCase();
    });
    
    
    // Group by message type
    const grouped: Record<string, Message> = {};
    related.forEach(msg => {
      const type = getMessageType(msg);
      if (!grouped[type] || new Date(msg.timestamp) > new Date(grouped[type].timestamp)) {
        grouped[type] = msg; // Keep the most recent message of each type
      }
    });
    
    
    return grouped;
  }, [selectedMessage, messages, selectedTicker]);

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
    // Always show fundamentals tab if we have a ticker and metrics data
    if (currentTicker && tickerMetrics) {
      tabs.push({ 
        id: 'fundamentals', 
        label: 'Fundamentals', 
        message: relatedMessages.fundamentals || selectedMessage || {
          // Create a minimal message for fundamentals display when no selectedMessage
          id: `fundamentals-${currentTicker}`,
          ticker: currentTicker,
          timestamp: new Date().toISOString(),
          type: 'fundamentals',
          title: `Fundamentals for ${currentTicker}`,
          content: '',
          link: null,
          year: undefined,
          quarter: undefined
        } as Message, 
        colors: {
          active: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200',
          inactive: 'text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/30'
        }
      });
    }
    // Add Report tab last (far right position)
    if (relatedMessages.report) tabs.push({ 
      id: 'report', 
      label: 'Report', 
      message: relatedMessages.report,
      colors: {
        active: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
        inactive: 'text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/30'
      }
    });
    return tabs;
  }, [relatedMessages, selectedMessage, tickerMetrics, currentTicker]);

  // Current message to display based on active tab
  const currentMessage = useMemo(() => {
    const tabMessage = availableTabs.find(tab => tab.id === activeTab)?.message;
    return tabMessage || selectedMessage;
  }, [activeTab, availableTabs, selectedMessage]);

  // Reset active tab when selected message or ticker changes
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [lastTicker, setLastTicker] = useState<string | null>(null);
  useEffect(() => {
    const messageIdChanged = selectedMessage?.message_id !== lastMessageId;
    const tickerChanged = currentTicker !== lastTicker;
    
    if (messageIdChanged || tickerChanged) {
      const availableTabIds = availableTabs.map(tab => tab.id);
      
      if (selectedMessage && messageIdChanged) {
        // If we have a message, use its type
        const messageType = getMessageType(selectedMessage);
        if (availableTabIds.includes(messageType)) {
          setActiveTab(messageType);
        } else if (availableTabIds.length > 0) {
          setActiveTab(availableTabIds[0]);
        }
      } else if (!selectedMessage && tickerChanged && availableTabIds.includes('fundamentals')) {
        // If no message but have ticker with fundamentals, default to fundamentals
        setActiveTab('fundamentals');
      } else if (availableTabIds.length > 0) {
        // Default to first available tab
        const firstTab = availableTabIds[0];
        if (firstTab) {
          setActiveTab(firstTab);
        }
      }
      
      setLastMessageId(selectedMessage?.message_id ?? selectedMessage?.id ?? null);
      setLastTicker(currentTicker || null);
    }
  }, [selectedMessage, availableTabs, lastMessageId, currentTicker, lastTicker]);

  const parsedMessage = currentMessage ? ParseMessagePayload(currentMessage) : null;
  const parsedTranscriptData = currentMessage ? ParseTranscriptData(currentMessage) : null;
  // Try new Bull/Bear format first, then fall back to legacy sentiment format
  const parsedSwingData = currentMessage ? ParseSwingAnalysisData(currentMessage) : null;
  const parsedSentimentData = parsedSwingData || (currentMessage ? ParseSentimentData(currentMessage) : null);

  // Simple Bar Chart Component
  const SimpleBarChart: React.FC<{
    data: number[];
    labels?: string[];
    title: string;
    color?: string | string[];
    height?: number;
  }> = ({ data, labels, title, color = '#3b82f6', height = 120 }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const maxValue = Math.max(...data.filter(d => d !== null && !isNaN(d)));
    const minValue = Math.min(...data.filter(d => d !== null && !isNaN(d)));
    const range = maxValue - minValue || 1;

    // Generate Y-axis scale labels
    const yAxisLabels = [];
    const numLabels = 5;
    for (let i = 0; i < numLabels; i++) {
      const value = maxValue - (i * range / (numLabels - 1));
      if (value >= 1000000) {
        yAxisLabels.push(`${(value / 1000000).toFixed(1)}M`);
      } else if (value >= 1000) {
        yAxisLabels.push(`${(value / 1000).toFixed(1)}K`);
      } else {
        yAxisLabels.push(value.toFixed(0));
      }
    }

    return (
      <div className="bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg p-3 sm:p-4 mb-4 overflow-hidden relative">
        <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-neutral-800 dark:text-neutral-200 truncate">{title}</h3>
        <div className="flex">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between pr-2 text-xs text-neutral-500 dark:text-neutral-400" style={{ height: `${height}px` }}>
            {yAxisLabels.map((label, index) => (
              <div key={index} className="leading-none">
                {label}
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 flex items-end justify-between gap-1" style={{ height: `${height}px` }}>
            {data.map((value, index) => {
              const isValid = value !== null && !isNaN(value);
              const barHeight = isValid ? Math.max(((value - minValue) / range) * height * 0.8, 2) : 0;

              // Get color for this bar - support both single color and array of colors
              const barColor = isValid
                ? (Array.isArray(color) ? (color[index] || color[0]) : color)
                : '#e5e7eb';

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center min-w-0 max-w-[40px] relative"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div
                    className="transition-all duration-200 cursor-pointer hover:opacity-80"
                    style={{
                      height: `${barHeight}px`,
                      backgroundColor: barColor,
                      width: '100%',
                      maxWidth: isMobile ? '16px' : '24px',
                      minWidth: '8px'
                    }}
                  />
                  {labels && labels[index] && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 truncate w-full text-center">
                      {labels[index]}
                    </span>
                  )}

                  {/* Hover Tooltip */}
                  {hoveredIndex === index && isValid && (
                    <div className="absolute bottom-full mb-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-2 py-1 rounded text-xs whitespace-nowrap z-10 shadow-lg">
                      {labels && labels[index] && `${labels[index]}: `}
                      {typeof value === 'string' ? value : value.toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Dual Series Bar Chart for Q/Q comparison
  const DualSeriesChart: React.FC<{
    series1: number[];
    series2: number[];
    labels: string[];
    title: string;
    series1Color?: string;
    series2Color?: string;
    height?: number;
  }> = ({
    series1,
    series2,
    labels,
    title,
    series1Color = '#ef4444',
    series2Color = '#3b82f6',
    height = 120
  }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const allData = [...series1.filter(d => d !== null && !isNaN(d)), ...series2.filter(d => d !== null && !isNaN(d))];
    const maxValue = Math.max(...allData);
    const minValue = Math.min(...allData);
    const range = maxValue - minValue || 1;

    // Generate Y-axis scale labels
    const yAxisLabels = [];
    const numLabels = 5;
    for (let i = 0; i < numLabels; i++) {
      const value = maxValue - (i * range / (numLabels - 1));
      if (value >= 1000000) {
        yAxisLabels.push(`${(value / 1000000).toFixed(1)}M`);
      } else if (value >= 1000) {
        yAxisLabels.push(`${(value / 1000).toFixed(1)}K`);
      } else {
        yAxisLabels.push(value.toFixed(0));
      }
    }

    return (
      <div className="bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg p-3 sm:p-4 mb-4 overflow-hidden relative">
        <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-neutral-800 dark:text-neutral-200 truncate">{title}</h3>
        <div className="flex">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between pr-2 text-xs text-neutral-500 dark:text-neutral-400" style={{ height: `${height}px` }}>
            {yAxisLabels.map((label, index) => (
              <div key={index} className="leading-none">
                {label}
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 flex items-end justify-between gap-1" style={{ height: `${height}px` }}>
          {series1.map((_, index) => {
            const value1 = series1[index];
            const value2 = series2[index];
            const isValid1 = value1 !== null && !isNaN(value1);
            const isValid2 = value2 !== null && !isNaN(value2);
            
            const barHeight1 = isValid1 ? Math.max(((value1 - minValue) / range) * height * 0.8, 2) : 0;
            const barHeight2 = isValid2 ? Math.max(((value2 - minValue) / range) * height * 0.8, 2) : 0;
            
            return (
              <div 
                key={index} 
                className="flex-1 flex flex-col items-center min-w-0 relative"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex w-full justify-center gap-0.5" style={{ height: `${height}px`, alignItems: 'flex-end' }}>
                  <div 
                    className="transition-all duration-200 cursor-pointer hover:opacity-80"
                    style={{ 
                      height: `${barHeight1}px`,
                      backgroundColor: isValid1 ? series1Color : '#e5e7eb',
                      minWidth: '4px',
                      width: isMobile ? '6px' : '8px',
                      maxWidth: isMobile ? '8px' : '12px'
                    }}
                  />
                  <div 
                    className="transition-all duration-200 cursor-pointer hover:opacity-80"
                    style={{ 
                      height: `${barHeight2}px`,
                      backgroundColor: isValid2 ? series2Color : '#e5e7eb',
                      minWidth: '4px',
                      width: isMobile ? '6px' : '8px',
                      maxWidth: isMobile ? '8px' : '12px'
                    }}
                  />
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 truncate w-full text-center">
                  {labels[index]}
                </span>
                
                {/* Hover Tooltip */}
                {hoveredIndex === index && (value1 !== null || value2 !== null) && (
                  <div className="absolute bottom-full mb-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-2 py-1 rounded text-xs whitespace-nowrap z-10 shadow-lg">
                    <div className="text-center">
                      <div className="font-medium mb-1">{labels[index]}</div>
                      {value1 !== null && !isNaN(value1) && (
                        <div>
                          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: series1Color }}></span>
                          Recent: {value1.toLocaleString()}
                        </div>
                      )}
                      {value2 !== null && !isNaN(value2) && (
                        <div>
                          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: series2Color }}></span>
                          Prior: {value2.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>
    );
  };

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
      {selectedMessage || currentTicker ? (
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
                    <span className="font-medium text-primary-700 dark:text-primary-300">{currentTicker}</span>
                    {selectedMessage?.quarter && (
                      <>
                        <span className="mx-1 text-neutral-400 dark:text-neutral-500">|</span>
                        <span className="text-neutral-600 dark:text-neutral-300">Q{selectedMessage.quarter}</span>
                      </>
                    )}
                  </div>
                  {selectedMessage?.company_name && isMobile && (
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
                {(currentMessage?.timestamp || selectedMessage?.timestamp) && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {convertToEasternTime(currentMessage?.timestamp || selectedMessage?.timestamp || new Date().toISOString())}
                  </span>
                )}
                
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

            {/* Tabs row - show if any tabs available */}
            {availableTabs.length > 0 && (
              <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-lg p-1">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 rounded-md transition-colors text-center truncate whitespace-nowrap overflow-hidden ${
                      activeTab === tab.id
                        ? `${tab.colors.active} shadow-sm`
                        : tab.colors.inactive
                    }`}
                    style={{
                      fontSize: availableTabs.length >= 5 ? (isMobile ? '0.6rem' : '0.65rem') :
                               availableTabs.length >= 4 ? (isMobile ? '0.65rem' : '0.7rem') : 
                               availableTabs.length >= 3 ? (isMobile ? '0.7rem' : '0.75rem') : 
                               (isMobile ? '0.75rem' : '0.875rem'),
                      fontWeight: availableTabs.length >= 4 ? '500' : '600',
                      padding: availableTabs.length >= 5 ? (isMobile ? '4px 2px' : '6px 4px') :
                               availableTabs.length >= 4 ? (isMobile ? '5px 3px' : '6px 6px') :
                               (isMobile ? '6px 8px' : '6px 8px')
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto">
            <div
              className="text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap markdown-content break-words overflow-wrap-anywhere"
              style={{
                fontSize: isMobile ? '0.875rem' : '0.75rem',
                lineHeight: isMobile ? '1.5' : undefined,
              }}
            >
                {activeTab === 'transcript' ? (
                  // Display transcript analysis with structured data
                  <div className="space-y-4">
                    {/* Show just the preview text */}
                    <div className="text-purple-700 dark:text-purple-400 font-semibold mb-3">
                      {currentMessage && ParseTranscriptMessage(currentMessage) || '📊 Earnings Call Transcript Analysis'}
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
                ) : activeTab === 'fundamentals' ? (
                  // Display fundamentals charts using metrics data
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="text-orange-700 dark:text-orange-400 font-semibold mb-3">
                      📊 Fundamentals Analysis - {currentTicker}
                    </div>
                    
                    {tickerMetrics ? (
                      <div className="space-y-4">
                        {/* Quarterly Sales Chart (Q0-Q8) */}
                        <SimpleBarChart
                          data={[
                            parseFloat(String(tickerMetrics['$s0'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$s1'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$s2'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$s3'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$s4'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$s5'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$s6'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$s7'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$s8'] || 0).replace(/,/g, ''))
                          ]}
                          labels={['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8']}
                          title="Quarterly Sales"
                          color="#3b82f6"
                          height={140}
                        />

                        {/* Q/Q Sales Comparison Chart */}
                        <DualSeriesChart
                          series1={[
                            parseFloat(String(tickerMetrics['$s7'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$s6'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$s5'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$s4'] || 0).replace(/,/g, ''))
                          ]}
                          series2={[
                            parseFloat(String(tickerMetrics['$s3'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$s2'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$s1'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$s0'] || 0).replace(/,/g, ''))
                          ]}
                          labels={['Q1', 'Q2', 'Q3', 'Q4']}
                          title="Q/Q Sales Comparison"
                          series1Color="#3b82f6" // blue for prior year quarters
                          series2Color="#10b981" // green for current year quarters (right side)
                          height={140}
                        />

                        {/* Annual EPS Chart */}
                        <SimpleBarChart
                          data={[
                            parseFloat(String(tickerMetrics['$eps4'] || 0)),
                            parseFloat(String(tickerMetrics['$eps3'] || 0)),
                            parseFloat(String(tickerMetrics['$eps2'] || 0)),
                            parseFloat(String(tickerMetrics['$eps1'] || 0)),
                            parseFloat(String(tickerMetrics['$eps0'] || 0)),
                            parseFloat(String(tickerMetrics['curfyepsmean'] || 0)),
                            parseFloat(String(tickerMetrics['nextfyepsmean'] || 0))
                          ]}
                          labels={['Y5', 'Y4', 'Y3', 'Y2', 'Y1', 'CY', 'NY']}
                          title="Annual EPS"
                          color={[
                            '#10b981', // Y5 - Historical (solid green)
                            '#10b981', // Y4 - Historical (solid green)
                            '#10b981', // Y3 - Historical (solid green)
                            '#10b981', // Y2 - Historical (solid green)
                            '#10b981', // Y1 - Historical (solid green)
                            '#6ee7b7', // CY - Current Year Estimate (lighter green)
                            '#a7f3d0'  // NY - Next Year Estimate (lightest green)
                          ]}
                          height={120}
                        />

                        {/* Annual Sales Chart */}
                        <SimpleBarChart
                          data={[
                            parseFloat(String(tickerMetrics['$salesa5'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$salesa4'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$salesa3'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$salesa2'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['$salesa1'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['curfysalesmean'] || 0).replace(/,/g, '')),
                            parseFloat(String(tickerMetrics['nextfysalesmean'] || 0).replace(/,/g, ''))
                          ]}
                          labels={['Y5', 'Y4', 'Y3', 'Y2', 'Y1', 'CY', 'NY']}
                          title="Annual Sales"
                          color="#f59e0b"
                          height={120}
                        />

                        {/* Key Ratios */}
                        <div className="bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg p-3 sm:p-4 overflow-hidden">
                          <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-neutral-800 dark:text-neutral-200">Key Ratios</h3>
                          <div className={`grid gap-2 sm:gap-4 text-xs sm:text-sm ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-600 dark:text-neutral-300 truncate">P/E:</span>
                              <span className="font-medium text-neutral-800 dark:text-neutral-200 ml-2 truncate">
                                {tickerMetrics.peexclxorttm || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-600 dark:text-neutral-300 truncate">P/S:</span>
                              <span className="font-medium text-neutral-800 dark:text-neutral-200 ml-2 truncate">
                                {tickerMetrics.pr2salesq || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-neutral-500 dark:text-neutral-400 text-center p-4">
                        No metrics data available for {currentTicker}
                      </div>
                    )}
                  </div>
                ) : activeTab === 'sentiment' ? (
                  // Display sentiment analysis with structured data
                  <div className="space-y-4">
                    {/* Show the preview text */}
                    <div className="text-green-700 dark:text-green-400 font-medium mb-3" style={{ fontSize: isMobile ? '0.875rem' : '0.75rem' }}>
                      {currentMessage && ParseSentimentMessage(currentMessage) || '📈 Sentiment Analysis'}
                    </div>
                    
                    {/* Display structured sentiment data in human-readable format */}
                    {parsedSentimentData && Object.keys(parsedSentimentData).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(parsedSentimentData).map(([section, items]) => (
                          <div key={section}>
                            <div className="text-green-700 dark:text-green-400 font-medium mb-2" style={{ fontSize: isMobile ? '0.875rem' : '0.75rem' }}>{section}</div>
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
                ) : activeTab === 'report' ? (
                  // Display report/link content
                  <div className="space-y-4">
                    {/* Show message content for link messages */}
                    {(currentMessage?.title || currentMessage?.subject || currentMessage?.message) && (
                      <div className="text-amber-700 dark:text-amber-400 font-semibold mb-3">
                        {currentMessage.title || currentMessage.subject || currentMessage.message}
                      </div>
                    )}
                    
                    {/* Always show the link button */}
                    <div className="text-center">
                      <a 
                        href={currentMessage?.link || currentMessage?.report_data?.link || selectedMessage?.link || selectedMessage?.report_data?.link || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors shadow-sm"
                      >
                        <span>View Full Report</span>
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
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
