import React, { useEffect, useRef, useState } from 'react';
import { Search, Wifi, WifiOff, Loader, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAudioWebSocket } from '../../../hooks/useAudioWebSocket';
import { AudioNotification } from '../../../services/audioWebsocket';
import { useWatchlist } from '../../../hooks/useWatchlist';


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
  
  // Audio playback state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentAudio, setCurrentAudio] = useState<AudioNotification | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioQueue, setAudioQueue] = useState<AudioNotification[]>([]);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const lastPlayedUrlRef = useRef<string | null>(null);
  
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
      // Show a visual notification
      const ticker = notification.data?.metadata?.ticker || notification.data?.metadata?.company_name || 'Unknown Stock';
      
      // Enhanced toast notification
      toast.success(`🔊 New Earnings Audio: ${ticker}`, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
      
      // Add the notification to the queue
      setAudioQueue(prevQueue => {
        const newQueue = [...prevQueue, notification];
        console.log('[AUDIO PLAYER] 🎧 Audio queue updated. New length:', newQueue.length);
        return newQueue;
      });
    }
  });


  const handleToggleAudio = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isToggling) {
      console.log('[AUDIO PLAYER] Already toggling, ignoring click');
      return;
    }
    
    setIsToggling(true);
    console.log('[AUDIO PLAYER] Audio toggle clicked. Current state - enabled:', audioEnabled, 'connected:', audioConnected);
    
    try {
      if (audioEnabled) {
        console.log('[AUDIO PLAYER] Disabling audio...');
        
        // Stop any currently playing audio immediately
        if (isPlaying && audioRef.current) {
          console.log('[AUDIO PLAYER] Stopping currently playing audio');
          audioRef.current.pause();
          audioRef.current.currentTime = 0; // Reset to beginning
          setIsPlaying(false);
          setCurrentAudio(null);
          setAudioQueue([]); // Clear the entire queue
        }
        
        await disableAudio();
      } else {
        console.log('[AUDIO PLAYER] Enabling audio...');
        await enableAudio();
        // Enable user interaction when audio is enabled
        setUserHasInteracted(true);
        
        // If there's a current audio and it's not playing, try to play it
        if (currentAudio && !isPlaying && audioRef.current) {
          console.log('[AUDIO PLAYER] Manual play attempt after enabling audio');
          try {
            await audioRef.current.play();
            setIsPlaying(true);
            console.log('[AUDIO PLAYER] Manual audio play successful');
          } catch (error) {
            console.error('[AUDIO PLAYER] Manual audio play failed:', error);
            toast.error(`Audio playback failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
              autoClose: 5000,
              position: 'top-right'
            });
          }
        }
      }
    } catch (error) {
      console.error('[AUDIO PLAYER] Error toggling audio:', error);
      toast.error('Failed to toggle audio. Please try again.', {
        autoClose: 3000,
        position: 'top-right'
      });
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
  
  // Set default playback speed to 1.5x
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = 1.5;
    }
  }, []);

  // Set up audio source when currentAudio changes
  useEffect(() => {
    if (currentAudio && audioRef.current && audioEnabled && userHasInteracted && !isPlaying) {
      const audioElement = audioRef.current;
      const audioUrl = currentAudio.data.audio_url;
      
      // Don't replay the same audio URL
      if (lastPlayedUrlRef.current === audioUrl) {
        console.log('[AUDIO PLAYER] Skipping - already played this audio URL:', audioUrl);
        setCurrentAudio(null); // Clear current audio to prevent stuck state
        return;
      }
      
      console.log('[AUDIO PLAYER] Setting up audio source:', audioUrl);
      
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
          audioElement.playbackRate = 1.5;
          
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
          
          console.log('[AUDIO PLAYER] Attempting to play audio...');
          await audioElement.play();
          setIsPlaying(true);
          lastPlayedUrlRef.current = audioUrl; // Mark this URL as played
          console.log('[AUDIO PLAYER] Audio playing successfully at 1.5x speed');
          
        } catch (error: any) {
          console.error('[AUDIO PLAYER] Error playing audio:', error);
          setIsPlaying(false);
          setCurrentAudio(null); // Clear current audio to try next one
          
          // Handle specific error cases
          if (error.name === 'NotAllowedError') {
            console.warn('[AUDIO PLAYER] Autoplay was blocked. User interaction is required to play audio.');
            toast.info('Audio autoplay blocked. Click the audio button to hear notifications.', {
              autoClose: 5000,
              position: 'top-right'
            });
          } else if (error.name === 'AbortError') {
            console.log('[AUDIO PLAYER] Play request was aborted (likely due to rapid messages)');
            // Don't show error toast for abort errors as they're expected
          } else if (error.message === 'Audio loading timeout') {
            console.error('[AUDIO PLAYER] Audio loading timed out');
            toast.error('Audio loading timed out. Network may be slow.', {
              autoClose: 3000,
              position: 'top-right'
            });
          } else if (error.name === 'NetworkError') {
            console.error('[AUDIO PLAYER] Network error loading audio');
            toast.error('Network error loading audio. Please check connection.', {
              autoClose: 3000,
              position: 'top-right'
            });
          } else {
            toast.error(`Audio playback failed: ${error.message}`, {
              autoClose: 5000,
              position: 'top-right'
            });
          }
        }
      };
      
      setupAudio();
    } else if (currentAudio && (!audioEnabled || !userHasInteracted)) {
      console.log('[AUDIO PLAYER] Not playing audio - audioEnabled:', audioEnabled, 'userHasInteracted:', userHasInteracted);
    }
  }, [currentAudio]); // Only depend on currentAudio to prevent retriggering
  
  // Handle audio events
  const handleAudioEnded = () => {
    console.log('[AUDIO PLAYER] Audio ended naturally');
    setIsPlaying(false);
    setCurrentAudio(null); // Clear current audio so next one can play
  };

  const handleAudioPause = () => {
    console.log('[AUDIO PLAYER] Audio paused');
    setIsPlaying(false);
  };

  const handleAudioPlay = () => {
    console.log('[AUDIO PLAYER] Audio started playing');
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
    console.log('[AUDIO PLAYER] Audio buffering...');
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
          console.log('[AUDIO PLAYER] Detected stuck playing state, correcting...');
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
          <Search size={14} className="text-neutral-400" />
        </div>
        <input
          type="text"
          placeholder="Search messages"
          value={searchMessageTicker}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 pr-16 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-xs h-8"
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
        onLoadStart={() => console.log('[AUDIO PLAYER] Started loading audio')}
        onCanPlay={() => console.log('[AUDIO PLAYER] Audio ready to play')}
        onAbort={() => console.log('[AUDIO PLAYER] Audio load aborted')}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default WebSocketStatus;
