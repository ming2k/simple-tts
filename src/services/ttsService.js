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

  async synthesizeWithStreaming(ssml, onChunkReceived = null) {
    const accessToken = await this.getAccessToken();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', this.baseUrl, true);

      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.setRequestHeader('Content-Type', 'application/ssml+xml');
      xhr.setRequestHeader('X-Microsoft-OutputFormat', 'audio-24khz-48kbitrate-mono-mp3');
      xhr.setRequestHeader('User-Agent', 'TTS-Browser-Extension');

      xhr.responseType = 'arraybuffer';

      // Enable streaming by monitoring progress
      let lastProcessedBytes = 0;
      const chunks = [];

      xhr.onprogress = function(e) {
        if (e.lengthComputable && onChunkReceived) {
          const currentBytes = e.loaded;
          if (currentBytes > lastProcessedBytes) {
            // Calculate progress percentage
            const progress = (currentBytes / e.total) * 100;
            onChunkReceived({ progress, loaded: currentBytes, total: e.total });
            lastProcessedBytes = currentBytes;
          }
        }
      };

      xhr.onload = function() {
        if (xhr.status === 200) {
          const blob = new Blob([xhr.response], { type: 'audio/mpeg' });
          resolve(blob);
        } else {
          reject(new Error(`Speech synthesis failed (${xhr.status}): ${xhr.statusText}`));
        }
      };

      xhr.onerror = function() {
        reject(new Error('Network error during speech synthesis'));
      };

      xhr.send(ssml);
    });
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
