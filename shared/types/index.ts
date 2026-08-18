export interface TransferMetadata {
  transferId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
  checksum: string;
  protocolVersion: number;
  createdAt: number;
  redundancyLevel: string;
}

export interface FramePayload {
  protocolVersion: number;
  transferId: string;
  frameIndex: number;
  totalFrames: number;
  payload: string;
  checksum: string;
  frameType: 'metadata' | 'data' | 'parity' | 'complete';
}

export interface EncodedFrame {
  data: string;
  frameIndex: number;
  totalFrames: number;
  frameType: 'metadata' | 'data' | 'parity' | 'complete';
}

export interface ReceiverState {
  transferId: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number;
  totalFrames: number;
  receivedFrames: number;
  missingFrames: number[];
  progress: number;
  status: 'scanning' | 'receiving' | 'reconstructing' | 'complete' | 'error';
  errorMessage?: string;
  startTime?: number;
  estimatedTimeRemaining?: number;
}

import { TransmissionSpeed } from '../constants';

export interface SenderState {
  status: 'idle' | 'preparing' | 'transmitting' | 'paused' | 'complete' | 'cancelled' | 'error';
  fileName: string | null;
  fileSize: number;
  mimeType: string | null;
  totalFrames: number;
  currentFrame: number;
  progress: number;
  speed: TransmissionSpeed;
  estimatedTimeRemaining: number;
  errorMessage?: string;
}

export interface TransferAnalytics {
  protocolVersion: string;
  fileSizeBucket: string;
  frameCount: number;
  durationMs: number;
  completed: boolean;
  createdAt: Date;
  redundancyLevel: string;
  chunkSize: number;
}

export interface ChunkData {
  index: number;
  data: Uint8Array;
  checksum: string;
}

export interface ParityChunk {
  index: number;
  data: Uint8Array;
  sourceIndices: number[];
}

export interface DecodedFrame {
  valid: boolean;
  frame?: FramePayload;
  error?: string;
}

export interface QRCodeResult {
  data: string;
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
  defaultChunkSize: number;
  defaultSpeed: string;
  defaultRedundancy: string;
  supportedMimeTypes: string[];
}