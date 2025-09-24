import { TTSService } from "./ttsService.js";

export class SimpleTTS {
  constructor(azureKey, azureRegion) {
    this.ttsService = new TTSService(azureKey, azureRegion);
  }

  async stopAudio() {
    return await this.ttsService.stopAudio();
  }

  async playText(text, userSettings = {}) {
    return await this.ttsService.playText(text, userSettings);
  }

  async playTextWithTrueStreaming(text, userSettings = {}, onProgress = null) {
    return await this.ttsService.playTextWithTrueStreaming(text, userSettings, onProgress);
  }

  async playTextSequential(text, userSettings = {}) {
    return await this.ttsService.playTextSequential(text, userSettings);
  }

  async synthesizeSpeech(text, userSettings = {}) {
    const finalSettings = await this.ttsService.getVoiceSettings(text, userSettings);
    return await this.ttsService.synthesizeSpeech(text, finalSettings);
  }

  async getVoicesList() {
    return await this.ttsService.getVoicesList();
  }

  async createStreamingResponse(text, settings = {}) {
    return await this.ttsService.createStreamingResponse(text, settings);
  }

}

export { TTSService } from "./ttsService.js";
export { AudioPlayer } from "./audioPlayer.js";
export { TextProcessor } from "./textProcessor.js";