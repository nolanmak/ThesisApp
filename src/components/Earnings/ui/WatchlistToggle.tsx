import React from 'react';
import { List } from 'lucide-react';
import { useWatchlistToggle } from '../../../hooks/useWatchlistToggle';

const WatchlistToggle: React.FC = () => {
  const { watchlist, watchListOn, toggleWatchlist, loading } = useWatchlistToggle();

  return (
    <div className="mb-3 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 rounded-md px-3 py-2 border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center gap-2">
        <List size={16} className="text-neutral-600 dark:text-neutral-400" />
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Watchlist Filter
        </span>
        {watchlist.length > 0 ? (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            ({watchlist.length} stock{watchlist.length !== 1 ? 's' : ''})
          </span>
        ) : (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            (No watchlist)
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {watchlist.length > 0 ? (
          <>
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              {watchListOn ? 'Filtering On' : 'Show All'}
            </span>
            <button
              onClick={() => toggleWatchlist(!watchListOn)}
              disabled={loading}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                watchListOn
                  ? 'bg-blue-600'
                  : 'bg-neutral-200 dark:bg-neutral-600'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  watchListOn ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </>
        ) : (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Add stocks to your watchlist to enable filtering
          </span>
        )}
      </div>
    </div>
  );
};

export default WatchlistToggle;