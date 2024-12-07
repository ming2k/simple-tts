import React from 'react';
import { SpeakerIcon } from './Icons';
import { SettingsIcon } from './Icons';

export function Header({ onOptionsClick }) {
  return (
    <header className="header">
      <div className="title">
        <SpeakerIcon />
        <h2>Simple TTS</h2>
      </div>
      <button 
        onClick={onOptionsClick} 
        className="settings-btn" 
        title="Settings"
        style={{ marginLeft: '8px' }}
      >
        <SettingsIcon />
      </button>
    </header>
  );
} 