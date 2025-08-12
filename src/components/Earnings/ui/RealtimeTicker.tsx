import React from 'react';
import { TickData } from '../../../services/alpacaService';

interface RealtimeTickerProps {
  symbol: string;
  tickData?: TickData;
  isConnected: boolean;
  isMobile?: boolean;
}

const RealtimeTicker: React.FC<RealtimeTickerProps> = ({ 
  symbol,
  tickData, 
  isConnected 
}) => {
  if (!tickData) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-neutral-400 text-xs">
          {isConnected ? 'Loading...' : 'Disconnected'}
        </div>
      </div>
    );
  }

  // const formatPrice = (price: number) => {
  //   return price.toFixed(2);
  // };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toLocaleString();
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  // const formatChange = (change: number, changePercent: number) => {
  //   const sign = change >= 0 ? '+' : '';
  //   return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  // };

  // const getChangeColor = (change: number) => {
  //   if (change > 0) return 'text-green-600';
  //   if (change < 0) return 'text-red-600';
  //   return 'text-neutral-600';
  // };

  return (
    <div className="flex flex-col space-y-2 p-3 bg-white rounded-lg border">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-700">{symbol}</span>
        <div 
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} 
          title={isConnected ? 'Connected' : 'Disconnected'}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">Price</span>
        <span className="text-xs font-medium text-neutral-900">
          {formatPrice(tickData.close)}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">Session Volume</span>
        <span className="text-xs font-semibold text-blue-600">
          {formatVolume(tickData.cumulativeVolume)}
        </span>
      </div>
      
      {tickData.volume > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">Latest Volume</span>
          <span className="text-xs font-medium text-neutral-700">
            {formatVolume(tickData.volume)}
          </span>
        </div>
      )}
      
      {tickData.volumePercentageOfAvg && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">20-Day Avg %</span>
          <span className={`text-xs font-semibold ${
            tickData.volumePercentageOfAvg >= 20 
              ? 'text-green-600' 
              : tickData.volumePercentageOfAvg >= 10 
                ? 'text-yellow-600' 
                : 'text-neutral-700'
          }`}>
            {tickData.volumePercentageOfAvg.toFixed(1)}%
          </span>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">Total Trades</span>
        <span className="text-xs font-medium text-neutral-700">
          {tickData.numberOfTrades.toLocaleString()}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">Last Update</span>
        <span className="text-xs text-neutral-600">
          {tickData.timestamp.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default RealtimeTicker;