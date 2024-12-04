export class TTSService {
  constructor(azureKey, azureRegion) {
    this.azureKey = azureKey;
    this.azureRegion = azureRegion;
    this.baseUrl = `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
  }

  createSSML(text, voice = 'en-US-AvaMultilingualNeural', rate = 1, pitch = 1) {
    const escapedText = this.escapeXmlChars(text);
    const lang = voice.split('-').slice(0, 2).join('-');
    
    return `<speak version='1.0' xml:lang='${lang}'>
    <voice xml:lang='${lang}' name='${voice}'>
        <prosody rate="${rate}" pitch="${pitch}%">
            ${escapedText}
        </prosody>
    </voice>
</speak>`.trim();
  }

  escapeXmlChars(text) {
    const xmlChars = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;'
    };
    return text.replace(/[<>&'"]/g, char => xmlChars[char] || char);
  }

  async synthesizeSpeech(text, settings = {}) {

    // console.log(settings);

    if (!this.azureKey || !this.azureRegion) {
      throw new Error('Azure credentials not configured');
    }

    // Convert pitch from 0.5-2 range to -50 to +50 percentage range
    const pitchPercent = ((settings.pitch || 1) - 1) * 100;
    
    const ssml = this.createSSML(
      text,
      settings.voice,
      settings.rate || 1,
      pitchPercent
    );

    console.log(ssml);

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.azureKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'TTS-Browser-Extension',
      },
      body: ssml
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Speech synthesis failed (${response.status}): ${errorText}`);
    }

    return response.blob();
  }

  createAudioPlayer(audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    return {
      audio,
      play: () => audio.play(),
      cleanup: () => URL.revokeObjectURL(audioUrl)
    };
  }

  async getVoicesList() {
    if (!this.azureKey || !this.azureRegion) {
      throw new Error('Azure credentials not configured');
    }

    const response = await fetch(
      `https://${this.azureRegion}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': this.azureKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch voices (${response.status})`);
    }

    const voices = await response.json();
    
    // Group voices by locale
    const groupedVoices = voices.reduce((acc, voice) => {
      const group = acc[voice.LocaleName] || [];
      group.push({
        value: voice.ShortName,
        label: `${voice.DisplayName} (${voice.Gender})`,
        locale: voice.Locale,
        gender: voice.Gender,
        styles: voice.StyleList || [],
        isMultilingual: !!voice.SecondaryLocaleList
      });
      acc[voice.LocaleName] = group;
      return acc;
    }, {});

    return groupedVoices;
  }
} 