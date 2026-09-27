/**
 * Simple Text Transfer — single-QR fast path for short text snippets.
 *
 * For text ≤ MAX_SIMPLE_TEXT_SIZE bytes, we skip fountain coding entirely.
 * The sender displays ONE static QR code; the receiver decodes it in a single scan.
 *
 * Frame format (binary):
 *   [0..3]  MAGIC bytes  0x4C 0x44 0x54 0x58  ("LDTX")
 *   [4..]   UTF-8 encoded text
 *
 * The receiver checks for MAGIC before trying binary fountain frame parsing.
 */

export const SIMPLE_TEXT_MAGIC = new Uint8Array([0x4c, 0x44, 0x54, 0x58]); // "LDTX"

/**
 * Maximum text byte length that fits safely in a single QR v40-L code.
 * QR v40-L binary capacity = 2953 bytes; subtract 4 bytes for magic = 2949.
 * We use a conservative limit of 1800 bytes for reliable scanning.
 */
export const MAX_SIMPLE_TEXT_BYTES = 1800;

/**
 * Encode a short text string into a simple-transfer binary frame.
 * Throws if the encoded text exceeds MAX_SIMPLE_TEXT_BYTES.
 */
export function encodeSimpleText(text: string): Uint8Array {
  const textBytes = new TextEncoder().encode(text);
  if (textBytes.length > MAX_SIMPLE_TEXT_BYTES) {
    throw new Error(
      `Text too long for simple mode (${textBytes.length} bytes > ${MAX_SIMPLE_TEXT_BYTES} limit). Use fountain mode instead.`
    );
  }
  const out = new Uint8Array(SIMPLE_TEXT_MAGIC.length + textBytes.length);
  out.set(SIMPLE_TEXT_MAGIC, 0);
  out.set(textBytes, SIMPLE_TEXT_MAGIC.length);
  return out;
}

/**
 * Try to decode a binary buffer as a simple text frame.
 * Returns the decoded string if the magic bytes match, otherwise null.
 */
export function decodeSimpleText(data: Uint8Array): string | null {
  if (data.length < SIMPLE_TEXT_MAGIC.length) return null;
  for (let i = 0; i < SIMPLE_TEXT_MAGIC.length; i++) {
    if (data[i] !== SIMPLE_TEXT_MAGIC[i]) return null;
  }
  try {
    return new TextDecoder().decode(data.slice(SIMPLE_TEXT_MAGIC.length));
  } catch {
    return null;
  }
}

/**
 * Check whether a text string qualifies for simple (single-QR) mode.
 */
export function isSimpleTextEligible(text: string): boolean {
  return new TextEncoder().encode(text).length <= MAX_SIMPLE_TEXT_BYTES;
}
