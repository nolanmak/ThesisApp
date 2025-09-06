import React, { useEffect, useRef, useState } from 'react';
import { Search, Wifi, WifiOff, Loader, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAudioWebSocket } from '../../../hooks/useAudioWebSocket';
import { AudioNotification } from '../../../services/audioWebsocket';
import { useWatchlist } from '../../../hooks/useWatchlist';
import { useAudioSettings } from '../../../contexts/AudioSettingsContext';


interface WebSocketStatusProps {
  searchMessageTicker: string;
  refreshing: boolean;
  enabled: boolean;
  connected: boolean;
  reconnecting: boolean;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onToggleWebSocket: () => void;
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = ({
  searchMessageTicker,
  refreshing,
  enabled,
  connected,
  reconnecting,
  onSearchChange,
  onRefresh,
  onToggleWebSocket
}) => {
  // Watchlist hook (automatically updates audio service filter)
  useWatchlist();
  
  // Audio settings hook
  const { settings } = useAudioSettings();
  
  // Audio playback state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentAudio, setCurrentAudio] = useState<AudioNotification | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioQueue, setAudioQueue] = useState<AudioNotification[]>([]);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const lastPlayedUrlRef = useRef<string | null>(null);
  const audioLockRef = useRef<boolean>(false);
  
  // Audio WebSocket integration
  const {
    connected: audioConnected,
    reconnecting: audioReconnecting,
    enabled: audioEnabled,
    enable: enableAudio,
    disable: disableAudio
  } = useAudioWebSocket({
    autoConnect: false,
    persistConnection: true,
    onAudioNotification: (notification) => {
      const ticker = notification.data?.metadata?.ticker || notification.data?.metadata?.company_name || 'Unknown Stock';
      console.log(`[AUDIO QUEUE] 🎵 New audio notification for ${ticker}, currently playing: ${isPlaying}, queue length: ${audioQueue.length}`);
      
      // Always add to queue - the queue processing logic will handle when to play
      setAudioQueue(prevQueue => {
        // Check for duplicate audio URLs in the queue to prevent the same audio from being queued multiple times
        const audioUrl = notification.data.audio_url;
        const isDuplicate = prevQueue.some(item => item.data.audio_url === audioUrl);
        
        if (isDuplicate) {
          console.log(`[AUDIO QUEUE] 🔁 Ignoring duplicate audio URL: ${audioUrl}`);
          return prevQueue;
        }
        
        const newQueue = [...prevQueue, notification];
        console.log(`[AUDIO QUEUE] ✅ Added to queue. New queue length: ${newQueue.length}`);
        return newQueue;
      });
    }
  });


  const handleToggleAudio = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isToggling) {
      return;
    }
    
    setIsToggling(true);
    
    try {
      if (audioEnabled) {
        console.log('[AUDIO TOGGLE] 🛑 Disabling audio');
        
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
        
        await disableAudio();
      } else {
        await enableAudio();
        // Enable user interaction when audio is enabled
        setUserHasInteracted(true);
        
        // If there's a current audio and it's not playing, try to play it
        if (currentAudio && !isPlaying && audioRef.current) {
          try {
            await audioRef.current.play();
            setIsPlaying(true);
          } catch (error) {
            console.error('[AUDIO PLAYER] Manual audio play failed:', error);
          }
        }
      }
    } catch (error) {
      console.error('[AUDIO PLAYER] Error toggling audio:', error);
    } finally {
      // Reset toggle state after a brief delay to show the loading state
      setTimeout(() => setIsToggling(false), 500);
    }
  };

  // Handle audio playback when new notifications arrive
  useEffect(() => {
    if (audioQueue.length > 0 && !isPlaying && audioEnabled && userHasInteracted) {
      // Play the next audio in the queue
      const nextAudio = audioQueue[0];
      setCurrentAudio(nextAudio);
      setAudioQueue(prevQueue => {
        const newQueue = prevQueue.slice(1);
        return newQueue;
      });
    }
  }, [audioQueue, isPlaying, userHasInteracted, audioEnabled]);
  
  // Set playback speed from settings
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = settings.playbackSpeed;
    }
  }, [settings.playbackSpeed]);

  // Set up audio source when currentAudio changes
  useEffect(() => {
    if (currentAudio && audioRef.current && audioEnabled && userHasInteracted && !isPlaying) {
      const audioElement = audioRef.current;
      const audioUrl = currentAudio.data.audio_url;
      
      // Don't replay the same audio URL
      if (lastPlayedUrlRef.current === audioUrl) {
        setCurrentAudio(null); // Clear current audio to prevent stuck state
        return;
      }
      
      
      // Abort any ongoing play promise to prevent interruption errors
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      }
      
      // Wait for any pending operations to complete before setting new source
      const setupAudio = async () => {
        try {
          // Set the new source and wait for it to be ready
          audioElement.src = audioUrl;
          audioElement.playbackRate = settings.playbackSpeed;
          
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
          
          await audioElement.play();
          setIsPlaying(true);
          lastPlayedUrlRef.current = audioUrl; // Mark this URL as played
          
        } catch (error: any) {
          console.error('[AUDIO PLAYER] Error playing audio:', error);
          setIsPlaying(false);
          setCurrentAudio(null); // Clear current audio to try next one
          
          // Handle specific error cases - only log, no toast popups
          if (error.name === 'NotAllowedError') {
            console.warn('[AUDIO PLAYER] Autoplay was blocked. User interaction is required to play audio.');
          } else if (error.name === 'AbortError') {
          } else if (error.message === 'Audio loading timeout') {
            console.error('[AUDIO PLAYER] Audio loading timed out');
          } else if (error.name === 'NetworkError') {
            console.error('[AUDIO PLAYER] Network error loading audio');
          } else {
            console.error('[AUDIO PLAYER] Audio playback failed:', error.message);
          }
        }
      };
      
      setupAudio();
    } else if (currentAudio && (!audioEnabled || !userHasInteracted)) {
    }
  }, [currentAudio]); // Only depend on currentAudio to prevent retriggering
  
  // Handle audio events
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentAudio(null); // Clear current audio so next one can play
  };

  const handleAudioPause = () => {
    setIsPlaying(false);
  };

  const handleAudioPlay = () => {
    setIsPlaying(true);
  };

  const handleAudioError = (e: Event) => {
    console.error('[AUDIO PLAYER] Audio error during playback:', e);
    setIsPlaying(false);
    setCurrentAudio(null); // Clear to move to next audio
  };

  const handleAudioStalled = () => {
    console.warn('[AUDIO PLAYER] Audio playback stalled - network issues?');
  };

  const handleAudioWaiting = () => {
  };

  // Recovery mechanism for stuck audio playback
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      const checkPlaybackInterval = setInterval(() => {
        const audio = audioRef.current;
        if (audio && !audio.paused && audio.currentTime > 0 && audio.duration > 0) {
          // Audio is actually playing, all good
          return;
        }
        
        if (audio && (audio.paused || audio.ended)) {
          setIsPlaying(false);
          if (audio.ended) {
            setCurrentAudio(null);
          }
        }
      }, 1000); // Check every second

      return () => clearInterval(checkPlaybackInterval);
    }
  }, [isPlaying]);
  return (
    <div className="mb-3 flex items-center">
      {/* Message search box */}
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          <Search size={14} className="text-neutral-400 dark:text-neutral-500" />
        </div>
        <input
          type="text"
          placeholder="Search messages"
          value={searchMessageTicker}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 pr-16 block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-xs h-8 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
        />
        <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-1">
          {refreshing && (
            <div className="flex items-center text-primary-600">
              <Loader size={14} className="animate-spin" />
            </div>
          )}
          
          {/* Live button */}
          <button
            onClick={onToggleWebSocket}
            className={`flex items-center justify-center rounded-full w-6 h-6 transition-colors duration-150 ease-in-out ${
              enabled 
                ? connected 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : reconnecting 
                    ? 'bg-amber-500 text-white hover:bg-amber-600' 
                    : 'bg-neutral-300 text-white hover:bg-neutral-400'
                : 'bg-neutral-200 text-neutral-500 hover:bg-neutral-300'
            }`}
            title={enabled ? "Disable real-time updates" : "Enable real-time updates"}
          >
            {enabled ? (
              connected ? (
                <Wifi size={12} />
              ) : (
                reconnecting ? (
                  <Loader size={12} className="animate-spin" />
                ) : (
                  <WifiOff size={12} />
                )
              )
            ) : (
              <WifiOff size={12} />
            )}
          </button>

          {/* Audio WebSocket button */}
          <button
            type="button"
            onClick={handleToggleAudio}
            disabled={isToggling}
            className={`flex items-center justify-center rounded-full w-6 h-6 transition-colors duration-150 ease-in-out ${
              isToggling
                ? 'cursor-wait bg-amber-500 text-white' // Loading state
                : 'cursor-pointer'
            } ${
              !isToggling ? (
                audioEnabled 
                  ? audioConnected 
                    ? isPlaying 
                      ? 'bg-green-500 text-white hover:bg-green-600 animate-pulse' // Playing state
                      : 'bg-blue-500 text-white hover:bg-blue-600' 
                    : audioReconnecting 
                      ? 'bg-amber-500 text-white hover:bg-amber-600' 
                      : 'bg-neutral-300 text-white hover:bg-neutral-400'
                  : 'bg-neutral-200 text-neutral-500 hover:bg-neutral-300'
              ) : ''
            }`}
            title={
              isToggling 
                ? 'Connecting...' 
                : audioEnabled 
                  ? isPlaying 
                    ? "Stop current audio and disable notifications" 
                    : "Disable audio notifications"
                  : "Enable audio notifications"
            }
          >
            {isToggling ? (
              <Loader size={12} className="animate-spin" />
            ) : audioEnabled ? (
              audioConnected ? (
                isPlaying ? (
                  <Volume2 size={12} className="animate-bounce" /> // Bouncing icon when playing
                ) : (
                  <Volume2 size={12} />
                )
              ) : (
                audioReconnecting ? (
                  <Loader size={12} className="animate-spin" />
                ) : (
                  <VolumeX size={12} />
                )
              )
            ) : (
              <VolumeX size={12} />
            )}
          </button>
          
          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className={`flex items-center justify-center rounded-full w-6 h-6 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors duration-150 ease-in-out shadow-sm ${
              refreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Refresh data"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      
      {/* Hidden audio element for playback */}
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
    </div>
  );
};

export default WebSocketStatus;
