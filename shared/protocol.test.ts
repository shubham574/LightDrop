import { describe, it, expect, beforeEach } from 'vitest';
import {
  createFramePayload,
  serializeFrame,
  deserializeFrame,
  calculateFrameChecksum,
  validateFrameChecksum,
  generateTransferId,
  getFileSizeBucket,
  estimateFrames,
  estimateDuration,
} from './protocol';
import { PROTOCOL_VERSION, FRAME_TYPES, DEFAULT_CHUNK_SIZE, REDUNDANCY_RATIOS } from './constants';

describe('Protocol', () => {
  describe('Frame Payload', () => {
    it('should create a valid frame payload', () => {
      const frame = createFramePayload(
        'test-transfer-id',
        5,
        100,
        'test-payload',
        'checksum123',
        FRAME_TYPES.DATA
      );

      expect(frame.protocolVersion).toBe(PROTOCOL_VERSION);
      expect(frame.transferId).toBe('test-transfer-id');
      expect(frame.frameIndex).toBe(5);
      expect(frame.totalFrames).toBe(100);
      expect(frame.payload).toBe('test-payload');
      expect(frame.checksum).toBe('checksum123');
      expect(frame.frameType).toBe(FRAME_TYPES.DATA);
    });

    it('should serialize and deserialize frame correctly', () => {
      const frame = createFramePayload(
        'test-id',
        1,
        10,
        'payload-data',
        'abc123',
        FRAME_TYPES.METADATA
      );

      const serialized = serializeFrame(frame);
      const deserialized = deserializeFrame(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized!.transferId).toBe('test-id');
      expect(deserialized!.frameIndex).toBe(1);
      expect(deserialized!.frameType).toBe(FRAME_TYPES.METADATA);
    });

    it('should return null for invalid JSON', () => {
      const result = deserializeFrame('not valid json');
      expect(result).toBeNull();
    });

    it('should return null for missing required fields', () => {
      const result = deserializeFrame('{"protocolVersion": 1}');
      expect(result).toBeNull();
    });

    it('should calculate and validate checksum correctly', () => {
      const payload = 'test payload data';
      const checksum = calculateFrameChecksum(payload);
      
      const frame = createFramePayload(
        'test-id',
        1,
        10,
        payload,
        checksum,
        FRAME_TYPES.DATA
      );

      expect(validateFrameChecksum(frame)).toBe(true);
    });

    it('should detect invalid checksum', () => {
      const frame = createFramePayload(
        'test-id',
        1,
        10,
        'payload',
        'wrong-checksum',
        FRAME_TYPES.DATA
      );

      expect(validateFrameChecksum(frame)).toBe(false);
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

  describe('File Size Bucketing', () => {
    it('should categorize file sizes correctly', () => {
      expect(getFileSizeBucket(500)).toBe('tiny');
      expect(getFileSizeBucket(1024 * 500)).toBe('small');
      expect(getFileSizeBucket(5 * 1024 * 1024)).toBe('medium');
      expect(getFileSizeBucket(50 * 1024 * 1024)).toBe('large');
      expect(getFileSizeBucket(200 * 1024 * 1024)).toBe('xlarge');
    });
  });

  describe('Frame Estimation', () => {
    it('should estimate frames correctly', () => {
      const fileSize = 1024 * 1024; // 1 MB
      const chunkSize = DEFAULT_CHUNK_SIZE;
      const redundancyRatio = REDUNDANCY_RATIOS.MEDIUM;

      const frames = estimateFrames(fileSize, chunkSize, redundancyRatio);
      
      const dataFrames = Math.ceil(fileSize / chunkSize);
      const parityFrames = Math.ceil(dataFrames * redundancyRatio);
      const expectedTotal = dataFrames + parityFrames + 2; // +2 for metadata and complete

      expect(frames).toBe(expectedTotal);
    });
  });

  describe('Duration Estimation', () => {
    it('should estimate duration correctly', () => {
      const frameCount = 1000;
      const fps = 5;
      
      const durationMs = estimateDuration(frameCount, fps);
      const expectedMs = Math.ceil((frameCount / fps) * 1000);
      
      expect(durationMs).toBe(expectedMs);
    });
  });
});