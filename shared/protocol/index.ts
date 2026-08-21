import { PROTOCOL_VERSION, MANIFEST_MAGIC, FRAME_TYPE_MANIFEST, FRAME_TYPE_FOUNTAIN, FOUNTAIN_FRAME_HEADER_SIZE } from '../constants';
import { TransferManifest, FountainSymbol, BinaryFrameHeader } from '../types';

// --- Binary frame serialization ---

export function serializeBinaryFrame(
  transferId: string,
  frameType: number,
  seed: number,
  totalBlocks: number,
  blockSize: number,
  payload: Uint8Array
): Uint8Array {
  const header = new ArrayBuffer(FOUNTAIN_FRAME_HEADER_SIZE);
  const view = new DataView(header);
  
  view.setUint16(0, MANIFEST_MAGIC, false);      // big-endian magic
  view.setUint8(2, PROTOCOL_VERSION);
  view.setUint16(3, hashTransferId(transferId), false);
  view.setUint8(5, frameType);
  view.setUint32(6, seed, false);
  view.setUint16(10, payload.length, false);
  view.setUint16(12, totalBlocks, false);
  view.setUint16(14, blockSize, false);
  view.setUint32(16, 0, false); // reserved
  
  const frame = new Uint8Array(FOUNTAIN_FRAME_HEADER_SIZE + payload.length);
  frame.set(new Uint8Array(header), 0);
  frame.set(payload, FOUNTAIN_FRAME_HEADER_SIZE);
  
  return frame;
}

export function deserializeBinaryFrame(data: Uint8Array): { header: BinaryFrameHeader, payload: Uint8Array } | null {
  if (data.length < FOUNTAIN_FRAME_HEADER_SIZE) return null;
  
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  
  const magic = view.getUint16(0, false);
  if (magic !== MANIFEST_MAGIC) return null;
  
  const version = view.getUint8(2);
  if (version !== PROTOCOL_VERSION) return null;
  
  const header: BinaryFrameHeader = {
    magic,
    version,
    transferIdHash: view.getUint16(3, false),
    frameType: view.getUint8(5),
    seed: view.getUint32(6, false),
    payloadLength: view.getUint16(10, false),
    totalBlocks: view.getUint16(12, false),
    blockSize: view.getUint16(14, false),
    reserved: view.getUint32(16, false),
  };
  
  if (data.length < FOUNTAIN_FRAME_HEADER_SIZE + header.payloadLength) return null;
  
  const payload = data.slice(FOUNTAIN_FRAME_HEADER_SIZE, FOUNTAIN_FRAME_HEADER_SIZE + header.payloadLength);
  
  return { header, payload };
}

// --- Manifest serialization ---

export function serializeManifest(manifest: TransferManifest): Uint8Array {
  const json = JSON.stringify(manifest);
  return new TextEncoder().encode(json);
}

export function deserializeManifest(payload: Uint8Array): TransferManifest | null {
  try {
    const json = new TextDecoder().decode(payload);
    return JSON.parse(json) as TransferManifest;
  } catch {
    return null;
  }
}

// --- Utilities ---

export function generateTransferId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `od_${timestamp}_${random}`;
}

export function hashTransferId(transferId: string): number {
  let hash = 0;
  for (let i = 0; i < transferId.length; i++) {
    hash = ((hash << 5) - hash) + transferId.charCodeAt(i);
    hash = hash & hash;
  }
  return (hash >>> 0) & 0xFFFF;
}

export function getFileSizeBucket(size: number): string {
  if (size < 1024) return 'tiny';
  if (size < 1024 * 1024) return 'small';
  if (size < 10 * 1024 * 1024) return 'medium';
  if (size < 100 * 1024 * 1024) return 'large';
  return 'xlarge';
}

export function estimateSymbolsNeeded(totalBlocks: number, overhead: number = 1.15): number {
  return Math.ceil(totalBlocks * overhead);
}

export function estimateDuration(symbolCount: number, fps: number): number {
  return Math.ceil((symbolCount / fps) * 1000);
}