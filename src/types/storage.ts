export interface Settings {
  // API credentials
  azureKey: string;
  azureRegion: string;
  // Voice settings
  voice: string;
  rate: number;
  pitch: number;
  // UI state
  showKey?: boolean;
}

export const defaultSettings: Settings = {
  azureKey: '',
  azureRegion: '',
  voice: 'en-US-AvaMultilingualNeural',
  rate: 1.0,
  pitch: 1.0,
  showKey: false,
};

export function isSettings(obj: unknown): obj is Settings {
  if (!obj || typeof obj !== 'object') return false;
  const s = obj as Settings;
  return (
    typeof s.azureKey === 'string' &&
    typeof s.azureRegion === 'string' &&
    typeof s.voice === 'string' &&
    typeof s.rate === 'number' &&
    typeof s.pitch === 'number'
  );
}
