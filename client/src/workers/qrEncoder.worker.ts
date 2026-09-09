import QRCode from 'qrcode';

self.onmessage = (e: MessageEvent) => {
  const { type, data, id, errorCorrectionLevel, margin } = e.data;

  if (type === 'generate') {
    try {
      const uint8Data = new Uint8Array(data);
      const segments: any = [{ data: uint8Data, mode: 'byte' }];
      
      const qr = QRCode.create(segments, { errorCorrectionLevel });
      
      const modulesData = qr.modules.data;
      const size = qr.modules.size;
      
      const modules = Array.from(modulesData);
      
      self.postMessage({
        type: 'result',
        id,
        modules,
        size
      });
    } catch (error: any) {
      self.postMessage({
        type: 'result',
        id,
        modules: null,
        size: 0,
        error: error.message || 'Failed to generate QR code'
      });
    }
  }
};

export {};
