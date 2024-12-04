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

document.addEventListener('DOMContentLoaded', function() {
    const speakButton = document.getElementById('speakButton');
    const sourceText = document.getElementById('sourceText');
    const status = document.getElementById('status');

    speakButton.addEventListener('click', async function() {
        const text = sourceText.value.trim();
        if (!text) {
            showStatus('Please enter some text', true);
            return;
        }

        try {
            showStatus('Generating speech...');
            const audio = await textToSpeech(text);
            await playAudio(audio);
            showStatus('Speech completed');
        } catch (error) {
            console.error('TTS Error:', error);
            const errorMessage = error.message || 'Failed to generate or play speech';
            showStatus(errorMessage, true);
            if (errorMessage.includes('settings not configured')) {
                browser.runtime.openOptionsPage();
            }
        }
    });
});

function showStatus(message, isError = false) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = 'status-message' + (isError ? ' error' : '');
}

async function textToSpeech(text) {
    const settings = await browser.storage.sync.get({
        speechRegion: '',
        speechKey: ''
    });

    if (!settings.speechRegion || !settings.speechKey) {
        throw new Error('Speech settings not configured. Please check the extension options.');
    }

    const ssml = `
        <speak version='1.0' xml:lang='en-US'>
            <voice xml:lang='en-US' xml:gender='Female' name='en-US-AvaMultilingualNeural'>
                ${escapeXml(text)}
            </voice>
        </speak>
    `;

    const response = await fetch(
        `https://${settings.speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': settings.speechKey,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
                'User-Agent': 'FasterTranslate'
            },
            body: ssml
        }
    );

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Invalid speech credentials. Please check your settings.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.arrayBuffer();
}

function playAudio(audioData) {
    return new Promise((resolve, reject) => {
        try {
            const blob = new Blob([audioData], { type: 'audio/mp3' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            
            audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
            };

            audio.onerror = (error) => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to play audio: ' + (error.message || 'Unknown error')));
            };

            // Start playing
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    URL.revokeObjectURL(url);
                    reject(new Error('Failed to start playback: ' + error.message));
                });
            }
        } catch (error) {
            reject(new Error('Error setting up audio playback: ' + error.message));
        }
    });
}

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
} 