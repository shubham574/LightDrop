import { describe, it, expect } from 'vitest';
import {
  encodeSimpleText,
  decodeSimpleText,
  isSimpleTextEligible,
  MAX_SIMPLE_TEXT_BYTES,
  SIMPLE_TEXT_MAGIC,
} from './simpleTextTransfer';

describe('Simple Text Transfer', () => {
  describe('encodeSimpleText', () => {
    it('should prepend magic bytes to encoded text', () => {
      const text = 'Hello, World!';
      const encoded = encodeSimpleText(text);

      // First 4 bytes should be LDTX magic
      expect(encoded[0]).toBe(0x4c);
      expect(encoded[1]).toBe(0x44);
      expect(encoded[2]).toBe(0x54);
      expect(encoded[3]).toBe(0x58);

      // Remaining bytes should be UTF-8 encoded text
      const textBytes = new TextEncoder().encode(text);
      expect(Array.from(encoded.slice(4))).toEqual(Array.from(textBytes));
    });

    it('should encode empty text', () => {
      const encoded = encodeSimpleText('');
      expect(encoded.length).toBe(SIMPLE_TEXT_MAGIC.length);
      expect(encoded).toEqual(SIMPLE_TEXT_MAGIC);
    });

    it('should encode a URL link', () => {
      const url = 'https://example.com/path?q=test&foo=bar';
      const encoded = encodeSimpleText(url);
      expect(encoded.length).toBe(SIMPLE_TEXT_MAGIC.length + new TextEncoder().encode(url).length);
    });

    it('should throw when text exceeds MAX_SIMPLE_TEXT_BYTES', () => {
      const longText = 'x'.repeat(MAX_SIMPLE_TEXT_BYTES + 1);
      expect(() => encodeSimpleText(longText)).toThrow();
    });

    it('should handle multibyte UTF-8 characters (emoji)', () => {
      const text = '🎉 Hello! 🚀';
      const encoded = encodeSimpleText(text);
      const decoded = decodeSimpleText(encoded);
      expect(decoded).toBe(text);
    });
  });

  describe('decodeSimpleText', () => {
    it('should decode an encoded simple text frame', () => {
      const original = 'LightDrop rocks!';
      const encoded = encodeSimpleText(original);
      const decoded = decodeSimpleText(encoded);
      expect(decoded).toBe(original);
    });

    it('should return null for wrong magic bytes', () => {
      const wrong = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x48, 0x69]);
      expect(decodeSimpleText(wrong)).toBeNull();
    });

    it('should return null for fountain frame data (starts with 0x4F 0x44)', () => {
      // Fountain frames start with MANIFEST_MAGIC 0x4F44 — not LDTX
      const fountainLike = new Uint8Array([0x4f, 0x44, 0x02, 0x00, 0x01]);
      expect(decodeSimpleText(fountainLike)).toBeNull();
    });

    it('should return null for empty data', () => {
      expect(decodeSimpleText(new Uint8Array([]))).toBeNull();
    });

    it('should return null for data shorter than magic', () => {
      expect(decodeSimpleText(new Uint8Array([0x4c, 0x44]))).toBeNull();
    });

    it('should handle roundtrip for text with newlines and special chars', () => {
      const text = 'Line 1\nLine 2\n\tTabbed\n"Quoted" & <tags>';
      const encoded = encodeSimpleText(text);
      const decoded = decodeSimpleText(encoded);
      expect(decoded).toBe(text);
    });
  });

  describe('isSimpleTextEligible', () => {
    it('should return true for short text', () => {
      expect(isSimpleTextEligible('Hello!')).toBe(true);
    });

    it('should return true for text exactly at the limit', () => {
      const atLimit = 'a'.repeat(MAX_SIMPLE_TEXT_BYTES);
      expect(isSimpleTextEligible(atLimit)).toBe(true);
    });

    it('should return false for text over the limit', () => {
      const overLimit = 'a'.repeat(MAX_SIMPLE_TEXT_BYTES + 1);
      expect(isSimpleTextEligible(overLimit)).toBe(false);
    });

    it('should account for multibyte characters in byte count', () => {
      // Each emoji is 4 bytes in UTF-8 — 450 emojis = 1800 bytes (at limit)
      const atLimit = '🎯'.repeat(450);
      expect(isSimpleTextEligible(atLimit)).toBe(true);
      
      // 451 emojis = 1804 bytes (over limit)
      const overLimit = '🎯'.repeat(451);
      expect(isSimpleTextEligible(overLimit)).toBe(false);
    });
  });
});
