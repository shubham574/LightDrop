import {
  PROTOCOL_VERSION,
  DEFAULT_CHUNK_SIZE,
  REDUNDANCY_RATIOS,
  TRANSMISSION_SPEEDS,
  TransmissionSpeed,
} from '@optical-drop/shared/constants';
import type { FramePayload } from '@optical-drop/shared/types';
import type { FrameType } from '@optical-drop/shared/constants';
import {
  generateTransferId,
  calculateFrameChecksum,
  estimateFrames,
  estimateDuration,
  getFileSizeBucket,
} from '@optical-drop/shared/protocol';
import { TransferMetadata, ChunkData, ParityChunk, EncodedFrame } from '@optical-drop/shared/types';

export interface TransferConfig {
  chunkSize: number;
  redundancyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  speed: TransmissionSpeed;
}

export const DEFAULT_TRANSFER_CONFIG: TransferConfig = {
  chunkSize: DEFAULT_CHUNK_SIZE,
  redundancyLevel: 'LOW',
  speed: 'EXTREME',
};

export async function createTransfer(
  file: File,
  config: Partial<TransferConfig> = {}
): Promise<{ metadata: TransferMetadata; chunks: ChunkData[]; parityChunks: ParityChunk[] }> {
  const finalConfig = { ...DEFAULT_TRANSFER_CONFIG, ...config };
  
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  const checksum = await calculateSHA256(uint8Array);
  const transferId = generateTransferId();
  
  const chunks = chunkData(uint8Array, finalConfig.chunkSize);
  const parityChunks = generateParityChunks(chunks, REDUNDANCY_RATIOS[finalConfig.redundancyLevel]);
  
  const totalFrames = chunks.length + parityChunks.length + 2;
  
  const metadata: TransferMetadata = {
    transferId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    chunkSize: finalConfig.chunkSize,
    totalChunks: chunks.length,
    checksum,
    protocolVersion: PROTOCOL_VERSION,
    createdAt: Date.now(),
    redundancyLevel: finalConfig.redundancyLevel,
  };
  
  return { metadata, chunks, parityChunks };
}

function chunkData(data: Uint8Array, chunkSize: number): ChunkData[] {
  const chunks: ChunkData[] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const checksum = calculateSimpleChecksum(chunk);
    chunks.push({
      index: chunks.length,
      data: chunk,
      checksum,
    });
  }
  return chunks;
}

function generateParityChunks(chunks: ChunkData[], redundancyRatio: number): ParityChunk[] {
  const parityCount = Math.ceil(chunks.length * redundancyRatio);
  const parityChunks: ParityChunk[] = [];
  
  for (let i = 0; i < parityCount; i++) {
    const sourceIndices: number[] = [];
    const parityData = new Uint8Array(chunks[0]?.data.length || 0);
    
    for (let j = i; j < chunks.length; j += parityCount) {
      sourceIndices.push(j);
      for (let k = 0; k < chunks[j].data.length; k++) {
        parityData[k] ^= chunks[j].data[k];
      }
    }
    
    parityChunks.push({
      index: i,
      data: parityData,
      sourceIndices,
    });
  }
  
  return parityChunks;
}

export function encodeFrames(
  metadata: TransferMetadata,
  chunks: ChunkData[],
  parityChunks: ParityChunk[]
): EncodedFrame[] {
  const frames: EncodedFrame[] = [];
  const totalDataFrames = chunks.length;
  const totalParityFrames = parityChunks.length;
  const totalFrames = totalDataFrames + totalParityFrames + 2;
  
  const metadataPayload = JSON.stringify({
    fileName: metadata.fileName,
    fileSize: metadata.fileSize,
    mimeType: metadata.mimeType,
    chunkSize: metadata.chunkSize,
    totalChunks: metadata.totalChunks,
    checksum: metadata.checksum,
    redundancyLevel: metadata.redundancyLevel,
  });
  
  const metadataFrame: FramePayload = {
    protocolVersion: PROTOCOL_VERSION,
    transferId: metadata.transferId,
    frameIndex: 0,
    totalFrames,
    payload: metadataPayload,
    checksum: calculateFrameChecksum(metadataPayload),
    frameType: 'metadata',
  };
  
  frames.push({
    data: JSON.stringify(metadataFrame),
    frameIndex: 0,
    totalFrames,
    frameType: 'metadata',
  });
  
  for (let i = 0; i < chunks.length; i++) {
    const payload = arrayBufferToBase64(chunks[i].data);
    const frame: FramePayload = {
      protocolVersion: PROTOCOL_VERSION,
      transferId: metadata.transferId,
      frameIndex: i + 1,
      totalFrames,
      payload,
      checksum: calculateFrameChecksum(payload),
      frameType: 'data',
    };
    frames.push({
      data: JSON.stringify(frame),
      frameIndex: i + 1,
      totalFrames,
      frameType: 'data',
    });
  }
  
  for (let i = 0; i < parityChunks.length; i++) {
    const payload = arrayBufferToBase64(parityChunks[i].data);
    const frame: FramePayload = {
      protocolVersion: PROTOCOL_VERSION,
      transferId: metadata.transferId,
      frameIndex: totalDataFrames + 1 + i,
      totalFrames,
      payload,
      checksum: calculateFrameChecksum(payload),
      frameType: 'parity',
    };
    frames.push({
      data: JSON.stringify(frame),
      frameIndex: totalDataFrames + 1 + i,
      totalFrames,
      frameType: 'parity',
    });
  }
  
  const completePayload = JSON.stringify({ complete: true });
  const completeFrame: FramePayload = {
    protocolVersion: PROTOCOL_VERSION,
    transferId: metadata.transferId,
    frameIndex: totalFrames - 1,
    totalFrames,
    payload: completePayload,
    checksum: calculateFrameChecksum(completePayload),
    frameType: 'complete',
  };
  
  frames.push({
    data: JSON.stringify(completeFrame),
    frameIndex: totalFrames - 1,
    totalFrames,
    frameType: 'complete',
  });
  
  return frames;
}

export function decodeFrame(data: string): FramePayload | null {
  try {
    const frame = JSON.parse(data) as FramePayload;
    if (frame.protocolVersion !== PROTOCOL_VERSION) return null;
    if (frame.checksum !== calculateFrameChecksum(frame.payload)) return null;
    return frame;
  } catch {
    return null;
  }
}

export async function reconstructFile(
  frames: Map<number, FramePayload>,
  metadata: TransferMetadata,
  parityChunks: ParityChunk[]
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = new Array(metadata.totalChunks);
  let receivedCount = 0;
  
  for (const [index, frame] of frames) {
    if (frame.frameType === 'data' && frame.frameIndex > 0 && frame.frameIndex <= metadata.totalChunks) {
      const chunkIndex = frame.frameIndex - 1;
      if (!chunks[chunkIndex]) {
        chunks[chunkIndex] = base64ToArrayBuffer(frame.payload);
        receivedCount++;
      }
    }
  }
  
  const missingIndices: number[] = [];
  for (let i = 0; i < metadata.totalChunks; i++) {
    if (!chunks[i]) missingIndices.push(i);
  }
  
  if (missingIndices.length > 0) {
    recoverMissingChunks(chunks, missingIndices, parityChunks);
  }
  
  const result = new Uint8Array(metadata.fileSize);
  let offset = 0;
  for (let i = 0; i < metadata.totalChunks; i++) {
    const chunk = chunks[i];
    if (chunk) {
      const remainingBytes = metadata.fileSize - offset;
      const copyLength = Math.min(chunk.length, remainingBytes);
      result.set(chunk.subarray(0, copyLength), offset);
      offset += copyLength;
    }
  }
  
  return result;
}

function recoverMissingChunks(
  chunks: (Uint8Array | undefined)[],
  missingIndices: number[],
  parityChunks: ParityChunk[]
): void {
  for (const parity of parityChunks) {
    const missingInParity = parity.sourceIndices.filter(idx => missingIndices.includes(idx));
    if (missingInParity.length === 1) {
      const missingIdx = missingInParity[0];
      const recovered = new Uint8Array(parity.data);
      
      for (const sourceIdx of parity.sourceIndices) {
        if (sourceIdx !== missingIdx && chunks[sourceIdx]) {
          for (let k = 0; k < recovered.length; k++) {
            recovered[k] ^= chunks[sourceIdx]![k];
          }
        }
      }
      
      chunks[missingIdx] = recovered;
      const idx = missingIndices.indexOf(missingIdx);
      if (idx !== -1) missingIndices.splice(idx, 1);
    }
  }
}

export async function verifyChecksum(data: Uint8Array, expectedChecksum: string): Promise<boolean> {
  const actualChecksum = await calculateSHA256(data);
  return actualChecksum === expectedChecksum;
}

async function calculateSHA256(data: Uint8Array): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to fallback
    }
  }

  // Pure JS fallback hash (64 hex characters) for non-secure HTTP contexts
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x811c9dc5, h4 = 0x62a9d9e1;
  for (let i = 0; i < data.length; i++) {
    const b = data[i];
    h1 = Math.imul(h1 ^ b, 2654435761);
    h2 = Math.imul(h2 ^ b, 1597334677);
    h3 = Math.imul(h3 ^ b, 3812015801);
    h4 = Math.imul(h4 ^ b, 2246822507);
  }
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const p4 = (h4 >>> 0).toString(16).padStart(8, '0');
  return (p1 + p2 + p3 + p4).repeat(2);
}

function calculateSimpleChecksum(data: Uint8Array): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash;
  }
  return hash.toString(16).padStart(8, '0');
}

function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function getTransferEstimates(fileSize: number, config: TransferConfig) {
  const totalFrames = estimateFrames(fileSize, config.chunkSize, REDUNDANCY_RATIOS[config.redundancyLevel]);
  const speedConfig = TRANSMISSION_SPEEDS[config.speed] || TRANSMISSION_SPEEDS.EXTREME;
  const fps = speedConfig.fps || 30;
  const durationMs = estimateDuration(totalFrames, fps);
  
  return {
    totalFrames,
    estimatedDurationMs: durationMs,
    estimatedDuration: formatDuration(durationMs),
    dataRate: `${((fileSize / 1024) / (durationMs / 1000 || 1)).toFixed(1)} KB/s`,
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

export function getFileSizeBucketName(size: number): string {
  return getFileSizeBucket(size);
}