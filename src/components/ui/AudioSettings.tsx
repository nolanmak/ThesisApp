import React, { useState, useEffect, useRef } from 'react';
import { Settings, X, RotateCcw, Volume2 } from 'lucide-react';
import { useAudioSettings } from '../../contexts/AudioSettingsContext';

interface AudioSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const AudioSettings: React.FC<AudioSettingsProps> = ({ isOpen, onClose }) => {
  const { settings, updatePlaybackSpeed, resetSettings } = useAudioSettings();
  const [tempSpeed, setTempSpeed] = useState(settings.playbackSpeed);
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
            <Volume2 size={20} className="text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Audio Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
          >
            <X size={18} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
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

        </div>

        {/* Footer */}
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
      </div>
    </div>
  );
};

export default AudioSettings;