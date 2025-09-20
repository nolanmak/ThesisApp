import React from 'react';
import { ThumbsDown, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Message } from '../../../types';
import AnalysisPanelGrid from './AnalysisPanelGrid';

interface PanelHeaderProps {
  selectedMessage: Message | null;
  selectedTicker?: string | null;
  isMobile: boolean;
  showAnalysisPanel: boolean;
  convertToEasternTime: (utcTimestamp: string) => string;
  handleCloseAnalysisPanel: () => void;
  setFeedbackModalOpen: (open: boolean) => void;
  isCollapsed: boolean;
  onCollapseToggle: (collapsed: boolean) => void;
  messages?: Message[]; // Add messages prop for AnalysisPanelGrid
}

const PanelHeader: React.FC<PanelHeaderProps> = ({
  selectedMessage,
  selectedTicker,
  isMobile,
  showAnalysisPanel,
  convertToEasternTime,
  handleCloseAnalysisPanel,
  setFeedbackModalOpen,
  isCollapsed,
  onCollapseToggle,
  messages = []
}) => {
  const currentTicker = selectedTicker || selectedMessage?.ticker;

  const handleCollapseToggle = () => {
    onCollapseToggle(!isCollapsed);
  };

  if (!showAnalysisPanel) {
    return null;
  }

  return (
    <div
      className={`
        ${isMobile
          ? 'w-full' // Show on mobile too
          : 'w-[27.5%]'}
        flex flex-col transition-all duration-300
      `}
    >
      {selectedMessage || currentTicker ? (
        <div className="flex flex-col">
          {/* Header - Always visible with consistent size */}
          <div className={`
            bg-white dark:bg-neutral-800 px-6 py-4
            ${isCollapsed
              ? 'border-b border-neutral-200 dark:border-neutral-800'
              : 'rounded-t-md shadow border border-[#f1f1f1] dark:border-neutral-700 border-b-0'
            }
          `}>
            {/* Title row */}
            <div
              className="flex items-center justify-between"
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
                {(selectedMessage?.timestamp || selectedTicker) && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {selectedMessage?.timestamp
                      ? convertToEasternTime(selectedMessage.timestamp)
                      : new Date().toLocaleString('en-US', {
                          timeZone: 'America/New_York',
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true
                        }).replace(',', ' |')
                    }
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

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {/* Collapse/Expand button for desktop */}
                {!isMobile && (
                  <button
                    onClick={handleCollapseToggle}
                    className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center justify-center w-[30px] h-[30px] rounded-full bg-neutral-200 dark:bg-neutral-700 transition-all"
                    title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
                  >
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                )}

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
            </div>
          </div>

          {/* Collapsible content - AnalysisPanelGrid */}
          {!isCollapsed && (
            <div className="bg-white dark:bg-neutral-800 p-6 rounded-b-md shadow border border-[#f1f1f1] dark:border-neutral-700 border-t-0">
              <AnalysisPanelGrid
                selectedMessage={selectedMessage}
                isMobile={isMobile}
                showAnalysisPanel={showAnalysisPanel}
                messages={messages}
                selectedTicker={selectedTicker}
                isCollapsed={false} // Always false since we handle collapse at this level
              />
            </div>
          )}
        </div>
      ) : (
        <div className="h-auto flex items-center justify-center text-neutral-500 dark:text-neutral-400 py-4">
          <p>Select a message to view analysis</p>
        </div>
      )}
    </div>
  );
};

export default PanelHeader;