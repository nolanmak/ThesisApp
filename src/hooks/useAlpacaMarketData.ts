import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  
  // Memoize symbols to prevent unnecessary re-subscriptions
  const memoizedSymbols = React.useMemo(() => symbols, [symbols.join(',')]);
  const unsubscribeFnRef = useRef<(() => void) | null>(null);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      const connected = alpacaService.isConnected();
      const wsEnabled = alpacaService.isWebSocketEnabled();
      
      setIsConnected(connected);
      setEnabled(wsEnabled);
      
      // More conservative connecting state management
      setIsConnecting(!connected && wsEnabled && symbols.length > 0 && !connected);
    };

    // Check immediately
    checkConnection();
    
    // Check less frequently to reduce noise
    const interval = setInterval(checkConnection, 3000);
    return () => clearInterval(interval);
  }, [memoizedSymbols.length]);

  // Subscribe to symbols
  useEffect(() => {
    if (!memoizedSymbols.length || !enabled) {
      previousSymbolsRef.current = memoizedSymbols;
      return;
    }

    // Only resubscribe if symbols have actually changed
    if (arraysEqual(memoizedSymbols, previousSymbolsRef.current)) {
      return;
    }

    // Clean up previous subscription if it exists
    if (unsubscribeFnRef.current) {
      unsubscribeFnRef.current();
      unsubscribeFnRef.current = null;
    }


    // Subscribe to all symbols at once
    const unsubscribe = alpacaService.subscribe(memoizedSymbols, (data: TickData) => {
      
      setMarketData(prev => ({
        ...prev,
        [data.symbol]: data
      }));
    });

    // Store the unsubscribe function
    unsubscribeFnRef.current = unsubscribe;

    // Update the ref to track current symbols
    previousSymbolsRef.current = [...memoizedSymbols];

    // Cleanup function
    return () => {
      if (unsubscribeFnRef.current) {
        unsubscribeFnRef.current();
        unsubscribeFnRef.current = null;
      }
    };
  }, [memoizedSymbols, enabled]);

  const disconnect = useCallback(() => {
    if (unsubscribeFnRef.current) {
      unsubscribeFnRef.current();
      unsubscribeFnRef.current = null;
    }
    alpacaService.disconnect();
    // Don't clear market data on disconnect - preserve volume data
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const enable = useCallback(() => {
    alpacaService.enable();
    setEnabled(true);
  }, []);

  const disable = useCallback(() => {
    alpacaService.disable();
    // Only clear data when explicitly disabling, not on temporary disconnections
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

  // Request volume data for a specific ticker
  const requestVolumeData = useCallback((ticker: string) => {
    alpacaService.requestVolumeData(ticker);
  }, []);

  // Request volume data for multiple tickers
  const requestVolumeDataForSymbols = useCallback((tickers: string[]) => {
    alpacaService.requestVolumeDataForSymbols(tickers);
  }, []);

  // Get market close status
  const getMarketCloseStatus = useCallback(() => {
    return alpacaService.getMarketCloseStatus();
  }, []);

  // Fetch initial volume data when symbols change
  useEffect(() => {
    if (memoizedSymbols.length > 0 && enabled && isConnected) {
      // Add a small delay to ensure subscription is processed first
      const timer = setTimeout(() => {
        alpacaService.fetchInitialData(memoizedSymbols);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [memoizedSymbols, enabled, isConnected]);

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
    resetAllCumulativeVolume,
    requestVolumeData,
    requestVolumeDataForSymbols,
    getMarketCloseStatus
  };
};