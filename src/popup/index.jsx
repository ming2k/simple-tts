import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';
import { TTSService } from '../services/ttsService';

function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  );
}

function Popup() {
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('');
  const [settings, setSettings] = useState({
    azureKey: '',
    azureRegion: ''
  });

  const [ttsService, setTtsService] = useState(null);
  const [audioPlayer, setAudioPlayer] = useState(null);

  useEffect(() => {
    browser.storage.local.get(['settings', 'lastInput', 'shouldAutoSpeak']).then((result) => {
      if (result.settings) {
        if (!result.settings.azureKey || !result.settings.azureRegion) {
          setStatus('Please configure Azure settings in the options page');
        }
        setSettings(result.settings);
        setTtsService(new TTSService(result.settings.azureKey, result.settings.azureRegion));
      } else {
        setStatus('Please configure Azure settings in the options page');
      }

      if (result.lastInput) {
        setText(result.lastInput);
        if (result.shouldAutoSpeak && ttsService && result.lastInput) {
          handleSpeak();
          browser.storage.local.remove('shouldAutoSpeak');
        }
      }
    });
  }, [ttsService]);

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
      
      const audioBlob = await ttsService.synthesizeSpeech(text);
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
        const audio = audioPlayer.audio;
        
        audio.onended = null;
        
        audio.addEventListener('ended', () => {
          audioPlayer.cleanup();
        }, { once: true });
      }
    };
  }, [audioPlayer]);

  const openSettings = () => {
    browser.runtime.openOptionsPage();
  };

  return (
    <div className="popup-container">
      <header className="header">
        <div className="title">
          <SpeakerIcon />
          <h2>Quick TTS</h2>
        </div>
        <button 
          onClick={openSettings} 
          className="settings-btn" 
          title="Settings"
        >
          ⚙️
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
            onClick={handleSpeak} 
            className={`speak-button ${isSpeaking ? 'speaking' : ''}`}
            disabled={isSpeaking}
          >
            <SpeakerIcon />
            {isSpeaking ? 'Speaking...' : 'Speak'}
          </button>

          {isSpeaking && (
            <button 
              onClick={handleStop}
              className="stop-button"
              title="Stop speaking"
            >
              ⏹️
            </button>
          )}
        </div>

        {status && <div className="status">{status}</div>}
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Popup />); 