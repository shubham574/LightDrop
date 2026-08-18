import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTransfer,
  encodeFrames,
  decodeFrame,
  reconstructFile,
  verifyChecksum,
  getTransferEstimates,
} from './protocol';
import { PROTOCOL_VERSION, DEFAULT_CHUNK_SIZE, REDUNDANCY_RATIOS } from '@optical-drop/shared/constants';

describe('Client Protocol', () => {
  const testFileContent = 'Hello, OpticalDrop! This is a test file for transfer. '.repeat(30);
  const testFile = new File([testFileContent], 'test.txt', { type: 'text/plain' });

  describe('createTransfer', () => {
    it('should create transfer metadata and chunks', async () => {
      const { metadata, chunks, parityChunks } = await createTransfer(testFile);

      expect(metadata.transferId).toMatch(/^od_/);
      expect(metadata.fileName).toBe('test.txt');
      expect(metadata.fileSize).toBe(testFile.size);
      expect(metadata.mimeType).toBe('text/plain');
      expect(metadata.chunkSize).toBe(DEFAULT_CHUNK_SIZE);
      expect(metadata.totalChunks).toBeGreaterThan(0);
      expect(metadata.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(metadata.protocolVersion).toBe(PROTOCOL_VERSION);
      expect(metadata.redundancyLevel).toBe('LOW');

      expect(chunks.length).toBe(metadata.totalChunks);
      expect(parityChunks.length).toBeGreaterThan(0);
    });

    it('should respect custom chunk size', async () => {
      const { metadata, chunks } = await createTransfer(testFile, { chunkSize: 512 });
      
      expect(metadata.chunkSize).toBe(512);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should respect custom redundancy level', async () => {
      const multiChunkFile = new File(['A'.repeat(5000)], 'multi.txt', { type: 'text/plain' });
      const { parityChunks: parityLow } = await createTransfer(multiChunkFile, { chunkSize: 512, redundancyLevel: 'LOW' });
      const { parityChunks: parityHigh } = await createTransfer(multiChunkFile, { chunkSize: 512, redundancyLevel: 'HIGH' });

      expect(parityHigh.length).toBeGreaterThan(parityLow.length);
    });
  });

  describe('encodeFrames', () => {
    it('should encode frames with correct structure', async () => {
      const { metadata, chunks, parityChunks } = await createTransfer(testFile);
      const frames = encodeFrames(metadata, chunks, parityChunks);

      expect(frames.length).toBe(chunks.length + parityChunks.length + 2); // +2 for metadata and complete

      // Check metadata frame
      const metadataFrame = frames[0];
      expect(metadataFrame.frameType).toBe('metadata');
      expect(metadataFrame.frameIndex).toBe(0);
      const metaPayload = JSON.parse(metadataFrame.data).payload;
      const metaData = JSON.parse(metaPayload);
      expect(metaData.fileName).toBe('test.txt');
      expect(metaData.checksum).toBe(metadata.checksum);

      // Check data frames
      for (let i = 1; i <= chunks.length; i++) {
        const frame = frames[i];
        expect(frame.frameType).toBe('data');
        expect(frame.frameIndex).toBe(i);
      }

      // Check parity frames
      for (let i = 0; i < parityChunks.length; i++) {
        const frame = frames[chunks.length + 1 + i];
        expect(frame.frameType).toBe('parity');
        expect(frame.frameIndex).toBe(chunks.length + 1 + i);
      }

      // Check complete frame
      const completeFrame = frames[frames.length - 1];
      expect(completeFrame.frameType).toBe('complete');
      expect(completeFrame.frameIndex).toBe(frames.length - 1);
    });
  });

  describe('decodeFrame', () => {
    it('should decode valid frames', async () => {
      const { metadata, chunks, parityChunks } = await createTransfer(testFile);
      const frames = encodeFrames(metadata, chunks, parityChunks);

      for (const frame of frames) {
        const decoded = decodeFrame(frame.data);
        expect(decoded).not.toBeNull();
        expect(decoded!.transferId).toBe(metadata.transferId);
        expect(decoded!.protocolVersion).toBe(PROTOCOL_VERSION);
      }
    });

    it('should reject frames with wrong protocol version', () => {
      const invalidFrame = JSON.stringify({
        protocolVersion: 999,
        transferId: 'test',
        frameIndex: 1,
        totalFrames: 10,
        payload: 'test',
        checksum: 'abc',
        frameType: 'data',
      });

      expect(decodeFrame(invalidFrame)).toBeNull();
    });

    it('should reject frames with invalid checksum', () => {
      const invalidFrame = JSON.stringify({
        protocolVersion: PROTOCOL_VERSION,
        transferId: 'test',
        frameIndex: 1,
        totalFrames: 10,
        payload: 'test',
        checksum: 'invalid-checksum',
        frameType: 'data',
      });

      expect(decodeFrame(invalidFrame)).toBeNull();
    });

    it('should reject malformed JSON', () => {
      expect(decodeFrame('not json')).toBeNull();
    });
  });

  describe('reconstructFile', () => {
    it('should reconstruct file from all frames', async () => {
      const { metadata, chunks, parityChunks } = await createTransfer(testFile);
      const frames = encodeFrames(metadata, chunks, parityChunks);

      const frameMap = new Map<number, any>();
      for (const frame of frames) {
        const decoded = decodeFrame(frame.data);
        if (decoded) frameMap.set(decoded.frameIndex, decoded);
      }

      const reconstructed = await reconstructFile(frameMap, metadata, parityChunks);
      const originalBytes = new TextEncoder().encode(testFileContent);

      expect(reconstructed.length).toBe(originalBytes.length);
      expect(new TextDecoder().decode(reconstructed)).toBe(testFileContent);
    });

    it('should handle missing frames with parity recovery', async () => {
      const { metadata, chunks, parityChunks } = await createTransfer(testFile);
      const frames = encodeFrames(metadata, chunks, parityChunks);

      const frameMap = new Map<number, any>();
      // Skip one data frame to test parity recovery
      for (let i = 0; i < frames.length; i++) {
        if (i === 2) continue; // Skip frame 2 (first data frame after metadata)
        const decoded = decodeFrame(frames[i].data);
        if (decoded) frameMap.set(decoded.frameIndex, decoded);
      }

      const reconstructed = await reconstructFile(frameMap, metadata, parityChunks);
      const originalBytes = new TextEncoder().encode(testFileContent);

      expect(reconstructed.length).toBe(originalBytes.length);
      expect(new TextDecoder().decode(reconstructed)).toBe(testFileContent);
    });
  });

  describe('verifyChecksum', () => {
    it('should verify correct checksum', async () => {
      const { metadata, chunks, parityChunks } = await createTransfer(testFile);
      const frames = encodeFrames(metadata, chunks, parityChunks);

      const frameMap = new Map<number, any>();
      for (const frame of frames) {
        const decoded = decodeFrame(frame.data);
        if (decoded) frameMap.set(decoded.frameIndex, decoded);
      }

      const reconstructed = await reconstructFile(frameMap, metadata, parityChunks);
      const isValid = await verifyChecksum(reconstructed, metadata.checksum);

      expect(isValid).toBe(true);
    });

    it('should reject corrupted data', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const wrongChecksum = 'wrong-checksum';
      
      const isValid = await verifyChecksum(data, wrongChecksum);
      expect(isValid).toBe(false);
    });
  });

  describe('getTransferEstimates', () => {
    it('should provide accurate estimates', () => {
      const fileSize = 1024 * 1024; // 1 MB
      const estimates = getTransferEstimates(fileSize, {
        chunkSize: DEFAULT_CHUNK_SIZE,
        redundancyLevel: 'MEDIUM',
        speed: 'BALANCED',
      });

      expect(estimates.totalFrames).toBeGreaterThan(0);
      expect(estimates.estimatedDurationMs).toBeGreaterThan(0);
      expect(estimates.estimatedDuration).toMatch(/\d+(\.\d+)?(ms|s|m)/);
      expect(estimates.dataRate).toMatch(/\d+(\.\d+)? KB\/s/);
    });
  });
});