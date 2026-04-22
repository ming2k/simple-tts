import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Header } from './components/Header';
import { TextInput } from './components/TextInput';
import { Controls } from './components/Controls';
import { Status } from './components/Status';
import { SetupNeeded } from './components/SetupNeeded';
import { getAzureCredentials } from '../../utils/azureConfig';
import { useSettings } from '../../hooks/useSettings';
import './style.css';

function Popup() {
  const { settings, updateSettings, loading } = useSettings();
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    browser.storage.local.get(['lastInput']).then((result) => {
      if (result.lastInput) {
        setText(result.lastInput);
      }
    });
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) {
        throw new Error('No active tab found');
      }

      if (isSpeaking) {
        await browser.tabs.sendMessage(activeTab.id, { type: 'STOP_AUDIO' });
        setIsSpeaking(false);
        setStatus('');
        return;
      }

      setIsSpeaking(true);
      setStatus('Generating speech...');
      
      const credentials = await getAzureCredentials(settings);
      
      if (!credentials?.azureKey || !credentials?.azureRegion) {
        throw new Error('Azure credentials not configured. Please check settings.');
      }

      const response = await browser.tabs.sendMessage(activeTab.id, {
        type: 'PLAY_STREAMING_TTS',
        text: text,
        settings: {
          voice: settings.voice,
          rate: settings.rate,
          pitch: settings.pitch
        },
        credentials
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to communicate with the page. Try refreshing the tab.');
      }

      if (response.requiresUserInteraction) {
        setStatus('Please click on the page first to allow audio playback.');
        setIsSpeaking(false);
      } else {
        setStatus('');
      }
    } catch (error: any) {
      console.error('TTS error:', error);
      setStatus(`Error: ${error.message}`);
      setIsSpeaking(false);
    }
  };

  const handleStop = async () => {
    try {
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        await browser.tabs.sendMessage(activeTab.id, { type: 'STOP_AUDIO' });
      }
      setIsSpeaking(false);
      setStatus('');
    } catch (error) {
      console.error('Error stopping audio:', error);
      setStatus('Error stopping audio');
    }
  };

  const handleOptionsClick = () => {
    browser.runtime.openOptionsPage();
  };

  const handleSetupClick = () => {
    browser.tabs.create({ url: browser.runtime.getURL('/onboarding.html') });
  };

  if (loading) return null;

  if (!settings.onboardingCompleted) {
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

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<Popup />); 
}
