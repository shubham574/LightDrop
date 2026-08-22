import { describe, it, expect, vi } from 'vitest';
import {
  prepareTransfer,
  createManifestFrame,
  createFountainFrame,
  decodeBinaryFrame,
  verifyChecksum,
  getTransferEstimates,
  DEFAULT_TRANSFER_CONFIG,
} from './protocol';
import { PROTOCOL_VERSION } from '@light-drop/shared/constants';

describe('Client Protocol', () => {
  const testFileContent = 'Hello, LightDrop! This is a test file for transfer. '.repeat(30);
  const testFile = new File([testFileContent], 'test.txt', { type: 'text/plain' });

  describe('prepareTransfer', () => {
    it('should create transfer manifest and fountain encoder', async () => {
      const { manifest, encoder, sourceData } = await prepareTransfer(testFile, { blockSize: 64 });

      expect(manifest.transferId).toMatch(/^od_/);
      expect(manifest.fileName).toBe('test.txt');
      expect(manifest.fileSize).toBe(testFile.size);
      expect(manifest.mimeType).toBe('text/plain');
      expect(manifest.blockSize).toBe(64);
      expect(manifest.totalBlocks).toBeGreaterThan(0);
      expect(manifest.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(manifest.protocolVersion).toBe(PROTOCOL_VERSION);
      expect(manifest.compressed).toBeDefined();

      expect(encoder).toBeDefined();
      expect(encoder.totalBlocks).toBe(manifest.totalBlocks);
      expect(encoder.blockSize).toBe(manifest.blockSize);
      expect(sourceData.length).toBeGreaterThan(0);
    });

    it('should respect custom block size', async () => {
      const { manifest } = await prepareTransfer(testFile, { blockSize: 128 });
      expect(manifest.blockSize).toBe(128);
    });
  });

  describe('Frame encoding and decoding', () => {
    it('should encode and decode a manifest frame', async () => {
      const { manifest } = await prepareTransfer(testFile);
      
      const frameData = createManifestFrame(manifest);
      expect(frameData).toBeInstanceOf(Uint8Array);
      expect(frameData.length).toBeGreaterThan(20);

      const decoded = decodeBinaryFrame(frameData);
      expect(decoded).not.toBeNull();
      expect(decoded!.type).toBe('manifest');
      
      if (decoded?.type === 'manifest') {
        expect(decoded.manifest.transferId).toBe(manifest.transferId);
        expect(decoded.manifest.fileName).toBe(manifest.fileName);
        expect(decoded.manifest.checksum).toBe(manifest.checksum);
      }
    });

    it('should encode and decode a fountain frame', async () => {
      const { manifest, encoder } = await prepareTransfer(testFile);
      
      const frameData = createFountainFrame(encoder, manifest.transferId);
      expect(frameData).toBeInstanceOf(Uint8Array);
      expect(frameData.length).toBe(20 + manifest.blockSize);

      const decoded = decodeBinaryFrame(frameData);
      expect(decoded).not.toBeNull();
      expect(decoded!.type).toBe('fountain');
      
      if (decoded?.type === 'fountain') {
        expect(decoded.symbol.seed).toBe(0); // First seed is 0
        expect(decoded.symbol.data.length).toBe(manifest.blockSize);
        expect(decoded.totalBlocks).toBe(manifest.totalBlocks);
        expect(decoded.blockSize).toBe(manifest.blockSize);
      }
    });

    it('should reject corrupted frames', () => {
      const corruptedData = new Uint8Array([0, 1, 2, 3, 4, 5]);
      expect(decodeBinaryFrame(corruptedData)).toBeNull();
    });
  });

  describe('verifyChecksum', () => {
    it('should verify correct checksum', async () => {
      const { manifest, sourceData } = await prepareTransfer(testFile);
      const isValid = await verifyChecksum(sourceData, manifest.checksum);
      expect(isValid).toBe(true);
    });

    it('should reject corrupted data', async () => {
      const { manifest, sourceData } = await prepareTransfer(testFile);
      
      // Corrupt the data
      const corrupted = new Uint8Array(sourceData);
      corrupted[0] = corrupted[0] ^ 0xFF;
      
      const isValid = await verifyChecksum(corrupted, manifest.checksum);
      expect(isValid).toBe(false);
    });
  });

  describe('getTransferEstimates', () => {
    it('should provide accurate estimates', () => {
      const fileSize = 1024 * 1024; // 1 MB
      const estimates = getTransferEstimates(fileSize, DEFAULT_TRANSFER_CONFIG);

      expect(estimates.totalBlocks).toBeGreaterThan(0);
      expect(estimates.symbolsNeeded).toBeGreaterThan(estimates.totalBlocks);
      expect(estimates.estimatedDurationMs).toBeGreaterThan(0);
      expect(estimates.estimatedDuration).toMatch(/\d+(\.\d+)?(ms|s|m)/);
      expect(estimates.dataRate).toMatch(/\d+(\.\d+)? KB\/s/);
    });
  });
});