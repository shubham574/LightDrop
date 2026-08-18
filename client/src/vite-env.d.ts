// Type declarations for jsqr (no official @types package exists)
declare module 'jsqr' {
  interface QRCodeLocation {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
    topLeftFinderPattern: { x: number; y: number; estimatedModuleSize: number };
    topRightFinderPattern: { x: number; y: number; estimatedModuleSize: number };
    bottomLeftFinderPattern: { x: number; y: number; estimatedModuleSize: number };
  }

  interface QRCode {
    binaryData: number[];
    data: string;
    chunks: QRCodeChunk[];
    version: number;
    location: QRCodeLocation;
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
    mask: number;
    dataMask: number;
  }

  interface QRCodeChunk {
    type: 'numeric' | 'alphanumeric' | 'byte' | 'kanji';
    data: string;
    byteModeData?: number[];
  }

  interface JSQRScanOptions {
    inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth';
    greyWeights?: {
      red: number;
      green: number;
      blue: number;
      useIntegerApproximation: boolean;
    };
    canOverwriteImage?: boolean;
  }

  function jsQR(
    imageData: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    options?: JSQRScanOptions
  ): QRCode | null;

  export default jsQR;
}