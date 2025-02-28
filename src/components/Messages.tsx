import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getMessages, deleteMessage } from '../services/api';
import { Message } from '../types';
import { RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const Messages: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
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
      setLoading(true);
      const fetchedMessages = await getMessages(bypassCache);
      setMessages(fetchedMessages);
      
      // Set all messages to be expanded by default
      const expandedState: Record<string, boolean> = {};
      fetchedMessages.forEach(message => {
        expandedState[message.message_id] = true;
      });
      setExpandedMessages(expandedState);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (messageId: string) => {
    try {
      const success = await deleteMessage(messageId);
      if (success) {
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg.message_id !== messageId)
        );
        toast.success('Message deleted');
      } else {
        throw new Error('Failed to delete message');
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
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
        <button
          onClick={handleRefresh}
          className="flex items-center px-4 py-2 bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200 transition-colors duration-150 ease-in-out shadow-sm"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </button>
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
              
              {isExpanded(message.message_id) && (
                <>
                  <div className="flex items-center text-sm text-neutral-500 mt-3 mb-3">
                    <span>{new Date(message.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-neutral-700 whitespace-pre-wrap markdown-content">
                    {message.discord_message}
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the parent onClick
                        handleDelete(message.message_id);
                      }}
                      className="flex items-center px-3 py-2 bg-error-50 text-error-600 rounded-md hover:bg-error-100 transition-colors"
                      title="Delete message"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete this message
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;
