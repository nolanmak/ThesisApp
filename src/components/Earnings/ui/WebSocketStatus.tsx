import React, { useEffect, useRef, useState } from 'react';
import { Search, Wifi, WifiOff, Loader, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAudioWebSocket } from '../../../hooks/useAudioWebSocket';
import { AudioNotification } from '../../../services/audioWebsocket';


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
  // Audio playback state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentAudio, setCurrentAudio] = useState<AudioNotification | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioQueue, setAudioQueue] = useState<AudioNotification[]>([]);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  
  // Audio WebSocket integration
  const {
    connected: audioConnected,
    reconnecting: audioReconnecting,
    enabled: audioEnabled,
    enable: enableAudio,
    disable: disableAudio
  } = useAudioWebSocket({
    autoConnect: true,
    persistConnection: true,
    onAudioNotification: (notification) => {
      console.log('[AUDIO PLAYER] 🎉 Received audio notification:', notification);
      
      // Show a visual notification
      const ticker = notification.data?.metadata?.ticker || notification.data?.metadata?.company_name || 'Unknown Stock';
      console.log('[AUDIO PLAYER] 🎆 Showing toast for ticker:', ticker);
      
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

  const handleToggleAudio = () => {
    if (audioEnabled) {
      disableAudio();
    } else {
      enableAudio();
      // Enable user interaction when audio is enabled
      setUserHasInteracted(true);
    }
  };

  // Handle audio playback when new notifications arrive
  useEffect(() => {
    console.log('[AUDIO PLAYER] Audio queue effect triggered. Queue length:', audioQueue.length, 'Is playing:', isPlaying);
    if (audioQueue.length > 0 && !isPlaying) {
      // Play the next audio in the queue
      const nextAudio = audioQueue[0];
      console.log('[AUDIO PLAYER] Setting current audio:', nextAudio);
      setCurrentAudio(nextAudio);
      setAudioQueue(prevQueue => {
        const newQueue = prevQueue.slice(1);
        console.log('[AUDIO PLAYER] Removed audio from queue. New length:', newQueue.length);
        return newQueue;
      });
    }
  }, [audioQueue, isPlaying]);
  
  // Set up audio source when currentAudio changes
  useEffect(() => {
    if (currentAudio && audioRef.current) {
      audioRef.current.src = currentAudio.data.audio_url;
      
      if (audioEnabled && userHasInteracted) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            console.log('Audio playing successfully');
          })
          .catch(error => {
            console.error('Error playing audio:', error);
            setIsPlaying(false);
            
            // If autoplay is blocked, show a notification to the user
            if (error.name === 'NotAllowedError') {
              console.warn('Autoplay was blocked. User interaction is required to play audio.');
              toast.info('Audio autoplay blocked. Click the audio button to hear notifications.', {
                autoClose: 5000,
                position: 'top-right'
              });
            } else {
              toast.error(`Audio playback failed: ${error.message}`, {
                autoClose: 5000,
                position: 'top-right'
              });
            }
          });
      }
    }
  }, [currentAudio, audioEnabled, userHasInteracted]);
  
  // Handle audio events
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentAudio(null);
  };
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
            onClick={handleToggleAudio}
            className={`flex items-center justify-center rounded-full w-6 h-6 transition-colors duration-150 ease-in-out ${
              audioEnabled 
                ? audioConnected 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : audioReconnecting 
                    ? 'bg-amber-500 text-white hover:bg-amber-600' 
                    : 'bg-neutral-300 text-white hover:bg-neutral-400'
                : 'bg-neutral-200 text-neutral-500 hover:bg-neutral-300'
            }`}
            title={audioEnabled ? "Disable audio notifications" : "Enable audio notifications"}
          >
            {audioEnabled ? (
              audioConnected ? (
                <Volume2 size={12} />
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
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default WebSocketStatus;
