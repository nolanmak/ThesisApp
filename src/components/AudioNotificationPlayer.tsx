import React, { useEffect, useRef, useState } from 'react';
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
    reconnecting, 
    lastNotification 
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
    <div className="audio-notification-player">
      <div className="connection-status">
        <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`} />
        {connected ? 'Connected to Audio Service' : reconnecting ? 'Reconnecting...' : 'Disconnected'}
      </div>
      
      {currentAudio && (
        <div className="audio-player">
          <h3>Audio Notification</h3>
          <p>Source: {currentAudio.data.bucket}/{currentAudio.data.key}</p>
          {currentAudio.data.metadata && currentAudio.data.metadata.ticker && (
            <p>Ticker: {currentAudio.data.metadata.ticker}</p>
          )}
          <audio 
            ref={audioRef}
            controls
            onEnded={handleAudioEnded}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
          
          {!isPlaying && (
            <button onClick={handlePlay} className="play-button">
              Play Audio
            </button>
          )}
        </div>
      )}
      
      {audioQueue.length > 0 && (
        <div className="audio-queue">
          <h4>Audio Queue ({audioQueue.length})</h4>
          <ul>
            {audioQueue.map((notification, index) => (
              <li key={`${notification.data.message_id}-${index}`}>
                {notification.data.key.split('/').pop()} 
                {notification.data.metadata?.ticker && ` - ${notification.data.metadata.ticker}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <style jsx>{`
        .audio-notification-player {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          max-width: 600px;
        }
        
        .connection-status {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .status-indicator {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 8px;
        }
        
        .connected {
          background-color: #4caf50;
        }
        
        .disconnected {
          background-color: #f44336;
        }
        
        .audio-player {
          margin-top: 16px;
        }
        
        .play-button {
          margin-top: 8px;
          padding: 8px 16px;
          background-color: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .play-button:hover {
          background-color: #0b7dda;
        }
        
        .audio-queue {
          margin-top: 16px;
          border-top: 1px solid #e0e0e0;
          padding-top: 16px;
        }
        
        .audio-queue ul {
          padding-left: 20px;
        }
        
        audio {
          width: 100%;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
};

export default AudioNotificationPlayer;
