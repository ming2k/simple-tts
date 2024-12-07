import React from 'react';

export function SetupNeeded({ onSetupClick }) {
  return (
    <div className="setup-needed">
      <h2>Complete Setup First</h2>
      <p>Please complete the setup process to start using Simple TTS.</p>
      <button 
        className="primary-button"
        onClick={onSetupClick}
      >
        Complete Setup
      </button>
    </div>
  );
} 