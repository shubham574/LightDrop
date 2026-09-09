export const PROTOCOL_VERSION = 2;

export const DEFAULT_BLOCK_SIZE = 256;
export const MIN_BLOCK_SIZE = 64;
export const MAX_BLOCK_SIZE = 2200;

export const FOUNTAIN_FRAME_HEADER_SIZE = 20;
export const MANIFEST_MAGIC = 0x4F44; // 'OD' in hex
export const FRAME_TYPE_MANIFEST = 0;
export const FRAME_TYPE_FOUNTAIN = 1;

export const TRANSMISSION_SPEEDS = {
  COMPATIBILITY: { fps: 5, frameDelay: 200, name: 'Compatibility (5 FPS)' },
  BALANCED: { fps: 10, frameDelay: 100, name: 'Balanced (10 FPS)' },
  FAST: { fps: 15, frameDelay: 66, name: 'Fast (15 FPS)' },
  EXTREME: { fps: 30, frameDelay: 33, name: 'Extreme (30 FPS)' },
  HYPER: { fps: 60, frameDelay: 16, name: 'Hyper (60 FPS)' },
} as const;

export type TransmissionSpeed = keyof typeof TRANSMISSION_SPEEDS;

export const DEFAULT_SPEED: TransmissionSpeed = 'EXTREME';

export const MAX_FILE_SIZE = 500 * 1024 * 1024;
export const MAX_FRAME_PAYLOAD_SIZE = 2953;

export const QR_ERROR_CORRECTION_LEVELS = {
  L: 'L',
  M: 'M',
  Q: 'Q',
  H: 'H',
} as const;

export const DEFAULT_QR_ERROR_CORRECTION = QR_ERROR_CORRECTION_LEVELS.L;

export const CAMERA_CONSTRAINTS = {
  facingMode: 'environment' as const,
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 30, max: 60 },
};

export const SCAN_REGION_RATIO = 0.7;

export const RECEIVER_STATUS = {
  SCANNING: 'scanning',
  RECEIVING: 'receiving',
  RECONSTRUCTING: 'reconstructing',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const;

export type ReceiverStatus = typeof RECEIVER_STATUS[keyof typeof RECEIVER_STATUS];

export const SENDER_STATUS = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  TRANSMITTING: 'transmitting',
  PAUSED: 'paused',
  COMPLETE: 'complete',
  CANCELLED: 'cancelled',
  ERROR: 'error',
} as const;

export type SenderStatus = typeof SENDER_STATUS[keyof typeof SENDER_STATUS];

export const ANALYTICS_EVENTS = {
  TRANSFER_STARTED: 'transfer_started',
  TRANSFER_COMPLETED: 'transfer_completed',
  TRANSFER_FAILED: 'transfer_failed',
  TRANSFER_CANCELLED: 'transfer_cancelled',
} as const;

export const MANIFEST_INTERLEAVE_INTERVAL = 50;
export const DEFAULT_FOUNTAIN_OVERHEAD = 1.15;