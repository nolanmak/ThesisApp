import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAudioWebSocket } from '../hooks/useAudioWebSocket';
import { AudioNotification } from '../services/audioWebsocket';

interface AudioNotificationPlayerProps {
  autoPlay?: boolean;
}

/**
 * Component that connects to the Audio WebSocket API and plays received audio files
 */
const AudioNotificationPlayer: React.FC<AudioNotificationPlayerProps> = ({ 
  autoPlay = true 
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentAudio, setCurrentAudio] = useState<AudioNotification | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioQueue, setAudioQueue] = useState<AudioNotification[]>([]);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Connect to the Audio WebSocket
  const { 
    connected, 
    reconnecting
  } = useAudioWebSocket({
    autoConnect: true,
    persistConnection: true,
    onAudioNotification: (notification) => {
      console.log('[AUDIO PLAYER] Received audio notification:', notification);
      setNotificationCount(prev => {
        const newCount = prev + 1;
        console.log('[AUDIO PLAYER] Notification count updated to:', newCount);
        return newCount;
      });
      
      // Show a visual notification
      const ticker = notification.data.metadata?.ticker || 'stock';
      console.log('[AUDIO PLAYER] Showing toast for ticker:', ticker);
      toast.info(`New audio notification for ${ticker}`, {
        position: 'top-right',
        autoClose: 3000
      });
      
      // Add the notification to the queue
      setAudioQueue(prevQueue => {
        const newQueue = [...prevQueue, notification];
        console.log('[AUDIO PLAYER] Audio queue updated. New length:', newQueue.length);
        return newQueue;
      });
    }
  });
  
  // Add component debugging
  console.log('[AUDIO PLAYER] Component rendering');
  console.log('[AUDIO PLAYER] Connected:', connected);
  console.log('[AUDIO PLAYER] Current audio:', currentAudio);
  console.log('[AUDIO PLAYER] Audio queue length:', audioQueue.length);
  console.log('[AUDIO PLAYER] User has interacted:', userHasInteracted);
  console.log('[AUDIO PLAYER] Notification count:', notificationCount);
  
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
      setAudioError(null);
      audioRef.current.src = currentAudio.data.audio_url;
      
      if (autoPlay && userHasInteracted) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            console.log('Audio playing successfully');
          })
          .catch(error => {
            console.error('Error playing audio:', error);
            setIsPlaying(false);
            setAudioError(error.message);
            
            // If autoplay is blocked, show a notification to the user
            if (error.name === 'NotAllowedError') {
              console.warn('Autoplay was blocked. User interaction is required to play audio.');
              toast.info('Audio autoplay blocked. Click the play button to hear notifications.', {
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
  }, [currentAudio, autoPlay, userHasInteracted]);
  
  // Handle audio events
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentAudio(null);
  };
  
  const handlePlay = () => {
    setUserHasInteracted(true);
    if (audioRef.current && currentAudio) {
      setAudioError(null);
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          console.log('Manual audio play successful');
        })
        .catch(error => {
          console.error('Error playing audio:', error);
          setAudioError(error.message);
          toast.error(`Audio playback failed: ${error.message}`, {
            autoClose: 5000,
            position: 'top-right'
          });
        });
    }
  };

  const enableUserInteraction = () => {
    setUserHasInteracted(true);
  };
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 my-4 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          {connected ? 'Connected to Audio Service' : reconnecting ? 'Reconnecting...' : 'Disconnected'}
        </div>
        {notificationCount > 0 && (
          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
            {notificationCount} notification{notificationCount !== 1 ? 's' : ''} received
          </div>
        )}
      </div>
      
      {connected && !userHasInteracted && (
        <div className="mt-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-500">
          <p className="m-0 text-gray-600 text-sm mb-2">⚠️ Audio autoplay requires user interaction. Click below to enable audio notifications.</p>
          <button 
            onClick={enableUserInteraction}
            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
          >
            Enable Audio
          </button>
        </div>
      )}
      
      {connected && !currentAudio && userHasInteracted && (
        <div className="mt-4 p-3 bg-gray-50 rounded border-l-4 border-blue-500">
          <p className="m-0 text-gray-600 text-sm">✅ Audio enabled and ready for notifications.</p>
        </div>
      )}
      
      {audioError && (
        <div className="mt-4 p-3 bg-red-50 rounded border-l-4 border-red-500">
          <p className="m-0 text-red-600 text-sm">❌ Audio Error: {audioError}</p>
        </div>
      )}
      
      {currentAudio && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Audio Notification</h3>
          <p className="text-sm text-gray-600">Source: {currentAudio.data.bucket}/{currentAudio.data.key}</p>
          {currentAudio.data.metadata && currentAudio.data.metadata.ticker && (
            <p className="text-sm text-gray-600">Ticker: {currentAudio.data.metadata.ticker}</p>
          )}
          <audio 
            ref={audioRef}
            controls
            className="w-full mt-2"
            onEnded={handleAudioEnded}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
          
          {!isPlaying && (
            <button 
              onClick={handlePlay} 
              className="mt-2 px-4 py-2 bg-blue-500 text-white border-none rounded cursor-pointer hover:bg-blue-600"
            >
              Play Audio
            </button>
          )}
        </div>
      )}
      
      {audioQueue.length > 0 && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h4 className="text-md font-medium mb-2">Audio Queue ({audioQueue.length})</h4>
          <ul className="pl-5">
            {audioQueue.map((notification, index) => (
              <li key={`${notification.data.message_id}-${index}`}>
                {notification.data.key.split('/').pop()} 
                {notification.data.metadata?.ticker && ` - ${notification.data.metadata.ticker}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      
    </div>
  );
};

export default AudioNotificationPlayer;
