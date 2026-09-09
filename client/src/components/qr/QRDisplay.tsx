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
  const scale = Math.floor((targetSize * dpr) / totalModules) || 1;
  const canvasSize = totalModules * scale;
  
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  canvas.style.width = `${targetSize}px`;
  canvas.style.height = `${targetSize}px`;
  
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  
  ctx.fillStyle = '#000000';
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (modules[row * moduleCount + col]) {
        ctx.fillRect(
          (col + margin) * scale,
          (row + margin) * scale,
          scale,
          scale
        );
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

  React.useEffect(() => {
    if (typeof Worker !== 'undefined') {
      workerRef.current = new Worker(new URL('../../workers/qrEncoder.worker.ts', import.meta.url), { type: 'module' });
    }
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

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
    const renderSize = Math.round(baseOptimalSize * dpr);
    const margin = 2;

    if (workerRef.current) {
      const id = ++pendingIdRef.current;
      
      const onMessage = (e: MessageEvent) => {
        if (e.data.id === id) {
          workerRef.current?.removeEventListener('message', onMessage);
          
          if (mounted && canvasRef.current) {
            if (e.data.error) {
              const err = new Error(e.data.error);
              setError(err);
              setIsLoading(false);
              onError?.(err);
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
              onLoad?.();
            }
          }
        }
      };
      
      workerRef.current.addEventListener('message', onMessage);
      
      const plainData = data instanceof Uint8Array 
        ? Array.from(data) 
        : Array.from(new TextEncoder().encode(data));

      workerRef.current.postMessage({
        type: 'generate',
        id,
        data: plainData,
        errorCorrectionLevel: ecLevel,
        margin
      });
    } else {
      generateQRCodeCanvas(data, canvasRef.current, {
        width: renderSize,
        margin,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: ecLevel,
      })
        .then(() => {
          if (mounted && canvasRef.current) {
            canvasRef.current.style.width = `${baseOptimalSize}px`;
            canvasRef.current.style.height = `${baseOptimalSize}px`;
            hasRenderedRef.current = true;
            setIsLoading(false);
            onLoad?.();
          }
        })
        .catch((err) => {
          if (mounted) {
            setError(err);
            setIsLoading(false);
            onError?.(err);
          }
        });
    }

    return () => {
      mounted = false;
    };
  }, [data, size, onLoad, onError]);

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