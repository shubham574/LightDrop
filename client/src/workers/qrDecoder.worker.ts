import jsQR from 'jsqr';

interface DecodeMessage {
  type: 'decode';
  imageData: ImageData;
  id: number;
}

interface DecodeResult {
  type: 'result';
  id: number;
  data: string | null;
  binaryData: Uint8Array | null;
  location?: {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
  };
}

type WorkerMessage = DecodeMessage;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, imageData, id } = event.data;
  
  if (type === 'decode') {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      
      const result: DecodeResult = {
        type: 'result',
        id,
        data: code?.data || null,
        binaryData: code?.binaryData ? new Uint8Array(code.binaryData) : null,
        location: code?.location,
      };
      
      self.postMessage(result);
    } catch (error) {
      self.postMessage({
        type: 'result',
        id,
        data: null,
        binaryData: null,
      } as DecodeResult);
    }
  }
};

export {};