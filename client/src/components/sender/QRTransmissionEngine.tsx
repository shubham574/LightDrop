'use client';

import * as React from 'react';
import { QRDisplay } from '@/components/qr/QRDisplay';
import { TransferManifest } from '@optical-drop/shared/types';
import {
  TRANSMISSION_SPEEDS,
  MANIFEST_INTERLEAVE_INTERVAL,
  TransmissionSpeed,
} from '@optical-drop/shared/constants';
import { createManifestFrame, createFountainFrame } from '@/lib/protocol';
import { FountainEncoder } from '@/lib/fountain';
import { formatFileSize, formatNumber } from '@/lib/utils';

interface QRTransmissionEngineProps {
  encoder: FountainEncoder;
  manifest: TransferManifest;
  onCancel: () => void;
  onSpeedChange: (speed: TransmissionSpeed) => void;
  initialSpeed?: TransmissionSpeed;
}

export function QRTransmissionEngine({
  encoder,
  manifest,
  onCancel,
  initialSpeed = 'EXTREME',
}: QRTransmissionEngineProps) {
  const [currentFrameData, setCurrentFrameData] = React.useState<Uint8Array>(new Uint8Array(0));
  const [speed] = React.useState<TransmissionSpeed>(initialSpeed);
  const [symbolsEmitted, setSymbolsEmitted] = React.useState(0);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const animationRef = React.useRef<number>();
  const lastFrameTimeRef = React.useRef(0);
  const symbolCountRef = React.useRef(0);
  const encoderRef = React.useRef(encoder);
  
  const speedConfig = TRANSMISSION_SPEEDS[speed] || TRANSMISSION_SPEEDS.EXTREME;
  const frameDelayRef = React.useRef(speedConfig.frameDelay);

  encoderRef.current = encoder;

  React.useEffect(() => {
    const frame = createManifestFrame(manifest);
    setCurrentFrameData(frame);
  }, [manifest]);

  React.useEffect(() => {
    frameDelayRef.current = (TRANSMISSION_SPEEDS[speed] || TRANSMISSION_SPEEDS.EXTREME).frameDelay;
  }, [speed]);

  const generateNextFrame = React.useCallback(() => {
    const count = symbolCountRef.current;
    
    if (count % MANIFEST_INTERLEAVE_INTERVAL === 0) {
      const frame = createManifestFrame(manifest);
      setCurrentFrameData(frame);
    } else {
      const frame = createFountainFrame(encoderRef.current, manifest.transferId);
      setCurrentFrameData(frame);
    }
    
    symbolCountRef.current++;
    setSymbolsEmitted(symbolCountRef.current);
  }, [manifest]);

  const renderFrame = React.useCallback((timestamp: number) => {
    const elapsed = timestamp - lastFrameTimeRef.current;
    
    if (elapsed >= frameDelayRef.current) {
      lastFrameTimeRef.current = timestamp;
      generateNextFrame();
    }
    
    animationRef.current = requestAnimationFrame(renderFrame);
  }, [generateNextFrame]);

  React.useEffect(() => {
    lastFrameTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [renderFrame]);

  // Fullscreen styling is handled by conditional classes
  const isFull = isFullscreen;

  return (
    <div className={`flex flex-col w-full ${isFull ? 'fixed inset-0 z-50 bg-decimen-bg items-center justify-center p-0' : 'gap-4 items-center mt-4'}`}>
      
      {!isFull && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2 w-[min(92vw,640px)] mb-2">
          <div className="bg-decimen-panel border border-decimen-line rounded-md px-2 py-1.5">
            <div className="text-decimen-muted text-[10px] uppercase tracking-[0.08em]">sending</div>
            <div className="font-mono text-[16px] text-decimen-accent truncate">{manifest.fileName}</div>
          </div>
          <div className="bg-decimen-panel border border-decimen-line rounded-md px-2 py-1.5">
            <div className="text-decimen-muted text-[10px] uppercase tracking-[0.08em]">size</div>
            <div className="font-mono text-[16px]">{formatFileSize(manifest.fileSize)}</div>
          </div>
          <div className="bg-decimen-panel border border-decimen-line rounded-md px-2 py-1.5">
            <div className="text-decimen-muted text-[10px] uppercase tracking-[0.08em]">tx rate</div>
            <div className="font-mono text-[16px] text-decimen-green">{speedConfig.fps} fps</div>
          </div>
          <div className="bg-decimen-panel border border-decimen-line rounded-md px-2 py-1.5">
            <div className="text-decimen-muted text-[10px] uppercase tracking-[0.08em]">blocks</div>
            <div className="font-mono text-[16px]">{formatNumber(manifest.totalBlocks)}</div>
          </div>
        </div>
      )}

      <div 
        className={`bg-white rounded-[10px] flex items-center justify-center cursor-pointer ${isFull ? 'w-[100vmin] h-[100vmin] max-w-[100%] max-h-[100%] p-8 rounded-none' : 'w-[min(92vw,480px)] aspect-square p-5'}`}
        onClick={() => setIsFullscreen(!isFull)}
        title={isFull ? "Click to exit fullscreen" : "Click to fullscreen"}
      >
        <QRDisplay
          data={currentFrameData}
          className="w-full h-full object-contain"
        />
      </div>

      {!isFull && (
        <div className="flex justify-center w-full mt-4">
          <button
            className="px-6 py-3 border border-decimen-red text-decimen-red rounded-lg font-bold hover:bg-decimen-red/10 transition-colors cursor-pointer"
            onClick={onCancel}
          >
            Stop Transfer
          </button>
        </div>
      )}
    </div>
  );
}