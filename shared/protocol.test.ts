import { describe, it, expect } from 'vitest';
import {
  serializeBinaryFrame,
  deserializeBinaryFrame,
  serializeManifest,
  deserializeManifest,
  generateTransferId,
  hashTransferId,
  getFileSizeBucket,
  estimateSymbolsNeeded,
  estimateDuration,
} from './protocol';
import { PROTOCOL_VERSION, MANIFEST_MAGIC, FRAME_TYPE_FOUNTAIN, FRAME_TYPE_MANIFEST } from './constants';
import { TransferManifest } from './types';

describe('Protocol', () => {
  describe('Binary Frame Serialization', () => {
    it('should serialize and deserialize a binary fountain frame correctly', () => {
      const transferId = 'od_123_abc';
      const frameType = FRAME_TYPE_FOUNTAIN;
      const seed = 12345;
      const totalBlocks = 1000;
      const blockSize = 256;
      const payload = new Uint8Array([1, 2, 3, 4, 5]);

      const serialized = serializeBinaryFrame(
        transferId,
        frameType,
        seed,
        totalBlocks,
        blockSize,
        payload
      );

      const deserialized = deserializeBinaryFrame(serialized);

      expect(deserialized).not.toBeNull();
      const { header, payload: deserializedPayload } = deserialized!;

      expect(header.magic).toBe(MANIFEST_MAGIC);
      expect(header.version).toBe(PROTOCOL_VERSION);
      expect(header.transferIdHash).toBe(hashTransferId(transferId));
      expect(header.frameType).toBe(frameType);
      expect(header.seed).toBe(seed);
      expect(header.totalBlocks).toBe(totalBlocks);
      expect(header.blockSize).toBe(blockSize);
      expect(header.payloadLength).toBe(payload.length);
      expect(Array.from(deserializedPayload)).toEqual(Array.from(payload));
    });

    it('should return null for invalid magic bytes', () => {
      const serialized = serializeBinaryFrame('test', FRAME_TYPE_FOUNTAIN, 1, 10, 256, new Uint8Array([1]));
      // Corrupt magic bytes
      serialized[0] = 0x00;
      serialized[1] = 0x00;
      
      const result = deserializeBinaryFrame(serialized);
      expect(result).toBeNull();
    });

    it('should return null for mismatched protocol version', () => {
      const serialized = serializeBinaryFrame('test', FRAME_TYPE_FOUNTAIN, 1, 10, 256, new Uint8Array([1]));
      // Corrupt version
      serialized[2] = 99;
      
      const result = deserializeBinaryFrame(serialized);
      expect(result).toBeNull();
    });

    it('should return null for truncated data', () => {
      const serialized = serializeBinaryFrame('test', FRAME_TYPE_FOUNTAIN, 1, 10, 256, new Uint8Array([1, 2, 3, 4, 5]));
      
      const result = deserializeBinaryFrame(serialized.slice(0, 15)); // cut header
      expect(result).toBeNull();

      const result2 = deserializeBinaryFrame(serialized.slice(0, 22)); // cut payload
      expect(result2).toBeNull();
    });
  });

  describe('Manifest Serialization', () => {
    it('should serialize and deserialize manifest correctly', () => {
      const manifest: TransferManifest = {
        transferId: 'test-id',
        fileName: 'test.txt',
        fileSize: 1024,
        mimeType: 'text/plain',
        blockSize: 256,
        totalBlocks: 4,
        checksum: 'abc123hash',
        protocolVersion: PROTOCOL_VERSION,
        createdAt: Date.now(),
        compressed: false,
      };

      const serialized = serializeManifest(manifest);
      const deserialized = deserializeManifest(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized).toEqual(manifest);
    });

    it('should return null for invalid manifest JSON', () => {
      const invalidPayload = new TextEncoder().encode('not valid json');
      const result = deserializeManifest(invalidPayload);
      expect(result).toBeNull();
    });
  });

  describe('Transfer ID Generation', () => {
    it('should generate unique transfer IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateTransferId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate IDs with correct prefix', () => {
      const id = generateTransferId();
      expect(id.startsWith('od_')).toBe(true);
    });
  });

  describe('Transfer ID Hashing', () => {
    it('should generate consistent 16-bit hashes', () => {
      const id1 = 'od_123_abc';
      const id2 = 'od_123_def';
      
      const hash1 = hashTransferId(id1);
      const hash1b = hashTransferId(id1);
      const hash2 = hashTransferId(id2);

      expect(hash1).toBe(hash1b); // deterministic
      expect(hash1).not.toBe(hash2); // usually distinct
      expect(hash1).toBeGreaterThanOrEqual(0);
      expect(hash1).toBeLessThanOrEqual(0xFFFF);
    });
  });

  describe('File Size Bucketing', () => {
    it('should categorize file sizes correctly', () => {
      expect(getFileSizeBucket(500)).toBe('tiny');
      expect(getFileSizeBucket(1024 * 500)).toBe('small');
      expect(getFileSizeBucket(5 * 1024 * 1024)).toBe('medium');
      expect(getFileSizeBucket(50 * 1024 * 1024)).toBe('large');
      expect(getFileSizeBucket(200 * 1024 * 1024)).toBe('xlarge');
    });
  });

  describe('Estimation', () => {
    it('should estimate symbols correctly', () => {
      const totalBlocks = 100;
      expect(estimateSymbolsNeeded(totalBlocks)).toBe(115); // 1.15 overhead
      expect(estimateSymbolsNeeded(totalBlocks, 1.5)).toBe(150); // custom overhead
    });

    it('should estimate duration correctly', () => {
      const symbolCount = 300;
      const fps = 30;
      
      const durationMs = estimateDuration(symbolCount, fps);
      expect(durationMs).toBe(10000); // 10 seconds
    });
  });
});