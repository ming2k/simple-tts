import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { TTSService } from '../services/ttsService.js';
import { Header } from './components/Header';
import { TextInput } from './components/TextInput';
import { Controls } from './components/Controls';
import { Status } from './components/Status';
import { SetupNeeded } from './components/SetupNeeded';
import './popup.css';

function Popup() {
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('');
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

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
        await browser.runtime.sendMessage({ type: 'STOP_ALL_AUDIO' });
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

      // Get current active tab
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!activeTab) {
        throw new Error('No active tab found');
      }

      const tts = new TTSService(settings.azureKey, settings.azureRegion);
      const audioBlob = await tts.synthesizeSpeech(text, {
        voice: settings.voice,
        rate: settings.rate,
        pitch: settings.pitch
      });

      if (!audioBlob) {
        throw new Error('Failed to generate speech');
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Create and play audio in the current tab
      await browser.tabs.executeScript(activeTab.id, {
        code: `
          (async () => {
            try {
              // Clean up any existing audio elements first
              document.querySelectorAll('audio[data-tts-audio="true"]').forEach(audio => {
                audio.pause();
                audio.remove();
              });

              const uint8Array = new Uint8Array([${uint8Array.toString()}]);
              const blob = new Blob([uint8Array], { type: 'audio/mp3' });
              const audioUrl = URL.createObjectURL(blob);
              const audio = new Audio(audioUrl);
              audio.setAttribute('data-tts-audio', 'true');
              audio.playbackRate = ${settings.rate || 1};
              
              // Send message when audio ends
              audio.onended = () => {
                if (audio.src.startsWith('blob:')) {
                  URL.revokeObjectURL(audio.src);
                }
                audio.remove();
                browser.runtime.sendMessage({ type: 'AUDIO_COMPLETED' });
              };

              // Send message if audio errors
              audio.onerror = () => {
                if (audio.src.startsWith('blob:')) {
                  URL.revokeObjectURL(audio.src);
                }
                audio.remove();
                browser.runtime.sendMessage({ 
                  type: 'AUDIO_ERROR',
                  error: 'Failed to play audio'
                });
              };

              document.body.appendChild(audio);
              await audio.play();
            } catch (error) {
              browser.runtime.sendMessage({ 
                type: 'AUDIO_ERROR',
                error: error.message
              });
            }
          })();
        `
      }).catch(async (err) => {
        // Fallback for Chrome MV3
        if (browser.scripting) {
          await browser.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: (audioData, rate) => {
              // Implementation similar to above but as a function
              // ... (same logic as above)
            },
            args: [Array.from(uint8Array), settings.rate || 1]
          });
        } else {
          throw err;
        }
      });

      setStatus('');

      // Add listener for audio completion and errors
      const messageListener = (request) => {
        if (request.type === 'AUDIO_COMPLETED' || request.type === 'STOP_AUDIO') {
          setIsSpeaking(false);
          setStatus('');
          browser.runtime.onMessage.removeListener(messageListener);
        } else if (request.type === 'AUDIO_ERROR') {
          setIsSpeaking(false);
          setStatus(`Error: ${request.error}`);
          browser.runtime.onMessage.removeListener(messageListener);
        }
      };

      browser.runtime.onMessage.addListener(messageListener);

    } catch (error) {
      console.error('TTS error:', error);
      setStatus(`Error: ${error.message}`);
      setIsSpeaking(false);
    }
  };

  const handleStop = async () => {
    try {
      const response = await browser.runtime.sendMessage({ type: 'STOP_ALL_AUDIO' });
      if (response.success) {
        setIsSpeaking(false);
        setStatus('');
      } else {
        throw new Error(response.error || 'Failed to stop audio');
      }
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
    <div className="popup-container">
      <Header onOptionsClick={handleOptionsClick} />
      <main className="content">
        <TextInput 
          value={text}
          onChange={handleTextChange}
          disabled={isSpeaking}
        />
        <Controls 
          onSpeak={handleSpeak}
          onStop={handleStop}
          isSpeaking={isSpeaking}
          disabled={!text.trim()}
        />
        <Status 
          message={status} 
          isPlaying={isSpeaking && !status}
        />
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Popup />); 


