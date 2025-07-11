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
  
  // Connect to the Audio WebSocket
  const { 
    connected, 
    reconnecting
  } = useAudioWebSocket({
    autoConnect: true,
    persistConnection: true,
    onAudioNotification: (notification) => {
      console.log('Received audio notification:', notification);
      // Add the notification to the queue
      setAudioQueue(prevQueue => [...prevQueue, notification]);
    }
  });
  
  // Handle audio playback when new notifications arrive
  useEffect(() => {
    if (audioQueue.length > 0 && !isPlaying) {
      // Play the next audio in the queue
      const nextAudio = audioQueue[0];
      setCurrentAudio(nextAudio);
      setAudioQueue(prevQueue => prevQueue.slice(1));
    }
  }, [audioQueue, isPlaying]);
  
  // Set up audio source when currentAudio changes
  useEffect(() => {
    if (currentAudio && audioRef.current) {
      audioRef.current.src = currentAudio.data.audio_url;
      
      if (autoPlay) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(error => {
            console.error('Error playing audio:', error);
            setIsPlaying(false);
            
            // If autoplay is blocked, show a notification to the user
            if (error.name === 'NotAllowedError') {
              console.warn('Autoplay was blocked. User interaction is required to play audio.');
              toast.info('Audio autoplay blocked. Click the play button to hear notifications.', {
                autoClose: 5000,
                position: 'top-right'
              });
            }
          });
      }
    }
  }, [currentAudio, autoPlay]);
  
  // Handle audio events
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentAudio(null);
  };
  
  const handlePlay = () => {
    if (audioRef.current && currentAudio) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(error => console.error('Error playing audio:', error));
    }
  };
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 my-4 max-w-2xl">
      <div className="flex items-center mb-4">
        <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        {connected ? 'Connected to Audio Service' : reconnecting ? 'Reconnecting...' : 'Disconnected'}
      </div>
      
      {connected && !currentAudio && (
        <div className="mt-4 p-3 bg-gray-50 rounded border-l-4 border-blue-500">
          <p className="m-0 text-gray-600 text-sm">💡 If audio doesn't play automatically, click the play button when notifications arrive.</p>
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
