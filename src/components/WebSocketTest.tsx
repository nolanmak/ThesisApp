import React, { useState, useCallback } from 'react';
import { Message } from '../types';
import useWebSocket from '../hooks/useWebSocket';

const WebSocketTest: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  // Handle new messages
  const handleMessage = useCallback((message: Message) => {
    console.log('WebSocket message received:', message);
    setMessages((prev) => {
      // Check if message already exists to prevent duplicates
      if (prev.some(m => m.message_id === message.message_id)) {
        return prev;
      }
      return [message, ...prev];
    });
  }, []);

  // Use the WebSocket hook
  const { 
    connected, 
    reconnecting,
    enabled,
    connect, 
    disconnect, 
    sendMessage,
    enable,
    disable
  } = useWebSocket({
    onMessage: handleMessage,
    autoConnect: false, // Don't auto-connect in the test component
    persistConnection: false // Don't persist connection in test component
  });

  // Handle manual connection
  const handleConnect = () => {
    connect();
  };

  // Handle manual disconnection
  const handleDisconnect = () => {
    disconnect();
  };

  // Send a ping message
  const handleSendPing = () => {
    sendMessage({ action: 'ping', timestamp: new Date().toISOString() });
  };

  return (
    <div className="p-4 border rounded-md">
      <h2 className="text-xl font-bold mb-4">WebSocket Test</h2>
      
      <div className="mb-4">
        <p className="mb-2">
          Status: {connected ? (
            <span className="text-green-600 font-medium">Connected</span>
          ) : reconnecting ? (
            <span className="text-amber-500 font-medium">Reconnecting...</span>
          ) : (
            <span className="text-red-600 font-medium">Disconnected</span>
          )}
        </p>
        
        <div className="flex space-x-2">
          <button 
            onClick={handleConnect}
            disabled={connected}
            className={`px-3 py-1 bg-green-600 text-white rounded ${connected ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
          >
            Connect
          </button>
          <button 
            onClick={handleDisconnect}
            disabled={!connected}
            className={`px-3 py-1 bg-red-600 text-white rounded ${!connected ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
          >
            Disconnect
          </button>
          <button 
            onClick={handleSendPing}
            disabled={!connected}
            className={`px-3 py-1 bg-blue-600 text-white rounded ${!connected ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
          >
            Send Ping
          </button>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Received Messages:</h3>
        {messages.length === 0 ? (
          <p className="text-neutral-500">No messages received yet</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((msg, index) => (
              <li key={index} className="p-3 bg-neutral-50 rounded border">
                <p><strong>Ticker:</strong> {msg.ticker}</p>
                <p><strong>Quarter:</strong> Q{msg.quarter} {msg.year}</p>
                <p><strong>Time:</strong> {new Date(msg.timestamp).toLocaleString()}</p>
                <p className="mt-2 text-sm">{msg.discord_message.substring(0, 100)}...</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default WebSocketTest;
