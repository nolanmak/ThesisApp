import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateUserProfile, UserProfile } from '../services/api';
import audioWebsocketService from '../services/audioWebsocket';

export const useWatchlistToggle = () => {
  const { user } = useAuth();
  const [watchListOn, setWatchListOn] = useState<boolean>(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.email) {
      setWatchListOn(true);
      setWatchlist([]);
      audioWebsocketService.setWatchlistFilter([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = await getUserProfile(user.email);
      const userWatchlist = profile?.watchlist || [];
      const isWatchListOn = profile?.watchListOn ?? true; // Default to true
      
      setWatchlist(userWatchlist);
      setWatchListOn(isWatchListOn);
      
      // Update audio service filter based on toggle state
      if (isWatchListOn && userWatchlist.length > 0) {
        audioWebsocketService.setWatchlistFilter(userWatchlist);
      } else {
        audioWebsocketService.setWatchlistFilter([]);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
      setError(errorMessage);
      
      // On error, default to enabled and clear filter
      setWatchListOn(true);
      setWatchlist([]);
      audioWebsocketService.setWatchlistFilter([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  const toggleWatchlist = useCallback(async (enabled: boolean) => {
    if (!user?.email) return;

    setLoading(true);
    setError(null);

    try {
      // Get current profile to preserve other data
      const currentProfile = await getUserProfile(user.email);
      
      const updatedProfile: UserProfile = {
        email: user.email,
        watchlist: currentProfile?.watchlist || [],
        watchListOn: enabled,
        settings: currentProfile?.settings || {}
      };

      await updateUserProfile(updatedProfile);
      setWatchListOn(enabled);

      // Update audio service filter based on toggle state
      if (enabled && watchlist.length > 0) {
        audioWebsocketService.setWatchlistFilter(watchlist);
      } else {
        audioWebsocketService.setWatchlistFilter([]);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update watchlist setting';
      setError(errorMessage);
      // Revert the toggle state on error
      setWatchListOn(!enabled);
    } finally {
      setLoading(false);
    }
  }, [user?.email, watchlist]);

  const addToWatchlist = useCallback(async (ticker: string) => {
    if (!user?.email || watchlist.includes(ticker)) return;

    setLoading(true);
    setError(null);

    try {
      const currentProfile = await getUserProfile(user.email);
      const updatedWatchlist = [...watchlist, ticker];
      
      const updatedProfile: UserProfile = {
        email: user.email,
        watchlist: updatedWatchlist,
        watchListOn: true, // Auto-enable when adding items
        settings: currentProfile?.settings || {}
      };

      await updateUserProfile(updatedProfile);
      setWatchlist(updatedWatchlist);
      setWatchListOn(true);

      // Update audio service filter since we auto-enable
      audioWebsocketService.setWatchlistFilter(updatedWatchlist);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to watchlist';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.email, watchlist]);

  const removeFromWatchlist = useCallback(async (ticker: string) => {
    if (!user?.email || !watchlist.includes(ticker)) return;

    setLoading(true);
    setError(null);

    try {
      const currentProfile = await getUserProfile(user.email);
      const updatedWatchlist = watchlist.filter(item => item !== ticker);
      
      const updatedProfile: UserProfile = {
        email: user.email,
        watchlist: updatedWatchlist,
        watchListOn: currentProfile?.watchListOn ?? true,
        settings: currentProfile?.settings || {}
      };

      await updateUserProfile(updatedProfile);
      setWatchlist(updatedWatchlist);

      // Update audio service filter based on current toggle state
      if (watchListOn && updatedWatchlist.length > 0) {
        audioWebsocketService.setWatchlistFilter(updatedWatchlist);
      } else {
        audioWebsocketService.setWatchlistFilter([]);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove from watchlist';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.email, watchlist, watchListOn]);

  // Load profile when user changes
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    watchlist,
    watchListOn,
    loading,
    error,
    toggleWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    refreshProfile: loadProfile
  };
};