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

  async synthesizeSequential(text, userSettings = {}) {
    const finalSettings = await this.ttsService.getVoiceSettings(text, userSettings);
    const segments = this.textProcessor.segmentByPunctuation(text);
    const audioSegments = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const mp3Blob = await this.ttsService.synthesizeSingleChunk(segment.text, finalSettings);

      audioSegments.push({
        order: segment.order,
        blob: mp3Blob,
        text: segment.text,
        type: segment.type
      });

      if (i < segments.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return audioSegments;
  }

  async synthesizeParallel(text, userSettings = {}) {
    const finalSettings = await this.ttsService.getVoiceSettings(text, userSettings);
    const chunks = this.textProcessor.splitIntoChunks(text);

    const synthesisTasks = chunks.map(async (chunk) => {
      const mp3Blob = await this.ttsService.synthesizeSingleChunk(chunk.text, finalSettings);
      return {
        order: chunk.order,
        blob: mp3Blob
      };
    });

    const results = await Promise.all(synthesisTasks);
    return results.sort((a, b) => a.order - b.order);
  }

  async playTextSequential(text, userSettings = {}) {
    await this.audioPlayer.stopAudio();
    const audioSegments = await this.synthesizeSequential(text, userSettings);
    const finalSettings = await this.ttsService.getVoiceSettings(text, userSettings);
    await this.audioPlayer.playAudioSegmentsInOrder(audioSegments, finalSettings.rate);
  }

  async playTextParallel(text, userSettings = {}) {
    await this.audioPlayer.stopAudio();
    const mp3Chunks = await this.synthesizeParallel(text, userSettings);
    const concatenatedAudioBuffer = await this.audioPlayer.concatenateMP3Chunks(mp3Chunks);
    const finalSettings = await this.ttsService.getVoiceSettings(text, userSettings);
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

  async synthesizeSpeech(text, userSettings = {}) {
    const finalSettings = await this.ttsService.getVoiceSettings(text, userSettings);
    const sentences = this.textProcessor.splitIntoChunks(text).map(chunk => chunk.text);

    await this.audioPlayer.stopAudio();

    const audioBlobs = await Promise.all(
      sentences.map((sentence) =>
        this.ttsService.synthesizeSingleChunk(sentence, finalSettings),
      ),
    );

    if (!audioBlobs.every((blob) => blob instanceof Blob)) {
      throw new Error("Failed to synthesize one or more audio chunks");
    }

    return audioBlobs;
  }
}