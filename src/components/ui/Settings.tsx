import React, { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, X, RotateCcw, Volume2, LogOut, User, List, Palette } from 'lucide-react';
import { useAudioSettings } from '../../contexts/AudioSettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useWatchlistToggle } from '../../hooks/useWatchlistToggle';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const { settings, updatePlaybackSpeed, resetSettings } = useAudioSettings();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { watchlist, watchListOn, toggleWatchlist, loading: watchlistLoading } = useWatchlistToggle();
  const [tempSpeed, setTempSpeed] = useState(settings.playbackSpeed);
  const [activeTab, setActiveTab] = useState<'audio' | 'theme' | 'account'>('audio');
  const modalRef = useRef<HTMLDivElement>(null);

  // Update temp speed when settings change
  useEffect(() => {
    setTempSpeed(settings.playbackSpeed);
  }, [settings.playbackSpeed]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleSpeedChange = (value: number) => {
    setTempSpeed(value);
    updatePlaybackSpeed(value);
  };

  const handleReset = () => {
    resetSettings();
  };

  const handleLogout = () => {
    // Clear the auth tokens from local storage
    localStorage.removeItem('user_data');
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('refresh_token');
    // Close modal and redirect to landing page
    onClose();
    navigate('/');
  };

  const handleWatchlistToggle = async (enabled: boolean) => {
    await toggleWatchlist(enabled);
  };

  const speedOptions = [
    { value: 0.25, label: '0.25x' },
    { value: 0.5, label: '0.5x' },
    { value: 0.75, label: '0.75x' },
    { value: 1.0, label: '1x' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5, label: '1.5x' },
    { value: 2.0, label: '2x' },
    { value: 3.0, label: '3x' },
    { value: 4.0, label: '4x' },
    { value: 5.0, label: '5x' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <SettingsIcon size={20} className="text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
          >
            <X size={18} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'audio'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <Volume2 size={16} />
            Audio
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'theme'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <Palette size={16} />
            Theme
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'account'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <User size={16} />
            Account
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'audio' && (
            <div className="space-y-6">
              {/* Playback Speed Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Playback Speed
                  </label>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {tempSpeed}x
                  </span>
                </div>

                {/* Speed Slider */}
                <div className="mb-4">
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={tempSpeed}
                    onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-neutral-200 dark:bg-neutral-600 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((tempSpeed - 0.1) / (10 - 0.1)) * 100}%, #e5e7eb ${((tempSpeed - 0.1) / (10 - 0.1)) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    <span>0.1x</span>
                    <span>5x</span>
                    <span>10x</span>
                  </div>
                </div>

                {/* Quick Speed Buttons */}
                <div className="grid grid-cols-5 gap-2">
                  {speedOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSpeedChange(option.value)}
                      className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                        Math.abs(tempSpeed - option.value) < 0.05
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Watchlist Filter Section */}
              {watchlist.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <List size={16} className="text-neutral-600 dark:text-neutral-400" />
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Watchlist Filter
                      </label>
                    </div>
                    <button
                      onClick={() => handleWatchlistToggle(!watchListOn)}
                      disabled={watchlistLoading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        watchListOn
                          ? 'bg-blue-600'
                          : 'bg-neutral-200 dark:bg-neutral-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          watchListOn ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                    {watchListOn 
                      ? `Filtering notifications to your ${watchlist.length} watchlist stock${watchlist.length !== 1 ? 's' : ''}`
                      : 'Receiving notifications for all stocks'
                    }
                  </p>
                  {watchListOn && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                        Your Watchlist ({watchlist.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {watchlist.map((ticker) => (
                          <span
                            key={ticker}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300"
                          >
                            {ticker}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-6">
              {/* Theme Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-4">
                  Choose Theme
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      theme === 'light'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-neutral-300 shadow-sm"></div>
                    <div className="text-left">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">Light</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">Bright and clean interface</div>
                    </div>
                    {theme === 'light' && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      theme === 'dark'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-600"></div>
                    <div className="text-left">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">Dark</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">Easy on the eyes</div>
                    </div>
                    {theme === 'dark' && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setTheme('system')}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      theme === 'system'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-white to-neutral-800 border-2 border-neutral-400"></div>
                    <div className="text-left">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">System</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">Matches your device settings</div>
                    </div>
                    {theme === 'system' && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* User Info Section */}
              <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <User size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>

              {/* App Info */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                  EarningsOwl Alpha Version
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center mt-1">
                  Please validate data through other sources
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Only show for Audio tab */}
        {activeTab === 'audio' && (
          <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-700">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
            >
              <RotateCcw size={14} />
              Reset to Default
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {/* Footer for Account tab */}
        {activeTab === 'account' && (
          <div className="flex items-center justify-end p-4 border-t border-neutral-200 dark:border-neutral-700">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;