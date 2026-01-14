import browser from 'webextension-polyfill';
import { Settings, defaultSettings, isSettings } from '../types/storage';

/**
 * Migrate legacy storage format to unified settings
 * Old format: { settings: {azureKey, azureRegion}, voiceSettings: {voice, rate, pitch} }
 * New format: { settings: {azureKey, azureRegion, voice, rate, pitch} }
 */
async function migrateLegacySettings(): Promise<Settings | null> {
  const result = await browser.storage.local.get(['settings', 'voiceSettings', 'languageVoiceSettings']);

  const oldSettings = result.settings || {};
  const voiceSettings = result.voiceSettings || {};
  const legacyVoice = result.languageVoiceSettings?.default || {};

  // Check if migration is needed
  if (!result.voiceSettings && !result.languageVoiceSettings) {
    return null; // No legacy data to migrate
  }

  // Merge old settings with voice settings
  const merged: Settings = {
    azureKey: oldSettings.azureKey || '',
    azureRegion: oldSettings.azureRegion || '',
    voice: voiceSettings.voice || legacyVoice.voice || defaultSettings.voice,
    rate: voiceSettings.rate ?? legacyVoice.rate ?? defaultSettings.rate,
    pitch: voiceSettings.pitch ?? legacyVoice.pitch ?? defaultSettings.pitch,
    showKey: oldSettings.showKey || false,
  };

  // Save merged settings and clean up legacy keys
  await browser.storage.local.set({ settings: merged });
  await browser.storage.local.remove(['voiceSettings', 'languageVoiceSettings']);

  console.log('[Settings] Migrated legacy settings to unified format');
  return merged;
}

/**
 * Get settings from storage with defaults
 */
export async function getSettings(): Promise<Settings> {
  try {
    const result = await browser.storage.local.get(['settings', 'voiceSettings']);

    // Check if migration is needed
    if (result.voiceSettings) {
      const migrated = await migrateLegacySettings();
      if (migrated) return migrated;
    }

    const stored = result.settings;
    if (stored && isSettings(stored)) {
      return { ...defaultSettings, ...stored };
    }

    return { ...defaultSettings };
  } catch (error) {
    console.error('[Settings] Failed to load:', error);
    return { ...defaultSettings };
  }
}

/**
 * Save settings to storage
 */
export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await browser.storage.local.set({ settings: merged });
}

/**
 * Get credentials from settings
 */
export async function getCredentials(): Promise<{ azureKey: string; azureRegion: string }> {
  const settings = await getSettings();

  if (!settings.azureKey || !settings.azureRegion) {
    throw new Error('Azure credentials not configured. Please check settings.');
  }

  return {
    azureKey: settings.azureKey,
    azureRegion: settings.azureRegion,
  };
}

/**
 * Get voice settings from settings
 */
export async function getVoiceSettings(): Promise<{ voice: string; rate: number; pitch: number }> {
  const settings = await getSettings();
  return {
    voice: settings.voice,
    rate: settings.rate,
    pitch: settings.pitch,
  };
}
