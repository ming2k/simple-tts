export class TextProcessor {
  constructor(maxCharsPerRequest = 1000) {
    this.maxCharsPerRequest = maxCharsPerRequest;
  }

  splitIntoChunks(text) {
    const sentences = text.match(/[^.!?]+[.!?]+[\s\n]*/g) || [text];
    const chunks = [];
    let currentChunk = '';

    sentences.forEach((sentence, index) => {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length === 0) return;

      if (currentChunk.length + trimmedSentence.length > this.maxCharsPerRequest && currentChunk.length > 0) {
        chunks.push({
          id: chunks.length,
          text: currentChunk.trim(),
          order: chunks.length
        });
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk.length > 0 ? ' ' : '') + trimmedSentence;
      }

      if (index === sentences.length - 1 && currentChunk.length > 0) {
        chunks.push({
          id: chunks.length,
          text: currentChunk.trim(),
          order: chunks.length
        });
      }
    });

    return chunks;
  }

  segmentByPunctuation(text) {
    const segments = [];
    let segmentOrder = 0;

    const lines = text.split(/\n+/);

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const allBreaks = /([.!?:;,]+)/;
      const parts = trimmedLine.split(allBreaks);
      let currentSegment = '';

      for (const part of parts) {
        if (!part) continue;

        if (allBreaks.test(part)) {
          currentSegment += part;
          if (currentSegment.trim()) {
            segments.push({
              id: segmentOrder++,
              text: currentSegment.trim(),
              order: segmentOrder - 1,
              type: this.getPunctuationType(part)
            });
            currentSegment = '';
          }
        } else {
          const trimmedPart = part.trim();
          if (!trimmedPart) continue;

          if (currentSegment.length + trimmedPart.length > this.maxCharsPerRequest && currentSegment.trim()) {
            segments.push({
              id: segmentOrder++,
              text: currentSegment.trim(),
              order: segmentOrder - 1,
              type: 'chunk'
            });
            currentSegment = trimmedPart;
          } else {
            currentSegment += (currentSegment.trim() ? ' ' : '') + trimmedPart;
          }
        }
      }

      if (currentSegment.trim()) {
        segments.push({
          id: segmentOrder++,
          text: currentSegment.trim(),
          order: segmentOrder - 1,
          type: 'line_end'
        });
      }
    }

    if (segments.length === 0 && text.trim()) {
      segments.push({
        id: 0,
        text: text.trim(),
        order: 0,
        type: 'complete'
      });
    }

    return segments;
  }

  getPunctuationType(punctuation) {
    if (/[.!?]/.test(punctuation)) return 'sentence';
    if (/[:]/.test(punctuation)) return 'colon';
    if (/[;]/.test(punctuation)) return 'semicolon';
    if (/[,]/.test(punctuation)) return 'comma';
    return 'punctuation';
  }

  escapeXmlChars(text) {
    const xmlChars = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return text.replace(/[<>&'"]/g, (char) => xmlChars[char] || char);
  }
}