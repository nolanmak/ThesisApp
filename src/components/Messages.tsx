import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getMessages, markMessageAsRead, deleteMessage } from '../services/api';
import { Message } from '../types';
import { RefreshCw, Mail, MailOpen, Trash2, Tag } from 'lucide-react';

const Messages: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchMessages();
    
    // Set up polling to check for new messages every 30 seconds
    const intervalId = setInterval(fetchMessages, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const fetchedMessages = await getMessages();
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };
  
  const handleMarkAsRead = async (messageId: string) => {
    try {
      await markMessageAsRead(messageId);
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId ? { ...msg, is_read: true } : msg
        )
      );
      toast.success('Message marked as read');
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      toast.error('Failed to update message');
    }
  };
  
  const handleDelete = async (messageId: string) => {
    try {
      const success = await deleteMessage(messageId);
      if (success) {
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg.id !== messageId)
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
    fetchMessages();
    toast.info('Feed refreshed');
  };
  
  // Count unread messages
  const unreadCount = messages.filter(msg => !msg.is_read).length;
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-neutral-800">
          Feed
          {unreadCount > 0 && (
            <span className="ml-3 px-2 py-1 text-sm bg-primary-600 text-white rounded-full">
              {unreadCount} new
            </span>
          )}
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
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`bg-white p-6 rounded-md shadow-md border ${
                message.is_read ? 'border-neutral-100' : 'border-primary-300 border-l-4'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  {message.is_read ? (
                    <MailOpen size={18} className="text-neutral-400 mr-2" />
                  ) : (
                    <Mail size={18} className="text-primary-500 mr-2" />
                  )}
                  <h3 className="text-lg font-medium text-neutral-800">
                    {message.subject}
                  </h3>
                </div>
                <div className="flex space-x-2">
                  {!message.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(message.id)}
                      className="p-1 text-neutral-500 hover:text-primary-600 transition-colors"
                      title="Mark as read"
                    >
                      <MailOpen size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(message.id)}
                    className="p-1 text-neutral-500 hover:text-error-500 transition-colors"
                    title="Delete message"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex items-center text-sm text-neutral-500 mb-3">
                <span className="mr-3">{new Date(message.timestamp).toLocaleString()}</span>
                <div className="flex items-center bg-neutral-100 px-2 py-1 rounded-md">
                  <Tag size={14} className="mr-1 text-neutral-400" />
                  <span>{message.source}</span>
                </div>
              </div>
              <div className="text-neutral-700 whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;
