import {
  PROTOCOL_VERSION,
  DEFAULT_BLOCK_SIZE,
  TRANSMISSION_SPEEDS,
  FRAME_TYPE_MANIFEST,
  FRAME_TYPE_FOUNTAIN,
  DEFAULT_FOUNTAIN_OVERHEAD,
  TransmissionSpeed,
} from '@light-drop/shared/constants';
import type { TransferManifest, FountainSymbol } from '@light-drop/shared/types';
import {
  generateTransferId,
  hashTransferId,
  serializeBinaryFrame,
  deserializeBinaryFrame,
  serializeManifest,
  deserializeManifest,
  getFileSizeBucket,
  estimateSymbolsNeeded,
  estimateDuration,
} from '@light-drop/shared/protocol';
import { FountainEncoder, FountainDecoder } from '@/lib/fountain';

export interface TransferConfig {
  blockSize: number;
  speed: TransmissionSpeed;
}

export const DEFAULT_TRANSFER_CONFIG: TransferConfig = {
  blockSize: DEFAULT_BLOCK_SIZE,
  speed: 'EXTREME',
};

export interface PreparedTransfer {
  manifest: TransferManifest;
  encoder: FountainEncoder;
  sourceData: Uint8Array;
}

export async function prepareTransfer(
  file: File,
  config: Partial<TransferConfig> = {}
): Promise<PreparedTransfer> {
  const finalConfig = { ...DEFAULT_TRANSFER_CONFIG, ...config };

  const arrayBuffer = await file.arrayBuffer();
  let sourceData = new Uint8Array(arrayBuffer);

  // Try gzip compression
  let compressed = false;
  let compressedSize: number | undefined;
  try {
    const compressedData = await compressData(sourceData);
    if (compressedData.length < sourceData.length * 0.9) {
      compressedSize = compressedData.length;
      sourceData = compressedData as any;
      compressed = true;
    }
  } catch {
    // Compression not available, use raw data
  }

  const checksum = await calculateSHA256(sourceData);
  const transferId = generateTransferId();
  const encoder = new FountainEncoder(sourceData, finalConfig.blockSize);

  const manifest: TransferManifest = {
    transferId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    blockSize: finalConfig.blockSize,
    totalBlocks: encoder.totalBlocks,
    checksum,
    protocolVersion: PROTOCOL_VERSION,
    createdAt: Date.now(),
    compressed,
    compressedSize,
  };

  return { manifest, encoder, sourceData };
}

export function createManifestFrame(manifest: TransferManifest): Uint8Array {
  const payload = serializeManifest(manifest);
  return serializeBinaryFrame(
    manifest.transferId,
    FRAME_TYPE_MANIFEST,
    0,
    manifest.totalBlocks,
    manifest.blockSize,
    payload
  );
}

export function createFountainFrame(
  encoder: FountainEncoder,
  transferId: string
): Uint8Array {
  const symbol = encoder.nextSymbol();
  return serializeBinaryFrame(
    transferId,
    FRAME_TYPE_FOUNTAIN,
    symbol.seed,
    encoder.totalBlocks,
    encoder.blockSize,
    symbol.data
  );
}

export function decodeBinaryFrame(data: Uint8Array): {
  type: 'manifest';
  manifest: TransferManifest;
} | {
  type: 'fountain';
  symbol: FountainSymbol;
  totalBlocks: number;
  blockSize: number;
  transferIdHash: number;
} | null {
  const parsed = deserializeBinaryFrame(data);
  if (!parsed) return null;

  const { header, payload } = parsed;

  if (header.frameType === FRAME_TYPE_MANIFEST) {
    const manifest = deserializeManifest(payload);
    if (!manifest) return null;
    return { type: 'manifest', manifest };
  }

  if (header.frameType === FRAME_TYPE_FOUNTAIN) {
    return {
      type: 'fountain',
      symbol: { seed: header.seed, data: payload },
      totalBlocks: header.totalBlocks,
      blockSize: header.blockSize,
      transferIdHash: header.transferIdHash,
    };
  }

  return null;
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

  // Pure JS fallback hash for non-secure HTTP contexts
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

async function compressData(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('CompressionStream not available');
  }
  const stream = new Blob([data as any]).stream().pipeThrough(new CompressionStream('gzip'));
  const blob = await new Response(stream).blob();
  return new Uint8Array((await blob.arrayBuffer()) as ArrayBuffer);
}

export async function decompressData(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream not available');
  }
  const stream = new Blob([data as any]).stream().pipeThrough(new DecompressionStream('gzip'));
  const blob = await new Response(stream).blob();
  return new Uint8Array((await blob.arrayBuffer()) as ArrayBuffer);
}

export function getTransferEstimates(fileSize: number, config: TransferConfig) {
  const totalBlocks = Math.ceil(fileSize / config.blockSize);
  const symbolsNeeded = estimateSymbolsNeeded(totalBlocks);
  const speedConfig = TRANSMISSION_SPEEDS[config.speed] || TRANSMISSION_SPEEDS.EXTREME;
  const fps = speedConfig.fps || 30;
  const durationMs = estimateDuration(symbolsNeeded, fps);

  return {
    totalBlocks,
    symbolsNeeded,
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