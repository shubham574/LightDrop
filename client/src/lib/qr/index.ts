import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark: string;
    light: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export const DEFAULT_QR_OPTIONS: QRCodeOptions = {
  width: 300,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
  errorCorrectionLevel: 'M',
};

export async function generateQRCodeDataURL(
  data: string | Uint8Array,
  options: QRCodeOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_QR_OPTIONS, ...options };
  if (data instanceof Uint8Array) {
    return QRCode.toDataURL([{ data: data as any, mode: 'byte' }], opts);
  }
  return QRCode.toDataURL(data, opts);
}

export async function generateQRCodeCanvas(
  data: string | Uint8Array,
  canvas: HTMLCanvasElement,
  options: QRCodeOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_QR_OPTIONS, ...options };
  if (data instanceof Uint8Array) {
    await QRCode.toCanvas(canvas, [{ data: data as any, mode: 'byte' }], opts);
  } else {
    await QRCode.toCanvas(canvas, data, opts);
  }
}

export async function generateQRCodeSVG(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_QR_OPTIONS, ...options };
  return QRCode.toString(data, { ...opts, type: 'svg' });
}

export function getOptimalQRSize(
  dataLength: number,
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M'
): number {
  const PX_PER_MODULE = 8;
  const MARGIN_MODULES = 4;
  let version = 40;
  for (let v = 1; v <= 40; v++) {
    if (calculateQRCapacity(v, errorCorrectionLevel) >= dataLength) {
      version = v;
      break;
    }
  }
  const modules = version * 4 + 17;
  const size = Math.round((modules + MARGIN_MODULES * 2) * PX_PER_MODULE);
  return Math.min(1000, Math.max(220, size));
}

export function getMaxBinaryCapacity(version: number, errorCorrection: 'L' | 'M' | 'Q' | 'H'): number {
  // Binary mode capacities per QR version at each EC level
  const capacities: Record<string, number[]> = {
    L: [0, 17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953],
    M: [0, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331],
    Q: [0, 11, 20, 32, 46, 60, 74, 86, 108, 130, 151, 177, 203, 241, 258, 292, 322, 364, 394, 442, 482, 509, 565, 611, 661, 715, 751, 805, 868, 908, 982, 1030, 1112, 1168, 1228, 1283, 1351, 1423, 1499, 1579, 1663],
    H: [0, 7, 14, 24, 34, 44, 58, 64, 84, 98, 119, 137, 155, 177, 194, 220, 250, 280, 310, 338, 382, 403, 439, 461, 511, 535, 593, 625, 658, 698, 742, 790, 842, 898, 958, 983, 1051, 1093, 1139, 1219, 1273],
  };
  return capacities[errorCorrection]?.[version] || 0;
}

export function calculateQRCapacity(version: number, errorCorrection: 'L' | 'M' | 'Q' | 'H'): number {
  return getMaxBinaryCapacity(version, errorCorrection);
}