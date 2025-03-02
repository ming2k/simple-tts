import React from 'react';
import { Volume2 } from 'react-feather';

export function Status({ message, isPlaying }) {
  if (!message && !isPlaying) {
    return null;
  }
  
  if (isPlaying) {
    return (
      <div className="status playing">
        <Volume2 size={16} />
        <span>Playing</span>
      </div>
    );
  }
  
  return (
    <div className={`status ${message.toLowerCase().includes('error') ? 'error' : ''}`}>
      <span>{message}</span>
    </div>
  );
} 