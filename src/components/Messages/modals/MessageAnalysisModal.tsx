import React from 'react';
import { X } from 'lucide-react';
import { Message } from '../../../types';

interface MessageAnalysisModalProps {
  show: boolean;
  onClose: () => void;
  message: Message | null;
  convertToEasternTime: (utcTimestamp: string) => string;
}

const MessageAnalysisModal: React.FC<MessageAnalysisModalProps> = ({
  show,
  onClose,
  message,
  convertToEasternTime
}) => {
  if (!show || !message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-neutral-200 bg-white z-10">
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-primary-50 px-3 py-1 rounded-md">
              <span className="font-medium text-primary-700">{message.ticker}</span>
              <span className="mx-1 text-neutral-400">|</span>
              <span className="text-neutral-600">Q{message.quarter}</span>
            </div>
            <span className="text-sm text-neutral-500">
              {convertToEasternTime(message.timestamp)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-neutral-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="prose max-w-none">
            <div className="text-neutral-800 whitespace-pre-wrap markdown-content">
              {message.discord_message}
            </div>
            
            {message.link && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <a 
                  href={message.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100 transition-colors"
                >
                  <span>View {message.ticker} Report</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageAnalysisModal;
