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
  }

  async synthesizeSpeech(text, userSettings = {}, handlePlayback = false) {
    try {
      // Get both API settings and voice settings
      const { settings, voiceSettings } = await browser.storage.local.get(['settings', 'voiceSettings']);
      
      // Verify API settings
      if (!settings?.azureKey || !settings?.azureRegion) {
        throw new Error('Azure credentials not configured');
      }

      // Update instance credentials if needed
      if (settings.azureKey !== this.azureKey || settings.azureRegion !== this.azureRegion) {
        this.azureKey = settings.azureKey;
        this.azureRegion = settings.azureRegion;
        this.baseUrl = `https://${settings.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
      }

      // Analyze text language
      const analysis = analyzeTextLanguage(text);
      console.log('Language analysis:', analysis);

      // Get language-specific voice settings
      const languageSettings = voiceSettings?.[analysis.dominant];
      
      // Determine final settings with proper fallback chain
      const finalSettings = {
        // Default settings
        voice: 'en-US-JennyNeural',
        rate: 1,
        pitch: 1,
        // Language-specific settings from storage
        ...languageSettings,
        // User-provided settings (override everything)
        ...userSettings
      };

      console.log('Using voice settings:', finalSettings);

      const sentences = this.splitIntoSentences(text);
      
      // Stop any currently playing audio
      if (this.currentAudio) {
        await this.stopAudio();
      }

      if (handlePlayback) {
        try {
          // Create a single context for all audio
          const context = new (window.AudioContext || window.webkitAudioContext)();
          await this.ensureAudioContext(context);
          
          // Process sentences sequentially
          for (const sentence of sentences) {
            const audioBlob = await this.synthesizeSingleChunk(sentence, finalSettings);
            await this.playAudioChunk(audioBlob, finalSettings.rate, context);
          }
          
          // Cleanup after all sentences
          if (context && context.state !== 'closed') {
            await context.close();
          }
        } catch (error) {
          console.error('Audio playback failed:', error);
          throw error;
        }
        return;
      }

      // If not handling playback, return all audio blobs
      return Promise.all(sentences.map(sentence => 
        this.synthesizeSingleChunk(sentence, finalSettings)
      ));
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
        const source = context.createBufferSource();
        
        this.currentAudio = { context, source };

        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        
        source.buffer = audioBuffer;
        source.playbackRate.value = rate;
        source.connect(context.destination);

        source.onended = () => {
          if (!existingContext) {
            // Don't close the context, just disconnect the source
            source.disconnect();
          }
          resolve();
        };

        // Context is already ensured to be running by initAudioContext
        source.start(0);
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
      
      // Create and play a silent buffer to warm up the audio system
      const silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.audioContext.destination);
      source.start();
      
      // Wait for the context to be running
      if (this.audioContext.state !== 'running') {
        await new Promise((resolve) => {
          const checkState = () => {
            if (this.audioContext.state === 'running') {
              resolve();
            } else {
              requestAnimationFrame(checkState);
            }
          };
          checkState();
        });
      }
    }
    return this.audioContext;
  }
} 