/**
 * Language configuration
 */
export const languageConfig = {
  // Chinese language group
  zh: {
    name: "Chinese",
    pattern: /[\u4E00-\u9FFF\u3400-\u4DBF]/, // Chinese characters
    defaultVoice: "zh-CN-XiaoxiaoNeural",
  },

  // Japanese language group
  ja: {
    name: "Japanese",
    pattern: /[\u3040-\u309F\u30A0-\u30FF]/, // Hiragana and Katakana
    defaultVoice: "ja-JP-NanamiNeural",
  },

  // English language group
  en: {
    name: "English",
    pattern: /[a-zA-Z]/, // Latin characters
    defaultVoice: "en-US-JennyNeural",
  },
};

/**
 * Get language code from region code
 */
export function getLanguageFromRegion(regionCode) {
  return regionCode.split("-")[0];
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
 * Analyze text and determine language composition with percentages
 * @param {string} text - Text to analyze
 * @returns {Object} Language composition with percentages and dominant language
 */
export function analyzeTextLanguage(text) {
  if (!text) return { dominant: "en", composition: {} };

  // Define regex patterns for different character types
  const patterns = {
    zh: {
      name: "Chinese",
      pattern: /[\u4E00-\u9FFF\u3400-\u4DBF]/g, // Chinese characters
    },
    ja: {
      name: "Japanese",
      pattern: /[\u3040-\u309F\u30A0-\u30FF]/g, // Hiragana and Katakana
    },
    en: {
      name: "English/Latin",
      pattern: /[a-zA-Z]/g, // Latin alphabet
    },
    num: {
      name: "Numbers",
      pattern: /[0-9]/g, // Numbers
    },
  };

  // Count characters for each language
  const counts = {};
  let totalCount = 0;

  // Initialize counts
  Object.keys(patterns).forEach((lang) => {
    counts[lang] = 0;
  });

  // Count meaningful characters (excluding spaces and punctuation)
  const meaningfulText = text.replace(/[\s\p{P}]/gu, "");

  // Count characters for each language
  Object.entries(patterns).forEach(([lang, { pattern }]) => {
    const matches = meaningfulText.match(pattern);
    counts[lang] = matches ? matches.length : 0;
    totalCount += counts[lang];
  });

  // Calculate percentages and find dominant language
  const composition = {};
  let maxPercentage = 0;
  let dominant = "en"; // Default to English

  Object.entries(counts).forEach(([lang, count]) => {
    const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
    composition[lang] = {
      count,
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      name: patterns[lang].name,
    };

    // Update dominant language (excluding numbers)
    if (lang !== "num" && percentage > maxPercentage) {
      maxPercentage = percentage;
      dominant = lang;
    }
  });

  // Special case: if Chinese percentage is significant (> 20%), consider it Chinese
  if (composition.zh.percentage > 20) {
    dominant = "zh";
  }

  return {
    dominant,
    composition,
    confidence: maxPercentage / 100,
  };
}

/**
 * Simple function to determine if text is primarily Chinese
 * @param {string} text - Text to analyze
 * @returns {boolean} True if text is primarily Chinese
 */
export function isPrimarilyChinese(text) {
  const analysis = analyzeTextLanguage(text);
  return analysis.dominant === "zh";
}

/**
 * Detect language from text
 */
export function detectLanguage(text) {
  if (!text) return { code: "en" };

  const charCounts = {};
  let totalCount = 0;

  // Count characters matching each language pattern
  for (const [code, lang] of Object.entries(languageConfig)) {
    const matches = text.match(new RegExp(lang.pattern, "g"));
    const count = matches ? matches.length : 0;
    charCounts[code] = count;
    totalCount += count;
  }

  // Find the dominant language
  let maxCount = 0;
  let detectedCode = "en";

  for (const [code, count] of Object.entries(charCounts)) {
    if (count > maxCount) {
      maxCount = count;
      detectedCode = code;
    }
  }

  return {
    code: detectedCode,
    confidence: totalCount > 0 ? maxCount / totalCount : 0,
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
  return (
    languageConfig[langCode]?.defaultVoice || languageConfig.en.defaultVoice
  );
}
