import { TextProcessor } from '../textProcessor.js';

describe('TextProcessor', () => {
  let textProcessor;

  beforeEach(() => {
    textProcessor = new TextProcessor();
  });

  describe('splitIntoChunks', () => {
    test('should split text into chunks based on sentence boundaries', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const chunks = textProcessor.splitIntoChunks(text);

      expect(chunks).toHaveLength(3);
      expect(chunks[0].text).toBe('First sentence.');
      expect(chunks[1].text).toBe('Second sentence!');
      expect(chunks[2].text).toBe('Third sentence?');
    });

    test('should handle text without punctuation', () => {
      const text = 'Single line of text without punctuation';
      const chunks = textProcessor.splitIntoChunks(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(text);
    });

    test('should respect max characters per chunk', () => {
      const processor = new TextProcessor(20);
      const text = 'This is a very long sentence that should be split into multiple chunks because it exceeds the maximum character limit.';

      const chunks = processor.splitIntoChunks(text);

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.text.length).toBeLessThanOrEqual(20);
      });
    });

    test('should assign proper order to chunks', () => {
      const text = 'First. Second. Third.';
      const chunks = textProcessor.splitIntoChunks(text);

      expect(chunks[0].order).toBe(0);
      expect(chunks[1].order).toBe(1);
      expect(chunks[2].order).toBe(2);
    });

    test('should handle empty text', () => {
      const chunks = textProcessor.splitIntoChunks('');
      expect(chunks).toHaveLength(0);
    });
  });

  describe('segmentByPunctuation', () => {
    test('should segment text by line breaks and punctuation', () => {
      const text = 'Line one: with colon.\nLine two; with semicolon,\nLine three!';
      const segments = textProcessor.segmentByPunctuation(text);

      expect(segments.length).toBeGreaterThan(3);
      expect(segments.some(s => s.type === 'colon')).toBe(true);
      expect(segments.some(s => s.type === 'semicolon')).toBe(true);
      expect(segments.some(s => s.type === 'sentence')).toBe(true);
    });

    test('should handle text with only line breaks', () => {
      const text = 'First line\nSecond line\nThird line';
      const segments = textProcessor.segmentByPunctuation(text);

      expect(segments).toHaveLength(3);
      segments.forEach(segment => {
        expect(segment.type).toBe('line_end');
      });
    });

    test('should handle single line text', () => {
      const text = 'Single line of text';
      const segments = textProcessor.segmentByPunctuation(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe('complete');
    });

    test('should assign correct punctuation types', () => {
      const text = 'Question? Statement. Exclamation! Colon: Semicolon; Comma,';
      const segments = textProcessor.segmentByPunctuation(text);

      const types = segments.map(s => s.type);
      expect(types).toContain('sentence');
      expect(types).toContain('colon');
      expect(types).toContain('semicolon');
      expect(types).toContain('comma');
    });
  });

  describe('getPunctuationType', () => {
    test('should identify sentence punctuation', () => {
      expect(textProcessor.getPunctuationType('.')).toBe('sentence');
      expect(textProcessor.getPunctuationType('!')).toBe('sentence');
      expect(textProcessor.getPunctuationType('?')).toBe('sentence');
    });

    test('should identify colon punctuation', () => {
      expect(textProcessor.getPunctuationType(':')).toBe('colon');
    });

    test('should identify semicolon punctuation', () => {
      expect(textProcessor.getPunctuationType(';')).toBe('semicolon');
    });

    test('should identify comma punctuation', () => {
      expect(textProcessor.getPunctuationType(',')).toBe('comma');
    });

    test('should fall back to generic punctuation', () => {
      expect(textProcessor.getPunctuationType('-')).toBe('punctuation');
    });
  });

  describe('escapeXmlChars', () => {
    test('should escape XML special characters', () => {
      const text = '<tag>content & "quotes" \'apostrophe\'</tag>';
      const escaped = textProcessor.escapeXmlChars(text);

      expect(escaped).toBe('&lt;tag&gt;content &amp; &quot;quotes&quot; &apos;apostrophe&apos;&lt;/tag&gt;');
    });

    test('should handle text without special characters', () => {
      const text = 'Normal text without special characters';
      const escaped = textProcessor.escapeXmlChars(text);

      expect(escaped).toBe(text);
    });

    test('should handle empty text', () => {
      const escaped = textProcessor.escapeXmlChars('');
      expect(escaped).toBe('');
    });
  });
});