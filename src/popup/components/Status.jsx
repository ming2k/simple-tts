import React from 'react';
import { SpeakerIcon } from './Icons';

export function Status({ message, isPlaying }) {
  if (!message && !isPlaying) {
    return <div className="status-placeholder" />;
  }
  
  if (isPlaying) {
    return (
      <div className="status playing">
        <SpeakerIcon />
        Playing
      </div>
    );
  }
  
  return (
    <div className={`status ${message.toLowerCase().includes('error') ? 'error' : ''}`}>
      {message}
    </div>
  );
} 