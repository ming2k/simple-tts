import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import browser from "webextension-polyfill";
import {
  SettingsContainer,
  SettingsLayout,
  SettingsContent,
} from "./components/Layout";
import { Navigation } from "./components/Navigation";
import { ApiSettings } from "./components/tabs/ApiSettings";
import { Document } from "./components/tabs/Document";
import { Sponsor } from "./components/tabs/Sponsor";
import { About } from "./components/tabs/About";
import "./settings.css";
import { SimpleTTS } from "../services/ttsService";
import { AudioSettings } from "./components/tabs/AudioSettings";
import { getSettings, saveSettings } from "../utils/settingsStorage";
import { defaultSettings } from "../types/storage";

function Settings() {
  const [activeTab, setActiveTab] = useState("api");
  const [voicesError, setVoicesError] = useState("");
  const [settings, setSettings] = useState({ ...defaultSettings });
  const [groupedVoices, setGroupedVoices] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const validTabs = ["api", "audio", "document", "sponsor", "about"];
    const initialTab = validTabs.includes(hash) ? hash : "api";

    getSettings().then(async (savedSettings) => {
      setActiveTab(initialTab);
      setSettings(savedSettings);

      if (savedSettings.azureKey && savedSettings.azureRegion) {
        await fetchVoices(savedSettings);
      }
    });
  }, []);

  const fetchVoices = async (currentSettings) => {
    try {
      const ttsService = new SimpleTTS(
        currentSettings.azureKey,
        currentSettings.azureRegion,
      );
      const voicesList = await ttsService.getVoicesList();
      setGroupedVoices(voicesList);
      setVoicesError("");
    } catch (error) {
      console.error("Failed to load voices:", error);
      setVoicesError("Failed to load voices. Please check your API settings.");
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setSettings((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveSettings(settings);

      if (activeTab === "api") {
        await fetchVoices(settings);
      }

      setTimeout(() => {
        setIsSaving(false);
      }, 1000);
    } catch (error) {
      setIsSaving(false);
      alert("Error saving settings");
      console.error(error);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
    browser.storage.local.set({ optionsActiveTab: tab });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "api":
        return (
          <ApiSettings
            settings={settings}
            onChange={handleChange}
            onSave={handleSave}
            isSaving={isSaving}
          />
        );
      case "audio":
        return (
          <AudioSettings
            settings={settings}
            groupedVoices={groupedVoices}
            onChange={handleChange}
            onSave={handleSave}
            isSaving={isSaving}
            voicesError={voicesError}
          />
        );
      case "document":
        return <Document />;
      case "sponsor":
        return <Sponsor />;
      case "about":
        return <About />;
      default:
        return null;
    }
  };

  return (
    <SettingsContainer>
      <h1>{browser.i18n.getMessage("settingsTitle")}</h1>
      <SettingsLayout>
        <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
        <SettingsContent>{renderContent()}</SettingsContent>
      </SettingsLayout>
    </SettingsContainer>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Settings />);
