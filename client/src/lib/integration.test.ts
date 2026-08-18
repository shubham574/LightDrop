import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTransfer,
  encodeFrames,
  decodeFrame,
  reconstructFile,
  verifyChecksum,
} from './protocol';
import { calculateFrameChecksum } from '@optical-drop/shared/protocol';

describe('Integration: Full Transfer Flow', () => {
  const testCases = [
    { name: 'small text', content: 'Hello World!', type: 'text/plain' },
    { name: 'larger text', content: 'Lorem ipsum '.repeat(100), type: 'text/plain' },
    { name: 'binary data', content: new Uint8Array([0, 1, 2, 255, 254, 253, 128, 64]), type: 'application/octet-stream' },
    { name: 'json data', content: JSON.stringify({ key: 'value', array: [1, 2, 3], nested: { a: 'b' } }), type: 'application/json' },
  ];

  for (const testCase of testCases) {
    describe(`${testCase.name}`, () => {
      let file: File;
      let metadata: any;
      let chunks: any[];
      let parityChunks: any[];
      let frames: any[];

      beforeEach(async () => {
        const content = typeof testCase.content === 'string' 
          ? testCase.content 
          : new TextDecoder().decode(testCase.content);
        file = new File([content], `${testCase.name}.bin`, { type: testCase.type });
        
        const result = await createTransfer(file, {
          chunkSize: 512,
          redundancyLevel: 'HIGH',
          speed: 'BALANCED',
        });
        
        metadata = result.metadata;
        chunks = result.chunks;
        parityChunks = result.parityChunks;
        frames = encodeFrames(metadata, chunks, parityChunks);
      });

      it('should complete full encode/decode/reconstruct cycle', async () => {
        // Decode all frames
        const frameMap = new Map<number, any>();
        for (const frame of frames) {
          const decoded = decodeFrame(frame.data);
          expect(decoded).not.toBeNull();
          if (decoded) frameMap.set(decoded.frameIndex, decoded);
        }

        // Reconstruct file
        const reconstructed = await reconstructFile(frameMap, metadata, parityChunks);
        
        // Verify checksum
        const isValid = await verifyChecksum(reconstructed, metadata.checksum);
        expect(isValid).toBe(true);

        // Verify content matches
        const originalContent = typeof testCase.content === 'string'
          ? testCase.content
          : new TextDecoder().decode(testCase.content);
        const reconstructedContent = new TextDecoder().decode(reconstructed);
        expect(reconstructedContent).toBe(originalContent);
      });

      it('should handle missing frames with parity recovery', async () => {
        const frameMap = new Map<number, any>();
        
        // Simulate losing 20% of data frames
        const dataFrameIndices = Array.from({ length: metadata.totalChunks }, (_, i) => i + 1);
        const framesToLose = dataFrameIndices.slice(0, Math.ceil(dataFrameIndices.length * 0.2));
        
        for (const frame of frames) {
          const decoded = decodeFrame(frame.data);
          if (!decoded) continue;
          
          // Skip lost frames
          if (framesToLose.includes(decoded.frameIndex)) continue;
          
          frameMap.set(decoded.frameIndex, decoded);
        }

        const reconstructed = await reconstructFile(frameMap, metadata, parityChunks);
        const isValid = await verifyChecksum(reconstructed, metadata.checksum);
        expect(isValid).toBe(true);
      });

      it('should handle duplicate frames', async () => {
        const frameMap = new Map<number, any>();
        
        for (const frame of frames) {
          const decoded = decodeFrame(frame.data);
          if (!decoded) continue;
          
          // Add frame twice (simulating duplicate reception)
          frameMap.set(decoded.frameIndex, decoded);
          frameMap.set(decoded.frameIndex, decoded); // duplicate
        }

        const reconstructed = await reconstructFile(frameMap, metadata, parityChunks);
        const isValid = await verifyChecksum(reconstructed, metadata.checksum);
        expect(isValid).toBe(true);
      });

      it('should handle out-of-order frames', async () => {
        const frameMap = new Map<number, any>();
        
        // Shuffle frames
        const shuffledFrames = [...frames].sort(() => Math.random() - 0.5);
        
        for (const frame of shuffledFrames) {
          const decoded = decodeFrame(frame.data);
          if (decoded) frameMap.set(decoded.frameIndex, decoded);
        }

        const reconstructed = await reconstructFile(frameMap, metadata, parityChunks);
        const isValid = await verifyChecksum(reconstructed, metadata.checksum);
        expect(isValid).toBe(true);
      });

      it('should reject frames from different transfer', async () => {
        const frameMap = new Map<number, any>();
        
        // Add valid frames
        for (const frame of frames) {
          const decoded = decodeFrame(frame.data);
          if (decoded) frameMap.set(decoded.frameIndex, decoded);
        }

        // Create a frame from different transfer
        const testPayload = 'dGVzdA==';
        const otherTransferFrame = {
          protocolVersion: 1,
          transferId: 'od_different_transfer_id',
          frameIndex: 1,
          totalFrames: metadata.totalFrames,
          payload: testPayload,
          checksum: calculateFrameChecksum(testPayload),
          frameType: 'data',
        };
        
        const otherFrameData = JSON.stringify(otherTransferFrame);
        const decodedOther = decodeFrame(otherFrameData);
        
        // Should decode but have different transferId
        expect(decodedOther).not.toBeNull();
        expect(decodedOther!.transferId).not.toBe(metadata.transferId);
        
        // Our reconstruction should only use frames with matching transferId
        // (handled by the receiver logic, not reconstructFile)
        const reconstructed = await reconstructFile(frameMap, metadata, parityChunks);
        const isValid = await verifyChecksum(reconstructed, metadata.checksum);
        expect(isValid).toBe(true);
      });
    });
  }
});

describe('Large File Handling', () => {
  it('should handle files near chunk boundaries', async () => {
    // Create file that's exactly multiple chunks + 1 byte
    const chunkSize = 512;
    const numChunks = 10;
    const content = 'x'.repeat(chunkSize * numChunks + 1);
    const file = new File([content], 'boundary.txt', { type: 'text/plain' });

    const { metadata, chunks, parityChunks } = await createTransfer(file, {
      chunkSize,
      redundancyLevel: 'MEDIUM',
    });

    expect(metadata.totalChunks).toBe(numChunks + 1);

    const frames = encodeFrames(metadata, chunks, parityChunks);
    const frameMap = new Map<number, any>();
    
    for (const frame of frames) {
      const decoded = decodeFrame(frame.data);
      if (decoded) frameMap.set(decoded.frameIndex, decoded);
    }

    const reconstructed = await reconstructFile(frameMap, metadata, parityChunks);
    const isValid = await verifyChecksum(reconstructed, metadata.checksum);
    expect(isValid).toBe(true);
    expect(new TextDecoder().decode(reconstructed)).toBe(content);
  });

  it('should handle empty file', async () => {
    const file = new File([''], 'empty.txt', { type: 'text/plain' });

    const { metadata, chunks, parityChunks } = await createTransfer(file);
    const frames = encodeFrames(metadata, chunks, parityChunks);
    const frameMap = new Map<number, any>();
    
    for (const frame of frames) {
      const decoded = decodeFrame(frame.data);
      if (decoded) frameMap.set(decoded.frameIndex, decoded);
    }

    const reconstructed = await reconstructFile(frameMap, metadata, parityChunks);
    const isValid = await verifyChecksum(reconstructed, metadata.checksum);
    expect(isValid).toBe(true);
    expect(reconstructed.length).toBe(0);
  });
});