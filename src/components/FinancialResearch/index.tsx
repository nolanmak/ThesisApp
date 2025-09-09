import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ui/ChatMessage';
import ChatInput from './ui/ChatInput';
import { TrendingUp, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  error?: boolean;
  metadata?: {
    query_type?: string;
    sources_count?: number;
    context_used?: boolean;
  };
}

interface APIResponse {
  response: string;
  query_type: string;
  logId: string;
  sources_count: number;
  context_used: boolean;
}

const FinancialResearch: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Research API endpoints from environment variables
  const API_BASE = import.meta.env.VITE_RESEARCH_API_BASE_URL;
  const API_KEY = import.meta.env.VITE_USER_PROFILE_API_KEY;
  const API_ENDPOINTS = {
    research: `${API_BASE}/research`,
    history: `${API_BASE}/research/reports`
  };

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history on component mount
  const loadHistory = async () => {
    if (!user?.email) return;

    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.history}?user=${encodeURIComponent(user.email)}&limit=30`, {
        headers: {
          'X-API-Key': API_KEY,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load history: ${response.status}`);
      }

      const historyData = await response.json();
      console.log('Loaded history:', historyData);

      // Convert history to messages format
      if (historyData && Array.isArray(historyData)) {
        const historyMessages: Message[] = [];
        
        historyData.forEach((conversation: any) => {
          // Add user message
          if (conversation.user_prompt) {
            historyMessages.push({
              id: `history-user-${conversation.timestamp || Date.now()}`,
              content: conversation.user_prompt,
              timestamp: conversation.timestamp ? new Date(conversation.timestamp) : new Date(),
              isUser: true
            });
          }

          // Add AI response
          if (conversation.ai_response || conversation.response) {
            historyMessages.push({
              id: `history-ai-${conversation.timestamp || Date.now()}`,
              content: conversation.ai_response || conversation.response,
              timestamp: conversation.timestamp ? new Date(conversation.timestamp) : new Date(),
              isUser: false,
              metadata: {
                query_type: conversation.query_type,
                sources_count: conversation.sources_count,
                context_used: conversation.context_used
              }
            });
          }

          // Set the most recent logId for conversation continuity
          if (conversation.logId || conversation.log_id) {
            setCurrentLogId(conversation.logId || conversation.log_id);
          }
        });

        // Sort by timestamp (oldest first for proper conversation flow)
        historyMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        if (historyMessages.length > 0) {
          setMessages(historyMessages);
        } else {
          // Show welcome message if no history
          showWelcomeMessage();
        }
      } else {
        // Show welcome message if no history data
        showWelcomeMessage();
      }

    } catch (error) {
      console.error('Error loading conversation history:', error);
      // Show welcome message on error
      showWelcomeMessage();
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const showWelcomeMessage = () => {
    // For the Gemini-style interface, we don't need a welcome message in the chat
    // The welcome message is shown in the empty state UI instead
    setMessages([]);
  };

  const clearConversation = () => {
    setCurrentLogId(null);
    showWelcomeMessage();
  };

  // Load history on component mount
  useEffect(() => {
    if (user?.email) {
      loadHistory();
    }
  }, [user?.email]);

  const handleSendMessage = async (content: string) => {
    if (!user?.email) {
      console.error('User email not available');
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content,
      timestamp: new Date(),
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Prepare API request
      const requestBody = {
        user: user.email,
        prompt: content,
        ...(currentLogId && { logId: currentLogId }) // Include logId for follow-up requests
      };

      console.log('Sending API request:', requestBody);

      const response = await fetch(API_ENDPOINTS.research, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: APIResponse = await response.json();
      
      console.log('API response:', data);

      // Update logId for future requests in this conversation
      if (data.logId) {
        setCurrentLogId(data.logId);
      }

      // Add AI response message with metadata
      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        content: data.response,
        timestamp: new Date(),
        isUser: false,
        metadata: {
          query_type: data.query_type,
          sources_count: data.sources_count,
          context_used: data.context_used
        }
      };

      setMessages(prev => [...prev, aiResponse]);

    } catch (error) {
      console.error('Error calling research API:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: `I apologize, but I'm having trouble processing your request right now. This could be due to:\n\n• API endpoint not configured\n• Network connectivity issues\n• Server temporarily unavailable\n\nPlease try again in a few moments. If the problem persists, contact support.`,
        timestamp: new Date(),
        isUser: false,
        error: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900">
      {/* Simplified Header - mobile optimized */}
      <div className="flex-shrink-0 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-medium text-neutral-900 dark:text-neutral-100">
              Financial Research
            </h1>
          </div>
          
          {/* Clear conversation button - mobile optimized */}
          {!isLoadingHistory && messages.length > 1 && (
            <button
              onClick={clearConversation}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
              title="Start new conversation"
            >
              <RefreshCw size={14} className="sm:w-4 sm:h-4" />
              {!isMobile && <span className="text-xs sm:text-sm">New chat</span>}
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoadingHistory ? (
          /* Loading history state */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full mx-auto mb-4">
                <TrendingUp className="text-blue-500 animate-pulse" size={32} />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Loading your research history...
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                Retrieving your previous conversations and analysis
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          /* Gemini-style welcome state - mobile optimized */
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-16 sm:pb-32">
            <div className="text-center max-w-2xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-neutral-900 dark:text-neutral-100 mb-6 sm:mb-8 leading-tight">
                Hello, {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'}
              </h2>
              <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 mb-8 sm:mb-12">
                How can I help you with financial research today?
              </p>
            </div>
          </div>
        ) : (
          /* Messages - mobile optimized */
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-8">
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              
              {/* Loading indicator - mobile optimized */}
              {isLoading && (
                <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                    <TrendingUp size={16} className="text-neutral-600 dark:text-neutral-300" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl rounded-tl-sm px-3 sm:px-4 py-3 shadow-sm border border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                        <span className="text-sm">Analyzing your request...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input Area - mobile optimized */}
        <div className="flex-shrink-0 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="max-w-4xl mx-auto">
            {/* Suggestion buttons for empty state - mobile optimized */}
            {messages.length === 0 && !isLoadingHistory && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-6 max-w-lg sm:max-w-2xl mx-auto">
                <button
                  onClick={() => handleSendMessage("What are the key financial metrics I should analyze for tech stocks?")}
                  className="px-4 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full text-sm transition-colors text-center"
                >
                  Analyze tech stocks
                </button>
                <button
                  onClick={() => handleSendMessage("What's the current market outlook for renewable energy investments?")}
                  className="px-4 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full text-sm transition-colors text-center"
                >
                  Renewable energy outlook
                </button>
                <button
                  onClick={() => handleSendMessage("Explain the impact of Federal Reserve rate changes on the stock market")}
                  className="px-4 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full text-sm transition-colors text-center"
                >
                  Fed rate impact
                </button>
                <button
                  onClick={() => handleSendMessage("What are the best value investing strategies for beginners?")}
                  className="px-4 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full text-sm transition-colors text-center"
                >
                  Value investing strategies
                </button>
              </div>
            )}
            
            <ChatInput 
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              placeholder="Ask about financial markets, company analysis, or investment insights..."
            />
          </div>
        </div>
      </div>

      {/* Simplified Disclaimer */}
      <div className="flex-shrink-0 px-6 pb-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
            This AI provides information for educational purposes only. Not financial advice. Consult professionals for investment decisions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinancialResearch;