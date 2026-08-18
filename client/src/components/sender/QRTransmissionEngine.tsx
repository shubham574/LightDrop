'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { QRDisplay } from '@/components/qr/QRDisplay';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  FastForward, 
  SkipBack, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  EncodedFrame, 
  TransferMetadata,
} from '@optical-drop/shared/types';
import {
  TRANSMISSION_SPEEDS,
  TransmissionSpeed 
} from '@optical-drop/shared/constants';
import { formatDuration, formatNumber, formatFileSize } from '@/lib/utils';

interface QRTransmissionEngineProps {
  frames: EncodedFrame[];
  metadata: TransferMetadata;
  onComplete: () => void;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onSpeedChange: (speed: TransmissionSpeed) => void;
  initialSpeed?: TransmissionSpeed;
}

export function QRTransmissionEngine({
  frames,
  metadata,
  onComplete,
  onCancel,
  onPause,
  onResume,
  onSpeedChange,
  initialSpeed = 'EXTREME',
}: QRTransmissionEngineProps) {
  const [currentFrameIndex, setCurrentFrameIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [speed, setSpeed] = React.useState<TransmissionSpeed>(initialSpeed);
  const [completed, setCompleted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const frameRef = React.useRef<HTMLCanvasElement>(null);
  const animationRef = React.useRef<number>();
  const lastFrameTimeRef = React.useRef(0);
  const currentFrameIndexRef = React.useRef(currentFrameIndex);
  const isPlayingRef = React.useRef(isPlaying);
  const completedRef = React.useRef(completed);

  const speedConfig = TRANSMISSION_SPEEDS[speed] || TRANSMISSION_SPEEDS.EXTREME;
  const frameDelayRef = React.useRef(speedConfig.frameDelay);
  const REPEAT_COUNT = 1;
  const AVAILABLE_SPEEDS = React.useMemo(() => Object.keys(TRANSMISSION_SPEEDS) as TransmissionSpeed[], []);

  currentFrameIndexRef.current = currentFrameIndex;
  isPlayingRef.current = isPlaying;
  completedRef.current = completed;

  const totalFramesCount = Math.max(1, frames.length);
  const logicalFrameIndex = Math.min(Math.max(0, Math.floor(currentFrameIndex / REPEAT_COUNT)), totalFramesCount - 1);
  const currentFrame = frames[logicalFrameIndex] || frames[0];
  const totalRepeatedFrames = totalFramesCount * REPEAT_COUNT;
  const progress = totalRepeatedFrames > 0 ? ((currentFrameIndex + 1) / totalRepeatedFrames) * 100 : 0;
  const remainingRepeatedFrames = Math.max(0, totalRepeatedFrames - currentFrameIndex - 1);
  const estimatedTimeRemaining = remainingRepeatedFrames * frameDelayRef.current;

  React.useEffect(() => {
    frameDelayRef.current = (TRANSMISSION_SPEEDS[speed] || TRANSMISSION_SPEEDS.EXTREME).frameDelay;
  }, [speed]);

  const play = React.useCallback(() => {
    const totalRepeated = frames.length * REPEAT_COUNT;
    if (currentFrameIndexRef.current >= totalRepeated - 1) {
      setCompleted(true);
      completedRef.current = true;
      setIsPlaying(false);
      isPlayingRef.current = false;
      onComplete();
      return;
    }
    setIsPlaying(true);
    isPlayingRef.current = true;
    onResume();
  }, [frames.length, onComplete, onResume]);

  const pause = React.useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    onPause();
  }, [onPause]);

  const restart = React.useCallback(() => {
    setCurrentFrameIndex(0);
    currentFrameIndexRef.current = 0;
    setCompleted(false);
    completedRef.current = false;
    setError(null);
    setIsPlaying(true);
    isPlayingRef.current = true;
  }, []);

  const handleSpeedChange = React.useCallback((newSpeed: TransmissionSpeed) => {
    setSpeed(newSpeed);
    onSpeedChange(newSpeed);
  }, [onSpeedChange]);

  const renderFrame = React.useCallback((timestamp: number) => {
    if (!isPlayingRef.current || completedRef.current) return;

    const totalRepeated = frames.length * REPEAT_COUNT;
    const elapsed = timestamp - lastFrameTimeRef.current;
    
    if (elapsed >= frameDelayRef.current) {
      lastFrameTimeRef.current = timestamp;
      const nextIdx = currentFrameIndexRef.current + 1;
      
      if (nextIdx < totalRepeated) {
        currentFrameIndexRef.current = nextIdx;
        setCurrentFrameIndex(nextIdx);
      } else {
        setCompleted(true);
        completedRef.current = true;
        setIsPlaying(false);
        isPlayingRef.current = false;
        onComplete();
        return;
      }
    }
    
    animationRef.current = requestAnimationFrame(renderFrame);
  }, [frames.length, onComplete]);

  React.useEffect(() => {
    if (isPlaying && !completed) {
      lastFrameTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(renderFrame);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, completed, renderFrame]);

  if (!currentFrame) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <p className="text-muted-foreground">Preparing QR frames...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
      <div className="w-full max-w-4xl space-y-6">
        <div className="glass-strong rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-optical-green">TRANSMITTING</h2>
              <p className="text-muted-foreground mt-1">{metadata.fileName}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-optical-green/70">
                {currentFrame.frameType.toUpperCase()}
              </span>
              {completed && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1 text-optical-green"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">COMPLETE</span>
                </motion.div>
              )}
            </div>
          </div>

          <div className="relative aspect-square max-w-[90vw] max-h-[70vh] mx-auto">
            <QRDisplay
              data={currentFrame.data}
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
              <span className="text-muted-foreground">FRAME</span>
              <span className="font-mono font-semibold text-lg">
                {formatNumber(logicalFrameIndex + 1)} / {formatNumber(frames.length)}
              </span>
            </div>
            <Progress value={progress} max={100} className="h-3" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{progress.toFixed(1)}%</span>
              <span className="font-mono text-optical-green">
                ETA: {formatDuration(estimatedTimeRemaining)}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-sm font-medium">TRANSMISSION SPEED</Label>
            <span className="text-sm text-muted-foreground">
              {speedConfig.name} ({speedConfig.fps} FPS)
              <span className="text-optical-green/70 ml-2">(×{REPEAT_COUNT} repeat = {speedConfig.fps / REPEAT_COUNT} eff. FPS)</span>
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
                {formatFileSize(metadata.fileSize)}
              </p>
              <p className="text-xs text-muted-foreground">FILE SIZE</p>
            </div>
            <div>
              <p className="text-3xl font-bold font-mono text-optical-green">
                {formatNumber(frames.length)}
              </p>
              <p className="text-xs text-muted-foreground">TOTAL FRAMES (×{REPEAT_COUNT} repeat)</p>
            </div>
            <div>
              <p className="text-3xl font-bold font-mono text-optical-green">
                {speedConfig.fps / REPEAT_COUNT} FPS
              </p>
              <p className="text-xs text-muted-foreground">EFFECTIVE RATE</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 w-full max-w-4xl">
        <Button
          variant="secondary"
          size="lg"
          onClick={restart}
          disabled={isPlaying && currentFrameIndex === 0}
          className="min-w-[140px]"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Restart
        </Button>

        <Button
          variant={isPlaying ? "secondary" : "optical"}
          size="xl"
          onClick={isPlaying ? pause : play}
          disabled={completed}
          className="min-w-[180px] animate-pulse-glow"
        >
          {isPlaying ? (
            <>
              <Pause className="w-6 h-6 mr-2" />
              Pause
            </>
          ) : completed ? (
            <>
              <CheckCircle className="w-6 h-6 mr-2" />
              Complete
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
          disabled={completed}
          className="min-w-[140px]"
        >
          <X className="w-5 h-5 mr-2" />
          Cancel
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground max-w-4xl">
        <p>Point the receiver's camera at the QR code above</p>
        <p className="mt-1">Keep devices steady • Maximize screen brightness • Avoid glare</p>
      </div>
    </div>
  );
}