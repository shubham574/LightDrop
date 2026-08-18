import { FrameType, PROTOCOL_VERSION } from '../constants';
import { FramePayload } from '../types';

export interface ProtocolConfig {
  version: number;
  chunkSize: number;
  redundancyRatio: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
}

export const DEFAULT_PROTOCOL_CONFIG: ProtocolConfig = {
  version: PROTOCOL_VERSION,
  chunkSize: 1024,
  redundancyRatio: 0.2,
  errorCorrectionLevel: 'M',
};

export function createFramePayload(
  transferId: string,
  frameIndex: number,
  totalFrames: number,
  payload: string,
  checksum: string,
  frameType: FrameType
): FramePayload {
  return {
    protocolVersion: PROTOCOL_VERSION,
    transferId,
    frameIndex,
    totalFrames,
    payload,
    checksum,
    frameType,
  };
}

export function serializeFrame(frame: FramePayload): string {
  return JSON.stringify(frame);
}

export function deserializeFrame(data: string): FramePayload | null {
  try {
    const parsed = JSON.parse(data);
    if (!validateFrameStructure(parsed)) {
      return null;
    }
    return parsed as FramePayload;
  } catch {
    return null;
  }
}

function validateFrameStructure(obj: unknown): obj is FramePayload {
  if (!obj || typeof obj !== 'object') return false;
  const frame = obj as Record<string, unknown>;
  return (
    typeof frame.protocolVersion === 'number' &&
    typeof frame.transferId === 'string' &&
    typeof frame.frameIndex === 'number' &&
    typeof frame.totalFrames === 'number' &&
    typeof frame.payload === 'string' &&
    typeof frame.checksum === 'string' &&
    typeof frame.frameType === 'string' &&
    ['metadata', 'data', 'parity', 'complete'].includes(frame.frameType as string)
  );
}

export function calculateFrameChecksum(payload: string): string {
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16).padStart(8, '0');
}

export function validateFrameChecksum(frame: FramePayload): boolean {
  const expectedChecksum = calculateFrameChecksum(frame.payload);
  return frame.checksum === expectedChecksum;
}

export function generateTransferId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `od_${timestamp}_${random}`;
}

export function getFileSizeBucket(size: number): string {
  if (size < 1024) return 'tiny';
  if (size < 1024 * 1024) return 'small';
  if (size < 10 * 1024 * 1024) return 'medium';
  if (size < 100 * 1024 * 1024) return 'large';
  return 'xlarge';
}

export function estimateFrames(fileSize: number, chunkSize: number, redundancyRatio: number): number {
  const dataFrames = Math.ceil(fileSize / chunkSize);
  const parityFrames = Math.ceil(dataFrames * redundancyRatio);
  return dataFrames + parityFrames + 2;
}

export function estimateDuration(
  frameCount: number,
  fps: number
): number {
  return Math.ceil((frameCount / fps) * 1000);
}