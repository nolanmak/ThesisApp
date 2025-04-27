import React, { useEffect, useState, useRef } from 'react';
import { Message } from '../../../types';
import { ExternalLink, BarChart2, X } from 'lucide-react';

interface MessagesListProps {
  messages: Message[];
  loading: boolean;
  convertToEasternTime: (utcTimestamp: string) => string;
  onSelectMessage?: (message: Message) => void;
  createMessagePreview?: (message: Message) => string;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message;
  convertToEasternTime: (utcTimestamp: string) => string;
}

// Feedback Modal Component
const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, message, convertToEasternTime }) => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);
  
  if (!isOpen) return null;
  
  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    
    setIsSubmitting(true);
    setSubmitError('');
    
    const webhookUrl = 'https://discord.com/api/webhooks/1339699614537748491/JjhKM9AEpTv_iS4dVVORe8V7BGt7VZ1F10YlVD-KrppX5ZvwcrmsiECXYAuZoCZsriIv';
    
    try {
      // Format the message for Discord
      const payload = {
        content: 'New Earnings Analysis Feedback:',
        embeds: [{
          title: `Feedback for ${message.ticker} (${message.company_name || 'Unknown Company'})`,
          description: feedback,
          color: 3447003, // Blue color
          fields: [
            {
              name: 'Message ID',
              value: message.message_id,
              inline: true
            },
            {
              name: 'Quarter',
              value: `Q${message.quarter} ${message.year}`,
              inline: true
            },
            {
              name: 'Timestamp',
              value: convertToEasternTime(message.timestamp),
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      };
      
      // Send to Discord webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Error sending feedback: ${response.status}`);
      }
      
      // Show thank you message and reset form
      setFeedback('');
      setShowThankYou(true);
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
        // Reset thank you state after modal is closed
        setTimeout(() => setShowThankYou(false), 300);
      }, 1500);
    } catch (error) {
      console.error('Error sending feedback:', error);
      setSubmitError('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        {showThankYou ? (
          <div className="text-center py-8">
            <div className="text-green-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Thank you for your feedback!</h3>
            <p className="text-gray-600">Your insights help us improve our earnings analysis.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Feedback for {message.ticker} {message.company_name ? `(${message.company_name})` : ''}</h3>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
                How can we improve this earnings analysis?
              </label>
              <textarea
                id="feedback"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your feedback helps us improve..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
          </>
        )}
        
        {!showThankYou && (
          <>
            {submitError && (
              <div className="mb-4 p-2 bg-red-50 text-red-600 rounded text-sm">
                {submitError}
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!feedback.trim() || isSubmitting}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white ${feedback.trim() && !isSubmitting ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'}`}
              >
                {isSubmitting ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Component for message preview - supports both standard text and structured metrics display
const StaticPreview: React.FC<{ 
  content: string | { metrics: Array<{label: string, value: string, expected: string, emoji?: string}> }; 
  multiline?: boolean;
  isMetrics?: boolean;
  isMobile?: boolean;
}> = ({ content, multiline = false, isMetrics = false, isMobile = false }) => {
  // If it's metrics data, render a structured layout
  if (isMetrics && typeof content !== 'string') {
    return (
      <div 
        style={{
          backgroundColor: '#f0f9ff', // Light blue background
          border: '1px solid #bfdbfe', // Light blue border
          borderRadius: '4px',
          padding: isMobile ? '8px 8px' : '6px 10px',
          margin: '4px 0',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          {/* Only render if we have at least one populated metric */}
          {content.metrics.some(metric => metric.value !== 'N/A' && metric.expected !== 'N/A') ? (
            <>
              {/* Current Quarter Section */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center'}}>
                <div style={{ 
                  fontWeight: '600', 
                  color: '#2563eb', 
                  fontSize: isMobile ? '.8rem' : '.7rem', 
                  marginRight: '4px',
                  width: isMobile ? '100%' : 'auto'
                }}>Current Quarter:</div>
                {content.metrics.slice(0, 2)
                  .filter(metric => metric.value !== 'N/A' && metric.expected !== 'N/A') // Only show populated metrics
                  .map((metric, index) => (
                    <div key={index} style={{ 
                      backgroundColor: 'transparent',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <div style={{ fontWeight: '500', fontSize: '.7rem', color: '#64748b'}}>{metric.label}:</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: '600', color: '#1e40af', fontSize: '.7rem' }}>{metric.value}</span>
                        <span style={{ color: '#64748b', fontSize: '.7rem' }}>vs</span>
                        <span style={{ color: '#64748b', fontSize: '.7rem' }}>{metric.expected}</span>
                        {metric.emoji && <span style={{ marginLeft: '2px', fontSize: '.7rem' }}>{metric.emoji}</span>}
                      </div>
                    </div>
                  ))
                }
              </div>
              
              {/* Next Quarter Section - Only show if there are populated metrics */}
              {content.metrics.slice(2, 4).some(metric => metric.value !== 'N/A' && metric.expected !== 'N/A') && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '4px', 
                  alignItems: 'center',
                  width: '100%',
                  maxWidth: '100%',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    fontWeight: '600', 
                    color: '#2563eb', 
                    fontSize: isMobile ? '.8rem' : '.7rem', 
                    marginRight: '4px',
                    width: isMobile ? '100%' : 'auto'
                  }}>Next Quarter:</div>
                    {content.metrics.slice(2, 4)
                      .filter(metric => metric.value !== 'N/A' && metric.expected !== 'N/A') // Only show populated metrics
                      .map((metric, index) => (
                        <div key={index} style={{ 
                          backgroundColor: 'transparent',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <div style={{ fontWeight: '500', fontSize: '0.6rem', color: '#64748b' }}>{metric.label}:</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: '600', color: '#1e40af', fontSize: '0.6rem' }}>{metric.value}</span>
                            <span style={{ color: '#64748b', fontSize: '0.6rem' }}>vs</span>
                            <span style={{ color: '#64748b', fontSize: '0.6rem' }}>{metric.expected}</span>
                            {metric.emoji && <span style={{ marginLeft: '2px', fontSize: '0.6rem' }}>{metric.emoji}</span>}
                          </div>
                        </div>
                      ))
                    }
                </div>
              )}
              
              {/* Current Year Section - Only show if there are populated metrics */}
              {content.metrics.slice(4).some(metric => metric.value !== 'N/A' && metric.expected !== 'N/A') && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '4px', 
                  alignItems: 'center',
                  width: '100%',
                  maxWidth: '100%',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    fontWeight: '600', 
                    color: '#2563eb', 
                    fontSize: isMobile ? '.8rem' : '.7rem', 
                    marginRight: '4px',
                    width: isMobile ? '100%' : 'auto'
                  }}>Fiscal Year:</div>
                    {content.metrics.slice(4)
                      .filter(metric => metric.value !== 'N/A' && metric.expected !== 'N/A') // Only show populated metrics
                      .map((metric, index) => (
                        <div key={index} style={{ 
                          backgroundColor: 'transparent',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <div style={{ fontWeight: '500', fontSize: '0.6rem', color: '#64748b' }}>{metric.label}:</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: '600', color: '#1e40af', fontSize: '0.6rem' }}>{metric.value}</span>
                            <span style={{ color: '#64748b', fontSize: '0.6rem' }}>vs</span>
                            <span style={{ color: '#64748b', fontSize: '0.6rem' }}>{metric.expected}</span>
                            {metric.emoji && <span style={{ marginLeft: '2px', fontSize: '0.6rem' }}>{metric.emoji}</span>}
                          </div>
                        </div>
                      ))
                    }
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '4px', color: '#64748b', fontSize: '.7rem', textAlign: 'center' }}>
              No metrics available
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Standard text preview
  return (
    <div 
      style={{
        backgroundColor: '#f0f9ff', // Light blue background
        border: '1px solid #bfdbfe', // Light blue border
        borderRadius: '4px',
        padding: isMobile ? '5px 8px' : '3px 8px',
        margin: '2px 0',
        minHeight: isMobile ? '24px' : '20px',
        maxHeight: multiline ? (isMobile ? '100px' : '80px') : (isMobile ? '24px' : '20px'),
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-start', // Align to top for multiline
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          color: '#1e40af', // Darker blue text
          fontWeight: '500',
          fontSize: isMobile ? '.8rem' : '.7rem',
          lineHeight: '1.4',
          width: '100%',
          whiteSpace: multiline || isMobile ? 'pre-wrap' : 'nowrap', // Always allow wrapping on mobile
          overflow: 'hidden',
          textOverflow: (multiline || isMobile) ? 'clip' : 'ellipsis', // Add ellipsis for single line only
          wordBreak: isMobile ? 'break-word' : 'normal' // Break long words on mobile
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
  convertToEasternTime,
  onSelectMessage,
  createMessagePreview: externalCreateMessagePreview
}) => {
  // State to track if the device is mobile
  const [isMobile, setIsMobile] = useState(false);
  // State for feedback modal
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedMessageForFeedback, setSelectedMessageForFeedback] = useState<{ id: string, ticker: string } | null>(null);
  
  // Check if the device is mobile based on screen width
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // State to track new messages for highlighting
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  // State to track search term
  const [searchMessageTicker, setSearchMessageTicker] = useState<string>('');
  // State to hold deduplicated messages
  const [deduplicatedMessages, setDeduplicatedMessages] = useState<Message[]>([]);
  
  // Refs
  const allSeenMessageIdsRef = useRef<Set<string>>(new Set());
  const prevMessagesRef = useRef<Message[]>([]);
  const initialLoadCompletedRef = useRef<boolean>(false);
  
  // Update search term from props
  useEffect(() => {
    // Extract search term from WebSocketStatus component
    const searchParam = new URLSearchParams(window.location.search).get('search');
    if (searchParam) {
      setSearchMessageTicker(searchParam);
    }
  }, []);
  
  // Process and deduplicate messages
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
    
    // Process messages to keep only the first one per ticker
    sortedMessages.forEach(message => {
      // For each ticker, we want to keep at most 2 messages:
      // 1. One with a link (typically the first announcement)
      // 2. One with processed data from the report
      
      const key = message.ticker + message.quarter + message.year;
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
  // Define a type for metric items to ensure consistency
  type MetricItem = {
    label: string;
    value: string;
    expected: string;
    emoji: string;
  };

  // Helper function to create a preview of the message content
  const createMessagePreview = (message: Message): { 
    content: string | { metrics: Array<MetricItem> }; 
    multiline: boolean;
    isMetrics: boolean;
  } => {
    // Use external preview function if provided
    if (externalCreateMessagePreview) {
      return { content: externalCreateMessagePreview(message), multiline: false, isMetrics: false };
    }
    
    // If EPSComparison is available, use that for the preview
    if (message.EPSComparison) {
      return { content: message.EPSComparison, multiline: false, isMetrics: false };
    }
    
    // Otherwise fall back to discord_message
    if (!message.discord_message) return { content: '', multiline: false, isMetrics: false };
    
    // Check if discord_message is a JSON string
    try {
      // Try to parse as JSON
      const jsonData = JSON.parse(message.discord_message);
      
      // Check if it has the specific earnings data format we're looking for
      if (jsonData.current_quarter_vs_expected && jsonData.next_quarter_vs_expected) {
        // Handle both formats - the new format with string values and the old format with object values
        let metricsData;
        
        // Check if we have the new format (string values)
        if (typeof jsonData.current_quarter_vs_expected.sales === 'string') {
          // Extract values from formatted strings
          // Define the return type for extractValues to ensure consistency
          type MetricValues = {
            value: string;
            expected: string;
            emoji: string;
          };
          
          const extractValues = (str: string): MetricValues => {
            // Default values if parsing fails
            const defaultValues = { value: 'N/A', expected: 'N/A', emoji: '' };
            
            if (!str) return defaultValues;
            
            // Find the last occurrence of 'vs' in the string
            const vsIndex = str.lastIndexOf(' vs ');
            if (vsIndex === -1) return defaultValues;
            
            // Split the string at the 'vs' to get the value and expected parts
            const valuePart = str.substring(0, vsIndex).trim();
            const expectedPart = str.substring(vsIndex + 4).trim(); // +4 to skip ' vs '
            
            // Extract the value (last word before 'vs')
            const valueWords = valuePart.split(' ');
            const value = valueWords[valueWords.length - 1];
            
            // Extract expected value and emoji
            let expected = expectedPart;
            let emoji = '';
            
            // Check for emoji at the end (last two characters)
            const lastTwoChars = expectedPart.slice(-2);
            // Simple check if the last character is not alphanumeric or parenthesis
            if (lastTwoChars && !lastTwoChars.match(/[a-zA-Z0-9()]/)) {
              emoji = lastTwoChars;
              expected = expectedPart.slice(0, -2).trim();
            }
            
            // Remove '(Expected)' text if present
            const expectedIndex = expected.indexOf('(Expected)');
            if (expectedIndex !== -1) {
              expected = expected.substring(0, expectedIndex).trim();
            }
            
            return {
              value: value === 'N/A' ? 'N/A' : value,
              expected: expected === 'N/A' ? 'N/A' : expected,
              emoji: emoji
            };
          };
          
          // Parse the string values to extract the actual numbers
          const currentSalesValues = extractValues(jsonData.current_quarter_vs_expected.sales);
          const currentEPSValues = extractValues(jsonData.current_quarter_vs_expected.eps);
          const nextSalesValues = extractValues(jsonData.next_quarter_vs_expected.sales);
          const nextEPSValues = extractValues(jsonData.next_quarter_vs_expected.eps);
          
          // Initialize metrics array with current and next quarter data
          const metrics: MetricItem[] = [
            {
              label: 'Sales',
              value: currentSalesValues.value,
              expected: currentSalesValues.expected,
              emoji: currentSalesValues.emoji
            },
            {
              label: 'EPS',
              value: currentEPSValues.value,
              expected: currentEPSValues.expected,
              emoji: currentEPSValues.emoji
            },
            {
              label: 'Sales',
              value: nextSalesValues.value,
              expected: nextSalesValues.expected,
              emoji: nextSalesValues.emoji
            },
            {
              label: 'EPS',
              value: nextEPSValues.value,
              expected: nextEPSValues.expected,
              emoji: nextEPSValues.emoji
            }
          ];
          
          // Add current year metrics if available
          if (jsonData.current_year_vs_expected) {
            const currentYearSalesValues = jsonData.current_year_vs_expected.sales ? 
              extractValues(jsonData.current_year_vs_expected.sales) : 
              { value: 'N/A', expected: 'N/A', emoji: '' };
              
            const currentYearEPSValues = jsonData.current_year_vs_expected.eps ? 
              extractValues(jsonData.current_year_vs_expected.eps) : 
              { value: 'N/A', expected: 'N/A', emoji: '' };
            
            // Add current year metrics to the array
            metrics.push(
              {
                label: 'FY Sales',
                value: currentYearSalesValues.value,
                expected: currentYearSalesValues.expected,
                emoji: currentYearSalesValues.emoji
              },
              {
                label: 'FY EPS',
                value: currentYearEPSValues.value,
                expected: currentYearEPSValues.expected,
                emoji: currentYearEPSValues.emoji
              }
            );
          }
          
          // Format the data as structured metrics
          metricsData = { metrics };
        } else {
          // Original format with nested objects
          const currentSales = jsonData.current_quarter_vs_expected.sales || {};
          const currentEPS = jsonData.current_quarter_vs_expected.eps || {};
          const nextSales = jsonData.next_quarter_vs_expected.sales || {};
          const nextEPS = jsonData.next_quarter_vs_expected.eps || {};
          
          // Initialize metrics array with current and next quarter data
          // Create metrics array with the consistent type
          const metrics: MetricItem[] = [
            {
              label: 'Sales',
              value: currentSales.actual || 'N/A',
              expected: currentSales.expected || 'N/A',
              emoji: ''
            },
            {
              label: 'EPS',
              value: currentEPS.actual || 'N/A',
              expected: currentEPS.expected || 'N/A',
              emoji: ''
            },
            {
              label: 'Sales',
              value: nextSales.guidance || 'N/A',
              expected: nextSales.expected || 'N/A',
              emoji: ''
            },
            {
              label: 'EPS',
              value: nextEPS.guidance || 'N/A',
              expected: nextEPS.expected || 'N/A',
              emoji: ''
            }
          ];
          
          // Add current year metrics if available
          if (jsonData.current_year_vs_expected) {
            const currentYearSales = jsonData.current_year_vs_expected.sales || {};
            const currentYearEPS = jsonData.current_year_vs_expected.eps || {};
            
            // Add current year metrics to the array
            metrics.push(
              {
                label: 'FY Sales',
                value: currentYearSales.actual || 'N/A',
                expected: currentYearSales.expected || 'N/A',
                emoji: ''
              },
              {
                label: 'FY EPS',
                value: currentYearEPS.actual || 'N/A',
                expected: currentYearEPS.expected || 'N/A',
                emoji: ''
              }
            );
          }
          
          metricsData = { metrics };
        }
        
        return { content: metricsData, multiline: true, isMetrics: true };
      }
      
      // If it has a message property but not the specific format, return just that part
      if (jsonData.message) {
        return { content: jsonData.message, multiline: false, isMetrics: false };
      }
    } catch {
      // Not JSON, continue with regular text processing
    }
    
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
    
    // For static preview, we want to show as much content as possible
    return { content: plainText, multiline: false, isMetrics: false };
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
      {/* Feedback Modal */}
      {feedbackModalOpen && selectedMessageForFeedback && (
        <FeedbackModal 
          isOpen={feedbackModalOpen}
          onClose={() => {
            setFeedbackModalOpen(false);
            setSelectedMessageForFeedback(null);
          }}
          message={messages.find(m => m.message_id === selectedMessageForFeedback.id) as Message}
          convertToEasternTime={convertToEasternTime}
        />
      )}
      {deduplicatedMessages.map((message) => (
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
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="14" 
                    height="14" 
                    viewBox="0 0 14 14" 
                    className="ml-1 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the parent onClick
                      setSelectedMessageForFeedback({ id: message.message_id, ticker: message.ticker });
                      setFeedbackModalOpen(true);
                    }}
                  >
                    <path fill="#fbcd00" fillRule="evenodd" d="M0 7a7 7 0 1 1 14 0A7 7 0 0 1 0 7m4.19 3.7a.625.625 0 1 1-1.207-.324a4.163 4.163 0 0 1 8.038 0a.625.625 0 0 1-1.207.325a2.913 2.913 0 0 0-5.624 0Zm.392-4.724a1.024 1.024 0 0 1 .002-2.049h.003a1.024 1.024 0 0 1-.003 2.049zm4.831 0a1.024 1.024 0 0 1 .003-2.049h.002a1.024 1.024 0 0 1-.002 2.049z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>

              {/* Static preview of the message content */}
              {message.discord_message && (
                <StaticPreview
                  content={createMessagePreview(message).content}
                  multiline={createMessagePreview(message).multiline}
                  isMetrics={createMessagePreview(message).isMetrics}
                  isMobile={isMobile}
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
