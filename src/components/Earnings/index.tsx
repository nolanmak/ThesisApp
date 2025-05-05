import React, { useState, useEffect } from 'react';
import MessagesList from './ui/MessagesList';
import WebSocketStatus from './ui/WebSocketStatus';
import { Message } from '../../types';
import useGlobalData from '../../hooks/useGlobalData';
import { X, ThumbsDown } from 'lucide-react';

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

const Messages: React.FC = () => {
  // Search state 
  const [searchMessageTicker, setSearchMessageTicker] = useState<string>('');
  // Selected message for analysis
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  // Flag to track if initial message has been set
  const [initialMessageSet, setInitialMessageSet] = useState<boolean>(false);
  // State to track if the device is mobile
  const [isMobile, setIsMobile] = useState(false);
  // State to track if analysis panel is visible on mobile
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  // State for feedback modal
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  
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

  // Use global data provider instead of local hook
  const {
    messages,
    messagesLoading,
    messagesRefreshing: refreshing,
    webSocketConnected,
    webSocketReconnecting,
    webSocketEnabled,
    refreshMessages,
    toggleWebSocket: toggleEnabled,
    updateMessagesSearchTicker: setMessagesSearchTicker,
    convertToEasternTime
  } = useGlobalData();

  // Set the initial message on first load when messages are available
  useEffect(() => {
    // Only run this effect if we haven't set the initial message yet
    // and if we have messages and they're not loading
    if (!initialMessageSet && messages.length > 0 && !messagesLoading) {
      // Find the most recent analysis message (without a link)
      const analysisMessages = messages.filter(msg => !msg.link);
      
      if (analysisMessages.length > 0) {
        // Sort by timestamp (newest first)
        const sortedAnalysisMessages = [...analysisMessages].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        // Set the most recent analysis message
        setSelectedMessage(sortedAnalysisMessages[0]);
      } else if (messages.length > 0) {
        // If no analysis messages, just use the most recent message
        const sortedMessages = [...messages].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setSelectedMessage(sortedMessages[0]);
      }
      
      // Mark that we've set the initial message
      setInitialMessageSet(true);
    }
  }, [messages, messagesLoading, initialMessageSet]);

  // Handlers for search
  const handleMessageSearchChange = (value: string) => {
    setSearchMessageTicker(value);
    setMessagesSearchTicker(value);
  };

  // Handler for message selection
  const handleMessageSelect = (message: Message) => {
    setSelectedMessage(message);
    // On mobile, show the analysis panel when a message is selected
    if (isMobile) {
      setShowAnalysisPanel(true);
    }
  };
  
  // Handler to close analysis panel on mobile
  const handleCloseAnalysisPanel = () => {
    setShowAnalysisPanel(false);
  };

  return (
    <div className="space-y-6">
      {/* Feedback Modal */}
      {feedbackModalOpen && selectedMessage && (
        <FeedbackModal 
          isOpen={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
          message={selectedMessage}
          convertToEasternTime={convertToEasternTime}
        />
      )}
      <div 
        className="flex h-[calc(100vh-120px)]"
        style={{
          flexDirection: isMobile ? 'column' : 'row'
        }}
      >
        {/* Messages panel */}
        <div 
          style={{
            width: isMobile ? '100%' : '65%',
            display: isMobile && showAnalysisPanel ? 'none' : 'flex',
            flexDirection: 'column',
            marginRight: isMobile ? 0 : '1rem',
            height: isMobile ? '100%' : undefined
          }}
        >
          <WebSocketStatus
            searchMessageTicker={searchMessageTicker}
            refreshing={refreshing}
            enabled={webSocketEnabled}
            connected={webSocketConnected}
            reconnecting={webSocketReconnecting}
            onSearchChange={handleMessageSearchChange}
            onRefresh={refreshMessages}
            onToggleWebSocket={toggleEnabled}
          />
          
          <MessagesList
            messages={messages}
            loading={messagesLoading}
            convertToEasternTime={convertToEasternTime}
            onSelectMessage={handleMessageSelect}
          />
        </div>
        
        {/* Analysis panel */}
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
      </div>
      
      {/* Disclaimer banner (bottom) */}
      <div className="bg-gray-50 text-gray-700 px-4 py-3 text-xs leading-tight rounded-md border border-gray-200 flex items-center justify-center mt-6">
        Disclaimer: This platform offers information and suggestions solely for educational purposes and should not be considered a replacement for professional financial advice. We cover stock investments without guaranteeing the completeness, accuracy, reliability, or suitability of the information, which may incorporate data from third-party sources. Investing in stocks and other financial instruments carries risks, such as potential loss of principal. Users should independently verify all information and consult qualified professionals tailored to their unique financial situations and investment goals. Our content and services are provided "as is," with no express or implied warranties. We are not responsible for any losses or damages resulting from the use of our services. This disclaimer may change; users are encouraged to review it periodically. Using our services indicates acceptance of these terms.
      </div>
    </div>
  );
};

export default Messages;