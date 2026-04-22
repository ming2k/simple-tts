import { TTSService } from "../services/ttsService";
import { getCredentials, getVoiceSettings } from "./settingsStorage";

/**
 * Shared audio playback utilities
 */

export { getCredentials, getVoiceSettings };

/**
 * Create TTS streaming response
 */
export async function createTTSStream(
  text,
  settings,
  credentials,
  abortSignal = null,
) {
  const ttsService = new TTSService();
  ttsService.setCredentials(credentials.azureKey, credentials.azureRegion);

  if (abortSignal) {
    return await ttsService.createStreamingResponse(
      text,
      settings,
      abortSignal,
    );
  }

  return await ttsService.createStreamingResponse(text, settings);
}

/**
 * Play TTS audio with AudioService
 */
export async function playTTS(audioService, text, customSettings = null) {
  const credentials = await getCredentials();
  const settings = customSettings || (await getVoiceSettings());

  const streamingResponse = await createTTSStream(text, settings, credentials);
  await audioService.playStreamingResponse(
    streamingResponse,
    settings.rate || 1,
  );
}

/**
 * Test voice with sample text
 */
export async function testVoice(audioService, voiceSettings) {
  const testText = "Hello! This is a test of your selected voice settings.";
  await playTTS(audioService, testText, voiceSettings);
}
