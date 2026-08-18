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
  errorCorrectionLevel: 'H',
};

export async function generateQRCodeDataURL(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_QR_OPTIONS, ...options };
  return QRCode.toDataURL(data, opts);
}

export async function generateQRCodeCanvas(
  data: string,
  canvas: HTMLCanvasElement,
  options: QRCodeOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_QR_OPTIONS, ...options };
  await QRCode.toCanvas(canvas, data, opts);
}

export async function generateQRCodeSVG(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_QR_OPTIONS, ...options };
  return QRCode.toString(data, { ...opts, type: 'svg' });
}

export function getOptimalQRSize(dataLength: number): number {
  if (dataLength < 100) return 200;
  if (dataLength < 500) return 256;
  if (dataLength < 1500) return 300;
  return 300;
}

export function calculateQRCapacity(version: number, errorCorrection: 'L' | 'M' | 'Q' | 'H'): number {
  const capacities: Record<string, number[]> = {
    L: [0, 41, 77, 127, 187, 255, 322, 370, 461, 552, 652, 772, 883, 1022, 1101, 1250, 1408, 1548, 1725, 1903, 2061, 2232, 2409, 2620, 2812, 3057, 3283, 3517, 3669, 3909, 4158, 4417, 4686, 4965, 5253, 5529, 5836, 6153, 6479, 6743],
    M: [0, 34, 63, 101, 149, 202, 255, 293, 365, 432, 513, 604, 691, 796, 871, 991, 1082, 1212, 1346, 1500, 1600, 1708, 1872, 2059, 2188, 2395, 2544, 2701, 2857, 3035, 3289, 3486, 3693, 3909, 4134, 4343, 4588, 4775, 5039, 5313],
    Q: [0, 27, 48, 77, 111, 144, 178, 207, 259, 312, 364, 427, 489, 580, 621, 703, 775, 876, 948, 1063, 1159, 1224, 1358, 1468, 1588, 1718, 1804, 1933, 2085, 2181, 2358, 2473, 2670, 2805, 2949, 3081, 3244, 3417, 3599],
    H: [0, 17, 34, 58, 82, 106, 139, 154, 202, 235, 288, 331, 374, 427, 468, 530, 571, 667, 726, 808, 871, 948, 1013, 1098, 1218, 1338, 1394, 1516, 1625, 1735, 1839, 1949, 2075, 2176, 2310, 2431, 2563, 2699, 2809],
  };
  return capacities[errorCorrection]?.[version] || 0;
}