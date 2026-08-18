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
  location?: {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
  };
}

type WorkerMessage = DecodeMessage;
type WorkerResponse = DecodeResult;

const pendingCallbacks = new Map<number, (result: WorkerResponse) => void>();
let messageId = 0;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, imageData, id } = event.data;
  
  if (type === 'decode') {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      
      const result: WorkerResponse = {
        type: 'result',
        id,
        data: code?.data || null,
        location: code?.location,
      };
      
      self.postMessage(result);
    } catch (error) {
      self.postMessage({
        type: 'result',
        id,
        data: null,
      } as WorkerResponse);
    }
  }
};

export {};