import React from 'react';
import { Message } from '../../../types';
import { ThumbsDown, X } from 'lucide-react';
import { ParseMessagePayload } from '../utils/messageUtils';

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
  const parsedMessage = selectedMessage ? ParseMessagePayload(selectedMessage) : null;

  return (
    <div 
    className={`
      ${isMobile
        ? showAnalysisPanel
          ? 'flex w-full h-full absolute inset-0 z-10'
          : 'hidden'
        : 'flex w-[35%] relative'}
      flex-col bg-white p-6 rounded-md shadow border border-[#f1f1f1]
    `}
    >
      {selectedMessage ? (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div 
            className="flex items-center justify-between pb-4 border-b border-neutral-200 mb-4"
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
                <div className="flex items-center">
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
              <div
                className="text-neutral-800 whitespace-pre-wrap markdown-content break-words overflow-wrap-anywhere"
                style={{
                  fontSize: isMobile ? '0.875rem' : '0.75rem',
                  lineHeight: isMobile ? '1.5' : undefined,
                }}
              >
                {selectedMessage.source === 'transcript_analysis' ? (
                  // Display full transcript analysis content
                  <div className="space-y-3">
                    <div className="text-purple-700 font-semibold mb-3">📊 Earnings Call Transcript Analysis</div>
                    <div 
                      className="text-neutral-700 leading-relaxed"
                      style={{
                        fontSize: isMobile ? '0.9rem' : '0.8rem',
                        lineHeight: '1.6'
                      }}
                    >
                      {selectedMessage.discord_message}
                    </div>
                    
                    {/* Display structured transcript data if available */}
                    {selectedMessage.transcript_data && (
                      <div className="mt-6 pt-4 border-t border-neutral-200">
                        <div className="text-purple-700 font-semibold mb-3">📋 Detailed Analysis Data</div>
                        <pre 
                          className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded border overflow-x-auto"
                          style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}
                        >
                          {JSON.stringify(JSON.parse(selectedMessage.transcript_data), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : parsedMessage && Object.keys(parsedMessage).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(parsedMessage).map(([section, items]) => (
                      <div key={section}>
                        <div className="text-primary-700 font-semibold mb-2">{section}</div>
                        { ['Additional Metrics', 'Company Highlights'].includes(section) ? (
                          <ul className="space-y-1 list-disc pl-5">
                            {items.map((item, idx) => (
                              <li key={idx} className="text-neutral-600">
                                {typeof item === 'string' ? item : item.text || item.label}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="space-y-1">
                          {items.map((item, idx: number) => (
                            <div key={idx} className="flex flex-wrap gap-2 items-center">
                              <span className="text-neutral-600">
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
                  <div className="text-neutral-500 text-center p-4">
                    No structured metrics available
                  </div>
                )}
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



export default AnalysisPanel;
