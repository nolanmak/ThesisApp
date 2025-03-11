# WebSocket Implementation

This document describes the WebSocket implementation for real-time updates in the Earnings Manager application.

## Overview

The WebSocket implementation enables real-time updates for the Messages component, allowing the frontend to receive instant notifications when new messages are added to the database or existing messages are updated.

## Components

### 1. WebSocket Service (`/src/services/websocket.ts`)

A singleton service that manages the WebSocket connection, handles reconnection logic, and provides methods for subscribing to WebSocket events.

Key features:
- Connection management (connect, disconnect)
- Automatic reconnection with exponential backoff
- Event subscription system for messages and connection status
- Message parsing for different API Gateway WebSocket message formats
- Ability to send messages to the AWS API Gateway WebSocket service
- Enable/disable functionality
- Ping/pong mechanism to detect stale connections

### 2. WebSocket Hook (`/src/hooks/useWebSocket.ts`)

A custom React hook that provides a simple interface for using the WebSocket service in React components.

Key features:
- Automatic connection management
- Connection status tracking (connected, reconnecting)
- Callback-based event handling
- Clean disconnection on component unmount
- Enable/disable functionality

### 3. Integration with Messages Component (`/src/components/Messages.tsx`)

The Messages component uses the WebSocket hook to receive real-time updates and display them to the user.

Key features:
- Visual indicator for WebSocket connection status
- Real-time updates of messages without page refresh
- Notifications for new messages
- Graceful handling of connection loss and reconnection
- Toggle for enabling/disabling WebSocket functionality

### 4. WebSocket Test Component (`/src/components/WebSocketTest.tsx`)

A test component for verifying WebSocket functionality.

Key features:
- Manual connection controls
- Message display
- Connection status display
- Test message sending

## WebSocket URL

The WebSocket endpoint is:
```
wss://lzbnogaowc.execute-api.us-east-1.amazonaws.com/prod
```

## Message Format

The WebSocket service is designed to handle multiple message formats from the API Gateway:

1. `{ message: Message }` - Message is in the `message` property
2. `{ body: string }` - Message is in the `body` property as a JSON string
3. `Message` - The message itself is the data

## Usage

To use the WebSocket functionality in a component:

```tsx
import useWebSocket from '../hooks/useWebSocket';
import { Message } from '../types';

const MyComponent = () => {
  // Handle new messages
  const handleMessage = (message: Message) => {
    console.log('New message received:', message);
    // Update state or UI
  };
  
  // Use the WebSocket hook
  const { 
    connected, 
    reconnecting, 
    enabled,
    connect,
    disconnect,
    enable,
    disable 
  } = useWebSocket({
    onMessage: handleMessage,
    onConnectionChange: (isConnected) => {
      console.log('Connection status changed:', isConnected);
    },
    persistConnection: true // Keep connection alive when component unmounts
  });
  
  return (
    <div>
      <p>WebSocket status: {connected ? 'Connected' : reconnecting ? 'Reconnecting' : 'Disconnected'}</p>
      <button onClick={enabled ? disable : enable}>
        {enabled ? 'Disable' : 'Enable'} WebSocket
      </button>
      {/* Rest of your component */}
    </div>
  );
};
```

### Hook Options

The `useWebSocket` hook accepts the following options:

- `autoConnect` (default: `true`): Automatically connect to the WebSocket when the component mounts
- `onMessage`: Callback function to handle incoming messages
- `onConnectionChange`: Callback function to handle connection status changes
- `persistConnection` (default: `false`): Keep the WebSocket connection alive when the component unmounts

### Connection Lifecycle Management

The WebSocket implementation includes smart connection lifecycle management to prevent rapid reconnection attempts:

1. **Connection Sharing**: Multiple components can share a single WebSocket connection
2. **Delayed Disconnection**: When a component unmounts, the connection is not immediately closed
3. **Connection Persistence**: The `persistConnection` option allows components to keep the connection alive even after unmounting
4. **User Tracking**: The system tracks how many components are using the WebSocket to avoid premature disconnection

## Reconnection Logic

The WebSocket service implements an exponential backoff strategy for reconnection:

1. Initial reconnection delay: 2 seconds
2. Each subsequent attempt increases the delay by a factor of 1.5
3. Maximum delay: 30 seconds
4. Maximum reconnection attempts: 5

After the maximum number of reconnection attempts, WebSocket functionality is automatically disabled and the user is prompted to either manually re-enable it or refresh the page.

## Ping/Pong Mechanism

To detect stale connections and ensure the WebSocket stays alive, the service implements a ping/pong mechanism:

1. After establishing a connection, the service starts sending ping messages every 30 seconds
2. If no pong response is received within 10 seconds, the connection is considered stale
3. If no pong is received for twice the ping interval (60 seconds), the connection is closed and reconnection is attempted

## Troubleshooting

If you experience issues with the WebSocket connection:

1. Check the browser console for error messages
2. Try disabling and re-enabling the WebSocket functionality using the toggle in the UI
3. Refresh the page to reset the WebSocket connection
4. Ensure the AWS API Gateway WebSocket service is accessible
5. Check for network issues or firewalls that might be blocking WebSocket connections
