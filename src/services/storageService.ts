import browser from 'webextension-polyfill';
import {
  StorageService,
  BrowserStorageData,
  TTSSettings,
  VoiceSettings,
  TTSWindowPosition,
  defaultTTSSettings,
  defaultVoiceSettings,
  isTTSSettings,
  isVoiceSettings,
  isLanguageVoiceSettings
} from '../types/storage';

/**
 * Service for managing browser.storage.local and localStorage data
 * Provides type-safe access to all storage operations
 */
export class BrowserStorageService implements StorageService {
  // Browser storage methods

  async getSettings(): Promise<TTSSettings | undefined> {
    try {
      const result = await browser.storage.local.get(['settings']);
      const settings = result.settings;

      if (settings && isTTSSettings(settings)) {
        return settings;
      }

      return undefined;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return undefined;
    }
  }

  async setSettings(settings: TTSSettings): Promise<void> {
    try {
      if (!isTTSSettings(settings)) {
        throw new Error('Invalid settings format');
      }
      await browser.storage.local.set({ settings });
    } catch (error) {
      console.error('Failed to set settings:', error);
      throw error;
    }
  }

  async getVoiceSettings(): Promise<VoiceSettings | undefined> {
    try {
      const result = await browser.storage.local.get(['voiceSettings', 'languageVoiceSettings']);
      const settings = result.voiceSettings;

      if (settings && isVoiceSettings(settings)) {
        return settings;
      }

      const legacy = result.languageVoiceSettings;
      if (legacy && isLanguageVoiceSettings(legacy) && legacy.default && isVoiceSettings(legacy.default)) {
        const migrated = legacy.default;
        await browser.storage.local.set({ voiceSettings: migrated });
        await browser.storage.local.remove('languageVoiceSettings');
        return migrated;
      }

      return undefined;
    } catch (error) {
      console.error('Failed to get voice settings:', error);
      return undefined;
    }
  }

  async setVoiceSettings(settings: VoiceSettings): Promise<void> {
    try {
      if (!isVoiceSettings(settings)) {
        throw new Error('Invalid voice settings format');
      }
      await browser.storage.local.set({ voiceSettings: settings });
      await browser.storage.local.remove('languageVoiceSettings');
    } catch (error) {
      console.error('Failed to set voice settings:', error);
      throw error;
    }
  }

  async getOnboardingCompleted(): Promise<boolean> {
    try {
      const result = await browser.storage.local.get(['onboardingCompleted']);
      return Boolean(result.onboardingCompleted);
    } catch (error) {
      console.error('Failed to get onboarding status:', error);
      return false;
    }
  }

  async setOnboardingCompleted(completed: boolean): Promise<void> {
    try {
      await browser.storage.local.set({ onboardingCompleted: completed });
    } catch (error) {
      console.error('Failed to set onboarding status:', error);
      throw error;
    }
  }

  async getLastInput(): Promise<string | undefined> {
    try {
      const result = await browser.storage.local.get(['lastInput']);
      return typeof result.lastInput === 'string' ? result.lastInput : undefined;
    } catch (error) {
      console.error('Failed to get last input:', error);
      return undefined;
    }
  }

  async setLastInput(input: string): Promise<void> {
    try {
      await browser.storage.local.set({ lastInput: input });
    } catch (error) {
      console.error('Failed to set last input:', error);
      throw error;
    }
  }

  async getOptionsActiveTab(): Promise<string | undefined> {
    try {
      const result = await browser.storage.local.get(['optionsActiveTab']);
      return typeof result.optionsActiveTab === 'string' ? result.optionsActiveTab : undefined;
    } catch (error) {
      console.error('Failed to get options active tab:', error);
      return undefined;
    }
  }

  async setOptionsActiveTab(tab: string): Promise<void> {
    try {
      await browser.storage.local.set({ optionsActiveTab: tab });
    } catch (error) {
      console.error('Failed to set options active tab:', error);
      throw error;
    }
  }

  // LocalStorage methods (for content script data)

  getTTSWindowPosition(): TTSWindowPosition | null {
    try {
      const saved = localStorage.getItem('tts-window-position');
      if (saved) {
        const position = JSON.parse(saved) as TTSWindowPosition;
        return position;
      }
      return null;
    } catch (error) {
      console.error('Failed to get TTS window position:', error);
      return null;
    }
  }

  setTTSWindowPosition(position: TTSWindowPosition): void {
    try {
      localStorage.setItem('tts-window-position', JSON.stringify(position));
    } catch (error) {
      console.error('Failed to set TTS window position:', error);
    }
  }

  getTTSDebug(): string | null {
    try {
      return localStorage.getItem('tts-debug');
    } catch (error) {
      console.error('Failed to get TTS debug setting:', error);
      return null;
    }
  }

  setTTSDebug(debug: string): void {
    try {
      localStorage.setItem('tts-debug', debug);
    } catch (error) {
      console.error('Failed to set TTS debug setting:', error);
    }
  }

  // Generic methods for batch operations

  async getBrowserStorageData(keys: (keyof BrowserStorageData)[]): Promise<Partial<BrowserStorageData>> {
    try {
      const result = await browser.storage.local.get(keys);
      return result as Partial<BrowserStorageData>;
    } catch (error) {
      console.error('Failed to get browser storage data:', error);
      return {};
    }
  }

  async setBrowserStorageData(data: Partial<BrowserStorageData>): Promise<void> {
    try {
      await browser.storage.local.set(data);
    } catch (error) {
      console.error('Failed to set browser storage data:', error);
      throw error;
    }
  }

  // Helper methods for getting settings with defaults

  async getSettingsWithDefaults(): Promise<TTSSettings> {
    const settings = await this.getSettings();
    return { ...defaultTTSSettings, ...settings };
  }

  async getVoiceSettingsWithDefaults(): Promise<VoiceSettings> {
    const settings = await this.getVoiceSettings();
    return { ...defaultVoiceSettings, ...settings };
  }

  // Utility method to clear all storage (useful for testing/debugging)
  async clearAllBrowserStorage(): Promise<void> {
    try {
      await browser.storage.local.clear();
    } catch (error) {
      console.error('Failed to clear browser storage:', error);
      throw error;
    }
  }

  clearAllLocalStorage(): void {
    try {
      localStorage.removeItem('tts-window-position');
      localStorage.removeItem('tts-debug');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }

  // Azure credentials helper
  async getAzureCredentials(settings: TTSSettings | null = null): Promise<{azureKey: string, azureRegion: string}> {
    // First try from passed settings object
    if (settings?.azureKey && settings?.azureRegion) {
      return {
        azureKey: settings.azureKey,
        azureRegion: settings.azureRegion,
      };
    }

    // Then try from browser storage
    try {
      const storageSettings = await this.getSettings();
      if (storageSettings?.azureKey && storageSettings?.azureRegion) {
        return {
          azureKey: storageSettings.azureKey,
          azureRegion: storageSettings.azureRegion,
        };
      }
    } catch (error) {
      console.warn('Failed to get credentials from browser storage:', error);
    }

    // Finally fallback to environment variables
    return {
      azureKey: process.env.AZURE_SPEECH_KEY || '',
      azureRegion: process.env.AZURE_REGION || '',
    };
  }

  // Migration helper for upgrading storage format
  async migrateStorage(): Promise<void> {
    try {
      const allData = await this.getBrowserStorageData([
        'settings',
        'voiceSettings',
        'onboardingCompleted',
        'optionsActiveTab',
        'lastInput'
      ]);

      // Perform any necessary migrations here
      // For example, if we change the structure of settings:
      if (allData.settings) {
        // Ensure all required fields exist with defaults
        const migratedSettings: TTSSettings = {
          ...defaultTTSSettings,
          ...allData.settings
        };
        await this.setSettings(migratedSettings);
      }

      const voiceSettings = await this.getVoiceSettings();
      if (!voiceSettings) {
        await this.setVoiceSettings(defaultVoiceSettings);
      }

      console.log('Storage migration completed');
    } catch (error) {
      console.error('Failed to migrate storage:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const storageService = new BrowserStorageService();
