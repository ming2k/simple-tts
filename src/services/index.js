import { TTSService } from "./ttsService.js";
import { AudioController } from "./audioController.js";

export class SimpleTTS {
  constructor(azureKey, azureRegion) {
    this.ttsService = new TTSService(azureKey, azureRegion);
    this.audioController = new AudioController(this.ttsService);
  }

  async stopAudio() {
    return await this.audioController.stopAudio();
  }

  async playTextSequential(text, userSettings = {}) {
    return await this.audioController.playTextSequential(text, userSettings);
  }

  async playTextParallel(text, userSettings = {}) {
    return await this.audioController.playTextParallel(text, userSettings);
  }

  async playTextWithSequentialConcatenation(text, userSettings = {}) {
    return await this.audioController.playTextWithSequentialConcatenation(text, userSettings);
  }

  async synthesizeSpeech(text, userSettings = {}) {
    return await this.audioController.synthesizeSpeech(text, userSettings);
  }

  async getSequentialAudioSegments(text, userSettings = {}) {
    return await this.audioController.getSequentialAudioSegments(text, userSettings);
  }

  async getVoicesList() {
    return await this.ttsService.getVoicesList();
  }

  splitIntoSentences(text) {
    return this.ttsService.splitIntoSentences(text);
  }
}

export { TTSService } from "./ttsService.js";
export { AudioController } from "./audioController.js";
export { AudioPlayer } from "./audioPlayer.js";
export { TextProcessor } from "./textProcessor.js";