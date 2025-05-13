import React, { useState } from 'react';
import { Message } from '../../../types';
import { X } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message;
  convertToEasternTime: (utcTimestamp: string) => string;
}

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
    
    const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL;
    
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

export default FeedbackModal;
