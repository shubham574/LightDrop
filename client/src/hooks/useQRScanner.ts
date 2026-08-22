import { useEffect, useRef, useState, useCallback, RefObject } from 'react';
import { QRCodeResult } from '@light-drop/shared/types';

interface UseQRScannerOptions {
  onDecode?: (result: QRCodeResult) => void;
  scanInterval?: number;
  enabled?: boolean;
}

interface UseQRScannerReturn {
  startScanning: () => void;
  stopScanning: () => void;
  isScanning: boolean;
  lastResult: QRCodeResult | null;
  error: string | null;
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
}

export function useQRScanner(options: UseQRScannerOptions = {}): UseQRScannerReturn {
  const { onDecode, scanInterval = 50, enabled = true } = options;
  
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<QRCodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const isScanningRef = useRef(false);
  const animationRef = useRef<number>();
  const scanIntervalRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingIdRef = useRef(0);
  const onDecodeRef = useRef(onDecode);
  const isWorkerBusyRef = useRef(false);
  
  const isStartingRef = useRef(false);

  // Keep onDecode ref updated without re-creating the worker
  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);
  
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      workerRef.current = new Worker(new URL('../workers/qrDecoder.worker.ts', import.meta.url), { type: 'module' });
      
      workerRef.current.onmessage = (event) => {
        isWorkerBusyRef.current = false;
        const { id, data, binaryData, location } = event.data;
        if (data || binaryData) {
          const result: QRCodeResult = {
            data: data || '',
            binaryData: binaryData || undefined,
            location,
          };
          setLastResult(result);
          onDecodeRef.current?.(result);
        }
      };
      
      workerRef.current.onerror = (err) => {
        isWorkerBusyRef.current = false;
        console.error('QR Worker error:', err);
        setError('QR decoder worker error');
      };
    }
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);
  
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = contextRef.current;
    const worker = workerRef.current;
    
    if (!video || !canvas || !context || !worker || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }
    
    if (isWorkerBusyRef.current) {
      return;
    }
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }
    
    const MAX_DIM = 720;
    let w = video.videoWidth;
    let h = video.videoHeight;
    
    if (w > MAX_DIM || h > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    
    canvas.width = w;
    canvas.height = h;
    context.drawImage(video, 0, 0, w, h);
    
    const imageData = context.getImageData(0, 0, w, h);
    const id = ++pendingIdRef.current;
    
    isWorkerBusyRef.current = true;
    worker.postMessage({ type: 'decode', imageData, id });
  }, []);
  
  const startScanning = useCallback(async () => {
    if (isScanningRef.current || isStartingRef.current || !enabled) return;
    
    isStartingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
      });
      
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      contextRef.current = canvasRef.current.getContext('2d', { willReadFrequently: true });
      
      isScanningRef.current = true;
      setIsScanning(true);
      setError(null);
      
      const scanLoop = () => {
        if (isScanningRef.current) {
          try {
            processFrame();
          } catch (e) {
            console.warn('QR scan error:', e);
          }
          scanIntervalRef.current = setTimeout(scanLoop, scanInterval);
        }
      };
      
      scanLoop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access camera');
      isScanningRef.current = false;
      setIsScanning(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [enabled, processFrame, scanInterval]);
  
  const stopScanning = useCallback(() => {
    isScanningRef.current = false;
    if (scanIntervalRef.current) {
      clearTimeout(scanIntervalRef.current);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const video = videoRef.current;
    if (video?.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
    
    setIsScanning(false);
  }, []);
  
  useEffect(() => {
    if (enabled && !isScanning) {
      startScanning();
    } else if (!enabled && isScanning) {
      stopScanning();
    }
    
    return () => {
      // Don't stop immediately on every re-render, rely on unmount or enabled changing
    };
  }, [enabled, isScanning, startScanning, stopScanning]);
  
  return {
    startScanning,
    stopScanning,
    isScanning,
    lastResult,
    error,
    videoRef,
    canvasRef,
  };
}