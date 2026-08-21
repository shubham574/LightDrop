'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { QRDisplay } from '@/components/qr/QRDisplay';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  CheckCircle,
} from 'lucide-react';
import { TransferManifest } from '@optical-drop/shared/types';
import {
  TRANSMISSION_SPEEDS,
  MANIFEST_INTERLEAVE_INTERVAL,
  TransmissionSpeed,
} from '@optical-drop/shared/constants';
import { formatDuration, formatNumber, formatFileSize } from '@/lib/utils';
import { createManifestFrame, createFountainFrame } from '@/lib/protocol';
import { FountainEncoder } from '@/lib/fountain';

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
  onSpeedChange,
  initialSpeed = 'EXTREME',
}: QRTransmissionEngineProps) {
  const [currentFrameData, setCurrentFrameData] = React.useState<Uint8Array>(new Uint8Array(0));
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [speed, setSpeed] = React.useState<TransmissionSpeed>(initialSpeed);
  const [symbolsEmitted, setSymbolsEmitted] = React.useState(0);
  const [frameLabel, setFrameLabel] = React.useState('MANIFEST');

  const animationRef = React.useRef<number>();
  const lastFrameTimeRef = React.useRef(0);
  const isPlayingRef = React.useRef(isPlaying);
  const symbolCountRef = React.useRef(0);
  const encoderRef = React.useRef(encoder);
  
  const speedConfig = TRANSMISSION_SPEEDS[speed] || TRANSMISSION_SPEEDS.EXTREME;
  const frameDelayRef = React.useRef(speedConfig.frameDelay);
  const AVAILABLE_SPEEDS = React.useMemo(() => Object.keys(TRANSMISSION_SPEEDS) as TransmissionSpeed[], []);

  isPlayingRef.current = isPlaying;
  encoderRef.current = encoder;

  const loopCount = Math.floor(symbolsEmitted / Math.max(1, manifest.totalBlocks));

  // Generate the initial manifest frame
  React.useEffect(() => {
    const frame = createManifestFrame(manifest);
    setCurrentFrameData(frame);
  }, [manifest]);

  React.useEffect(() => {
    frameDelayRef.current = (TRANSMISSION_SPEEDS[speed] || TRANSMISSION_SPEEDS.EXTREME).frameDelay;
  }, [speed]);

  const generateNextFrame = React.useCallback(() => {
    const count = symbolCountRef.current;
    
    // Interleave manifest frame periodically so late-joining receivers can pick up metadata
    if (count % MANIFEST_INTERLEAVE_INTERVAL === 0) {
      const frame = createManifestFrame(manifest);
      setCurrentFrameData(frame);
      setFrameLabel('MANIFEST');
    } else {
      const frame = createFountainFrame(encoderRef.current, manifest.transferId);
      setCurrentFrameData(frame);
      setFrameLabel('FOUNTAIN');
    }
    
    symbolCountRef.current++;
    setSymbolsEmitted(symbolCountRef.current);
  }, [manifest]);

  const play = React.useCallback(() => {
    setIsPlaying(true);
    isPlayingRef.current = true;
  }, []);

  const pause = React.useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  const handleSpeedChange = React.useCallback((newSpeed: TransmissionSpeed) => {
    setSpeed(newSpeed);
    onSpeedChange(newSpeed);
  }, [onSpeedChange]);

  const renderFrame = React.useCallback((timestamp: number) => {
    if (!isPlayingRef.current) return;

    const elapsed = timestamp - lastFrameTimeRef.current;
    
    if (elapsed >= frameDelayRef.current) {
      lastFrameTimeRef.current = timestamp;
      generateNextFrame();
    }
    
    animationRef.current = requestAnimationFrame(renderFrame);
  }, [generateNextFrame]);

  React.useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(renderFrame);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, renderFrame]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
      <div className="w-full max-w-4xl space-y-6">
        <div className="glass-strong rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-optical-green">TRANSMITTING</h2>
              <p className="text-muted-foreground mt-1">{manifest.fileName}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-optical-green/70">
                {frameLabel}
              </span>
            </div>
          </div>

          <div className="relative aspect-square max-w-[90vw] max-h-[70vh] mx-auto">
            <QRDisplay
              data={currentFrameData}
              className="w-full h-full max-w-[90vw] max-h-[70vh] animate-pulse-glow"
            />
            <AnimatePresence mode="wait">
              {isPlaying && (
                <motion.div
                  key="scan-line"
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="absolute inset-0 scan-overlay" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">SYMBOLS EMITTED</span>
              <span className="font-mono font-semibold text-lg">
                {formatNumber(symbolsEmitted)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">LOOP</span>
              <span className="font-mono text-optical-green">
                #{loopCount + 1} ({manifest.totalBlocks} blocks × ~1.15 overhead)
              </span>
            </div>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-sm font-medium">TRANSMISSION SPEED</Label>
            <span className="text-sm text-muted-foreground">
              {speedConfig.name} ({speedConfig.fps} FPS)
            </span>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max={AVAILABLE_SPEEDS.length - 1}
              value={AVAILABLE_SPEEDS.indexOf(speed) !== -1 ? AVAILABLE_SPEEDS.indexOf(speed) : 0}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                const nextSpeed = AVAILABLE_SPEEDS[idx] || 'EXTREME';
                handleSpeedChange(nextSpeed);
              }}
              className="flex-1 h-2 bg-optical-panel rounded-lg appearance-none accent-optical-green cursor-pointer"
              aria-label="Transmission speed"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 text-xs text-muted-foreground">
            {AVAILABLE_SPEEDS.map((s) => {
              const currentSConfig = TRANSMISSION_SPEEDS[s];
              if (!currentSConfig) return null;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSpeedChange(s)}
                  className={cn(
                    'px-2 py-1.5 rounded text-center transition-colors cursor-pointer font-medium',
                    speed === s ? 'bg-optical-green/20 text-optical-green border border-optical-green/30' : 'bg-optical-panel hover:bg-optical-panel/80'
                  )}
                >
                  {currentSConfig.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold font-mono text-optical-green">
                {formatFileSize(manifest.fileSize)}
              </p>
              <p className="text-xs text-muted-foreground">FILE SIZE</p>
            </div>
            <div>
              <p className="text-3xl font-bold font-mono text-optical-green">
                {formatNumber(manifest.totalBlocks)}
              </p>
              <p className="text-xs text-muted-foreground">SOURCE BLOCKS</p>
            </div>
            <div>
              <p className="text-3xl font-bold font-mono text-optical-green">
                {speedConfig.fps} FPS
              </p>
              <p className="text-xs text-muted-foreground">FRAME RATE</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 w-full max-w-4xl">
        <Button
          variant={isPlaying ? "secondary" : "optical"}
          size="xl"
          onClick={isPlaying ? pause : play}
          className="min-w-[180px] animate-pulse-glow"
        >
          {isPlaying ? (
            <>
              <Pause className="w-6 h-6 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-6 h-6 mr-2" />
              Resume
            </>
          )}
        </Button>

        <Button
          variant="destructive"
          size="lg"
          onClick={onCancel}
          className="min-w-[140px]"
        >
          <X className="w-5 h-5 mr-2" />
          Cancel
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground max-w-4xl">
        <p>Point the receiver's camera at the QR code above</p>
        <p className="mt-1">Fountain codes — receiver can join anytime, order doesn't matter</p>
      </div>
    </div>
  );
}