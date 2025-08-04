import { useEffect, useState, useCallback } from 'react';
import { alpacaService, TickData } from '../services/alpacaService';

export interface MarketDataState {
  [symbol: string]: TickData;
}

export const useAlpacaMarketData = (symbols: string[]) => {
  const [marketData, setMarketData] = useState<MarketDataState>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [enabled, setEnabled] = useState(alpacaService.isWebSocketEnabled());

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      const connected = alpacaService.isConnected();
      const wsEnabled = alpacaService.isWebSocketEnabled();
      
      setIsConnected(connected);
      setEnabled(wsEnabled);
      
      // If we have config but not connected, we're probably connecting
      setIsConnecting(!connected && wsEnabled && symbols.length > 0);
    };

    // Check immediately
    checkConnection();
    
    // Check periodically
    const interval = setInterval(checkConnection, 2000);
    return () => clearInterval(interval);
  }, [symbols.length]);

  // Subscribe to symbols
  useEffect(() => {
    if (!symbols.length || !enabled) return;

    console.log('Subscribing to Alpaca symbols:', symbols);

    // Subscribe to all symbols at once
    const unsubscribe = alpacaService.subscribe(symbols, (data: TickData) => {
      console.log('Received market data:', data);
      setMarketData(prev => ({
        ...prev,
        [data.symbol]: data
      }));
    });

    return () => {
      console.log('Unsubscribing from Alpaca symbols:', symbols);
      unsubscribe();
    };
  }, [symbols, enabled]);

  const disconnect = useCallback(() => {
    alpacaService.disconnect();
    setMarketData({});
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const enable = useCallback(() => {
    alpacaService.enable();
    setEnabled(true);
  }, []);

  const disable = useCallback(() => {
    alpacaService.disable();
    setMarketData({});
    setEnabled(false);
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const reconnect = useCallback(() => {
    if (enabled) {
      alpacaService.connect();
    }
  }, [enabled]);

  // Reset cumulative volume for a specific symbol or all symbols
  const resetCumulativeVolume = useCallback((symbol?: string) => {
    alpacaService.resetCumulativeVolume(symbol);
  }, []);

  // Get cumulative stats for a symbol
  const getCumulativeStats = useCallback((symbol: string) => {
    return alpacaService.getCumulativeStats(symbol);
  }, []);

  // Reset cumulative volume for all currently subscribed symbols
  const resetAllCumulativeVolume = useCallback(() => {
    alpacaService.resetCumulativeVolume(); // No symbol = reset all
  }, []);

  return {
    marketData,
    isConnected,
    isConnecting,
    enabled,
    disconnect,
    enable,
    disable,
    reconnect,
    resetCumulativeVolume,
    getCumulativeStats,
    resetAllCumulativeVolume
  };
};