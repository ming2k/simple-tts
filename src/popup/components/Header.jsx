import React from 'react';
import { Volume2, Settings } from 'react-feather';

export function Header({ onOptionsClick }) {
  return (
    <header className="header">
      <div className="title">
        <Volume2 size={18} />
        <span>Simple TTS</span>
      </div>
      <button 
        onClick={onOptionsClick} 
        className="settings-btn" 
        title="Settings"
        aria-label="Open Settings"
      >
        <Settings size={16} />
      </button>
    </header>
  );
} 