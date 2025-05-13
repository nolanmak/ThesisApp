import React from 'react';
import { Message } from '../../../types';
import { ThumbsDown, X } from 'lucide-react';

// Interface for metric objects
interface Metric {
  metric_label: string;
  metric_value: number | null;
  metric_value_low: number | null;
  metric_value_high: number | null;
  metric_unit: string;
  metric_currency: string;
}

// Interface for structured message data
interface MessageData {
  current_quarter?: Metric[];
  next_quarter_guidance?: Metric[];
  current_year?: Metric[];
  next_year_guidance?: Metric[];
  company_provided_commentary?: string[];
  message?: string;
}

interface AnalysisPanelProps {
  selectedMessage: Message | null;
  isMobile: boolean;
  showAnalysisPanel: boolean;
  convertToEasternTime: (utcTimestamp: string) => string;
  handleCloseAnalysisPanel: () => void;
  setFeedbackModalOpen: (open: boolean) => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  selectedMessage,
  isMobile,
  showAnalysisPanel,
  convertToEasternTime,
  handleCloseAnalysisPanel,
  setFeedbackModalOpen
}) => {
  return (
    <div 
      style={{
        width: isMobile ? '100%' : '35%',
        display: (isMobile && !showAnalysisPanel) ? 'none' : 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '0.375rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        border: '1px solid #f1f1f1',
        height: isMobile ? '100%' : undefined,
        position: isMobile ? 'absolute' : 'relative',
        top: isMobile ? 0 : undefined,
        left: isMobile ? 0 : undefined,
        right: isMobile ? 0 : undefined,
        bottom: isMobile ? 0 : undefined,
        zIndex: isMobile ? 10 : undefined
      }}
    >
      {selectedMessage ? (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div 
            className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200"
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
                className="flex items-center bg-primary-50 px-3 py-1 rounded-md"
                style={{
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  padding: isMobile ? '6px 10px' : undefined,
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="font-medium text-primary-700">{selectedMessage.ticker}</span>
                  <span className="mx-1 text-neutral-400">|</span>
                  <span className="text-neutral-600">Q{selectedMessage.quarter}</span>
                </div>
                {selectedMessage.company_name && isMobile && (
                  <span 
                    className="text-xs text-neutral-500"
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
              <span className="text-sm text-neutral-500">
                {convertToEasternTime(selectedMessage.timestamp)}
              </span>
              
              {/* Feedback icon */}
              <div 
                className="ml-1 cursor-pointer hover:opacity-80 transition-opacity text-blue-500"
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
                className="text-neutral-500 hover:text-neutral-700"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: '#f3f4f6'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto">
            
            {!selectedMessage.link && (
              <div className="prose max-w-none overflow-x-hidden">
                <div 
                  className="text-neutral-800 whitespace-pre-wrap markdown-content break-words overflow-wrap-anywhere"
                  style={{
                    fontSize: isMobile ? '0.875rem' : '0.75rem',
                    lineHeight: isMobile ? '1.5' : undefined
                  }}
                >
                  {(() => {
                    // Try to parse the discord_message as JSON
                    try {
                      const jsonData = JSON.parse(selectedMessage.discord_message);
                      
                      // If it has a message property, return just that part
                      if (jsonData && jsonData.message) {
                        return jsonData.message;
                      }
                      
                      // Handle the format for messages without estimates
                      if (jsonData && (jsonData.current_quarter || jsonData.next_quarter_guidance)) {
                        return formatMessageWithoutEstimates(jsonData);
                      }
                      
                      // Otherwise, stringify the JSON with formatting for readability
                      return JSON.stringify(jsonData, null, 2);
                    } catch {
                      // Not JSON, return as is
                      return selectedMessage.discord_message;
                    }
                  })()}
                </div>
              </div>
            )}
            {selectedMessage.link && (
              <div className="pt-4 border-neutral-200">
                <a 
                  href={selectedMessage.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100 transition-colors"
                  style={{
                    display: 'inline-flex',
                    padding: isMobile ? '10px 16px' : undefined,
                    fontSize: isMobile ? '0.9rem' : undefined
                  }}
                >
                  <span>View {selectedMessage.ticker} Report</span>
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-neutral-500">
          <p>Select a message to view analysis</p>
        </div>
      )}
    </div>
  );
};

// Helper function to format message content for messages without estimates
const formatMessageWithoutEstimates = (jsonData: MessageData): string => {
  let formattedMessage = '';
  
  // Current Quarter Section
  if (jsonData.current_quarter && Array.isArray(jsonData.current_quarter) && jsonData.current_quarter.length > 0) {
    formattedMessage += 'Current Quarter\n';
    
    // Sort metrics by importance (Revenue, EPS, etc.)
    const sortedMetrics = [...jsonData.current_quarter].sort((a: Metric, b: Metric) => {
      const order = ['Revenue', 'EPS', 'EPS Diluted', 'Net Income', 'Gross Margin', 'Operating Income'];
      const aIndex = order.indexOf(a.metric_label);
      const bIndex = order.indexOf(b.metric_label);
      
      // If both metrics are in the order array, sort by their position
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      // If only a is in the order array, it comes first
      if (aIndex !== -1) return -1;
      // If only b is in the order array, it comes first
      if (bIndex !== -1) return 1;
      // Otherwise, sort alphabetically
      return a.metric_label.localeCompare(b.metric_label);
    });
    
    // Add each metric to the message - no limits, show all metrics with values
    sortedMetrics.forEach(metric => {
      if (metric.metric_value !== null || metric.metric_value_low !== null) {
        let value = '';
        
        // Format range values
        if (metric.metric_value_low !== null && metric.metric_value_high !== null) {
          value = `${metric.metric_value_low}-${metric.metric_value_high}`;
        } else if (metric.metric_value !== null) {
          value = `${metric.metric_value}`;
        }
        
        // Add unit and currency
        if (metric.metric_unit === 'millions') {
          value += 'M';
        } else if (metric.metric_unit === 'billions') {
          value += 'B';
        } else if (metric.metric_unit === '%') {
          value += '%';
        } else if (metric.metric_unit && metric.metric_unit !== '') {
          value += ` ${metric.metric_unit}`;
        }
        
        // Add currency symbol
        if (metric.metric_currency === 'USD' && !value.startsWith('$')) {
          value = '$' + value;
        }
        
        formattedMessage += `${metric.metric_label}: ${value}\n`;
      }
    });
    
    formattedMessage += '\n';
  }
  
  // Next Quarter Guidance Section
  if (jsonData.next_quarter_guidance && Array.isArray(jsonData.next_quarter_guidance)) {
    // Filter out metrics with null values
    const guidanceMetrics = jsonData.next_quarter_guidance.filter(
      (m: Metric) => m.metric_value !== null || m.metric_value_low !== null
    );
    
    if (guidanceMetrics.length > 0) {
      formattedMessage += 'Next Quarter Guidance\n';
      
      // Sort metrics by importance
      const sortedGuidance = [...guidanceMetrics].sort((a: Metric, b: Metric) => {
        const order = ['Revenue', 'EPS', 'EPS Diluted', 'Net Income', 'Gross Margin', 'Operating Income'];
        const aIndex = order.indexOf(a.metric_label);
        const bIndex = order.indexOf(b.metric_label);
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.metric_label.localeCompare(b.metric_label);
      });
      
      // Add each guidance metric to the message - no limits, show all metrics with values
      sortedGuidance.forEach(metric => {
        let value = '';
        
        // Format range values
        if (metric.metric_value_low !== null && metric.metric_value_high !== null) {
          value = `${metric.metric_value_low}-${metric.metric_value_high}`;
        } else if (metric.metric_value !== null) {
          value = `${metric.metric_value}`;
        }
        
        // Add unit and currency
        if (metric.metric_unit === 'millions') {
          value += 'M';
        } else if (metric.metric_unit === 'billions') {
          value += 'B';
        } else if (metric.metric_unit === '%') {
          value += '%';
        } else if (metric.metric_unit && metric.metric_unit !== '') {
          value += ` ${metric.metric_unit}`;
        }
        
        // Add currency symbol
        if (metric.metric_currency === 'USD' && !value.startsWith('$')) {
          value = '$' + value;
        }
        
        formattedMessage += `${metric.metric_label}: ${value}\n`;
      });
      
      formattedMessage += '\n';
    }
  }
  
  // Current Year Section
  if (jsonData.current_year && Array.isArray(jsonData.current_year) && jsonData.current_year.length > 0) {
    // Filter out metrics with null values
    const yearMetrics = jsonData.current_year.filter(
      (m: Metric) => m.metric_value !== null || m.metric_value_low !== null
    );
    
    if (yearMetrics.length > 0) {
      formattedMessage += 'Current Year\n';
      
      // Sort and add metrics
      const sortedYearMetrics = [...yearMetrics].sort((a: Metric, b: Metric) => {
        const order = ['Revenue', 'EPS', 'EPS Diluted', 'Net Income', 'Gross Margin', 'Operating Income'];
        const aIndex = order.indexOf(a.metric_label);
        const bIndex = order.indexOf(b.metric_label);
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.metric_label.localeCompare(b.metric_label);
      });
      
      // Add each metric to the message - no limits, show all metrics with values
      sortedYearMetrics.forEach(metric => {
        let value = '';
        
        // Format range values
        if (metric.metric_value_low !== null && metric.metric_value_high !== null) {
          value = `${metric.metric_value_low}-${metric.metric_value_high}`;
        } else if (metric.metric_value !== null) {
          value = `${metric.metric_value}`;
        }
        
        // Add unit and currency
        if (metric.metric_unit === 'millions') {
          value += 'M';
        } else if (metric.metric_unit === 'billions') {
          value += 'B';
        } else if (metric.metric_unit === '%') {
          value += '%';
        } else if (metric.metric_unit && metric.metric_unit !== '') {
          value += ` ${metric.metric_unit}`;
        }
        
        // Add currency symbol
        if (metric.metric_currency === 'USD' && !value.startsWith('$')) {
          value = '$' + value;
        }
        
        formattedMessage += `${metric.metric_label}: ${value}\n`;
      });
      
      formattedMessage += '\n';
    }
  }
  
  // Next Year Guidance Section
  if (jsonData.next_year_guidance && Array.isArray(jsonData.next_year_guidance) && jsonData.next_year_guidance.length > 0) {
    // Filter out metrics with null values
    const nextYearMetrics = jsonData.next_year_guidance.filter(
      (m: Metric) => m.metric_value !== null || m.metric_value_low !== null
    );
    
    if (nextYearMetrics.length > 0) {
      formattedMessage += 'Next Year Guidance\n';
      
      // Sort and add metrics
      const sortedNextYearMetrics = [...nextYearMetrics].sort((a: Metric, b: Metric) => {
        const order = ['Revenue', 'EPS', 'EPS Diluted', 'Net Income', 'Gross Margin', 'Operating Income'];
        const aIndex = order.indexOf(a.metric_label);
        const bIndex = order.indexOf(b.metric_label);
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.metric_label.localeCompare(b.metric_label);
      });
      
      // Add each metric to the message - no limits, show all metrics with values
      sortedNextYearMetrics.forEach(metric => {
        let value = '';
        
        // Format range values
        if (metric.metric_value_low !== null && metric.metric_value_high !== null) {
          value = `${metric.metric_value_low}-${metric.metric_value_high}`;
        } else if (metric.metric_value !== null) {
          value = `${metric.metric_value}`;
        }
        
        // Add unit and currency
        if (metric.metric_unit === 'millions') {
          value += 'M';
        } else if (metric.metric_unit === 'billions') {
          value += 'B';
        } else if (metric.metric_unit === '%') {
          value += '%';
        } else if (metric.metric_unit && metric.metric_unit !== '') {
          value += ` ${metric.metric_unit}`;
        }
        
        // Add currency symbol
        if (metric.metric_currency === 'USD' && !value.startsWith('$')) {
          value = '$' + value;
        }
        
        formattedMessage += `${metric.metric_label}: ${value}\n`;
      });
      
      formattedMessage += '\n';
    }
  }
  
  // Company Commentary Section
  if (jsonData.company_provided_commentary && Array.isArray(jsonData.company_provided_commentary) && jsonData.company_provided_commentary.length > 0) {
    formattedMessage += 'Company Highlights\n';
    
    jsonData.company_provided_commentary.forEach((comment: string) => {
      formattedMessage += `• ${comment}\n`;
    });
  }
  
  return formattedMessage;
};

export default AnalysisPanel;
