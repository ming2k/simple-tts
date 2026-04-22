import React from 'react';
import { Volume2, Square } from 'react-feather';

export function ControlDashboard({ onSpeak, onStop, isSpeaking, disabled }) {
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
            <Square size={16} />
            <span>Stop</span>
          </>
        ) : (
          <>
            <Volume2 size={16} />
            <span>Speak</span>
          </>
        )}
      </button>
    </div>
  );
} 