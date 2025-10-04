import { VoiceSettings, GroupedVoices, LanguageVoiceSettings } from "../types/storage.ts";
import browser from "webextension-polyfill";

export class TTSService {
  private azureKey: string;
  private azureRegion: string;
  private baseUrl: string | null;

  constructor(azureKey?: string, azureRegion?: string) {
    this.azureKey = azureKey || '';
    this.azureRegion = azureRegion || '';
    this.baseUrl = azureRegion ?
      `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1` : null;
  }

  setCredentials(azureKey: string, azureRegion: string): void {
    this.azureKey = azureKey;
    this.azureRegion = azureRegion;
    this.baseUrl = `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
  }

  private escapeXmlChars(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  createSSML(text: string, voice: string = "en-US-ChristopherNeural", rate: number = 1, pitch: number = 1): string {
    const escapedText = this.escapeXmlChars(text);
    const voiceLang = voice.split("-").slice(0, 2).join("-");
    const gender = voice.includes("Neural") ? "Male" : "Female";

    return `<speak version='1.0' xml:lang='${voiceLang}'><voice xml:lang='${voiceLang}' xml:gender='${gender}' name='${voice}'>
        <prosody rate="${rate}" pitch="${pitch}%">
            ${escapedText}
        </prosody>
    </voice></speak>`.trim();
  }

  async createStreamingResponse(text, settings = {}) {
    if (!this.azureKey || !this.azureRegion) {
      throw new Error("Azure credentials not configured");
    }

    const pitchPercent = ((settings.pitch || 1) - 1) * 100;
    const ssml = this.createSSML(text, settings.voice, settings.rate || 1, pitchPercent);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.azureKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'webm-24khz-16bit-mono-opus',
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
