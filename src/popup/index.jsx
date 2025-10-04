import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { TTSService } from "../services/ttsService";
import { AudioService } from "../services/audioService";
import { Header } from "./components/Header";
import { TextInput } from "./components/TextInput";
import { ControlDashboard } from "./components/ControlDashboard.jsx";
import { Status } from "./components/Status";
import { SetupNeeded } from "./components/SetupNeeded";
import browser from 'webextension-polyfill';
import "./popup.css";

console.log("[Simple TTS] Popup loaded/reloaded");

function Popup() {
  const [text, setText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState("");
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [audioService] = useState(() => new AudioService());

  useEffect(() => {
    browser.storage.local
      .get(["onboardingCompleted", "lastInput"])
      .then((result) => {
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
      setStatus("Please enter text to speak");
      return;
    }

    try {
      if (isSpeaking) {
        await audioService.stopAudio();
        setIsSpeaking(false);
        setStatus("");
        return;
      }

      setIsSpeaking(true);
      setStatus("Generating speech...");

      const { settings, languageVoiceSettings } = await browser.storage.local.get([
        "settings",
        "languageVoiceSettings"
      ]);

      if (!settings?.azureKey || !settings?.azureRegion) {
        throw new Error(
          "Azure credentials not configured. Please check settings.",
        );
      }

      const ttsService = new TTSService();
      ttsService.setCredentials(settings.azureKey, settings.azureRegion);

      const voiceSettings = languageVoiceSettings?.default || {};
      const finalSettings = {
        voice: settings.voice || voiceSettings.voice || "en-US-JennyNeural",
        rate: settings.rate || voiceSettings.rate || 1,
        pitch: settings.pitch || voiceSettings.pitch || 1,
      };

      // Split text by newlines for sequential playback
      const segments = text.split(/\n+/).filter(segment => segment.trim().length > 0);

      if (segments.length === 0) {
        throw new Error('No text to speak');
      }

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i].trim();
        if (segment) {
          const streamingResponse = await ttsService.createStreamingResponse(
            segment,
            finalSettings
          );

          await audioService.playStreamingResponse(
            streamingResponse,
            finalSettings.rate || 1
          );

          if (i < segments.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }

      setStatus("");
      setIsSpeaking(false);
    } catch (error) {
      console.error("TTS error:", error);
      setStatus(`Error: ${error.message}`);
      setIsSpeaking(false);
      await audioService.stopAudio();
    }
  };

  const handleStop = async () => {
    try {
      await audioService.stopAudio();
      setIsSpeaking(false);
      setStatus("");
    } catch (error) {
      console.error("Error stopping audio:", error);
      setStatus("Error stopping audio");
    }
  };

  const handleOptionsClick = () => {
    browser.tabs.create({ url: "settings.html" });
  };

  const handleSetupClick = () => {
    browser.tabs.create({ url: browser.runtime.getURL("onboarding.html") });
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
    <div
      className={`popup-container ${status || isSpeaking ? "has-status" : ""}`}
    >
      <Header onOptionsClick={handleOptionsClick} />
      <main className={`content ${status || isSpeaking ? "has-status" : ""}`}>
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
              <Status message={status} isPlaying={isSpeaking && !status} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Popup />);
