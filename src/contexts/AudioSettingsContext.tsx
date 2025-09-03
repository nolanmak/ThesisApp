import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AudioSettings {
  playbackSpeed: number;
}

interface AudioSettingsContextType {
  settings: AudioSettings;
  updatePlaybackSpeed: (speed: number) => void;
  resetSettings: () => void;
}

const defaultSettings: AudioSettings = {
  playbackSpeed: 2.0, // Default to 2x speed
};

const AudioSettingsContext = createContext<AudioSettingsContextType | undefined>(undefined);

interface AudioSettingsProviderProps {
  children: ReactNode;
}

export const AudioSettingsProvider: React.FC<AudioSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AudioSettings>(() => {
    // Load settings from localStorage on initialization
    const savedSettings = localStorage.getItem('audio-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Validate the loaded settings
        if (typeof parsed.playbackSpeed === 'number' && 
            parsed.playbackSpeed >= 0.1 && 
            parsed.playbackSpeed <= 10) {
          return parsed;
        }
      } catch (error) {
        console.warn('Failed to parse saved audio settings:', error);
      }
    }
    return defaultSettings;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('audio-settings', JSON.stringify(settings));
  }, [settings]);

  const updatePlaybackSpeed = (speed: number) => {
    // Clamp speed between 0.1x and 10x
    const clampedSpeed = Math.max(0.1, Math.min(10, speed));
    setSettings(prev => ({
      ...prev,
      playbackSpeed: clampedSpeed
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const value: AudioSettingsContextType = {
    settings,
    updatePlaybackSpeed,
    resetSettings
  };

  return (
    <AudioSettingsContext.Provider value={value}>
      {children}
    </AudioSettingsContext.Provider>
  );
};

export const useAudioSettings = (): AudioSettingsContextType => {
  const context = useContext(AudioSettingsContext);
  if (context === undefined) {
    throw new Error('useAudioSettings must be used within an AudioSettingsProvider');
  }
  return context;
};

export default AudioSettingsContext;