'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { cn, formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { QRTransmissionEngine } from '@/components/sender/QRTransmissionEngine';
import { createTransfer, encodeFrames, getTransferEstimates } from '@/lib/protocol';
import { useTransferStore } from '@/stores/transferStore';
import { useToast } from '@/hooks/useToast';
import { 
  FileIcon, 
  Upload, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Settings,
  Trash2
} from 'lucide-react';

export function SendPage() {
  const { toast } = useToast();
  const { 
    sender, 
    setSenderState, 
    setCurrentTransfer, 
    resetSender,
    config,
    setConfig 
  } = useTransferStore();
  
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [frames, setFrames] = React.useState<any[]>([]);
  const [metadata, setMetadata] = React.useState<any>(null);
  const [estimates, setEstimates] = React.useState<any>(null);
  const [showSettings, setShowSettings] = React.useState(false);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > 500 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Maximum file size is 500MB', variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
      setEstimates(getTransferEstimates(file.size, config));
    }
  }, [config, toast]);

  React.useEffect(() => {
    if (selectedFile) {
      setEstimates(getTransferEstimates(selectedFile.size, config));
    }
  }, [selectedFile, config]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: false });

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setSenderState({ status: 'preparing' });
    
    try {
      const { metadata: meta, chunks, parityChunks } = await createTransfer(file, {
        chunkSize: config.chunkSize,
        redundancyLevel: config.redundancyLevel,
        speed: config.speed,
      });
      
      const encodedFrames = encodeFrames(meta, chunks, parityChunks);
      const est = getTransferEstimates(file.size, config);
      
      setMetadata(meta);
      setFrames(encodedFrames);
      setEstimates(est);
      setCurrentTransfer(meta);
      setSenderState({ 
        status: 'transmitting',
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        totalFrames: encodedFrames.length,
        estimatedTimeRemaining: est.estimatedDurationMs,
      });
    } catch (error) {
      console.error('File processing error:', error);
      toast({ title: 'Error', description: 'Failed to process file', variant: 'destructive' });
      setSenderState({ status: 'error', errorMessage: 'Failed to process file' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    resetSender();
    setSelectedFile(null);
    setFrames([]);
    setMetadata(null);
    setEstimates(null);
  };

  const handleComplete = () => {
    toast({ title: 'Transfer Complete', description: `${metadata?.fileName} sent successfully`, variant: 'success' });
  };

  const handlePause = () => setSenderState({ status: 'paused' });
  const handleResume = () => setSenderState({ status: 'transmitting' });
  const handleSpeedChange = (speed: any) => setConfig({ speed });

  if (frames.length > 0 && metadata) {
    return (
      <QRTransmissionEngine
        frames={frames}
        metadata={metadata}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onPause={handlePause}
        onResume={handleResume}
        onSpeedChange={handleSpeedChange}
        initialSpeed={config.speed}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex flex-col"
    >
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-optical-green/10 mb-4">
              <Upload className="w-8 h-8 text-optical-green" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Send a File</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Select a file to encode into QR frames for optical transfer
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-panel"
            {...(getRootProps() as any)}
          >
            <input {...getInputProps()} />
            <div className={cn(
              'flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all',
              isDragActive 
                ? 'border-optical-green bg-optical-green/5' 
                : 'border-optical-border hover:border-optical-green/50'
            )}>
              <Upload className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">
                {isDragActive ? 'Drop file here' : 'Drag & drop a file, or click to select'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Maximum file size: 500 MB
              </p>
              <Button variant="optical" size="lg" className="w-full max-w-xs">
                <FileIcon className="w-5 h-5 mr-2" />
                Choose File
              </Button>
            </div>
          </motion.div>

          {selectedFile && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-panel p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-optical-green/10 flex items-center justify-center">
                    <FileIcon className="w-6 h-6 text-optical-green" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Chunk Size</Label>
                  <select
                    value={config.chunkSize}
                    onChange={(e) => setConfig({ chunkSize: parseInt(e.target.value) })}
                    className="input-field mt-1"
                  >
                    <option value={512}>512 bytes</option>
                    <option value={1024}>1 KB (default)</option>
                    <option value={2048}>2 KB</option>
                  </select>
                </div>
                <div>
                  <Label>Redundancy</Label>
                  <select
                    value={config.redundancyLevel}
                    onChange={(e) => setConfig({ redundancyLevel: e.target.value as any })}
                    className="input-field mt-1"
                  >
                    <option value="LOW">Low (10%)</option>
                    <option value="MEDIUM">Medium (20%)</option>
                    <option value="HIGH">High (30%)</option>
                  </select>
                </div>
                <div>
                  <Label>Speed</Label>
                  <select
                    value={config.speed}
                    onChange={(e) => setConfig({ speed: e.target.value as any })}
                    className="input-field mt-1"
                  >
                    <option value="COMPATIBILITY">Compatibility (5 FPS)</option>
                    <option value="BALANCED">Balanced (10 FPS)</option>
                    <option value="FAST">Fast (15 FPS)</option>
                    <option value="EXTREME">Extreme (30 FPS - Default)</option>
                    <option value="HYPER">Hyper (60 FPS - Blazing Fast)</option>
                  </select>
                </div>
                <div>
                  <Label>Estimated Frames</Label>
                  <p className="font-mono text-lg text-optical-green mt-1">
                    {estimates?.totalFrames || '—'}
                  </p>
                </div>
              </div>
              <Button
                variant="optical"
                size="xl"
                className="w-full"
                onClick={() => processFile(selectedFile)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Start Transmission
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card-panel p-6 text-center"
            >
              <Loader2 className="w-12 h-12 text-optical-green animate-spin mx-auto mb-4" />
              <p className="text-lg">Processing file...</p>
              <p className="text-sm text-muted-foreground mt-2">Generating QR frames and calculating checksums</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}