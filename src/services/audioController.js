import { AudioPlayer } from "./audioPlayer.js";
import { TextProcessor } from "./textProcessor.js";

export class AudioController {
  constructor(ttsService) {
    this.ttsService = ttsService;
    this.audioPlayer = new AudioPlayer();
    this.textProcessor = new TextProcessor();
  }

  async stopAudio() {
    await this.audioPlayer.stopAudio();
  }

  async synthesizeSequential(text, userSettings = {}, onProgress = null) {
    const finalSettings = await this.ttsService.getVoiceSettings(text, userSettings);
    const opusBlob = await this.ttsService.synthesizeSingleChunk(text, finalSettings, onProgress);

    return [{
      order: 0,
      blob: opusBlob,
      text: text,
      type: 'complete'
    }];
  }

  async synthesizeParallel(text, userSettings = {}, onProgress = null) {
    const finalSettings = await this.ttsService.getVoiceSettings(text, userSettings);
    const opusBlob = await this.ttsService.synthesizeSingleChunk(text, finalSettings, onProgress);

    return [{
      order: 0,
      blob: opusBlob
    }];
  }

  async playTextSequential(text, userSettings = {}, onProgress = null) {
    await this.audioPlayer.stopAudio();

    // Create progress callback for faster feedback
    const progressCallback = onProgress ? (progress) => {
      onProgress({ ...progress, stage: 'synthesizing' });
    } : null;

    const audioSegments = await this.synthesizeSequential(text, userSettings, progressCallback);
    const finalSettings = await this.ttsService.getVoiceSettings(text, userSettings);

    if (onProgress) onProgress({ stage: 'playing', progress: 100 });

    // Use streaming playback for faster response
    if (audioSegments.length === 1) {
      await this.audioPlayer.playStreamingAudio(audioSegments[0].blob, finalSettings.rate, onProgress);
    } else {
      await this.audioPlayer.playAudioSegmentsInOrder(audioSegments, finalSettings.rate);
    }
  }

  async playTextParallel(text, userSettings = {}, onProgress = null) {
    await this.audioPlayer.stopAudio();

    const progressCallback = onProgress ? (progress) => {
      onProgress({ ...progress, stage: 'synthesizing' });
    } : null;

    const opusChunks = await this.synthesizeParallel(text, userSettings, progressCallback);

    if (onProgress) onProgress({ stage: 'processing', progress: 90 });
    const concatenatedAudioBuffer = await this.audioPlayer.concatenateAudioChunks(opusChunks);
    const finalSettings = await this.ttsService.getVoiceSettings(text, userSettings);

    if (onProgress) onProgress({ stage: 'playing', progress: 100 });
    await this.audioPlayer.playAudioBuffer(concatenatedAudioBuffer, finalSettings.rate);
  }

  async playTextWithSequentialConcatenation(text, userSettings = {}) {
    await this.audioPlayer.stopAudio();
    const audioSegments = await this.synthesizeSequential(text, userSettings);
    const concatenatedAudioBuffer = await this.audioPlayer.concatenateMP3Chunks(audioSegments);
    const finalSettings = await this.ttsService.getVoiceSettings(text, userSettings);
    await this.audioPlayer.playAudioBuffer(concatenatedAudioBuffer, finalSettings.rate);
  }

  async getSequentialAudioSegments(text, userSettings = {}) {
    return await this.synthesizeSequential(text, userSettings);
  }

  async synthesizeSpeech(text, userSettings = {}, onProgress = null) {
    const finalSettings = await this.ttsService.getVoiceSettings(text, userSettings);
    await this.audioPlayer.stopAudio();

    const audioBlob = await this.ttsService.synthesizeSingleChunk(text, finalSettings, onProgress);

    if (!(audioBlob instanceof Blob)) {
      throw new Error("Failed to synthesize audio");
    }

    return [audioBlob];
  }
}