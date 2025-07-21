import React, { useState } from 'react';
import { List, Upload } from 'lucide-react';

const WatchList: React.FC = () => {
  const [tickers, setTickers] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    setTickers(pastedText);
    
    // TODO: Send request to backend to update watchlist
    // This will be implemented when the API is provided
    console.log('Pasted tickers:', pastedText);
  };

  const handleSubmit = async () => {
    if (!tickers.trim()) return;
    
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      console.log('Submitting tickers:', tickers);
      // await api.updateWatchlist(tickers);
    } catch (error) {
      console.error('Error updating watchlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center mb-6">
          <List className="mr-3 text-blue-500" size={24} />
          <h1 className="text-2xl font-semibold text-neutral-800">Watch List</h1>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="tickers" className="block text-sm font-medium text-neutral-700 mb-2">
              Stock Tickers
            </label>
            <p className="text-sm text-neutral-500 mb-3">
              Paste your list of stock tickers below (one per line or comma-separated)
            </p>
            <textarea
              id="tickers"
              value={tickers}
              onChange={(e) => setTickers(e.target.value)}
              onPaste={handlePaste}
              className="w-full h-48 p-3 border border-neutral-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="AAPL&#10;MSFT&#10;GOOGL&#10;TSLA&#10;&#10;or&#10;&#10;AAPL, MSFT, GOOGL, TSLA"
            />
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!tickers.trim() || isLoading}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="mr-2" size={16} />
              {isLoading ? 'Updating...' : 'Update Watch List'}
            </button>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-neutral-50 rounded-md border border-neutral-200">
          <h3 className="text-sm font-medium text-neutral-700 mb-2">Instructions:</h3>
          <ul className="text-sm text-neutral-600 space-y-1">
            <li>• Paste your ticker symbols in the text area above</li>
            <li>• Tickers can be separated by new lines or commas</li>
            <li>• Click "Update Watch List" to save your changes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WatchList;