import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';
import { TTSService } from '../services/ttsService.js';
import { OnboardingPopup } from '../onboarding/OnboardingPopup';

function SpeakerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="6" y="6" width="12" height="12" rx="1"/>
    </svg>
  );
}

function Popup() {
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('');
  const [ttsService, setTtsService] = useState(null);
  const [audioPlayer, setAudioPlayer] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    browser.storage.local.get(['onboardingCompleted', 'settings', 'lastInput']).then((result) => {
      setShowOnboarding(!result.onboardingCompleted);
      
      if (result.settings) {
        const { azureKey, azureRegion } = result.settings;
        if (!azureKey || !azureRegion) {
          setStatus('Please configure Azure settings in the options page');
        } else {
          setTtsService(new TTSService(azureKey, azureRegion));
        }
      } else {
        setStatus('Please configure Azure settings in the options page');
      }

      if (result.lastInput) {
        setText(result.lastInput);
      }
    });
  }, []);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    browser.storage.local.set({ lastInput: newText });
  };

  const handleSpeak = async () => {
    if (!text.trim()) {
      setStatus('Please enter text to speak');
      return;
    }

    if (!ttsService) {
      setStatus('TTS service not initialized');
      return;
    }

    try {
      setIsSpeaking(true);
      setStatus('Generating speech...');
      
      // Get current settings
      const { settings } = await browser.storage.local.get('settings');
      
      const audioBlob = await ttsService.synthesizeSpeech(text, {
        voice: settings.voice,
        rate: settings.rate,
        pitch: settings.pitch
      });

      const player = ttsService.createAudioPlayer(audioBlob);
      setAudioPlayer(player);
      
      player.audio.onended = () => {
        setIsSpeaking(false);
        setStatus('');
        player.cleanup();
        setAudioPlayer(null);
      };

      player.audio.onerror = (event) => {
        setIsSpeaking(false);
        setStatus('Error playing audio');
        player.cleanup();
        setAudioPlayer(null);
        console.error('Audio playback error:', event);
      };
      
      // Apply playback rate from settings
      player.audio.playbackRate = settings.rate || 1;
      
      setStatus('Playing...');
      await player.play();
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      setIsSpeaking(false);
      console.error('TTS error:', error);
      if (audioPlayer) {
        audioPlayer.cleanup();
        setAudioPlayer(null);
      }
    }
  };

  const handleStop = () => {
    if (audioPlayer) {
      audioPlayer.audio.pause();
      audioPlayer.audio.currentTime = 0;
      audioPlayer.cleanup();
      setAudioPlayer(null);
      setIsSpeaking(false);
      setStatus('');
    }
  };

  useEffect(() => {
    return () => {
      if (audioPlayer) {
        audioPlayer.cleanup();
      }
    };
  }, [audioPlayer]);

  const handleOptionsClick = () => {
    // Open settings page in new tab
    browser.tabs.create({ url: 'settings.html' });
    // browser.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
  };

  if (showOnboarding) {
    return <OnboardingPopup />;
  }

  return (
    <div className="popup-container">
      <header className="header">
        <div className="title">
          <SpeakerIcon />
          <h2>Quick TTS</h2>
        </div>
        <button 
          onClick={handleOptionsClick} 
          className="settings-btn" 
          title="Settings"
        >
          <SettingsIcon />
        </button>
      </header>
      
      <main className="content">
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Enter text to speak..."
          rows={4}
          className="text-input"
        />

        <div className="controls">
          <button 
            onClick={isSpeaking ? handleStop : handleSpeak}
            className={`primary-button ${isSpeaking ? 'speaking' : ''}`}
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

        {status && (
          <div className={`status ${status.toLowerCase().includes('error') ? 'error' : ''}`}>
            {status}
          </div>
        )}
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Popup />); 