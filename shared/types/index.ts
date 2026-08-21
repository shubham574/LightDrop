import { TransmissionSpeed } from '../constants';

export interface TransferManifest {
  transferId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  blockSize: number;
  totalBlocks: number;
  checksum: string; // SHA-256 of original file
  protocolVersion: number;
  createdAt: number;
  compressed: boolean; // whether gzip was applied
  compressedSize?: number; // size after compression, if applied
}

export interface FountainSymbol {
  seed: number;    // uint32 - used by PRNG to derive degree + source indices
  data: Uint8Array; // XOR'd source block data
}

export interface BinaryFrameHeader {
  magic: number;        // uint16 - 0x4F44
  version: number;      // uint8 - protocol version (2)
  transferIdHash: number; // uint16 - first 2 bytes of hash of transfer ID
  frameType: number;    // uint8 - 0=manifest, 1=fountain
  seed: number;         // uint32 - fountain symbol seed (0 for manifest)
  payloadLength: number; // uint16 - length of payload after header
  totalBlocks: number;  // uint16 - K (total source blocks)
  blockSize: number;    // uint16 - T (bytes per source block)
  reserved: number;     // uint32 - reserved / CRC placeholder
}

export interface ReceiverState {
  transferId: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number;
  totalBlocks: number;
  decodedBlocks: number;
  uniqueSymbolsReceived: number;
  duplicateSymbolsSkipped: number;
  progress: number;
  status: 'scanning' | 'receiving' | 'reconstructing' | 'complete' | 'error';
  errorMessage?: string;
  startTime?: number;
  estimatedTimeRemaining?: number;
}

export interface SenderState {
  status: 'idle' | 'preparing' | 'transmitting' | 'paused' | 'complete' | 'cancelled' | 'error';
  fileName: string | null;
  fileSize: number;
  mimeType: string | null;
  totalBlocks: number;
  symbolsEmitted: number;
  loopCount: number;
  speed: TransmissionSpeed;
  errorMessage?: string;
}

export interface TransferAnalytics {
  protocolVersion: string;
  fileSizeBucket: string;
  totalBlocks: number;
  symbolsTransferred: number;
  durationMs: number;
  completed: boolean;
  createdAt: Date;
  blockSize: number;
}

export interface DecodedResult {
  valid: boolean;
  frameType?: number; // 0=manifest, 1=fountain
  manifest?: TransferManifest;
  symbol?: FountainSymbol;
  error?: string;
}

export interface QRCodeResult {
  data: string;
  binaryData?: Uint8Array;
  location?: {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
  };
}

export interface AppConfig {
  protocolVersion: number;
  maxFileSize: number;
  defaultBlockSize: number;
  defaultSpeed: string;
  supportedMimeTypes: string[];
}