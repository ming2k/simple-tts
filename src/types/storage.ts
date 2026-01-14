// Voice settings per language/locale
export interface VoiceSettings {
  voice: string;
  rate: number;
  pitch: number;
}

// Language-specific voice settings mapping (for legacy migration)
export interface LanguageVoiceSettings {
  [languageKey: string]: VoiceSettings;
}

// Default values
export const defaultVoiceSettings: VoiceSettings = {
  voice: 'en-US-AvaMultilingualNeural',
  rate: 1.0,
  pitch: 1.0
};

// Type guards for runtime type checking
export function isVoiceSettings(obj: unknown): obj is VoiceSettings {
  return obj !== null &&
    typeof obj === 'object' &&
    'voice' in obj && typeof (obj as VoiceSettings).voice === 'string' &&
    'rate' in obj && typeof (obj as VoiceSettings).rate === 'number' &&
    'pitch' in obj && typeof (obj as VoiceSettings).pitch === 'number';
}

export function isLanguageVoiceSettings(obj: unknown): obj is LanguageVoiceSettings {
  return obj !== null &&
    typeof obj === 'object' &&
    Object.values(obj as Record<string, unknown>).every(value => isVoiceSettings(value));
}
