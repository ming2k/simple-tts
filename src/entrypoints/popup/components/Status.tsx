import React from 'react';
import { SpeakerIcon } from './Icons';

export function Status({ message, isPlaying }) {
  if (!message && !isPlaying) {
    return null;
  }
  
  if (isPlaying) {
    return (
      <div className="status playing">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SpeakerIcon className="playing-icon" />
          Playing
        </div>
        <div className="sound-wave">
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
        </div>
      </div>
    );
  }
  
  return (
    <div className={`status ${message.toLowerCase().includes('error') ? 'error' : ''}`}>
      {message}
    </div>
  );
} 