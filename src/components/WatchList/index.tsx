import React, { useState, useEffect, useCallback } from 'react';
import { List, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '../../services/api';
import StockLogo from '../ui/StockLogo';

const WatchList: React.FC = () => {
  const { user } = useAuth();
  const [tickers, setTickers] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentWatchlist, setCurrentWatchlist] = useState<string[]>([]);

  const loadWatchlist = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      const profile = await getUserProfile(user.email);
      if (profile?.watchlist) {
        setCurrentWatchlist(profile.watchlist);
        setTickers(profile.watchlist.join('\n'));
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
    }
  }, [user?.email]);

  // Load current watchlist on component mount
  useEffect(() => {
    if (user?.email) {
      loadWatchlist();
    }
  }, [user?.email, loadWatchlist]);

  const updateWatchlist = async (watchlistArray: string[]) => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
      await updateUserProfile({
        email: user.email,
        watchlist: watchlistArray,
        settings: {} // Keep existing settings or add new ones as needed
      });
      
      setCurrentWatchlist(watchlistArray);
      console.log('Watchlist updated successfully');
    } catch (error) {
      console.error('Error updating watchlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const parseTickersFromText = (text: string): string[] => {
    return text
      .split(/[,\n]/)
      .map(ticker => ticker.trim().toUpperCase())
      .filter(ticker => ticker.length > 0);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    setTickers(pastedText);
    
    // Auto-update watchlist on paste
    const parsedTickers = parseTickersFromText(pastedText);
    if (parsedTickers.length > 0) {
      await updateWatchlist(parsedTickers);
    }
  };

  const handleSubmit = async () => {
    if (!tickers.trim()) return;
    
    const parsedTickers = parseTickersFromText(tickers);
    await updateWatchlist(parsedTickers);
  };

  const handleClearWatchlist = async () => {
    if (!user?.email) return;
    
    // Confirm with user before clearing
    if (window.confirm('Are you sure you want to clear your entire watchlist? This action cannot be undone.')) {
      await updateWatchlist([]);
      setTickers('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex items-center mb-6">
          <List className="mr-3 text-blue-500 dark:text-blue-400" size={24} />
          <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">Watch List</h1>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="tickers" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Stock Tickers
            </label>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
              Paste your list of stock tickers below (one per line or comma-separated)
            </p>
            <textarea
              id="tickers"
              value={tickers}
              onChange={(e) => setTickers(e.target.value)}
              onPaste={handlePaste}
              className="w-full h-48 p-3 border border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
              placeholder="AAPL&#10;MSFT&#10;GOOGL&#10;TSLA&#10;&#10;or&#10;&#10;AAPL, MSFT, GOOGL, TSLA"
            />
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={handleClearWatchlist}
              disabled={isLoading || currentWatchlist.length === 0}
              className="flex items-center px-4 py-2 bg-red-500 dark:bg-red-600 text-white rounded-md hover:bg-red-600 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="mr-2" size={16} />
              Clear All
            </button>
            <button
              onClick={handleSubmit}
              disabled={!tickers.trim() || isLoading}
              className="flex items-center px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="mr-2" size={16} />
              {isLoading ? 'Updating...' : 'Update Watch List'}
            </button>
          </div>
        </div>
        
        {currentWatchlist.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">Current Watch List ({currentWatchlist.length} tickers):</h3>
            <div className="flex flex-wrap gap-2">
              {currentWatchlist.map((ticker) => (
                <div key={ticker} className="flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-300 text-sm rounded-md">
                  <StockLogo ticker={ticker} size={16} />
                  <span>{ticker}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-700 rounded-md border border-neutral-200 dark:border-neutral-600">
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Instructions:</h3>
          <ul className="text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
            <li>• Paste your ticker symbols in the text area above</li>
            <li>• Tickers can be separated by new lines or commas</li>
            <li>• Auto-saves on paste, or click "Update Watch List" to save manually</li>
            <li>• Your current watch list will load automatically when you visit this page</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WatchList;