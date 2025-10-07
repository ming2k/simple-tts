import browser from 'webextension-polyfill';
import {
  VoiceSettings,
  defaultVoiceSettings,
  isVoiceSettings,
  isLanguageVoiceSettings
} from '../types/storage';

async function migrateLegacyVoiceSettings(legacy: unknown): Promise<VoiceSettings | undefined> {
  if (!legacy || typeof legacy !== 'object') {
    return undefined;
  }

  if (!isLanguageVoiceSettings(legacy)) {
    return undefined;
  }

  const legacyDefault = (legacy as Record<string, VoiceSettings>)['default'];
  if (legacyDefault && isVoiceSettings(legacyDefault)) {
    await browser.storage.local.set({ voiceSettings: legacyDefault });
    await browser.storage.local.remove('languageVoiceSettings');
    return legacyDefault;
  }

  return undefined;
}

async function readStoredVoiceSettings(): Promise<VoiceSettings | undefined> {
  const result = await browser.storage.local.get(['voiceSettings', 'languageVoiceSettings']);

  const stored = result.voiceSettings;
  if (stored && isVoiceSettings(stored)) {
    return stored;
  }

  return migrateLegacyVoiceSettings(result.languageVoiceSettings);
}

export async function getStoredVoiceSettings(): Promise<VoiceSettings | undefined> {
  try {
    return await readStoredVoiceSettings();
  } catch (error) {
    console.error('Failed to load voice settings:', error);
    return undefined;
  }
}

export async function getVoiceSettingsWithDefaults(): Promise<VoiceSettings> {
  const stored = await getStoredVoiceSettings();
  return {
    ...defaultVoiceSettings,
    ...stored,
  };
}

export async function saveVoiceSettings(settings: VoiceSettings): Promise<void> {
  if (!isVoiceSettings(settings)) {
    throw new Error('Invalid voice settings format');
  }

  const merged = {
    ...defaultVoiceSettings,
    ...settings,
  };

  await browser.storage.local.set({ voiceSettings: merged });
  await browser.storage.local.remove('languageVoiceSettings');
}
