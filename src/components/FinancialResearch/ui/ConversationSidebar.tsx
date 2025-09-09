import React, { useState } from 'react';
import { Search, Plus, MessageSquare, Clock } from 'lucide-react';

interface Conversation {
  logId: string;
  title: string;
  timestamp: string;
  prompt: string;
  response: string;
  query_type: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
  isLoading: boolean;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  isLoading
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Generate conversation title from prompt (first 50 chars)
  const generateTitle = (prompt: string) => {
    return prompt.length > 50 ? `${prompt.substring(0, 50)}...` : prompt;
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv =>
    conv.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.response.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format timestamp for display - convert UTC to local time
  const formatTimestamp = (timestamp: string) => {
    // Ensure UTC timestamp is properly parsed
    const utcDate = new Date(timestamp.endsWith('Z') ? timestamp : timestamp + 'Z');
    const now = new Date();
    const diffInMs = now.getTime() - utcDate.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return utcDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 168) { // 7 days
      return utcDate.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return utcDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span className="font-medium">New chat</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-lg text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-neutral-500">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-neutral-500">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.logId}
                onClick={() => onSelectConversation(conversation.logId)}
                className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                  currentConversationId === conversation.logId
                    ? 'bg-neutral-100 dark:bg-neutral-800 border-l-4 border-blue-500'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare size={16} className="text-neutral-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">
                      {generateTitle(conversation.prompt)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={12} className="text-neutral-400" />
                      <span className="text-xs text-neutral-500">
                        {formatTimestamp(conversation.timestamp)}
                      </span>
                    </div>
                    {conversation.query_type && (
                      <div className="mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          conversation.query_type === 'simple_current' 
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : conversation.query_type === 'complex_research'
                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}>
                          {conversation.query_type.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;