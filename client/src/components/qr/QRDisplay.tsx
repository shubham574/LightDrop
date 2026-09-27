'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { generateQRCodeCanvas, getOptimalQRSize } from '@/lib/qr';
import { DEFAULT_QR_ERROR_CORRECTION } from '@light-drop/shared/constants';

interface QRDisplayProps {
  data: string | Uint8Array;
  size?: number;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

function renderModules(
  canvas: HTMLCanvasElement,
  modules: number[],
  moduleCount: number,
  margin: number,
  targetSize: number,
  dpr: number
) {
  const totalModules = moduleCount + margin * 2;
  const canvasSize = Math.round(targetSize * dpr);
  const scale = canvasSize / totalModules;
  
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  canvas.style.width = `${targetSize}px`;
  canvas.style.height = `${targetSize}px`;
  
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  
  ctx.fillStyle = '#000000';
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (modules[row * moduleCount + col]) {
        const x = Math.round((col + margin) * scale);
        const y = Math.round((row + margin) * scale);
        const w = Math.ceil((col + margin + 1) * scale) - x;
        const h = Math.ceil((row + margin + 1) * scale) - y;
        
        ctx.fillRect(x, y, w, h);
      }
    }
  }
}

export function QRDisplay({ data, size, className, onLoad, onError }: QRDisplayProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const hasRenderedRef = React.useRef(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const workerRef = React.useRef<Worker | null>(null);
  const pendingIdRef = React.useRef<number>(0);

  // --- FIX: Single persistent onmessage dispatcher via a pending-callbacks Map ---
  // Previously: each data-change added addEventListener('message', onMessage), but
  // cleanup only set mounted=false (never removed the listener). At 30 fps this
  // accumulated hundreds of stale listeners → worker became unresponsive → blank QR.
  // Now: one permanent worker.onmessage dispatches to registered per-request callbacks.
  const pendingCallbacksRef = React.useRef<Map<number, (e: MessageEvent) => void>>(new Map());

  // Keep latest onLoad/onError without recreating effects
  const onLoadRef = React.useRef(onLoad);
  const onErrorRef = React.useRef(onError);
  React.useEffect(() => { onLoadRef.current = onLoad; }, [onLoad]);
  React.useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Create the worker once; set the single persistent dispatcher
  React.useEffect(() => {
    if (typeof Worker !== 'undefined') {
      const worker = new Worker(
        new URL('../../workers/qrEncoder.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // One handler, dispatches by id — no per-render addEventListener needed
      worker.onmessage = (e: MessageEvent) => {
        const cb = pendingCallbacksRef.current.get(e.data.id);
        if (cb) {
          pendingCallbacksRef.current.delete(e.data.id);
          cb(e);
        }
      };

      worker.onerror = () => {
        // Clear all pending callbacks on fatal worker error
        pendingCallbacksRef.current.clear();
      };

      workerRef.current = worker;
    }
    return () => {
      pendingCallbacksRef.current.clear();
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Re-generate QR whenever data or size changes
  React.useEffect(() => {
    if (!data || !canvasRef.current) return;
    if (data instanceof Uint8Array && data.length === 0) return;
    if (typeof data === 'string' && data.length === 0) return;

    let mounted = true;
    if (!hasRenderedRef.current) {
      setIsLoading(true);
    }
    setError(null);

    const dataLength = data instanceof Uint8Array ? data.length : data.length;
    const ecLevel = DEFAULT_QR_ERROR_CORRECTION as 'L' | 'M' | 'Q' | 'H';
    const baseOptimalSize = size || getOptimalQRSize(dataLength, ecLevel);
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const margin = 2;
    const id = ++pendingIdRef.current;

    if (workerRef.current) {
      const plainData = data instanceof Uint8Array
        ? Array.from(data)
        : Array.from(new TextEncoder().encode(data));

      // Register a callback for this specific request id
      pendingCallbacksRef.current.set(id, (e: MessageEvent) => {
        if (!mounted || !canvasRef.current) return;

        if (e.data.error) {
          const err = new Error(e.data.error);
          setError(err);
          setIsLoading(false);
          onErrorRef.current?.(err);
        } else {
          renderModules(
            canvasRef.current,
            e.data.modules,
            e.data.size,
            margin,
            baseOptimalSize,
            dpr
          );
          hasRenderedRef.current = true;
          setIsLoading(false);
          onLoadRef.current?.();
        }
      });

      workerRef.current.postMessage({
        type: 'generate',
        id,
        data: plainData,
        errorCorrectionLevel: ecLevel,
        margin,
      });
    } else {
      // Fallback: main-thread generation (Worker unavailable)
      const renderSize = Math.round(baseOptimalSize * dpr);
      generateQRCodeCanvas(data, canvasRef.current, {
        width: renderSize,
        margin,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: ecLevel,
      })
        .then(() => {
          if (mounted && canvasRef.current) {
            canvasRef.current.style.width = `${baseOptimalSize}px`;
            canvasRef.current.style.height = `${baseOptimalSize}px`;
            hasRenderedRef.current = true;
            setIsLoading(false);
            onLoadRef.current?.();
          }
        })
        .catch((err) => {
          if (mounted) {
            setError(err);
            setIsLoading(false);
            onErrorRef.current?.(err);
          }
        });
    }

    return () => {
      mounted = false;
      // Deregister the pending callback — prevents stale handler from firing later
      pendingCallbacksRef.current.delete(id);
    };
  }, [data, size]);

  return (
    <div className={cn('relative inline-flex items-center justify-center overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        className={cn(
          'qr-canvas rounded-none bg-white transition-opacity duration-150 max-w-full max-h-full',
          isLoading && !hasRenderedRef.current && 'opacity-0'
        )}
        aria-label="QR code for file transfer"
      />
      {isLoading && !hasRenderedRef.current && (
        <div className="absolute inset-0 flex items-center justify-center bg-lightdrop-panel/50 rounded-lg">
          <div className="w-8 h-8 border-4 border-lightdrop-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-lightdrop-bg/90 rounded-lg text-lightdrop-red p-4 text-center text-sm">
          Failed to generate QR code
        </div>
      )}
    </div>
  );
}