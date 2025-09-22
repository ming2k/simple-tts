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

  async playTextSequential(text, userSettings = {}, onProgress = null) {
    return await this.audioController.playTextSequential(text, userSettings, onProgress);
  }

  async playTextParallel(text, userSettings = {}, onProgress = null) {
    return await this.audioController.playTextParallel(text, userSettings, onProgress);
  }

  async playTextWithSequentialConcatenation(text, userSettings = {}, onProgress = null) {
    return await this.audioController.playTextWithSequentialConcatenation(text, userSettings, onProgress);
  }

  async synthesizeSpeech(text, userSettings = {}, onProgress = null) {
    return await this.audioController.synthesizeSpeech(text, userSettings, onProgress);
  }

  async getSequentialAudioSegments(text, userSettings = {}) {
    return await this.audioController.getSequentialAudioSegments(text, userSettings);
  }

  async getVoicesList() {
    return await this.ttsService.getVoicesList();
  }

}

export { TTSService } from "./ttsService.js";
export { AudioController } from "./audioController.js";
export { AudioPlayer } from "./audioPlayer.js";
export { TextProcessor } from "./textProcessor.js";