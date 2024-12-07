export class TTSService {
  constructor(azureKey, azureRegion) {
    this.azureKey = azureKey;
    this.azureRegion = azureRegion;
    this.baseUrl = `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
    this.maxCharsPerRequest = 1000;
    this.currentAudio = null;
  }

  // Split text into sentences
  splitIntoSentences(text) {
    // Split on period, question mark, or exclamation mark followed by space or newline
    const sentences = text.match(/[^.!?]+[.!?]+[\s\n]*/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
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

  async synthesizeSpeech(text, settings = {}, handlePlayback = false) {
    // Split text into sentences
    const sentences = this.splitIntoSentences(text);
    
    // Stop any currently playing audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    // If handlePlayback is true, play the audio internally
    if (handlePlayback) {
      // Start all API requests in parallel
      const audioPromises = sentences.map(sentence => 
        this.synthesizeSingleChunk(sentence, settings)
      );

      // Play chunks sequentially as they become ready
      for (let i = 0; i < sentences.length; i++) {
        try {
          // Wait for the next chunk to be ready
          const audioBlob = await audioPromises[i];
          // Play it
          await this.playAudioChunk(audioBlob, settings.rate || 1);
        } catch (error) {
          console.error(`Error processing chunk ${i}:`, error);
          throw error;
        }
      }
      return;
    }

    // Otherwise, return a single audio blob
    try {
      if (sentences.length === 1) {
        return await this.synthesizeSingleChunk(text, settings);
      }

      // For multiple sentences, combine the audio blobs
      const audioBlobs = await Promise.all(
        sentences.map(sentence => this.synthesizeSingleChunk(sentence, settings))
      );

      // Combine all blobs into one
      const audioArrays = await Promise.all(
        audioBlobs.map(blob => blob.arrayBuffer())
      );
      
      const totalLength = audioArrays.reduce((acc, arr) => acc + arr.byteLength, 0);
      const combinedArray = new Uint8Array(totalLength);
      
      let offset = 0;
      audioArrays.forEach(array => {
        combinedArray.set(new Uint8Array(array), offset);
        offset += array.byteLength;
      });

      return new Blob([combinedArray], { type: 'audio/mp3' });
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      throw error;
    }
  }

  async playAudioChunk(audioBlob, rate = 1) {
    return new Promise((resolve, reject) => {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      this.currentAudio = audio;
      audio.playbackRate = rate;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };

      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };

      audio.play().catch(reject);
    });
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