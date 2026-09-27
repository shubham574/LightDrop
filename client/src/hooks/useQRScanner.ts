import { useEffect, useRef, useState, useCallback, RefObject } from 'react';
import { QRCodeResult } from '@light-drop/shared/types';

const POOL_SIZE = Math.min(4, typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 2);

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
  
  const workersRef = useRef<Worker[]>([]);
  const busyRef = useRef<boolean[]>([]);
  const nextWorkerRef = useRef(0);
  
  const isScanningRef = useRef(false);
  const animationRef = useRef<number>();
  const scanIntervalRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingIdRef = useRef(0);
  const onDecodeRef = useRef(onDecode);
  
  const isStartingRef = useRef(false);

  // Keep onDecode ref updated without re-creating the worker
  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);
  
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      const workers: Worker[] = [];
      const busys: boolean[] = [];
      for (let i = 0; i < POOL_SIZE; i++) {
        const worker = new Worker(new URL('../workers/qrDecoder.worker.ts', import.meta.url), { type: 'module' });
        
        worker.onmessage = (event) => {
          busyRef.current[i] = false;
          // Thread safety: Out-of-order results from different workers are safe because
          // FountainDecoder.addSymbol() is keyed by seed (sequence number). Duplicate
          // frames are detected via seen.has(seq), and belief propagation in resolve()
          // is deterministic regardless of insertion order.
          const { data, binaryData, location } = event.data;
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
        
        worker.onerror = (err) => {
          busyRef.current[i] = false;
          console.error('QR Worker error:', err);
          setError('QR decoder worker error');
        };
        
        workers.push(worker);
        busys.push(false);
      }
      workersRef.current = workers;
      busyRef.current = busys;
    }
    
    return () => {
      workersRef.current.forEach(worker => worker.terminate());
      workersRef.current = [];
      busyRef.current = [];
    };
  }, []);
  
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = contextRef.current;
    const workers = workersRef.current;
    
    if (!video || !canvas || !context || workers.length === 0 || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }
    
    let freeWorkerIndex = -1;
    for (let i = 0; i < POOL_SIZE; i++) {
      const idx = (nextWorkerRef.current + i) % POOL_SIZE;
      if (!busyRef.current[idx]) {
        freeWorkerIndex = idx;
        break;
      }
    }
    
    if (freeWorkerIndex === -1) {
      return;
    }
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }
    
    const MAX_DIM = 960;
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
    
    busyRef.current[freeWorkerIndex] = true;
    workers[freeWorkerIndex].postMessage({ type: 'decode', imageData, id });
    
    nextWorkerRef.current = (freeWorkerIndex + 1) % POOL_SIZE;
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
        (canvasRef as React.MutableRefObject<HTMLCanvasElement>).current = document.createElement('canvas');
      }

      // --- FIX P3: Guard against null canvas context (Firefox + certain environments) ---
      const ctx = canvasRef.current!.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        stream.getTracks().forEach(t => t.stop());
        setError('Failed to get canvas 2D context. Try a different browser.');
        isScanningRef.current = false;
        setIsScanning(false);
        return;
      }
      contextRef.current = ctx;
      
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
          animationRef.current = requestAnimationFrame(scanLoop);
        }
      };
      
      animationRef.current = requestAnimationFrame(scanLoop);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access camera');
      isScanningRef.current = false;
      setIsScanning(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [enabled, processFrame]);
  
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