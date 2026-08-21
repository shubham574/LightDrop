import { describe, it, expect } from 'vitest';
import {
  prepareTransfer,
  createManifestFrame,
  createFountainFrame,
  decodeBinaryFrame,
  verifyChecksum,
  decompressData,
} from './protocol';
import { FountainDecoder } from './fountain';

describe('Integration: Full Fountain Transfer Flow', () => {
  const testCases = [
    { name: 'small text', content: 'Hello World!', type: 'text/plain' },
    { name: 'larger text', content: 'Lorem ipsum '.repeat(100), type: 'text/plain' },
    { name: 'binary data', content: new Uint8Array([0, 1, 2, 255, 254, 253, 128, 64]), type: 'application/octet-stream' },
    { name: 'json data', content: JSON.stringify({ key: 'value', array: [1, 2, 3], nested: { a: 'b' } }), type: 'application/json' },
  ];

  for (const testCase of testCases) {
    describe(`${testCase.name}`, () => {
      it('should complete full encode/decode/reconstruct cycle', async () => {
        const content = typeof testCase.content === 'string'
          ? testCase.content
          : new TextDecoder().decode(testCase.content);
        const file = new File([content], `${testCase.name}.bin`, { type: testCase.type });

        // Sender side
        const { manifest, encoder, sourceData } = await prepareTransfer(file, { blockSize: 128 });

        // Generate frames (manifest + enough fountain frames)
        const frames: Uint8Array[] = [];
        frames.push(createManifestFrame(manifest));
        
        const numSymbols = Math.max(100, manifest.totalBlocks * 5);
        for (let i = 0; i < numSymbols; i++) {
          frames.push(createFountainFrame(encoder, manifest.transferId));
        }

        // Receiver side
        let decodedManifest: any = null;
        let decoder: FountainDecoder | null = null;

        for (const frame of frames) {
          const decoded = decodeBinaryFrame(frame);
          expect(decoded).not.toBeNull();

          if (decoded!.type === 'manifest') {
            decodedManifest = decoded!.manifest;
            if (!decoder) {
              decoder = new FountainDecoder(decodedManifest.totalBlocks, decodedManifest.blockSize);
            }
          } else if (decoded!.type === 'fountain' && decoder) {
            decoder.addSymbol(decoded!.symbol.seed, decoded!.symbol.data);
            if (decoder.isComplete) break;
          }
        }

        expect(decoder).not.toBeNull();
        expect(decoder!.isComplete).toBe(true);

        // Reconstruct
        const decodedData = decoder!.getDecodedData(decodedManifest.compressed ? (decodedManifest.compressedSize || decodedManifest.fileSize) : decodedManifest.fileSize);
        let finalData = decodedData;
        
        if (decodedManifest.compressed) {
          finalData = await decompressData(decodedData);
        }

        // Verify
        const isValid = await verifyChecksum(finalData, decodedManifest.checksum);
        expect(isValid).toBe(true);

        const reconstructedContent = new TextDecoder().decode(finalData);
        expect(reconstructedContent).toBe(content);
      });
    });
  }

  describe('Edge Cases', () => {
    it('should handle order-independent reception (fountain property)', async () => {
      const content = 'This is a test of the order independent fountain codes '.repeat(50);
      const file = new File([content], 'order.txt', { type: 'text/plain' });

      const { manifest, encoder } = await prepareTransfer(file, { blockSize: 64 });
      
      const fountainFrames: Uint8Array[] = [];
      const numSymbols = Math.max(100, manifest.totalBlocks * 5);
      for (let i = 0; i < numSymbols; i++) {
        fountainFrames.push(createFountainFrame(encoder, manifest.transferId));
      }

      // Shuffle frames
      const shuffledFrames = [...fountainFrames].sort(() => Math.random() - 0.5);

      const decoder = new FountainDecoder(manifest.totalBlocks, manifest.blockSize);
      for (const frame of shuffledFrames) {
        const decoded = decodeBinaryFrame(frame);
        if (decoded && decoded.type === 'fountain') {
          decoder.addSymbol(decoded.symbol.seed, decoded.symbol.data);
          if (decoder.isComplete) break;
        }
      }

      expect(decoder.isComplete).toBe(true);
      const decodedData = decoder.getDecodedData(manifest.compressed ? (manifest.compressedSize || manifest.fileSize) : manifest.fileSize);
      let finalData = decodedData;
      if (manifest.compressed) finalData = await decompressData(decodedData);
      
      const isValid = await verifyChecksum(finalData, manifest.checksum);
      expect(isValid).toBe(true);
    });
  });
});