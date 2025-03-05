import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getMessages } from '../services/api';
import { Message } from '../types';
import { RefreshCw, ChevronDown, ChevronUp, Loader } from 'lucide-react';

// Function to convert UTC to Eastern Time (EST/EDT)
const convertToEasternTime = (utcTimestamp: string): string => {
  const date = new Date(utcTimestamp);
  
  // Format the date to Eastern Time
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// Function to create a preview of the message content
const createMessagePreview = (content: string, maxLength: number = 150): string => {
  if (!content) return '';
  
  // Remove any markdown symbols that might make the preview look odd
  const cleanContent = content.replace(/[#*_~`]/g, '');
  
  if (cleanContent.length <= maxLength) return cleanContent;
  
  // Find the last space before maxLength to avoid cutting words
  const lastSpaceIndex = cleanContent.substring(0, maxLength).lastIndexOf(' ');
  const cutoffIndex = lastSpaceIndex > 0 ? lastSpaceIndex : maxLength;
  
  return cleanContent.substring(0, cutoffIndex) + '...';
};

const Messages: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    fetchMessages();
    
    // Set up polling to check for new messages every 30 seconds
    const intervalId = setInterval(() => fetchMessages(true), 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  const fetchMessages = async (bypassCache: boolean = false) => {
    try {
      if (!messages.length) {
        // Only show full page loading on initial load
        setLoading(true);
      } else if (bypassCache) {
        // Show refreshing indicator for subsequent loads
        setRefreshing(true);
      }
      
      const fetchedMessages = await getMessages(bypassCache);
      setMessages(fetchedMessages);
      
      // Set all messages to be collapsed by default
      const expandedState: Record<string, boolean> = {};
      fetchedMessages.forEach(message => {
        // Preserve expanded state for existing messages
        if (messages.some(m => m.message_id === message.message_id)) {
          expandedState[message.message_id] = expandedMessages[message.message_id] || false;
        } else {
          expandedState[message.message_id] = false;
        }
      });
      setExpandedMessages(expandedState);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to fetch messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    fetchMessages(true); // Bypass cache to get fresh data
    toast.info('Feed refreshed');
  };
  
  const toggleExpand = (messageId: string) => {
    setExpandedMessages(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };
  
  const isExpanded = (messageId: string) => {
    return expandedMessages[messageId] || false;
  };
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-neutral-800">
          Feed
        </h1>
        <div className="flex items-center">
          {refreshing && (
            <div className="flex items-center mr-4 text-primary-600">
              <Loader size={16} className="animate-spin mr-2" />
              <span className="text-sm">Refreshing...</span>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center px-4 py-2 bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200 transition-colors duration-150 ease-in-out shadow-sm ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="bg-white p-6 rounded-md shadow-md border border-neutral-100 text-center">
          <p className="text-neutral-500">Loading messages...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-white p-6 rounded-md shadow-md border border-neutral-100 text-center">
          <p className="text-neutral-500">No messages found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((message) => (
            <div 
              key={message.message_id}
              className="bg-white p-6 rounded-md shadow-md border border-neutral-100"
            >
              <div 
                className="flex justify-between items-start cursor-pointer"
                onClick={() => toggleExpand(message.message_id)}
              >
                <h3 className="text-lg font-medium text-neutral-800">
                  {message.ticker} Earnings Report
                </h3>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center bg-primary-50 px-3 py-1 rounded-md text-sm">
                    <span className="font-medium text-primary-700">{message.ticker}</span>
                    <span className="mx-1 text-neutral-400">|</span>
                    <span className="text-neutral-600">Q{message.quarter} {message.year}</span>
                  </div>
                  <button
                    className="p-1 text-neutral-500 hover:text-primary-600 transition-colors"
                    title={isExpanded(message.message_id) ? "Collapse" : "Expand"}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the parent onClick
                      toggleExpand(message.message_id);
                    }}
                  >
                    {isExpanded(message.message_id) ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center text-sm text-neutral-500 mt-3 mb-3">
                <span>{convertToEasternTime(message.timestamp)}</span>
              </div>
              
              {!isExpanded(message.message_id) && (
                <div className="text-neutral-600 whitespace-pre-wrap mt-2 text-sm">
                  {createMessagePreview(message.discord_message)}
                </div>
              )}
              
              {isExpanded(message.message_id) && (
                <div className="text-neutral-700 whitespace-pre-wrap markdown-content mt-2">
                  {message.discord_message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;
