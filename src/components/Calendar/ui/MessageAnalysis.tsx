import React, { useState } from 'react';
import { Message } from '../../../types';
import { Info } from 'lucide-react';

interface MessageAnalysisProps {
  ticker: string;
  date: string;
  messages: Message[];
  isMobile?: boolean;
}

interface AnalysisResult {
  totalMessages: number;
  linkMessages: {
    total: number;
    irSite: number;
    wireSite: number;
    wireBreakdown: {
      businesswire: number;
      globenewswire: number;
      prnewswire: number;
      accesswire: number;
      other: number;
    };
  };
  analysisMessages: {
    total: number;
    messages: Message[];
    hasDifferences: boolean;
    differences?: string[];
  };
}

const compareAnalysisMessages = (messages: Message[]): { hasDifferences: boolean; differences: string[] } => {
  if (messages.length <= 1) {
    return { hasDifferences: false, differences: [] };
  }

  const differences: string[] = [];
  const firstMessage = messages[0];
  
  for (let i = 1; i < messages.length; i++) {
    const currentMessage = messages[i];
    
    // Compare message content length
    const firstLength = firstMessage.discord_message?.length || 0;
    const currentLength = currentMessage.discord_message?.length || 0;
    const lengthDiff = Math.abs(firstLength - currentLength);
    
    if (lengthDiff > 50) { // Significant difference in content length
      differences.push(`Message ${i + 1} has ${lengthDiff > 0 ? 'significantly more' : 'significantly less'} content`);
    }
    
    // Compare timestamps (if more than 5 minutes apart, they might be different versions)
    const firstTime = new Date(firstMessage.timestamp).getTime();
    const currentTime = new Date(currentMessage.timestamp).getTime();
    const timeDiff = Math.abs(firstTime - currentTime);
    
    if (timeDiff > 5 * 60 * 1000) { // More than 5 minutes apart
      differences.push(`Message ${i + 1} published ${Math.round(timeDiff / (60 * 1000))} minutes apart`);
    }
    
    // Compare source if available
    if (firstMessage.source !== currentMessage.source) {
      differences.push(`Different sources: "${firstMessage.source || 'unknown'}" vs "${currentMessage.source || 'unknown'}"`);
    }
    
    // Simple content comparison (check for key differences)
    if (firstMessage.discord_message && currentMessage.discord_message) {
      const firstWords = firstMessage.discord_message.toLowerCase().split(/\s+/);
      const currentWords = currentMessage.discord_message.toLowerCase().split(/\s+/);
      
      // Check for significantly different word counts
      if (Math.abs(firstWords.length - currentWords.length) > 10) {
        differences.push(`Message ${i + 1} has ${Math.abs(firstWords.length - currentWords.length)} more/fewer words`);
      }
    }
  }
  
  return {
    hasDifferences: differences.length > 0,
    differences
  };
};

const analyzeMessages = (messages: Message[], ticker: string, date: string): AnalysisResult => {
  // Filter messages for the specific ticker and date
  const relevantMessages = messages.filter(msg => {
    try {
      const msgTimestamp = new Date(msg.timestamp);
      // Check if the date is valid
      if (isNaN(msgTimestamp.getTime())) {
        console.warn('Invalid timestamp in message:', msg.timestamp, msg);
        return false;
      }
      const msgDate = msgTimestamp.toISOString().split('T')[0];
      return msg.ticker.toLowerCase() === ticker.toLowerCase() && msgDate === date;
    } catch (error) {
      console.warn('Error parsing timestamp:', msg.timestamp, error);
      return false;
    }
  });

  const linkMessages = relevantMessages.filter(msg => msg.link);
  const analysisMessages = relevantMessages.filter(msg => !msg.link);

  // Categorize link messages by source
  let irSite = 0;
  let wireSite = 0;
  const wireBreakdown = {
    businesswire: 0,
    globenewswire: 0,
    prnewswire: 0,
    accesswire: 0,
    other: 0
  };

  linkMessages.forEach(msg => {
    const link = msg.link?.toLowerCase() || '';
    const source = msg.source?.toLowerCase() || '';
    
    if (link.includes('businesswire') || source.includes('businesswire')) {
      wireSite++;
      wireBreakdown.businesswire++;
    } else if (link.includes('globenewswire') || source.includes('globenewswire')) {
      wireSite++;
      wireBreakdown.globenewswire++;
    } else if (link.includes('prnewswire') || source.includes('prnewswire')) {
      wireSite++;
      wireBreakdown.prnewswire++;
    } else if (link.includes('accesswire') || source.includes('accesswire')) {
      wireSite++;
      wireBreakdown.accesswire++;
    } else if (link.includes('wire') || source.includes('wire')) {
      wireSite++;
      wireBreakdown.other++;
    } else {
      irSite++;
    }
  });

  // Check for differences in analysis messages
  const comparisonResult = compareAnalysisMessages(analysisMessages);

  return {
    totalMessages: relevantMessages.length,
    linkMessages: {
      total: linkMessages.length,
      irSite,
      wireSite,
      wireBreakdown
    },
    analysisMessages: {
      total: analysisMessages.length,
      messages: analysisMessages,
      hasDifferences: comparisonResult.hasDifferences,
      differences: comparisonResult.differences
    }
  };
};

const MessageAnalysis: React.FC<MessageAnalysisProps> = ({
  ticker,
  date,
  messages,
  isMobile = false
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  try {
    // Ensure messages is an array and has valid data
    if (!Array.isArray(messages)) {
      console.warn('Messages is not an array:', messages);
      return (
        <div className="flex flex-col items-center justify-center h-full text-neutral-400">
          <p style={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
            Loading messages...
          </p>
        </div>
      );
    }

    const analysis = analyzeMessages(messages, ticker, date);

  if (analysis.totalMessages === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-400">
        <p style={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
          No messages found
        </p>
        <p style={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
          for {date}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      {/* Link Messages Section */}
      {analysis.linkMessages.total > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2">
          <div className="font-semibold text-blue-800 mb-1">
            Link Messages ({analysis.linkMessages.total})
          </div>
          
          {analysis.linkMessages.irSite > 0 && (
            <div className="text-blue-700">
              IR Site: {analysis.linkMessages.irSite}
            </div>
          )}
          
          {analysis.linkMessages.wireSite > 0 && (
            <div className="text-blue-700">
              Wire Services: {analysis.linkMessages.wireSite}
              {analysis.linkMessages.wireBreakdown.businesswire > 0 && (
                <div className="ml-2 text-blue-600">
                  • Business Wire: {analysis.linkMessages.wireBreakdown.businesswire}
                </div>
              )}
              {analysis.linkMessages.wireBreakdown.globenewswire > 0 && (
                <div className="ml-2 text-blue-600">
                  • GlobeNewswire: {analysis.linkMessages.wireBreakdown.globenewswire}
                </div>
              )}
              {analysis.linkMessages.wireBreakdown.prnewswire > 0 && (
                <div className="ml-2 text-blue-600">
                  • PR Newswire: {analysis.linkMessages.wireBreakdown.prnewswire}
                </div>
              )}
              {analysis.linkMessages.wireBreakdown.accesswire > 0 && (
                <div className="ml-2 text-blue-600">
                  • AccessWire: {analysis.linkMessages.wireBreakdown.accesswire}
                </div>
              )}
              {analysis.linkMessages.wireBreakdown.other > 0 && (
                <div className="ml-2 text-blue-600">
                  • Other Wire: {analysis.linkMessages.wireBreakdown.other}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Analysis Messages Section */}
      {analysis.analysisMessages.total > 0 && (
        <div className="bg-green-50 border border-green-200 rounded p-2 relative">
          <div className="font-semibold text-green-800 mb-1 flex items-center justify-between">
            <span>Analysis Messages ({analysis.analysisMessages.total})</span>
            {analysis.analysisMessages.hasDifferences && analysis.analysisMessages.differences && (
              <div className="relative">
                <button
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="text-orange-600 hover:text-orange-800"
                >
                  <Info size={14} />
                </button>
                {showTooltip && (
                  <div className="absolute right-0 top-6 z-10 w-64 bg-white border border-gray-300 rounded shadow-lg p-3 text-xs">
                    <div className="font-semibold text-gray-800 mb-2">Analysis Differences:</div>
                    <ul className="text-gray-700 space-y-1">
                      {analysis.analysisMessages.differences.map((diff, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-orange-500 mr-1">•</span>
                          <span>{diff}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {analysis.analysisMessages.hasDifferences && analysis.analysisMessages.total > 1 && (
            <div className="text-orange-700 flex items-center">
              <span className="mr-1">⚠️</span>
              <span>Multiple analyses with differences detected</span>
            </div>
          )}
          
          {!analysis.analysisMessages.hasDifferences && analysis.analysisMessages.total > 1 && (
            <div className="text-green-700">
              ✓ Multiple consistent analyses
            </div>
          )}
          
          {analysis.analysisMessages.total === 1 && (
            <div className="text-green-700">
              ✓ Single analysis available
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="text-neutral-600 text-center pt-1 border-t border-neutral-200">
        Total: {analysis.totalMessages} message{analysis.totalMessages !== 1 ? 's' : ''}
      </div>
    </div>
  );
  } catch (error) {
    console.error('Error in MessageAnalysis component:', error);
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400">
        <p style={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
          Error loading analysis
        </p>
      </div>
    );
  }
};

export default MessageAnalysis;