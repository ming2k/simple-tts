export interface Settings {
  voice: string;
  rate: number;
  pitch: number;
  azureKey: string;
  azureRegion: string;
  showKey: boolean;
  onboardingCompleted: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  voice: 'zh-CN-XiaoxiaoNeural',
  rate: 1,
  pitch: 1,
  azureKey: '',
  azureRegion: '',
  showKey: false,
  onboardingCompleted: false,
};

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface TTSMessage {
  type: 'PLAY_STREAMING_TTS' | 'STOP_AUDIO' | 'PING' | 'AUDIO_STATUS_CHANGED';
  text?: string;
  settings?: Partial<Settings>;
  credentials?: {
    azureKey: string;
    azureRegion: string;
  };
  state?: PlaybackState;
}
