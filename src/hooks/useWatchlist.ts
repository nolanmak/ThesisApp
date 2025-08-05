import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/api';
import audioWebsocketService from '../services/audioWebsocket';

export const useWatchlist = () => {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWatchlist = useCallback(async () => {
    if (!user?.email) {
      setWatchlist([]);
      audioWebsocketService.setWatchlistFilter([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = await getUserProfile(user.email);
      const userWatchlist = profile?.watchlist || [];
      setWatchlist(userWatchlist);
      
      // Update audio service filter
      audioWebsocketService.setWatchlistFilter(userWatchlist);
      
      console.log('[WATCHLIST HOOK] Updated watchlist:', userWatchlist);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load watchlist';
      setError(errorMessage);
      console.error('Error loading watchlist:', err);
      
      // On error, clear the filter to avoid blocking all notifications
      setWatchlist([]);
      audioWebsocketService.setWatchlistFilter([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Load watchlist when user changes
  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  return {
    watchlist,
    loading,
    error,
    refreshWatchlist: loadWatchlist
  };
};