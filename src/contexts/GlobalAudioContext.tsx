import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAudioWebSocket } from '../hooks/useAudioWebSocket';
import { AudioNotification } from '../services/audioWebsocket';
import { useWatchlist } from '../hooks/useWatchlist';
import { useAudioSettings } from './AudioSettingsContext';
import { useAuth } from './AuthContext';

interface GlobalAudioContextType {
  // Audio playback state
  currentAudio: AudioNotification | null;
  isPlaying: boolean;
  audioQueue: AudioNotification[];
  audioLoading: boolean;
  userHasInteracted: boolean;
  
  // WebSocket connection state
  audioConnected: boolean;
  audioReconnecting: boolean;
  audioEnabled: boolean;
  
  // Control functions
  enableAudio: () => Promise<void>;
  disableAudio: () => Promise<void>;
  setUserInteraction: () => void;
  
  // Queue management
  clearQueue: () => void;
  skipCurrentAudio: () => void;
}

const GlobalAudioContext = createContext<GlobalAudioContextType | undefined>(undefined);

interface GlobalAudioProviderProps {
  children: ReactNode;
}

export const GlobalAudioProvider: React.FC<GlobalAudioProviderProps> = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Check if we're in an authenticated area (not landing page)
  const isInAuthenticatedArea = location.pathname.startsWith('/dashboard') && user;
  
  // Only initialize watchlist hook if we're in authenticated area
  // This prevents errors on landing page where auth context might not be available
  const watchlistResult = useWatchlist();
  
  // Audio settings hook
  const { settings } = useAudioSettings();
  
  // Audio playback state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentAudio, setCurrentAudio] = useState<AudioNotification | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioQueue, setAudioQueue] = useState<AudioNotification[]>([]);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const lastPlayedUrlRef = useRef<string | null>(null);
  const audioLockRef = useRef<boolean>(false);
  
  // Audio WebSocket integration - only if we're in authenticated area
  const {
    connected: audioConnected,
    reconnecting: audioReconnecting,
    enabled: audioEnabled,
    enable,
    disable
  } = useAudioWebSocket({
    autoConnect: false,
    persistConnection: true,
    onAudioNotification: isInAuthenticatedArea ? (notification) => {
      const ticker = notification.data?.metadata?.ticker || notification.data?.metadata?.company_name || 'Unknown Stock';
      console.log(`[GLOBAL AUDIO] 🎵 New audio notification for ${ticker}, currently playing: ${isPlaying}, queue length: ${audioQueue.length}`);
      
      // Always add to queue - the queue processing logic will handle when to play
      setAudioQueue(prevQueue => {
        // Check for duplicate audio URLs in the queue to prevent the same audio from being queued multiple times
        const audioUrl = notification.data.audio_url;
        const isDuplicate = prevQueue.some(item => item.data.audio_url === audioUrl);
        
        if (isDuplicate) {
          console.log(`[GLOBAL AUDIO] 🔁 Ignoring duplicate audio URL: ${audioUrl}`);
          return prevQueue;
        }
        
        const newQueue = [...prevQueue, notification];
        console.log(`[GLOBAL AUDIO] ✅ Added to queue. New queue length: ${newQueue.length}`);
        return newQueue;
      });
    } : undefined
  });

  // Control functions - only work in authenticated areas
  const enableAudio = async () => {
    if (!isInAuthenticatedArea) {
      console.log('[GLOBAL AUDIO] Audio not available outside authenticated areas');
      return;
    }
    
    await enable();
    setUserHasInteracted(true);
    
    // If there's a current audio and it's not playing, try to play it
    if (currentAudio && !isPlaying && audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('[GLOBAL AUDIO] Manual audio play failed:', error);
      }
    }
  };

  const disableAudio = async () => {
    if (!isInAuthenticatedArea) {
      console.log('[GLOBAL AUDIO] Audio not available outside authenticated areas');
      return;
    }
    
    console.log('[GLOBAL AUDIO] 🛑 Disabling audio');
    
    // Stop any currently playing audio immediately and reset all states
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Reset all audio states
    setIsPlaying(false);
    setCurrentAudio(null);
    setAudioQueue([]);
    setAudioLoading(false);
    audioLockRef.current = false;
    
    await disable();
  };

  const setUserInteraction = () => {
    setUserHasInteracted(true);
  };

  const clearQueue = () => {
    setAudioQueue([]);
  };

  const skipCurrentAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentAudio(null);
    audioLockRef.current = false;
  };

  // Handle audio playback when new notifications arrive
  useEffect(() => {
    // Only process queue when:
    // 1. We're in an authenticated area
    // 2. There are items in the queue
    // 3. No audio is currently playing
    // 4. No audio is currently loading
    // 5. Audio is enabled and user has interacted
    // 6. No audio lock is active
    if (isInAuthenticatedArea && audioQueue.length > 0 && !isPlaying && !audioLoading && audioEnabled && userHasInteracted && !audioLockRef.current) {
      console.log(`[GLOBAL AUDIO] 🎯 Processing queue: ${audioQueue.length} items waiting`);
      
      // Play the next audio in the queue
      const nextAudio = audioQueue[0];
      const ticker = nextAudio.data?.metadata?.ticker || 'Unknown';
      console.log(`[GLOBAL AUDIO] ▶️ Playing next audio for ${ticker}`);
      
      setCurrentAudio(nextAudio);
      setAudioQueue(prevQueue => {
        const newQueue = prevQueue.slice(1);
        console.log(`[GLOBAL AUDIO] 📋 Queue updated: ${newQueue.length} items remaining`);
        return newQueue;
      });
    } else if (audioQueue.length > 0) {
      // Log why we're not processing the queue
      const reasons = [];
      if (!isInAuthenticatedArea) reasons.push('not in authenticated area');
      if (isPlaying) reasons.push('already playing');
      if (audioLoading) reasons.push('loading');
      if (!audioEnabled) reasons.push('disabled');
      if (!userHasInteracted) reasons.push('no user interaction');
      if (audioLockRef.current) reasons.push('locked');

      console.log(`[GLOBAL AUDIO] ⏸️ Queue paused (${audioQueue.length} items): ${reasons.join(', ')}`);
      console.log(`[GLOBAL AUDIO] 🔍 Debug - isInAuthenticatedArea: ${isInAuthenticatedArea}, audioEnabled: ${audioEnabled}, userHasInteracted: ${userHasInteracted}`);
    }
  }, [audioQueue, isPlaying, audioLoading, userHasInteracted, audioEnabled, isInAuthenticatedArea]);
  
  // Set playback speed from settings
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = settings.playbackSpeed;
    }
  }, [settings.playbackSpeed]);

  // Set up audio source when currentAudio changes
  useEffect(() => {
    if (isInAuthenticatedArea && currentAudio && audioRef.current && audioEnabled && userHasInteracted && !audioLockRef.current) {
      const audioElement = audioRef.current;
      const audioUrl = currentAudio.data.audio_url;
      const ticker = currentAudio.data?.metadata?.ticker || 'Unknown';
      
      // Don't replay the same audio URL
      if (lastPlayedUrlRef.current === audioUrl) {
        console.log(`[GLOBAL AUDIO] 🔁 Skipping duplicate audio URL: ${audioUrl}`);
        setCurrentAudio(null);
        return;
      }
      
      console.log(`[GLOBAL AUDIO] 🔄 Setting up audio for ${ticker}: ${audioUrl}`);
      
      // Set the audio lock to prevent interruptions
      audioLockRef.current = true;
      setAudioLoading(true);
      
      // Setup and play audio
      const setupAudio = async () => {
        try {
          // Stop any currently playing audio first
          if (!audioElement.paused) {
            audioElement.pause();
            audioElement.currentTime = 0;
          }
          
          // Set the new source and playback rate
          audioElement.src = audioUrl;
          audioElement.playbackRate = settings.playbackSpeed;
          
          console.log(`[GLOBAL AUDIO] ⏳ Loading audio for ${ticker}...`);
          
          // Wait for the audio to be ready to play with timeout
          await new Promise((resolve, reject) => {
            let timeoutId: NodeJS.Timeout;
            
            const cleanup = () => {
              audioElement.removeEventListener('canplay', handleCanPlay);
              audioElement.removeEventListener('error', handleLoadError);
              if (timeoutId) clearTimeout(timeoutId);
            };
            
            const handleCanPlay = () => {
              cleanup();
              resolve(undefined);
            };
            
            const handleLoadError = (error: Event) => {
              cleanup();
              reject(error);
            };
            
            // Set up event listeners
            audioElement.addEventListener('canplay', handleCanPlay);
            audioElement.addEventListener('error', handleLoadError);
            
            // Add timeout to prevent hanging
            timeoutId = setTimeout(() => {
              cleanup();
              reject(new Error('Audio loading timeout'));
            }, 10000); // 10 second timeout
            
            // Load the audio
            audioElement.load();
          });
          
          console.log(`[GLOBAL AUDIO] ▶️ Playing audio for ${ticker}`);
          await audioElement.play();
          
          setIsPlaying(true);
          setAudioLoading(false);
          lastPlayedUrlRef.current = audioUrl;
          
        } catch (error: any) {
          console.error(`[GLOBAL AUDIO] ❌ Error playing audio for ${ticker}:`, error);
          
          // Reset states on error
          setIsPlaying(false);
          setAudioLoading(false);
          setCurrentAudio(null);
          audioLockRef.current = false;
          
          // Handle specific error cases
          if (error.name === 'NotAllowedError') {
            console.warn('[GLOBAL AUDIO] Autoplay was blocked. User interaction is required.');
          } else if (error.name === 'AbortError') {
            console.warn('[GLOBAL AUDIO] Audio playback was aborted.');
          } else if (error.message === 'Audio loading timeout') {
            console.error('[GLOBAL AUDIO] Audio loading timed out');
          } else if (error.name === 'NetworkError') {
            console.error('[GLOBAL AUDIO] Network error loading audio');
          } else {
            console.error('[GLOBAL AUDIO] Audio playback failed:', error.message);
          }
        }
      };
      
      setupAudio();
    } else if (currentAudio && (!isInAuthenticatedArea || !audioEnabled || !userHasInteracted)) {
      console.log(`[GLOBAL AUDIO] ⏸️ Audio ready but conditions not met - authenticated: ${isInAuthenticatedArea}, enabled: ${audioEnabled}, interacted: ${userHasInteracted}`);
    }
  }, [currentAudio, settings.playbackSpeed, isInAuthenticatedArea]);
  
  // Handle audio events
  const handleAudioEnded = () => {
    console.log('[GLOBAL AUDIO] 🏁 Audio finished playing');
    setIsPlaying(false);
    setAudioLoading(false);
    setCurrentAudio(null);
    audioLockRef.current = false; // Release the lock so next audio can play
  };

  const handleAudioPause = () => {
    console.log('[GLOBAL AUDIO] ⏸️ Audio paused');
    setIsPlaying(false);
    // Note: Don't release lock on pause in case we need to resume
  };

  const handleAudioPlay = () => {
    console.log('[GLOBAL AUDIO] ▶️ Audio started playing');
    setIsPlaying(true);
    setAudioLoading(false); // Audio is now playing, no longer loading
  };

  const handleAudioError = (e: Event) => {
    console.error('[GLOBAL AUDIO] ❌ Audio error during playback:', e);
    setIsPlaying(false);
    setAudioLoading(false);
    setCurrentAudio(null);
    audioLockRef.current = false; // Release lock on error so next audio can try
  };

  const handleAudioStalled = () => {
    console.warn('[GLOBAL AUDIO] 📶 Audio playback stalled - network issues?');
    // Don't change playing state, just log - it might recover
  };

  const handleAudioWaiting = () => {
    console.log('[GLOBAL AUDIO] ⏳ Audio waiting for data...');
    // Audio is buffering, don't change state
  };

  // Recovery mechanism for stuck audio playback
  useEffect(() => {
    if ((isPlaying || audioLoading) && audioRef.current) {
      const checkPlaybackInterval = setInterval(() => {
        const audio = audioRef.current;
        
        if (!audio) return;
        
        // If we're supposed to be playing but audio is paused/ended
        if (isPlaying && (audio.paused || audio.ended)) {
          console.warn('[GLOBAL AUDIO] 🔧 Recovery: Audio state mismatch detected');
          setIsPlaying(false);
          
          if (audio.ended) {
            console.log('[GLOBAL AUDIO] 🔧 Recovery: Audio ended, cleaning up');
            setCurrentAudio(null);
            audioLockRef.current = false;
          }
        }
        
        // If we've been loading for too long, something might be stuck
        if (audioLoading && audioLockRef.current) {
          if (!audio.src || audio.networkState === audio.NETWORK_NO_SOURCE) {
            console.warn('[GLOBAL AUDIO] 🔧 Recovery: Audio loading stuck, resetting');
            setAudioLoading(false);
            setCurrentAudio(null);
            audioLockRef.current = false;
          }
        }
        
      }, 1000); // Check every second

      return () => clearInterval(checkPlaybackInterval);
    }
  }, [isPlaying, audioLoading]);

  // Debug helper function for testing (attach to window for console access)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugAudio = {
        testNotification: (ticker = 'TEST') => {
          const testNotification = {
            type: 'new_audio',
            timestamp: new Date().toISOString(),
            data: {
              message_id: `test-${Date.now()}`,
              audio_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Public test audio
              bucket: 'test-bucket',
              key: 'test-key',
              content_type: 'audio/wav',
              size: 12345,
              metadata: {
                ticker: ticker,
                company_name: ticker
              }
            }
          };

          console.log('[DEBUG] Injecting test audio notification:', testNotification);
          setAudioQueue(prev => [...prev, testNotification]);
        },
        getState: () => ({
          audioEnabled,
          userHasInteracted,
          isPlaying,
          audioLoading,
          queueLength: audioQueue.length,
          currentAudio,
          audioConnected
        }),
        clearFilter: () => {
          audioWebsocketService.setWatchlistFilter([]);
          console.log('[DEBUG] Cleared watchlist filter - all tickers now allowed');
        }
      };
    }
  }, [audioEnabled, userHasInteracted, isPlaying, audioLoading, audioQueue, currentAudio, audioConnected]);

  const contextValue: GlobalAudioContextType = {
    currentAudio,
    isPlaying,
    audioQueue,
    audioLoading,
    userHasInteracted,
    audioConnected,
    audioReconnecting,
    audioEnabled,
    enableAudio,
    disableAudio,
    setUserInteraction,
    clearQueue,
    skipCurrentAudio
  };

  return (
    <GlobalAudioContext.Provider value={contextValue}>
      {children}
      
      {/* Global hidden audio element for playback */}
      <audio 
        ref={audioRef}
        onEnded={handleAudioEnded}
        onPause={handleAudioPause}
        onPlay={handleAudioPlay}
        onError={handleAudioError}
        onStalled={handleAudioStalled}
        onWaiting={handleAudioWaiting}
        onLoadStart={() => {}}
        onCanPlay={() => {}}
        onAbort={() => {}}
        style={{ display: 'none' }}
      />
    </GlobalAudioContext.Provider>
  );
};

export const useGlobalAudio = (): GlobalAudioContextType => {
  const context = useContext(GlobalAudioContext);
  if (context === undefined) {
    throw new Error('useGlobalAudio must be used within a GlobalAudioProvider');
  }
  return context;
};

export default GlobalAudioContext;