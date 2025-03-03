import { analyzeTextLanguage, getDefaultVoice, languageConfig } from '../utils/languageConfig.js';
import browser from 'webextension-polyfill';

export class TTSService {
  constructor(azureKey, azureRegion) {
    this.azureKey = azureKey;
    this.azureRegion = azureRegion;
    this.baseUrl = `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
    this.maxCharsPerRequest = 1000;
    this.currentAudio = null;
    this.isFirstPlay = true; // Track if this is the first playback
    this.audioContext = null; // Add this to track our initialized context
  }

  // Split text into sentences
  splitIntoSentences(text) {
    // First split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+[\s\n]*/g) || [text];
    const chunks = [];
    
    // Process each sentence
    sentences.forEach(sentence => {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length === 0) return;
      
      // If sentence is shorter than max chars, add it directly
      if (trimmedSentence.length <= this.maxCharsPerRequest) {
        chunks.push(trimmedSentence);
        return;
      }
      
      // Split long sentences at natural break points
      let remainingText = trimmedSentence;
      while (remainingText.length > this.maxCharsPerRequest) {
        // Find the last comma, space, or natural break before maxCharsPerRequest
        let splitIndex = remainingText.lastIndexOf(',', this.maxCharsPerRequest);
        if (splitIndex === -1) splitIndex = remainingText.lastIndexOf(' ', this.maxCharsPerRequest);
        
        // If no natural break found, force split at maxCharsPerRequest
        if (splitIndex === -1) splitIndex = this.maxCharsPerRequest;
        
        // Add the chunk and update remaining text
        chunks.push(remainingText.substring(0, splitIndex).trim());
        remainingText = remainingText.substring(splitIndex).trim();
      }
      
      // Add any remaining text as the final chunk
      if (remainingText.length > 0) {
        chunks.push(remainingText);
      }
    });
    
    return chunks;
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

  async synthesizeSingleChunk(text, settings = {}) {
    if (!this.azureKey || !this.azureRegion) {
      throw new Error('Azure credentials not configured');
    }

    try {
      const pitchPercent = ((settings.pitch || 1) - 1) * 100;
      const ssml = this.createSSML(
        text,
        settings.voice,
        settings.rate || 1,
        pitchPercent
      );

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
    } catch (error) {
      console.error('Error in synthesizeSingleChunk:', error);
      throw error;
    }
  }

  async synthesizeSpeech(text, userSettings = {}, handlePlayback = false) {
    try {
      // Get both API settings and voice settings
      const { settings, voiceSettings } = await browser.storage.local.get(['settings', 'voiceSettings']);
      
      // Analyze text language
      const analysis = analyzeTextLanguage(text);
      console.log('Text language detected:', analysis.dominant);
      console.log('Full voice settings:', voiceSettings);
      
      // More explicit lookup of language settings
      let languageSettings;
      if (voiceSettings && voiceSettings[analysis.dominant]) {
        languageSettings = voiceSettings[analysis.dominant];
        console.log(`Found voice settings for ${analysis.dominant}:`, languageSettings);
      } else {
        languageSettings = {
          voice: getDefaultVoice(analysis.dominant)
        };
        console.log(`Using default voice for ${analysis.dominant}:`, languageSettings);
      }

      // Determine final settings with proper fallback chain
      const finalSettings = {
        rate: 1,
        pitch: 1,
        ...languageSettings,
        ...userSettings
      };

      // Ensure we're using the correct voice
      if (!finalSettings.voice || finalSettings.voice.startsWith('zh-')) {
        console.warn('Incorrect voice detected, forcing to proper language voice');
        finalSettings.voice = getDefaultVoice(analysis.dominant);
      }

      console.log('Final settings to be used:', finalSettings);

      // Update instance credentials if needed
      if (settings.azureKey !== this.azureKey || settings.azureRegion !== this.azureRegion) {
        this.azureKey = settings.azureKey;
        this.azureRegion = settings.azureRegion;
        this.baseUrl = `https://${settings.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
      }

      const sentences = this.splitIntoSentences(text);
      
      // Stop any currently playing audio
      if (this.currentAudio) {
        await this.stopAudio();
      }

      // If not handling playback, return array of blobs
      const audioBlobs = await Promise.all(
        sentences.map(sentence => this.synthesizeSingleChunk(sentence, finalSettings))
      );

      if (!audioBlobs.every(blob => blob instanceof Blob)) {
        throw new Error('Failed to synthesize one or more audio chunks');
      }

      return audioBlobs;

    } catch (error) {
      console.error('Speech synthesis failed:', error);
      throw error;
    }
  }

  async ensureAudioContext(context) {
    if (context.state === 'suspended') {
      // Try to resume the context
      try {
        await context.resume();
      } catch (error) {
        // If we can't resume, wait for user interaction
        await new Promise((resolve) => {
          const handleInteraction = async () => {
            await context.resume();
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
            resolve();
          };
          document.addEventListener('click', handleInteraction, { once: true });
          document.addEventListener('touchstart', handleInteraction, { once: true });
        });
      }
    }
  }

  async stopAudio() {
    if (this.currentAudio) {
      if (this.currentAudio.source) {
        this.currentAudio.source.stop();
        this.currentAudio.source.disconnect();
      }
      this.currentAudio = null;
    }
  }

  async playAudioChunk(audioBlob, rate = 1, existingContext = null) {
    return new Promise(async (resolve, reject) => {
      try {
        // Use existing context or get the initialized one
        const context = existingContext || await this.initAudioContext();
        
        // Ensure context is running
        if (context.state !== 'running') {
          await context.resume();
        }

        const source = context.createBufferSource();
        this.currentAudio = { context, source };

        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        
        source.buffer = audioBuffer;
        source.playbackRate.value = rate;
        source.connect(context.destination);

        // Add a longer scheduling delay
        const startTime = context.currentTime + 0.8;

        source.onended = () => {
          if (!existingContext) {
            source.disconnect();
          }
          resolve();
        };

        source.start(startTime);
      } catch (error) {
        console.error('Playback error:', error);
        reject(error);
      }
    });
  }

  createAudioPlayer(audioBlob) {
    let source;
    let onEnded = () => {};
    
    const play = async () => {
      try {
        // Use the shared initialized context
        const context = await this.initAudioContext();
        
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        
        source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        
        source.onended = () => {
          onEnded();
        };
        
        source.start(0);
      } catch (error) {
        console.error('Audio player error:', error);
        throw error;
      }
    };

    return {
      play,
      cleanup: async () => {
        if (source) {
          source.stop();
          source.disconnect();
        }
        // Don't close the shared context
      },
      set onEnded(callback) {
        onEnded = callback;
      }
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
          'Ocp-Apim-Subscription-Key': this.azureKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch voices (${response.status}): ${errorText}`);
    }

    const voices = await response.json();
    
    // Group voices by locale
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
        isMultilingual: !!voice.SecondaryLocaleList
      });
      
      return acc;
    }, {});

    return groupedVoices;
  }

  // Add this new method to initialize and warm up the audio context
  async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create a longer silent buffer (1 second)
      const sampleRate = this.audioContext.sampleRate;
      const silentBuffer = this.audioContext.createBuffer(1, sampleRate, sampleRate);
      const source = this.audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.audioContext.destination);
      
      // Start and stop with a longer duration
      const startTime = this.audioContext.currentTime;
      source.start(startTime);
      source.stop(startTime + 0.5); // Play for 500ms
      
      // Wait for the context to be fully initialized
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return this.audioContext;
  }
}