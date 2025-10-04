// TypeScript interfaces for browser.storage.local and localStorage data structures

// Settings for Azure TTS configuration
export interface TTSSettings {
  azureKey: string;
  azureRegion: string;
  voice: string;
  rate: number;
  pitch: number;
}

// Voice settings per language/locale
export interface VoiceSettings {
  voice: string;
  rate: number;
  pitch: number;
}

// Language-specific voice settings mapping
export interface LanguageVoiceSettings {
  [languageKey: string]: VoiceSettings;
}

// TTS mini-window position data
export interface TTSWindowPosition {
  bottom?: string;
  right?: string;
  transform?: string;
  xOffset?: number;
  yOffset?: number;
}

// Browser storage data structure
export interface BrowserStorageData {
  // Core settings
  settings?: TTSSettings;

  // Language-specific voice settings
  languageVoiceSettings?: LanguageVoiceSettings;

  // UI state
  onboardingCompleted?: boolean;
  optionsActiveTab?: string;
  lastInput?: string;
}

// localStorage data structure (separate from browser.storage.local)
export interface LocalStorageData {
  'tts-window-position'?: TTSWindowPosition;
  'tts-debug'?: string;
}

// Voice information from Azure API
export interface AzureVoice {
  value: string;
  label: string;
  locale: string;
  gender: string;
  styles: string[];
  isMultilingual: boolean;
}

// Grouped voices by locale
export interface GroupedVoices {
  [locale: string]: AzureVoice[];
}

// Audio status information
export interface AudioStatus {
  isPlaying: boolean;
  hasAudio: boolean;
  hasCache: boolean;
  canReplay: boolean;
  isEnded: boolean;
  isPaused: boolean;
  autoplayBlocked: boolean;
}

// TTS request information for caching/replay
export interface TTSRequest {
  text: string;
  settings: VoiceSettings;
  credentials: {
    azureKey: string;
    azureRegion: string;
  };
}

// Audio operation parameters
export interface AudioOperationParams {
  text?: string;
  settings?: VoiceSettings;
  credentials?: TTSRequest['credentials'];
  ttsService?: any; // Will be properly typed when we convert TTSService
}

// Storage service interface
export interface StorageService {
  // Browser storage methods
  getSettings(): Promise<TTSSettings | undefined>;
  setSettings(settings: TTSSettings): Promise<void>;

  getLanguageVoiceSettings(): Promise<LanguageVoiceSettings | undefined>;
  setLanguageVoiceSettings(settings: LanguageVoiceSettings): Promise<void>;

  getOnboardingCompleted(): Promise<boolean>;
  setOnboardingCompleted(completed: boolean): Promise<void>;

  getLastInput(): Promise<string | undefined>;
  setLastInput(input: string): Promise<void>;

  getOptionsActiveTab(): Promise<string | undefined>;
  setOptionsActiveTab(tab: string): Promise<void>;

  // LocalStorage methods
  getTTSWindowPosition(): TTSWindowPosition | null;
  setTTSWindowPosition(position: TTSWindowPosition): void;

  getTTSDebug(): string | null;
  setTTSDebug(debug: string): void;

  // Generic methods
  getBrowserStorageData(keys: (keyof BrowserStorageData)[]): Promise<Partial<BrowserStorageData>>;
  setBrowserStorageData(data: Partial<BrowserStorageData>): Promise<void>;
}

// Default values
export const defaultTTSSettings: TTSSettings = {
  azureKey: '',
  azureRegion: '',
  voice: 'en-US-JennyNeural',
  rate: 1.0,
  pitch: 1.0
};

export const defaultVoiceSettings: VoiceSettings = {
  voice: 'en-US-JennyNeural',
  rate: 1.0,
  pitch: 1.0
};

// Type guards for runtime type checking
export function isTTSSettings(obj: any): obj is TTSSettings {
  return obj &&
    typeof obj.azureKey === 'string' &&
    typeof obj.azureRegion === 'string' &&
    typeof obj.voice === 'string' &&
    typeof obj.rate === 'number' &&
    typeof obj.pitch === 'number';
}

export function isVoiceSettings(obj: any): obj is VoiceSettings {
  return obj &&
    typeof obj.voice === 'string' &&
    typeof obj.rate === 'number' &&
    typeof obj.pitch === 'number';
}

export function isLanguageVoiceSettings(obj: any): obj is LanguageVoiceSettings {
  return obj && typeof obj === 'object' &&
    Object.values(obj).every(value => isVoiceSettings(value));
}