document.getElementById('openSettings').addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

// Add translation functionality
document.getElementById('translateBtn').addEventListener('click', async () => {
  const sourceText = document.getElementById('sourceText').value;
  const targetLang = document.getElementById('targetLang').value;
  const resultText = document.getElementById('resultText');

  if (!sourceText.trim()) return;

  resultText.value = 'Translating...';

  try {
    const response = await browser.runtime.sendMessage({
      action: 'translate',
      text: sourceText,
      targetLang: targetLang
    });

    resultText.value = response.translatedText;
  } catch (error) {
    resultText.value = 'Translation failed';
  }
}); 