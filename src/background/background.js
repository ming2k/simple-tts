browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === 'translate') {
    try {
      // Get user's preferred target language from settings
      const settings = await browser.storage.sync.get({ targetLang: 'en' });
      
      // For this example, we'll use Google Translate API
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${settings.targetLang}&dt=t&q=${encodeURIComponent(message.text)}`);
      const data = await response.json();
      
      return {
        translatedText: data[0][0][0]
      };
    } catch (error) {
      console.error('Translation error:', error);
      return {
        translatedText: 'Translation failed'
      };
    }
  }
});
