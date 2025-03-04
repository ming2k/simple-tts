/**
 * Language configuration
 */
export const languageConfig = {
  // Chinese language group
  zh: {
    name: 'Chinese',
    pattern: /[\u4E00-\u9FFF\u3400-\u4DBF]/, // Chinese characters
    defaultVoice: 'zh-CN-XiaoxiaoNeural'
  },

  // Japanese language group
  ja: {
    name: 'Japanese',
    pattern: /[\u3040-\u309F\u30A0-\u30FF]/, // Hiragana and Katakana
    defaultVoice: 'ja-JP-NanamiNeural'
  },

  // English language group
  en: {
    name: 'English',
    pattern: /[a-zA-Z]/, // Latin characters
    defaultVoice: 'en-US-JennyNeural'
  }
};

/**
 * Get language code from region code
 */
export function getLanguageFromRegion(regionCode) {
  return regionCode.split('-')[0];
}

/**
 * Get available voices for a region
 */
export function getVoicesForRegion(regionCode) {
  const langCode = getLanguageFromRegion(regionCode);
  const language = languageConfig[langCode];
  return language?.regions[regionCode]?.voices || [];
}

/**
 * Detect language from text
 */
export function detectLanguage(text) {
  if (!text) return { code: 'en' };

  const charCounts = {};
  let totalCount = 0;

  // Count characters matching each language pattern
  for (const [code, lang] of Object.entries(languageConfig)) {
    const matches = text.match(new RegExp(lang.pattern, 'g'));
    const count = matches ? matches.length : 0;
    charCounts[code] = count;
    totalCount += count;
  }

  // Find the dominant language
  let maxCount = 0;
  let detectedCode = 'en';

  for (const [code, count] of Object.entries(charCounts)) {
    if (count > maxCount) {
      maxCount = count;
      detectedCode = code;
    }
  }

  return {
    code: detectedCode,
    confidence: totalCount > 0 ? maxCount / totalCount : 0
  };
}

/**
 * Get available voices for a language
 */
export function getVoicesForLanguage(langCode) {
  return languageConfig[langCode]?.voices || languageConfig.en.voices;
}

/**
 * Get default voice for a language
 */
export function getDefaultVoice(langCode) {
  return languageConfig[langCode]?.defaultVoice || languageConfig.en.defaultVoice;
} 