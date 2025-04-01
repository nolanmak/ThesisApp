import React from 'react';
import { Search, Wifi, WifiOff, Loader, RefreshCw } from 'lucide-react';


interface WebSocketStatusProps {
  searchMessageTicker: string;
  refreshing: boolean;
  enabled: boolean;
  connected: boolean;
  reconnecting: boolean;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onToggleWebSocket: () => void;
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = ({
  searchMessageTicker,
  refreshing,
  enabled,
  connected,
  reconnecting,
  onSearchChange,
  onRefresh,
  onToggleWebSocket
}) => {
  return (
    <div className="mb-3 flex items-center">
      {/* Message search box */}
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          <Search size={14} className="text-neutral-400" />
        </div>
        <input
          type="text"
          placeholder="Search messages"
          value={searchMessageTicker}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 pr-16 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-xs h-8"
        />
        <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-1">
          {refreshing && (
            <div className="flex items-center text-primary-600">
              <Loader size={14} className="animate-spin" />
            </div>
          )}
          
          {/* Live button */}
          <button
            onClick={onToggleWebSocket}
            className={`flex items-center justify-center rounded-full w-6 h-6 transition-colors duration-150 ease-in-out ${
              enabled 
                ? connected 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : reconnecting 
                    ? 'bg-amber-500 text-white hover:bg-amber-600' 
                    : 'bg-neutral-300 text-white hover:bg-neutral-400'
                : 'bg-neutral-200 text-neutral-500 hover:bg-neutral-300'
            }`}
            title={enabled ? "Disable real-time updates" : "Enable real-time updates"}
          >
            {enabled ? (
              connected ? (
                <Wifi size={12} />
              ) : (
                reconnecting ? (
                  <Loader size={12} className="animate-spin" />
                ) : (
                  <WifiOff size={12} />
                )
              )
            ) : (
              <WifiOff size={12} />
            )}
          </button>
          
          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className={`flex items-center justify-center rounded-full w-6 h-6 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors duration-150 ease-in-out shadow-sm ${
              refreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Refresh data"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebSocketStatus;
