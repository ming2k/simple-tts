import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { TTSService } from '../services/ttsService.js';
import { Header } from './components/Header';
import { TextInput } from './components/TextInput';
import { ControlDashboard } from './components/ControlDashboard.jsx';
import { Status } from './components/Status';
import { SetupNeeded } from './components/SetupNeeded';
import './popup.css';

function Popup() {
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('');
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState(null);

  useEffect(() => {
    browser.storage.local.get(['onboardingCompleted', 'lastInput']).then((result) => {
      setOnboardingCompleted(result.onboardingCompleted || false);
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

    try {
      if (isSpeaking) {
        if (audioPlayer) {
          await audioPlayer.cleanup();
          setAudioPlayer(null);
        }
        setIsSpeaking(false);
        setStatus('');
        return;
      }

      setIsSpeaking(true);
      setStatus('Generating speech...');
      
      const { settings } = await browser.storage.local.get('settings');
      
      if (!settings?.azureKey || !settings?.azureRegion) {
        throw new Error('Azure credentials not configured. Please check settings.');
      }

      const tts = new TTSService(settings.azureKey, settings.azureRegion);
      const audioBlobs = await tts.synthesizeSpeech(text, {
        voice: settings.voice,
        rate: settings.rate,
        pitch: settings.pitch
      });

      if (!audioBlobs || !audioBlobs.length) {
        throw new Error('Failed to generate speech');
      }

      // Combine all blobs into one
      const combinedBlob = new Blob(audioBlobs, { type: 'audio/mp3' });

      // Create audio player
      const player = tts.createAudioPlayer(combinedBlob);
      setAudioPlayer(player);

      // Play the audio
      await player.play();
      setStatus('');

      // Add ended event listener
      player.onEnded = () => {
        setIsSpeaking(false);
        setStatus('');
        setAudioPlayer(null);
      };

    } catch (error) {
      console.error('TTS error:', error);
      setStatus(`Error: ${error.message}`);
      setIsSpeaking(false);
      if (audioPlayer) {
        await audioPlayer.cleanup();
        setAudioPlayer(null);
      }
    }
  };

  const handleStop = async () => {
    try {
      if (audioPlayer) {
        await audioPlayer.cleanup();
        setAudioPlayer(null);
      }
      setIsSpeaking(false);
      setStatus('');
    } catch (error) {
      console.error('Error stopping audio:', error);
      setStatus('Error stopping audio');
    }
  };

  const handleOptionsClick = () => {
    browser.tabs.create({ url: 'settings.html' });
  };

  const handleSetupClick = () => {
    browser.tabs.create({ url: browser.runtime.getURL('onboarding.html') });
  };

  if (!onboardingCompleted) {
    return (
      <div className="popup-container">
        <Header onOptionsClick={handleOptionsClick} />
        <SetupNeeded onSetupClick={handleSetupClick} />
      </div>
    );
  }

  return (
    <div className={`popup-container ${(status || isSpeaking) ? 'has-status' : ''}`}>
      <Header onOptionsClick={handleOptionsClick} />
      <main className={`content ${(status || isSpeaking) ? 'has-status' : ''}`}>
        <div className="input-section">
          <TextInput 
            value={text}
            onChange={handleTextChange}
            disabled={isSpeaking}
          />
          <div className="control-row">
            <ControlDashboard 
              onSpeak={handleSpeak}
              onStop={handleStop}
              isSpeaking={isSpeaking}
              disabled={!text.trim()}
            />
            {(status || isSpeaking) && (
              <Status 
                message={status} 
                isPlaying={isSpeaking && !status}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Popup />); 


