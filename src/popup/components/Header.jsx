import React from 'react';
import { Volume2, Settings, Minimize2 } from 'react-feather';

export function Header({ onOptionsClick, onToggleMini }) {
  return (
    <header className="header">
      <div className="title">
        <Volume2 size={18} />
        <span>Simple TTS</span>
      </div>
      <div className="header-buttons">
        <button 
          onClick={onToggleMini}
          className="settings-btn" 
          title="Mini Mode"
          aria-label="Toggle Mini Mode"
        >
          <Minimize2 size={16} />
        </button>
        <button 
          onClick={onOptionsClick} 
          className="settings-btn" 
          title="Settings"
          aria-label="Open Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
} 