import { TextProcessor } from "./textProcessor.js";
import { AudioPlayer } from "./audioPlayer.js";
import browser from "webextension-polyfill";

export class TTSService {
  constructor(azureKey, azureRegion) {
    this.azureKey = azureKey;
    this.azureRegion = azureRegion;
    this.baseUrl = azureRegion ?
      `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1` : null;
    this.textProcessor = new TextProcessor();
    this.audioPlayer = new AudioPlayer();
  }

  setCredentials(azureKey, azureRegion) {
    this.azureKey = azureKey;
    this.azureRegion = azureRegion;
    this.baseUrl = `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
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


  async synthesizeSpeech(text, settings = {}) {
    const pitchPercent = ((settings.pitch || 1) - 1) * 100;
    const ssml = this.createSSML(text, settings.voice, settings.rate || 1, pitchPercent);

    return await this.synthesizeStreaming(ssml);
  }

  async stopAudio() {
    return await this.audioPlayer.stopAudio();
  }

  getAudioFormat() {
    return {
      audioFormat: 'webm-24khz-16bit-mono-opus',
      mimeType: 'audio/webm; codecs="opus"'
    };
  }

  async synthesizeStreaming(ssml) {
    if (!this.azureKey || !this.azureRegion) {
      throw new Error("Azure credentials not configured");
    }

    const { audioFormat, mimeType } = this.getAudioFormat();

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.azureKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': audioFormat
      },
      body: ssml
    });

    if (!response.ok) {
      throw new Error(`Speech synthesis failed (${response.status}): ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Blob([arrayBuffer], { type: mimeType });
  }


  async playText(text, userSettings = {}) {
    await this.audioPlayer.stopAudio();
    const finalSettings = await this.getVoiceSettings(text, userSettings);
    return await this.playTextWithStreaming(text, finalSettings);
  }

  async playTextWithStreaming(text, settings = {}) {
    const pitchPercent = ((settings.pitch || 1) - 1) * 100;
    const ssml = this.createSSML(text, settings.voice, settings.rate || 1, pitchPercent);

    const { audioFormat, mimeType } = this.getAudioFormat();

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.azureKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': audioFormat
      },
      body: ssml
    });

    if (!response.ok) {
      throw new Error(`Speech synthesis failed (${response.status}): ${response.statusText}`);
    }

    // Create audio element and play directly
    const audio = new Audio();
    audio.playbackRate = settings.rate || 1;

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);

    audio.src = url;
    await audio.play();

    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
    });
  }

  async playTextWithTrueStreaming(text, userSettings = {}, onProgress = null) {
    await this.audioPlayer.stopAudio();
    const finalSettings = await this.getVoiceSettings(text, userSettings);

    try {
      const response = await this.createStreamingResponse(text, finalSettings);
      return await this.audioPlayer.playStreamingResponse(response, finalSettings.rate, onProgress);
    } catch (error) {
      console.error('Streaming playback failed:', error);
      throw error;
    }
  }

  async playTextSequential(text, userSettings = {}) {
    await this.audioPlayer.stopAudio();
    const finalSettings = await this.getVoiceSettings(text, userSettings);

    const segments = text.split(/\n+/).filter(segment => segment.trim().length > 0);

    if (segments.length === 0) {
      throw new Error('No text to speak');
    }

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i].trim();
      if (segment) {
        try {
          const response = await this.createStreamingResponse(segment, finalSettings);
          await this.audioPlayer.playStreamingResponse(response, finalSettings.rate);

          if (i < segments.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error(`Error playing segment ${i + 1}:`, error);
          throw new Error(`Speech synthesis failed to generate audio`);
        }
      }
    }
  }

  async getStreamingUrl(text, settings = {}) {
    const pitchPercent = ((settings.pitch || 1) - 1) * 100;
    const ssml = this.createSSML(text, settings.voice, settings.rate || 1, pitchPercent);

    const { audioFormat } = this.getAudioFormat();

    const requestBody = new URLSearchParams({
      ssml: ssml,
      format: audioFormat
    });

    const streamEndpoint = `${this.baseUrl}/stream`;
    return `${streamEndpoint}?${requestBody}`;
  }

  async createStreamingResponse(text, settings = {}) {
    if (!this.azureKey || !this.azureRegion) {
      throw new Error("Azure credentials not configured");
    }

    const pitchPercent = ((settings.pitch || 1) - 1) * 100;
    const ssml = this.createSSML(text, settings.voice, settings.rate || 1, pitchPercent);

    const { audioFormat } = this.getAudioFormat();

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.azureKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': audioFormat
        },
        body: ssml
      });

      if (!response.ok) {
        let errorDetails = response.statusText;
        try {
          const errorText = await response.text();
          if (errorText) {
            errorDetails = errorText;
          }
        } catch {
          // Ignore error parsing error response
        }

        if (response.status === 401) {
          throw new Error(`Invalid Azure API key or expired subscription`);
        } else if (response.status === 403) {
          throw new Error(`Access denied. Check your Azure subscription and region`);
        } else if (response.status === 429) {
          throw new Error(`Rate limit exceeded. Please try again later`);
        } else {
          throw new Error(`Speech synthesis failed (${response.status}): ${errorDetails}`);
        }
      }

      return response;
    } catch (error) {
      if (error.message.includes('fetch')) {
        throw new Error(`Network error: Check your internet connection`);
      }
      throw error;
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
    }

    return { settings, languageVoiceSettings };
  }

  async getVoiceSettings(text, userSettings = {}) {
    const { languageVoiceSettings } = await this.getSettings();

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
    if (!this.azureKey || !this.azureRegion) {
      throw new Error("Azure credentials not configured");
    }

    const response = await fetch(
      `https://${this.azureRegion}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": this.azureKey,
          "Content-Type": "application/json"
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
