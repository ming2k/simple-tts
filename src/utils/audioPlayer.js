import browser from 'webextension-polyfill';
import { TTSService } from '../services/ttsService';
import { getVoiceSettingsWithDefaults } from './voiceSettingsStorage';

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
  const settings = await getVoiceSettingsWithDefaults();
  return {
    voice: settings.voice,
    rate: settings.rate,
    pitch: settings.pitch
  };
}

/**
 * Create TTS streaming response
 * @param {string} text - Text to convert to speech
 * @param {object} settings - Voice settings {voice, rate, pitch}
 * @param {object} credentials - Azure credentials {azureKey, azureRegion}
 * @param {AbortSignal} [abortSignal] - Optional signal to cancel the request
 * @returns {Promise<Response>} Streaming audio response
 */
export async function createTTSStream(text, settings, credentials, abortSignal = null) {
  const ttsService = new TTSService();
  ttsService.setCredentials(credentials.azureKey, credentials.azureRegion);

  if (abortSignal) {
    return await ttsService.createStreamingResponse(text, settings, abortSignal);
  }

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
