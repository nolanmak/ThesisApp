import { useEffect, useState, useCallback, useRef } from 'react';
import { alpacaService, TickData } from '../services/alpacaService';

export interface MarketDataState {
  [symbol: string]: TickData;
}

// Helper function to compare symbol arrays
const arraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
};

export const useAlpacaMarketData = (symbols: string[]) => {
  const [marketData, setMarketData] = useState<MarketDataState>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [enabled, setEnabled] = useState(alpacaService.isWebSocketEnabled());
  const previousSymbolsRef = useRef<string[]>([]);

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
    if (!symbols.length || !enabled) {
      previousSymbolsRef.current = symbols;
      return;
    }

    // Only resubscribe if symbols have actually changed
    if (arraysEqual(symbols, previousSymbolsRef.current)) {
      return;
    }

    console.log('Subscribing to Alpaca symbols:', symbols);
    console.log('Previous symbols were:', previousSymbolsRef.current);

    // Subscribe to all symbols at once
    const unsubscribe = alpacaService.subscribe(symbols, (data: TickData) => {
      console.log('📊 RT Volume Data:', data.symbol, 'Vol:', data.volume, 'Cumulative:', data.cumulativeVolume);
      setMarketData(prev => ({
        ...prev,
        [data.symbol]: data
      }));
    });

    // Update the ref to track current symbols
    previousSymbolsRef.current = symbols;

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