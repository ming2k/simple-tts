import {
  analyzeTextLanguage,
  getDefaultVoice,
} from "../utils/languageConfig.js";
import browser from "webextension-polyfill";

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

  // Enhanced text chunking for parallel processing
  splitIntoChunks(text) {
    console.log('TTS: Chunking text (' + text.length + ' chars)');
    
    // Split into sentences first
    const sentences = text.match(/[^.!?]+[.!?]+[\s\n]*/g) || [text];
    
    const chunks = [];
    let currentChunk = '';

    sentences.forEach((sentence, index) => {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length === 0) return;

      // If adding this sentence would exceed the limit, start a new chunk
      if (currentChunk.length + trimmedSentence.length > this.maxCharsPerRequest && currentChunk.length > 0) {
        chunks.push({
          id: chunks.length,
          text: currentChunk.trim(),
          order: chunks.length,
          length: currentChunk.trim().length
        });
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk.length > 0 ? ' ' : '') + trimmedSentence;
      }

      // If this is the last sentence, add the remaining chunk
      if (index === sentences.length - 1 && currentChunk.length > 0) {
        chunks.push({
          id: chunks.length,
          text: currentChunk.trim(),
          order: chunks.length,
          length: currentChunk.trim().length
        });
      }
    });

    console.log('TTS: Created ' + chunks.length + ' chunks for parallel processing');

    return chunks;
  }

  // Advanced text segmentation by line breaks and punctuation for sequential processing
  segmentTextByPunctuation(text) {
    console.log('TTS: Segmenting text by line breaks and punctuation (' + text.length + ' chars)');
    
    const segments = [];
    let segmentOrder = 0;
    
    // Step 1: Split by line breaks first (highest priority)
    const lines = text.split(/\n+/);
    console.log('TTS: Found', lines.length, 'lines after splitting by line breaks');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      let line = lines[lineIndex].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      console.log(`TTS: Processing line ${lineIndex + 1}: "${line.substring(0, 50)}..."`);
      
      // Step 2: Within each line, split by punctuation marks
      // Define all punctuation that should create breaks
      const allBreaks = /([.!?:;,]+)/;
      
      // Split the line by punctuation marks
      const parts = line.split(allBreaks);
      let currentSegment = '';
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;
        
        // If this is a punctuation mark, add it to current segment and finish the segment
        if (allBreaks.test(part)) {
          currentSegment += part;
          
          // Create segment if we have content
          if (currentSegment.trim()) {
            segments.push({
              id: segmentOrder,
              text: currentSegment.trim(),
              order: segmentOrder,
              length: currentSegment.trim().length,
              type: this.getPunctuationType(part)
            });
            segmentOrder++;
            console.log(`TTS: Created ${this.getPunctuationType(part)} segment: "${currentSegment.trim().substring(0, 50)}..."`);
            currentSegment = '';
          }
        } else {
          // This is text content
          const trimmedPart = part.trim();
          if (!trimmedPart) continue;
          
          // Check if adding this would exceed max chars
          if (currentSegment.length + trimmedPart.length > this.maxCharsPerRequest && currentSegment.trim()) {
            // Save current segment first
            segments.push({
              id: segmentOrder,
              text: currentSegment.trim(),
              order: segmentOrder,
              length: currentSegment.trim().length,
              type: 'chunk'
            });
            segmentOrder++;
            currentSegment = trimmedPart;
          } else {
            // Add to current segment
            currentSegment += (currentSegment.trim() ? ' ' : '') + trimmedPart;
          }
        }
      }
      
      // Add any remaining segment from this line
      if (currentSegment.trim()) {
        segments.push({
          id: segmentOrder,
          text: currentSegment.trim(),
          order: segmentOrder,
          length: currentSegment.trim().length,
          type: 'line_end'
        });
        segmentOrder++;
        console.log(`TTS: Created line_end segment: "${currentSegment.trim().substring(0, 50)}..."`);
      }
    }
    
    // Handle case where entire text has no line breaks or punctuation
    if (segments.length === 0 && text.trim()) {
      segments.push({
        id: 0,
        text: text.trim(),
        order: 0,
        length: text.trim().length,
        type: 'complete'
      });
    }
    
    console.log('TTS: Created ' + segments.length + ' segments for sequential processing:');
    segments.forEach((segment, i) => {
      console.log(`  ${i + 1}. [${segment.type}] "${segment.text.substring(0, 50)}${segment.text.length > 50 ? '...' : ''}"`);
    });
    
    return segments;
  }

  // Helper method to determine punctuation type
  getPunctuationType(punctuation) {
    if (/[.!?]/.test(punctuation)) return 'sentence';
    if (/[:]/.test(punctuation)) return 'colon';
    if (/[;]/.test(punctuation)) return 'semicolon';
    if (/[,]/.test(punctuation)) return 'comma';
    return 'punctuation';
  }

  // Legacy method for backward compatibility
  splitIntoSentences(text) {
    return this.splitIntoChunks(text).map(chunk => chunk.text);
  }

  createSSML(text, voice = "en-US-AvaMultilingualNeural", rate = 1, pitch = 1) {
    const escapedText = this.escapeXmlChars(text);
    const lang = voice.split("-").slice(0, 2).join("-");

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
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return text.replace(/[<>&'"]/g, (char) => xmlChars[char] || char);
  }

  async synthesizeSingleChunk(text, settings = {}) {
    if (!this.azureKey || !this.azureRegion) {
      throw new Error("Azure credentials not configured");
    }

    try {
      const pitchPercent = ((settings.pitch || 1) - 1) * 100;
      const ssml = this.createSSML(
        text,
        settings.voice,
        settings.rate || 1,
        pitchPercent,
      );

      return await this.synthesizeWithChunkedTransfer(ssml);
    } catch (error) {
      console.error("Error in synthesizeSingleChunk:", error);
      throw error;
    }
  }

  async synthesizeWithChunkedTransfer(ssml) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', this.baseUrl, true);
      
      // Configure headers for chunked transfer with high-quality MP3 format
      xhr.setRequestHeader('Ocp-Apim-Subscription-Key', this.azureKey);
      xhr.setRequestHeader('Content-Type', 'application/ssml+xml');
      xhr.setRequestHeader('X-Microsoft-OutputFormat', 'audio-24khz-96kbitrate-mono-mp3');
      xhr.setRequestHeader('User-Agent', 'TTS-Browser-Extension-Chunked-MP3');
      
      xhr.responseType = 'arraybuffer';
      
      xhr.onload = function() {
        if (xhr.status === 200) {
          const blob = new Blob([xhr.response], { type: 'audio/mpeg' });
          resolve(blob);
        } else {
          console.error('TTS request failed:', xhr.status, xhr.statusText);
          reject(new Error(`Speech synthesis failed (${xhr.status}): ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = function() {
        console.error('Network error during TTS request');
        reject(new Error('Network error during speech synthesis'));
      };
      
      xhr.send(ssml);
    });
  }

  async synthesizeWithStreamingPlayback(text, settings = {}, onChunkReady = null) {
    if (!this.azureKey || !this.azureRegion) {
      throw new Error("Azure credentials not configured");
    }

    const pitchPercent = ((settings.pitch || 1) - 1) * 100;
    const ssml = this.createSSML(
      text,
      settings.voice,
      settings.rate || 1,
      pitchPercent,
    );

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', this.baseUrl, true);
      
      xhr.setRequestHeader('Ocp-Apim-Subscription-Key', this.azureKey);
      xhr.setRequestHeader('Content-Type', 'application/ssml+xml');
      xhr.setRequestHeader('X-Microsoft-OutputFormat', 'audio-16khz-128kbitrate-mono-mp3');
      xhr.setRequestHeader('User-Agent', 'TTS-Browser-Extension');
      
      xhr.responseType = 'arraybuffer';
      
      let lastProcessedLength = 0;
      const audioChunks = [];
      
      xhr.onload = function() {
        if (xhr.status === 200) {
          const finalBlob = new Blob([xhr.response], { type: 'audio/mpeg' });
          resolve({ blob: finalBlob, chunks: audioChunks });
        } else {
          reject(new Error(`Speech synthesis failed (${xhr.status}): ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error during speech synthesis'));
      };
      
      // Process chunks as they arrive
      xhr.onreadystatechange = function() {
        if (xhr.readyState >= 3 && xhr.response) {
          const currentLength = xhr.response.byteLength;
          
          if (currentLength > lastProcessedLength) {
            // Extract new chunk
            const newChunkData = xhr.response.slice(lastProcessedLength);
            const chunkBlob = new Blob([newChunkData], { type: 'audio/mpeg' });
            
            audioChunks.push(chunkBlob);
            lastProcessedLength = currentLength;
            
            // Notify callback if provided
            if (onChunkReady && chunkBlob.size > 0) {
              onChunkReady(chunkBlob, audioChunks.length);
            }
            
            console.log(`Received audio chunk ${audioChunks.length}: ${newChunkData.byteLength} bytes`);
          }
        }
      };
      
      xhr.send(ssml);
    });
  }

  // Sequential synthesis with ordered segments
  async synthesizeWithSequentialProcessing(text, userSettings = {}) {
    try {
      // Get settings
      const { settings, voiceSettings } = await browser.storage.local.get([
        "settings",
        "voiceSettings",
      ]);

      // Analyze language and get final settings
      const analysis = analyzeTextLanguage(text);
      let languageSettings;
      
      if (voiceSettings && voiceSettings[analysis.dominant]) {
        languageSettings = voiceSettings[analysis.dominant];
      } else {
        languageSettings = {
          voice: getDefaultVoice(analysis.dominant),
        };
      }

      const finalSettings = {
        rate: 1,
        pitch: 1,
        ...languageSettings,
        ...userSettings,
      };

      // Update credentials if needed
      if (
        settings.azureKey !== this.azureKey ||
        settings.azureRegion !== this.azureRegion
      ) {
        this.azureKey = settings.azureKey;
        this.azureRegion = settings.azureRegion;
        this.baseUrl = `https://${settings.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
      }

      // Segment text by punctuation for sequential processing
      const textSegments = this.segmentTextByPunctuation(text);
      console.log('TTS: Processing', textSegments.length, 'segments sequentially');

      // Process segments sequentially (not in parallel)
      const audioSegments = [];
      for (let i = 0; i < textSegments.length; i++) {
        const segment = textSegments[i];
        console.log(`TTS: Processing segment ${i + 1}/${textSegments.length} (${segment.type}): "${segment.text.substring(0, 50)}..."`);
        
        try {
          const mp3Blob = await this.synthesizeWithChunkedTransfer(
            this.createSSML(segment.text, finalSettings.voice, finalSettings.rate, ((finalSettings.pitch || 1) - 1) * 100)
          );
          
          audioSegments.push({
            order: segment.order,
            blob: mp3Blob,
            size: mp3Blob.size,
            text: segment.text,
            type: segment.type
          });
          
          // Small delay between requests to be respectful to the API
          if (i < textSegments.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          console.error(`TTS segment ${i + 1} failed:`, error);
          throw error;
        }
      }
      
      console.log('TTS: Sequential synthesis completed');
      return audioSegments;

    } catch (error) {
      console.error('TTS sequential synthesis failed:', error);
      throw error;
    }
  }

  // Parallel synthesis with text chunking
  async synthesizeWithParallelProcessing(text, userSettings = {}) {
    try {
      // Get settings
      const { settings, voiceSettings } = await browser.storage.local.get([
        "settings",
        "voiceSettings",
      ]);

      // Analyze language and get final settings
      const analysis = analyzeTextLanguage(text);
      let languageSettings;
      
      if (voiceSettings && voiceSettings[analysis.dominant]) {
        languageSettings = voiceSettings[analysis.dominant];
      } else {
        languageSettings = {
          voice: getDefaultVoice(analysis.dominant),
        };
      }

      const finalSettings = {
        rate: 1,
        pitch: 1,
        ...languageSettings,
        ...userSettings,
      };

      // Update credentials if needed
      if (
        settings.azureKey !== this.azureKey ||
        settings.azureRegion !== this.azureRegion
      ) {
        this.azureKey = settings.azureKey;
        this.azureRegion = settings.azureRegion;
        this.baseUrl = `https://${settings.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
      }

      // Split text into chunks for parallel processing
      const textChunks = this.splitIntoChunks(text);
      console.log('TTS: Processing', textChunks.length, 'chunks in parallel');

      // Process all chunks in parallel
      const synthesisTasks = textChunks.map(async (chunk, index) => {
        try {
          const mp3Blob = await this.synthesizeWithChunkedTransfer(
            this.createSSML(chunk.text, finalSettings.voice, finalSettings.rate, ((finalSettings.pitch || 1) - 1) * 100)
          );
          return {
            order: chunk.order,
            blob: mp3Blob,
            size: mp3Blob.size
          };
        } catch (error) {
          console.error(`TTS chunk ${index + 1} failed:`, error);
          throw error;
        }
      });

      // Wait for all parallel synthesis to complete
      const results = await Promise.all(synthesisTasks);
      
      console.log('TTS: Parallel synthesis completed');

      // Sort results by original order
      results.sort((a, b) => a.order - b.order);
      
      return results;

    } catch (error) {
      console.error('TTS parallel synthesis failed:', error);
      throw error;
    }
  }

  async synthesizeSpeech(text, userSettings = {}) {
    try {
      // Get both API settings and voice settings
      const { settings, voiceSettings } = await browser.storage.local.get([
        "settings",
        "voiceSettings",
      ]);

      // Analyze text language
      const analysis = analyzeTextLanguage(text);
      console.log("Text language detected:", analysis.dominant);
      console.log("Full voice settings:", voiceSettings);

      // More explicit lookup of language settings
      let languageSettings;
      if (voiceSettings && voiceSettings[analysis.dominant]) {
        languageSettings = voiceSettings[analysis.dominant];
        console.log(
          `Found voice settings for ${analysis.dominant}:`,
          languageSettings,
        );
      } else {
        languageSettings = {
          voice: getDefaultVoice(analysis.dominant),
        };
        console.log(
          `Using default voice for ${analysis.dominant}:`,
          languageSettings,
        );
      }

      // Determine final settings with proper fallback chain
      const finalSettings = {
        rate: 1,
        pitch: 1,
        ...languageSettings,
        ...userSettings,
      };

      // Ensure we're using the correct voice
      if (!finalSettings.voice || finalSettings.voice.startsWith("zh-")) {
        console.warn(
          "Incorrect voice detected, forcing to proper language voice",
        );
        finalSettings.voice = getDefaultVoice(analysis.dominant);
      }

      console.log("Final settings to be used:", finalSettings);

      // Update instance credentials if needed
      if (
        settings.azureKey !== this.azureKey ||
        settings.azureRegion !== this.azureRegion
      ) {
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
        sentences.map((sentence) =>
          this.synthesizeSingleChunk(sentence, finalSettings),
        ),
      );

      if (!audioBlobs.every((blob) => blob instanceof Blob)) {
        throw new Error("Failed to synthesize one or more audio chunks");
      }

      return audioBlobs;
    } catch (error) {
      console.error("Speech synthesis failed:", error);
      throw error;
    }
  }

  async ensureAudioContext(context) {
    if (context.state === "suspended") {
      // Try to resume the context
      try {
        await context.resume();
      } catch {
        // If we can't resume, wait for user interaction
        await new Promise((resolve) => {
          const handleInteraction = async () => {
            await context.resume();
            document.removeEventListener("click", handleInteraction);
            document.removeEventListener("touchstart", handleInteraction);
            resolve();
          };
          document.addEventListener("click", handleInteraction, { once: true });
          document.addEventListener("touchstart", handleInteraction, {
            once: true,
          });
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
    return new Promise((resolve, reject) => {
      const playChunk = async () => {
        try {
          // Use existing context or get the initialized one
          const context = existingContext || (await this.initAudioContext());

          // Ensure context is running
          if (context.state !== "running") {
            await context.resume();
          }

          const source = context.createBufferSource();
          this.currentAudio = { context, source };

          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await context.decodeAudioData(arrayBuffer);

          source.buffer = audioBuffer;
          source.playbackRate.value = rate;
          source.connect(context.destination);

          // Immediate start for sequential playback - no delay needed
          const startTime = context.currentTime + 0.1; // Minimal delay for stability

          source.onended = () => {
            source.disconnect();
            resolve();
          };

          source.start(startTime);
        } catch (error) {
          console.error("Playback error:", error);
          reject(error);
        }
      };
      
      playChunk();
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
        console.error("Audio player error:", error);
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
      },
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
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch voices (${response.status}): ${errorText}`,
      );
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
        isMultilingual: !!voice.SecondaryLocaleList,
      });

      return acc;
    }, {});

    return groupedVoices;
  }

  // Add this new method to initialize and warm up the audio context
  async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // Create a longer silent buffer (1 second)
      const sampleRate = this.audioContext.sampleRate;
      const silentBuffer = this.audioContext.createBuffer(
        1,
        sampleRate,
        sampleRate,
      );
      const source = this.audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.audioContext.destination);

      // Start and stop with a longer duration
      const startTime = this.audioContext.currentTime;
      source.start(startTime);
      source.stop(startTime + 0.5); // Play for 500ms

      // Wait for the context to be fully initialized
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return this.audioContext;
  }

  // MP3 audio concatenation via AudioBuffer
  async concatenateMP3Chunks(mp3Chunks) {
    const audioContext = await this.initAudioContext();
    const audioBuffers = [];
    let totalSamples = 0;
    
    // Decode all MP3 chunks to AudioBuffers
    for (let i = 0; i < mp3Chunks.length; i++) {
      const chunk = mp3Chunks[i];
      
      try {
        const arrayBuffer = await chunk.blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers.push(audioBuffer);
        totalSamples += audioBuffer.length;
      } catch (error) {
        console.error(`Failed to decode chunk ${i + 1}:`, error);
        throw error;
      }
    }
    
    // Create concatenated AudioBuffer
    const sampleRate = audioBuffers[0].sampleRate;
    const channels = audioBuffers[0].numberOfChannels;
    const concatenatedBuffer = audioContext.createBuffer(channels, totalSamples, sampleRate);
    
    // Copy all audio data
    let offset = 0;
    for (let i = 0; i < audioBuffers.length; i++) {
      const buffer = audioBuffers[i];
      for (let channel = 0; channel < channels; channel++) {
        const sourceData = buffer.getChannelData(channel);
        const targetData = concatenatedBuffer.getChannelData(channel);
        targetData.set(sourceData, offset);
      }
      offset += buffer.length;
    }
    
    console.log('TTS: Concatenated audio (' + Math.round(concatenatedBuffer.duration * 100) / 100 + 's)');
    return concatenatedBuffer;
  }

  // Play AudioBuffer directly
  async playAudioBuffer(audioBuffer, rate = 1) {
    try {
      const audioContext = await this.initAudioContext();
      
      return new Promise((resolve, reject) => {
        try {
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = rate;
          source.connect(audioContext.destination);
          
          this.currentAudio = { context: audioContext, source };
          
          source.onended = () => {
            source.disconnect();
            resolve();
          };
          
          source.start();
          
        } catch (error) {
          console.error('AudioBuffer playback error:', error);
          reject(error);
        }
      });
      
    } catch (error) {
      console.error('AudioBuffer playback failed:', error);
      throw error;
    }
  }

  async playTextWithChunkedStreaming(text, userSettings = {}) {
    try {
      // Get settings
      const { settings, voiceSettings } = await browser.storage.local.get([
        "settings",
        "voiceSettings",
      ]);

      const analysis = analyzeTextLanguage(text);
      let languageSettings;
      
      if (voiceSettings && voiceSettings[analysis.dominant]) {
        languageSettings = voiceSettings[analysis.dominant];
      } else {
        languageSettings = {
          voice: getDefaultVoice(analysis.dominant),
        };
      }

      const finalSettings = {
        rate: 1,
        pitch: 1,
        ...languageSettings,
        ...userSettings,
      };

      // Update credentials if needed
      if (
        settings.azureKey !== this.azureKey ||
        settings.azureRegion !== this.azureRegion
      ) {
        this.azureKey = settings.azureKey;
        this.azureRegion = settings.azureRegion;
        this.baseUrl = `https://${settings.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
      }

      // Stop any currently playing audio
      if (this.currentAudio) {
        await this.stopAudio();
      }

      // Initialize audio context
      const audioContext = await this.initAudioContext();
      let isFirstChunk = true;

      // Use streaming synthesis with chunk callback
      const result = await this.synthesizeWithStreamingPlayback(
        text,
        finalSettings,
        (_chunkBlob, _chunkIndex) => {
          // Chunk received callback - could implement progressive playback here
          if (isFirstChunk) {
            isFirstChunk = false;
          }
        }
      );

      // Play the complete audio
      return await this.playAudioChunk(result.blob, finalSettings.rate, audioContext);
      
    } catch (error) {
      console.error('Error in chunked streaming playback:', error);
      throw error;
    }
  }

  // Ordered audio playback system for sequential segments
  async playAudioSegmentsInOrder(audioSegments, playbackRate = 1) {
    try {
      // Initialize audio context once for all segments
      const audioContext = await this.initAudioContext();
      
      // Ensure context is running
      if (audioContext.state !== "running") {
        await audioContext.resume();
      }
      
      console.log('TTS: Playing', audioSegments.length, 'audio segments in order');
      
      // Sort segments by order to ensure correct playback sequence
      const sortedSegments = [...audioSegments].sort((a, b) => a.order - b.order);
      
      for (let i = 0; i < sortedSegments.length; i++) {
        const segment = sortedSegments[i];
        console.log(`TTS: Playing segment ${i + 1}/${sortedSegments.length} (${segment.type}): "${segment.text.substring(0, 50)}..."`);
        
        try {
          // Play each segment and wait for it to complete before playing the next
          await this.playAudioChunk(segment.blob, playbackRate, audioContext);
          
          // Small gap between segments for natural flow
          if (i < sortedSegments.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200)); // Increased gap for better separation
          }
          
        } catch (error) {
          console.error(`Error playing segment ${i + 1}:`, error);
          // Continue with next segment even if one fails
        }
      }
      
      console.log('TTS: Finished playing all segments in order');
      
    } catch (error) {
      console.error('Error in ordered audio playback:', error);
      throw error;
    }
  }

  // Simple method: Just return audio segments for manual playback
  async getSequentialAudioSegments(text, userSettings = {}) {
    try {
      console.log('TTS: Getting sequential audio segments');
      
      // Sequential synthesis (returns ordered audio segments)
      const audioSegments = await this.synthesizeWithSequentialProcessing(text, userSettings);
      
      console.log('TTS: Sequential synthesis completed, returning', audioSegments.length, 'segments');
      return audioSegments;
      
    } catch (error) {
      console.error('Sequential TTS synthesis failed:', error);
      throw error;
    }
  }

  // Main method: Sequential processing + ordered playback
  async playTextWithSequentialProcessing(text, userSettings = {}) {
    try {
      // Stop any currently playing audio
      if (this.currentAudio) {
        await this.stopAudio();
      }

      console.log('TTS: Starting sequential processing pipeline');
      
      // Step 1: Sequential synthesis (returns ordered audio segments)
      const audioSegments = await this.synthesizeWithSequentialProcessing(text, userSettings);
      
      // Step 2: Play segments in their original order
      const finalSettings = {
        rate: 1,
        ...userSettings,
      };
      
      await this.playAudioSegmentsInOrder(audioSegments, finalSettings.rate);
      
      console.log('TTS: Sequential processing pipeline completed');
      
    } catch (error) {
      console.error('Sequential TTS pipeline failed:', error);
      throw error;
    }
  }

  // Alternative: Sequential processing with concatenated playback
  async playTextWithSequentialConcatenation(text, userSettings = {}) {
    try {
      // Stop any currently playing audio
      if (this.currentAudio) {
        await this.stopAudio();
      }

      console.log('TTS: Starting sequential processing with concatenation');
      
      // Step 1: Sequential synthesis (returns ordered audio segments)
      const audioSegments = await this.synthesizeWithSequentialProcessing(text, userSettings);
      
      // Step 2: Concatenate all segments into single audio buffer
      const concatenatedAudioBuffer = await this.concatenateMP3Chunks(audioSegments);
      
      // Step 3: Play concatenated audio
      const finalSettings = {
        rate: 1,
        ...userSettings,
      };
      
      await this.playAudioBuffer(concatenatedAudioBuffer, finalSettings.rate);
      
      console.log('TTS: Sequential concatenation pipeline completed');
      
    } catch (error) {
      console.error('Sequential concatenation TTS pipeline failed:', error);
      throw error;
    }
  }

  // Main method: Parallel processing + MP3 concatenation + playback
  async playTextWithParallelProcessing(text, userSettings = {}) {
    try {
      // Stop any currently playing audio
      if (this.currentAudio) {
        await this.stopAudio();
      }

      // Step 1: Parallel synthesis (returns MP3 chunks)
      const mp3Chunks = await this.synthesizeWithParallelProcessing(text, userSettings);
      
      // Step 2: Concatenate MP3 chunks into single AudioBuffer
      const concatenatedAudioBuffer = await this.concatenateMP3Chunks(mp3Chunks);
      
      // Step 3: Play concatenated audio
      const finalSettings = {
        rate: 1,
        ...userSettings,
      };
      
      await this.playAudioBuffer(concatenatedAudioBuffer, finalSettings.rate);
      
    } catch (error) {
      console.error('Parallel TTS pipeline failed:', error);
      throw error;
    }
  }
}
