import React from 'react';
import { SpeakerIcon, StopIcon } from './Icons';

export function Controls({ onSpeak, onStop, isSpeaking, disabled }) {
  const handleClick = () => {
    if (isSpeaking) {
      onStop();
    } else {
      onSpeak();
    }
  };

  return (
    <div className="controls">
      <button 
        onClick={handleClick}
        className={`primary-button ${isSpeaking ? 'speaking' : ''}`}
        disabled={disabled}
      >
        {isSpeaking ? (
          <>
            <StopIcon />
            Stop
          </>
        ) : (
          <>
            <SpeakerIcon />
            Speak
          </>
        )}
      </button>
    </div>
  );
} 