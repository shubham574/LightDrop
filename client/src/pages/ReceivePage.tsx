'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatFileSize, formatDuration, formatNumber } from '@/lib/utils';
import { useQRScanner } from '@/hooks/useQRScanner';
import { decodeBinaryFrame, verifyChecksum, decompressData } from '@/lib/protocol';
import { FountainDecoder } from '@/lib/fountain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTransferStore } from '@/stores/transferStore';
import { useToast } from '@/hooks/useToast';
import { 
  Camera, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Download,
  RotateCcw,
  WifiOff,
  Shield,
  Eye,
  EyeOff,
  Settings,
  Info
} from 'lucide-react';
import { TransferManifest, QRCodeResult } from '@optical-drop/shared/types';
import { hashTransferId } from '@optical-drop/shared/protocol';

export function ReceivePage() {
  const { toast } = useToast();
  const { 
    receiver, 
    setReceiverState, 
    resetReceiver,
  } = useTransferStore();
  
  const [currentManifest, setCurrentManifest] = React.useState<TransferManifest | null>(null);
  const [decoder, setDecoder] = React.useState<FountainDecoder | null>(null);
  const [isReconstructing, setIsReconstructing] = React.useState(false);
  const [reconstructedFile, setReconstructedFile] = React.useState<Blob | null>(null);
  const [showHelp, setShowHelp] = React.useState(false);
  const [torchEnabled, setTorchEnabled] = React.useState(false);

  const decoderRef = React.useRef<FountainDecoder | null>(null);
  const manifestRef = React.useRef<TransferManifest | null>(null);
  const reconstructingRef = React.useRef(false);

  const handleDecodedFrame = React.useCallback(async (result: QRCodeResult) => {
    // Get binary data from QR scan
    const binaryData = result.binaryData;
    if (!binaryData || binaryData.length === 0) return;

    const decoded = decodeBinaryFrame(binaryData);
    if (!decoded) return;

    if (decoded.type === 'manifest') {
      const manifest = decoded.manifest;
      
      // Check if this is a new transfer
      if (manifestRef.current && manifestRef.current.transferId !== manifest.transferId) {
        // Different transfer, reset
        decoderRef.current = null;
      }

      if (!manifestRef.current || manifestRef.current.transferId !== manifest.transferId) {
        manifestRef.current = manifest;
        setCurrentManifest(manifest);
        
        const newDecoder = new FountainDecoder(manifest.totalBlocks, manifest.blockSize);
        decoderRef.current = newDecoder;
        setDecoder(newDecoder);
        
        setReceiverState({
          transferId: manifest.transferId,
          fileName: manifest.fileName,
          mimeType: manifest.mimeType,
          fileSize: manifest.fileSize,
          totalBlocks: manifest.totalBlocks,
          status: 'receiving',
          startTime: Date.now(),
          decodedBlocks: 0,
          uniqueSymbolsReceived: 0,
          duplicateSymbolsSkipped: 0,
        });
      }
      return;
    }

    if (decoded.type === 'fountain') {
      const currentDecoder = decoderRef.current;
      const manifest = manifestRef.current;
      if (!currentDecoder || !manifest) return;
      if (currentDecoder.isComplete) return;
      if (reconstructingRef.current) return;

      // Verify this symbol belongs to our transfer
      const expectedHash = hashTransferId(manifest.transferId);
      if (decoded.transferIdHash !== expectedHash) return;

      const contributed = currentDecoder.addSymbol(decoded.symbol.seed, decoded.symbol.data);
      
      if (contributed) {
        setReceiverState({
          decodedBlocks: currentDecoder.decodedCount,
          uniqueSymbolsReceived: (receiver.uniqueSymbolsReceived || 0) + 1,
          progress: currentDecoder.progress * 100,
        });
      } else {
        setReceiverState({
          duplicateSymbolsSkipped: (receiver.duplicateSymbolsSkipped || 0) + 1,
        });
      }

      // Update ETA
      if (receiver.startTime && currentDecoder.progress > 0 && currentDecoder.progress < 1) {
        const elapsed = Date.now() - receiver.startTime;
        const rate = currentDecoder.decodedCount / (elapsed / 1000);
        const remaining = manifest.totalBlocks - currentDecoder.decodedCount;
        const estimatedTimeRemaining = remaining / rate * 1000;
        setReceiverState({ estimatedTimeRemaining });
      }

      // Check if decoding is complete
      if (currentDecoder.isComplete && !reconstructingRef.current) {
        reconstructingRef.current = true;
        await attemptReconstruction(currentDecoder, manifest);
      }
    }
  }, [receiver.startTime, receiver.uniqueSymbolsReceived, receiver.duplicateSymbolsSkipped, setReceiverState]);

  const { startScanning, stopScanning, isScanning, error, videoRef } = useQRScanner({
    onDecode: handleDecodedFrame,
    scanInterval: 50,
    enabled: !reconstructedFile,
  });

  const attemptReconstruction = async (dec: FountainDecoder, manifest: TransferManifest) => {
    setIsReconstructing(true);
    setReceiverState({ status: 'reconstructing' });

    try {
      let fileData: Uint8Array;
      
      if (manifest.compressed) {
        const compressedData = dec.getDecodedData(manifest.compressedSize || manifest.fileSize);
        fileData = await decompressData(compressedData);
      } else {
        fileData = dec.getDecodedData(manifest.fileSize);
      }
      
      const valid = await verifyChecksum(fileData, manifest.checksum);

      if (valid) {
        const blob = new Blob([fileData.buffer as ArrayBuffer], { type: manifest.mimeType });
        setReconstructedFile(blob);
        setReceiverState({ status: 'complete', progress: 100 });
        stopScanning();
        toast({ title: 'Transfer Complete', description: `${manifest.fileName} received successfully`, variant: 'success' });
      } else {
        setReceiverState({ status: 'error', errorMessage: 'Checksum verification failed. Some data may be corrupted.' });
        toast({ title: 'Verification Failed', description: 'File integrity check failed. Please try again.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Reconstruction error:', err);
      setReceiverState({ status: 'error', errorMessage: 'Failed to reconstruct file' });
      toast({ title: 'Error', description: 'Failed to reconstruct file', variant: 'destructive' });
    } finally {
      setIsReconstructing(false);
      reconstructingRef.current = false;
    }
  };

  const handleDownload = () => {
    if (reconstructedFile && currentManifest) {
      const url = URL.createObjectURL(reconstructedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentManifest.fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleReset = () => {
    resetReceiver();
    setCurrentManifest(null);
    manifestRef.current = null;
    decoderRef.current = null;
    setDecoder(null);
    setReconstructedFile(null);
    reconstructingRef.current = false;
    startScanning();
  };

  const handleTorchToggle = async () => {
    if (!videoRef.current) return;
    try {
      const track = (videoRef.current.srcObject as MediaStream)?.getVideoTracks()[0];
      if (track) {
        await track.applyConstraints({ advanced: [{ torch: !torchEnabled }] } as any);
        setTorchEnabled(!torchEnabled);
      }
    } catch (e) {
      console.error('Torch toggle failed:', e);
    }
  };

  if (reconstructedFile && currentManifest) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen flex flex-col items-center justify-center p-4"
      >
        <div className="w-full max-w-md space-y-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-24 h-24 mx-auto rounded-full bg-optical-green/10 flex items-center justify-center"
          >
            <CheckCircle className="w-12 h-12 text-optical-green" />
          </motion.div>

          <div>
            <h1 className="text-3xl font-bold mb-2">Transfer Complete</h1>
            <p className="text-muted-foreground">{currentManifest.fileName}</p>
            <p className="text-sm text-muted-foreground mt-1">{formatFileSize(currentManifest.fileSize)}</p>
          </div>

          <div className="glass-strong rounded-xl p-4 flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-optical-green">
              <Shield className="w-5 h-5" />
              <span>Integrity verified</span>
            </div>
            <div className="flex items-center gap-2">
              <WifiOff className="w-5 h-5" />
              <span>Offline transfer</span>
            </div>
          </div>

          <Button variant="optical" size="xl" onClick={handleDownload} className="w-full">
            <Download className="w-5 h-5 mr-2" />
            Download File
          </Button>

          <Button variant="secondary" onClick={handleReset} className="w-full">
            <RotateCcw className="w-5 h-5 mr-2" />
            Receive Another File
          </Button>
        </div>
      </motion.div>
    );
  }

  if (receiver.status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen flex flex-col items-center justify-center p-4"
      >
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-red-400" />
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-2">Transfer Failed</h1>
            <p className="text-muted-foreground">{receiver.errorMessage || 'An error occurred during transfer'}</p>
          </div>

          <Button variant="optical" size="xl" onClick={handleReset} className="w-full">
            <RotateCcw className="w-5 h-5 mr-2" />
            Try Again
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex flex-col"
    >
      <div className="relative flex-1 flex flex-col">
        <div className="relative w-full h-full max-h-[70vh] min-h-[400px] bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover camera-preview"
            playsInline
            muted
            aria-label="Camera preview for QR scanning"
          />
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-[70%] aspect-square max-w-[300px] scan-frame">
              <div className="corner-marker tl" />
              <div className="corner-marker tr" />
              <div className="corner-marker bl" />
              <div className="corner-marker br" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isScanning && (
              <motion.div
                key="scan-line"
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[70%] h-0.5 bg-gradient-to-r from-transparent via-optical-green to-transparent scan-overlay" style={{ maxWidth: '300px' }} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between p-4 pointer-events-auto">
            <div className="glass-strong rounded-xl px-4 py-2 text-center">
              <p className="font-medium">Point camera at sender's screen</p>
              <p className="text-xs text-muted-foreground">Fountain codes — order doesn't matter</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleTorchToggle}
                className={cn(torchEnabled && 'text-optical-green')}
                aria-label={torchEnabled ? 'Turn off flashlight' : 'Turn on flashlight'}
              >
                {torchEnabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 w-full max-w-2xl mx-auto space-y-6">
          {currentManifest && receiver.status === 'receiving' && (
            <Card className="glass-strong">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Receiving</CardTitle>
                  <span className="text-sm font-mono text-optical-green">
                    {formatNumber(receiver.decodedBlocks)} / {formatNumber(currentManifest.totalBlocks)} blocks
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{currentManifest.fileName}</span>
                  <span className="font-mono text-optical-green">{formatFileSize(currentManifest.fileSize)}</span>
                </div>
                <Progress value={receiver.progress} max={100} className="h-3" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{receiver.progress.toFixed(1)}%</span>
                  <span className="font-mono text-optical-green">
                    ETA: {receiver.estimatedTimeRemaining ? formatDuration(receiver.estimatedTimeRemaining) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Symbols: {formatNumber(receiver.uniqueSymbolsReceived)} received</span>
                  <span>Duplicates skipped: {formatNumber(receiver.duplicateSymbolsSkipped)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {!currentManifest && (
            <Card className="glass-strong">
              <CardContent className="pt-6 pb-6 text-center">
                <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Waiting for QR Code</h3>
                <p className="text-muted-foreground mb-4">
                  Point your camera at the sender's screen to begin receiving
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-1">
                    <WifiOff className="w-5 h-5" />
                    <span>No Wi-Fi</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Shield className="w-5 h-5" />
                    <span>Verified</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Camera className="w-5 h-5" />
                    <span>Camera Only</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isReconstructing && (
            <Card className="glass-strong">
              <CardContent className="pt-6 pb-6 text-center">
                <Loader2 className="w-12 h-12 text-optical-green animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Reconstructing File</h3>
                <p className="text-muted-foreground">Verifying integrity via SHA-256...</p>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-center gap-4">
            <Button
              variant={isScanning ? "secondary" : "optical"}
              size="lg"
              onClick={isScanning ? stopScanning : startScanning}
              className="min-w-[160px]"
            >
              {isScanning ? (
                <>
                  <X className="w-5 h-5 mr-2" />
                  Stop Scanning
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 mr-2" />
                  Start Scanning
                </>
              )}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setShowHelp(true)} className="min-w-[160px]">
              <Info className="w-5 h-5 mr-2" />
              Help
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-strong rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Scanning Tips</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowHelp(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3 p-3 bg-optical-panel/50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-optical-green/10 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-5 h-5 text-optical-green" />
                  </div>
                  <div>
                    <p className="font-medium">Use Rear Camera</p>
                    <p className="text-muted-foreground">The back camera typically has better focus and resolution for QR codes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-optical-panel/50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-optical-green/10 flex items-center justify-center flex-shrink-0">
                    <Sun className="w-5 h-5 text-optical-green" />
                  </div>
                  <div>
                    <p className="font-medium">Maximize Brightness</p>
                    <p className="text-muted-foreground">Set sender screen to maximum brightness for best contrast</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-optical-panel/50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-optical-green/10 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-optical-green" />
                  </div>
                  <div>
                    <p className="font-medium">Fill the Frame</p>
                    <p className="text-muted-foreground">Position the QR code within the corner markers on screen</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-optical-panel/50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-optical-green/10 flex items-center justify-center flex-shrink-0">
                    <Minimize className="w-5 h-5 text-optical-green" />
                  </div>
                  <div>
                    <p className="font-medium">Keep Steady</p>
                    <p className="text-muted-foreground">Hold devices steady and parallel; avoid glare and reflections</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-optical-panel/50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-optical-green/10 flex items-center justify-center flex-shrink-0">
                    <Settings className="w-5 h-5 text-optical-green" />
                  </div>
                  <div>
                    <p className="font-medium">Fountain Codes</p>
                    <p className="text-muted-foreground">Missed frames are automatically handled — no need to restart. Just keep scanning.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

import { Sun, Smartphone, Minimize } from 'lucide-react';