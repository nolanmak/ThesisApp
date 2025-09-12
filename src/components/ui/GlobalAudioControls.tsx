import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Volume2, VolumeX, Loader, SkipForward, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { useGlobalAudio } from '../../contexts/GlobalAudioContext';
import { useAuth } from '../../contexts/AuthContext';

interface GlobalAudioControlsProps {
  className?: string;
  showAdvancedControls?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const GlobalAudioControls: React.FC<GlobalAudioControlsProps> = ({
  className = '',
  showAdvancedControls = false,
  size = 'md'
}) => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Check if we're in an authenticated area
  const isInAuthenticatedArea = location.pathname.startsWith('/dashboard') && user;
  
  // Don't render controls if not in authenticated area
  if (!isInAuthenticatedArea) {
    return null;
  }

  const {
    audioEnabled,
    audioConnected,
    audioReconnecting,
    isPlaying,
    audioLoading,
    audioQueue,
    currentAudio,
    enableAudio,
    disableAudio,
    setUserInteraction,
    clearQueue,
    skipCurrentAudio
  } = useGlobalAudio();

  const [isToggling, setIsToggling] = useState(false);

  const handleToggleAudio = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isToggling) {
      return;
    }
    
    setIsToggling(true);
    
    try {
      if (audioEnabled) {
        console.log('[GLOBAL AUDIO CONTROLS] 🛑 Disabling audio');
        await disableAudio();
      } else {
        console.log('[GLOBAL AUDIO CONTROLS] 🔊 Enabling audio');
        await enableAudio();
        setUserInteraction();
      }
    } catch (error) {
      console.error('[GLOBAL AUDIO CONTROLS] Error toggling audio:', error);
    } finally {
      // Reset toggle state after a brief delay to show the loading state
      setTimeout(() => setIsToggling(false), 500);
    }
  };

  const handleSkipCurrent = () => {
    skipCurrentAudio();
  };

  const handleClearQueue = () => {
    clearQueue();
  };

  // Size configurations
  const sizeConfig = {
    sm: { button: 'w-5 h-5', icon: 12 },
    md: { button: 'w-6 h-6', icon: 14 },
    lg: { button: 'w-8 h-8', icon: 16 }
  };

  const config = sizeConfig[size];

  const getButtonStyle = () => {
    if (isToggling) {
      return 'cursor-wait bg-amber-500 text-white'; // Loading state
    }
    
    if (!audioEnabled) {
      return 'bg-neutral-200 text-neutral-500 hover:bg-neutral-300';
    }
    
    if (!audioConnected) {
      if (audioReconnecting) {
        return 'bg-amber-500 text-white hover:bg-amber-600';
      }
      return 'bg-neutral-300 text-white hover:bg-neutral-400';
    }
    
    // Connected and enabled
    if (isPlaying) {
      return 'bg-green-500 text-white hover:bg-green-600 animate-pulse'; // Playing state
    }
    
    return 'bg-blue-500 text-white hover:bg-blue-600';
  };

  const getTooltip = () => {
    if (isToggling) {
      return 'Connecting...';
    }
    
    if (!audioEnabled) {
      return 'Enable audio notifications';
    }
    
    if (isPlaying) {
      return 'Stop current audio and disable notifications';
    }
    
    return 'Disable audio notifications';
  };

  const getIcon = () => {
    if (isToggling) {
      return <Loader size={config.icon} className="animate-spin" />;
    }
    
    if (!audioEnabled) {
      return <VolumeX size={config.icon} />;
    }
    
    if (!audioConnected) {
      if (audioReconnecting) {
        return <Loader size={config.icon} className="animate-spin" />;
      }
      return <VolumeX size={config.icon} />;
    }
    
    // Connected and enabled
    if (isPlaying) {
      return <Volume2 size={config.icon} className="animate-bounce" />; // Bouncing icon when playing
    }
    
    return <Volume2 size={config.icon} />;
  };

  const getCurrentAudioInfo = () => {
    if (!currentAudio) return null;
    
    const ticker = currentAudio.data?.metadata?.ticker || 
                   currentAudio.data?.metadata?.company_name || 
                   'Unknown Stock';
    return ticker;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Main audio toggle button */}
      <button
        type="button"
        onClick={handleToggleAudio}
        disabled={isToggling}
        className={`flex items-center justify-center rounded-full ${config.button} transition-colors duration-150 ease-in-out ${getButtonStyle()}`}
        title={getTooltip()}
      >
        {getIcon()}
      </button>

      {/* Advanced controls */}
      {showAdvancedControls && audioEnabled && (
        <>
          {/* Current playing info */}
          {(isPlaying || audioLoading) && (
            <div className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
              {audioLoading ? (
                <span>Loading...</span>
              ) : (
                <span>Playing: {getCurrentAudioInfo()}</span>
              )}
            </div>
          )}

          {/* Skip current button */}
          {(isPlaying || audioLoading) && (
            <button
              onClick={handleSkipCurrent}
              className={`flex items-center justify-center rounded-full ${config.button} bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors duration-150 ease-in-out`}
              title="Skip current audio"
            >
              <SkipForward size={config.icon} />
            </button>
          )}

          {/* Clear queue button */}
          {audioQueue.length > 0 && (
            <button
              onClick={handleClearQueue}
              className={`flex items-center justify-center rounded-full ${config.button} bg-red-200 text-red-600 hover:bg-red-300 transition-colors duration-150 ease-in-out`}
              title={`Clear queue (${audioQueue.length} items)`}
            >
              <Trash2 size={config.icon} />
            </button>
          )}

          {/* Queue status */}
          {audioQueue.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
              <span>{audioQueue.length} queued</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GlobalAudioControls;