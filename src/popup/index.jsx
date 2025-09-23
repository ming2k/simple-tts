import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { SimpleTTS } from "../services/index.js";
import { Header } from "./components/Header";
import { TextInput } from "./components/TextInput";
import { ControlDashboard } from "./components/ControlDashboard.jsx";
import { Status } from "./components/Status";
import { SetupNeeded } from "./components/SetupNeeded";
import browser from 'webextension-polyfill';
import "./popup.css";

function Popup() {
  const [text, setText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState("");
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [ttsInstance, setTtsInstance] = useState(null);

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
        if (ttsInstance) {
          await ttsInstance.stopAudio();
          setTtsInstance(null);
        }
        setIsSpeaking(false);
        setStatus("");
        return;
      }

      setIsSpeaking(true);
      setStatus("Generating speech...");

      const { settings } = await browser.storage.local.get("settings");

      if (!settings?.azureKey || !settings?.azureRegion) {
        throw new Error(
          "Azure credentials not configured. Please check settings.",
        );
      }

      const tts = new SimpleTTS(settings.azureKey, settings.azureRegion);
      setTtsInstance(tts);

      // Use sequential processing with line break support
      await tts.playTextSequential(text, {
        voice: settings.voice,
        rate: settings.rate,
        pitch: settings.pitch,
      });

      setStatus("");
      setIsSpeaking(false);
      setTtsInstance(null);
    } catch (error) {
      console.error("TTS error:", error);
      setStatus(`Error: ${error.message}`);
      setIsSpeaking(false);
      if (ttsInstance) {
        await ttsInstance.stopAudio();
        setTtsInstance(null);
      }
    }
  };

  const handleStop = async () => {
    try {
      if (ttsInstance) {
        await ttsInstance.stopAudio();
        setTtsInstance(null);
      }
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
