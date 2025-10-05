import browser from 'webextension-polyfill';
import { TTSService } from '../services/ttsService';

/**
 * Shared audio playback utilities
 * Centralizes common TTS playback logic used across:
 * - Popup window
 * - Audio settings test
 * - Content script (tts-mini-window)
 */

/**
 * Get TTS credentials from storage
 * @returns {Promise<{azureKey: string, azureRegion: string}>}
 * @throws {Error} if credentials are not configured
 */
export async function getCredentials() {
  const { settings } = await browser.storage.local.get(['settings']);

  if (!settings?.azureKey || !settings?.azureRegion) {
    throw new Error('Azure credentials not configured. Please check settings.');
  }

  return {
    azureKey: settings.azureKey,
    azureRegion: settings.azureRegion
  };
}

/**
 * Get voice settings from storage
 * @returns {Promise<{voice: string, rate: number, pitch: number}>}
 */
export async function getVoiceSettings() {
  const { settings, languageVoiceSettings } = await browser.storage.local.get([
    'settings',
    'languageVoiceSettings'
  ]);

  const voiceSettings = languageVoiceSettings?.default || {};

  return {
    voice: settings?.voice || voiceSettings.voice || 'en-US-JennyNeural',
    rate: settings?.rate || voiceSettings.rate || 1,
    pitch: settings?.pitch || voiceSettings.pitch || 1
  };
}

/**
 * Create TTS streaming response
 * @param {string} text - Text to convert to speech
 * @param {object} settings - Voice settings {voice, rate, pitch}
 * @param {object} credentials - Azure credentials {azureKey, azureRegion}
 * @returns {Promise<Response>} Streaming audio response
 */
export async function createTTSStream(text, settings, credentials) {
  const ttsService = new TTSService();
  ttsService.setCredentials(credentials.azureKey, credentials.azureRegion);

  return await ttsService.createStreamingResponse(text, settings);
}

/**
 * Play TTS audio with AudioService
 * @param {AudioService} audioService - The audio service instance
 * @param {string} text - Text to speak
 * @param {object} customSettings - Optional custom voice settings
 * @returns {Promise<void>}
 */
export async function playTTS(audioService, text, customSettings = null) {
  const credentials = await getCredentials();
  const settings = customSettings || await getVoiceSettings();

  const streamingResponse = await createTTSStream(text, settings, credentials);
  await audioService.playStreamingResponse(streamingResponse, settings.rate || 1);
}

/**
 * Test voice with sample text
 * @param {AudioService} audioService - The audio service instance
 * @param {object} voiceSettings - Voice settings to test {voice, rate, pitch}
 * @returns {Promise<void>}
 */
export async function testVoice(audioService, voiceSettings) {
  const testText = 'Hello! This is a test of your selected voice settings.';
  await playTTS(audioService, testText, voiceSettings);
}
