import { useEffect, useRef, useState, useCallback, RefObject } from 'react';
import { QRCodeResult } from '@optical-drop/shared/types';

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
  const { onDecode, scanInterval = 100, enabled = true } = options;
  
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<QRCodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const isScanningRef = useRef(false);
  const animationRef = useRef<number>();
  const scanIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const pendingIdRef = useRef(0);
  
  const isStartingRef = useRef(false);
  
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      workerRef.current = new Worker(new URL('../workers/qrDecoder.worker.ts', import.meta.url), { type: 'module' });
      
      workerRef.current.onmessage = (event) => {
        const { id, data, location } = event.data;
        if (data) {
          const result: QRCodeResult = { data, location };
          setLastResult(result);
          onDecode?.(result);
        }
      };
      
      workerRef.current.onerror = (err) => {
        console.error('QR Worker error:', err);
        setError('QR decoder worker error');
      };
    }
    
    return () => {
      workerRef.current?.terminate();
    };
  }, [onDecode]);
  
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = contextRef.current;
    const worker = workerRef.current;
    
    if (!video || !canvas || !context || !worker || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const id = ++pendingIdRef.current;
    
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
          processFrame();
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