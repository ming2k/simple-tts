import { TextProcessor } from "./textProcessor.js";
import browser from "webextension-polyfill";

export class TTSService {
  constructor(azureKey, azureRegion) {
    this.azureKey = azureKey;
    this.azureRegion = azureRegion;
    this.baseUrl =
      `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
    this.tokenUrl =
      `https://${azureRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
    this.textProcessor = new TextProcessor();
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  createSSML(text, voice = "en-US-ChristopherNeural", rate = 1, pitch = 1) {
    const escapedText = this.textProcessor.escapeXmlChars(text);
    const voiceLang = voice.split("-").slice(0, 2).join("-");
    const gender = voice.includes("Neural") ? "Male" : "Female";

    return `<speak version='1.0' xml:lang='${voiceLang}'><voice xml:lang='${voiceLang}' xml:gender='${gender}' name='${voice}'>
        <prosody rate="${rate}" pitch="${pitch}%">
            ${escapedText}
        </prosody>
    </voice></speak>`.trim();
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.azureKey || !this.azureRegion) {
      throw new Error("Azure credentials not configured");
    }

    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.azureKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        throw new Error(`Token request failed (${response.status}): ${response.statusText}`);
      }

      this.accessToken = await response.text();
      this.tokenExpiry = Date.now() + (9 * 60 * 1000); // 9 minutes (buffer for 10min expiry)

      return this.accessToken;
    } catch (error) {
      console.error('Failed to get access token:', error);
      throw error;
    }
  }

  async synthesizeSingleChunk(text, settings = {}, onProgress = null) {
    const pitchPercent = ((settings.pitch || 1) - 1) * 100;
    const ssml = this.createSSML(text, settings.voice, settings.rate || 1, pitchPercent);

    return await this.synthesizeWithStreaming(ssml, onProgress);
  }

  // Keep backward compatibility
  async synthesizeWithChunkedTransfer(ssml) {
    return await this.synthesizeWithStreaming(ssml);
  }

  // Non-streaming method for cases where MP3 format is specifically needed
  async synthesizeNonStreaming(ssml) {
    return await this.synthesizeWithStreaming(ssml, null, true);
  }

  checkWebMSupport() {
    try {
      // Check if we're in a browser environment
      if (typeof document === 'undefined') {
        return false; // Node.js environment
      }

      // Create test audio element to check codec support
      const audio = document.createElement('audio');

      // Check for WebM with Opus support
      const webmOpusSupport = audio.canPlayType('audio/webm; codecs="opus"');

      // Return true if support is "probably" or "maybe"
      const isSupported = webmOpusSupport === 'probably' || webmOpusSupport === 'maybe';

      console.log(`WebM/Opus support check: ${webmOpusSupport} (${isSupported ? 'supported' : 'not supported'})`);

      return isSupported;
    } catch (error) {
      console.warn('Error checking WebM support, falling back to MP3:', error);
      return false;
    }
  }

  async synthesizeWithStreaming(ssml, onChunkReceived = null, useNonStreaming = false) {
    const accessToken = await this.getAccessToken();
    const isStreaming = !useNonStreaming; // Default to streaming unless explicitly disabled

    // Check format support and fall back to MP3 if WebM/Opus not supported
    const supportsWebM = this.checkWebMSupport();
    const audioFormat = isStreaming && supportsWebM ? 'webm-24khz-16bit-mono-opus' : 'audio-24khz-48kbitrate-mono-mp3';
    const mimeType = isStreaming && supportsWebM ? 'audio/webm' : 'audio/mpeg';

    console.log(`TTS synthesis started - Mode: ${isStreaming ? 'streaming' : 'non-streaming'}, Format: ${audioFormat}, WebM support: ${supportsWebM}`);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': audioFormat,
          'User-Agent': 'TTS-Browser-Extension'
        },
        body: ssml
      });

      if (!response.ok) {
        throw new Error(`Speech synthesis failed (${response.status}): ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      if (isStreaming && response.body) {
        console.log(`Streaming enabled - Content-Length: ${total || 'unknown'}`);
        return await this.processStreamingResponse(response, onChunkReceived, total, mimeType);
      } else {
        console.log('Non-streaming mode - buffering complete response');
        const arrayBuffer = await response.arrayBuffer();
        return new Blob([arrayBuffer], { type: mimeType });
      }
    } catch (error) {
      console.error('TTS synthesis error:', error);
      throw error;
    }
  }

  async processStreamingResponse(response, onChunkReceived, total, mimeType) {
    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log(`Streaming complete - Total bytes: ${loaded}`);
          break;
        }

        chunks.push(value);
        loaded += value.length;

        if (onChunkReceived) {
          const progress = total > 0 ? (loaded / total) * 100 : 0;
          onChunkReceived({
            progress,
            loaded,
            total,
            isStreaming: true,
            chunkSize: value.length
          });
        }
      }

      const arrayBuffer = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) {
        arrayBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      return new Blob([arrayBuffer], { type: mimeType });
    } finally {
      reader.releaseLock();
    }
  }

  async getSettings() {
    const { settings, languageVoiceSettings } = await browser.storage.local.get([
      "settings",
      "languageVoiceSettings",
    ]);

    if (settings.azureKey !== this.azureKey || settings.azureRegion !== this.azureRegion) {
      this.azureKey = settings.azureKey;
      this.azureRegion = settings.azureRegion;
      this.baseUrl = `https://${settings.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
      this.tokenUrl = `https://${settings.azureRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
      this.accessToken = null;
      this.tokenExpiry = null;
    }

    return { settings, languageVoiceSettings };
  }

  async getVoiceSettings(text, userSettings = {}) {
    const { settings, languageVoiceSettings } = await this.getSettings();

    let languageSettings;
    if (languageVoiceSettings && languageVoiceSettings['default']) {
      languageSettings = languageVoiceSettings['default'];
    } else {
      languageSettings = {
        voice: "en-US-JennyNeural",
        rate: 1,
        pitch: 1
      };
    }

    return {
      rate: 1,
      pitch: 1,
      ...languageSettings,
      ...userSettings,
    };
  }


  async getVoicesList() {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `https://${this.azureRegion}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch voices (${response.status}): ${errorText}`);
    }

    const voices = await response.json();

    const groupedVoices = voices.reduce((acc, voice) => {
      const locale = voice.Locale;
      if (!acc[locale]) {
        acc[locale] = [];
      }

      acc[locale].push({
        value: voice.ShortName,
        label: `${voice.DisplayName} (${voice.Gender})`,
        locale: voice.Locale,
        gender: voice.Gender,
        styles: voice.StyleList || [],
        isMultilingual: !!voice.SecondaryLocaleList,
      });

      return acc;
    }, {});

    return groupedVoices;
  }

}
