'use client';

import * as React from 'react';
import { cn, formatFileSize } from '@/lib/utils';
import { useQRScanner } from '@/hooks/useQRScanner';
import { decodeBinaryFrame, verifyChecksum, decompressData } from '@/lib/protocol';
import { FountainDecoder } from '@/lib/fountain';
import { useTransferStore } from '@/stores/transferStore';
import { useToast } from '@/hooks/useToast';
import { Header, Footer } from './LandingPage';
import { TransferManifest, QRCodeResult } from '@light-drop/shared/types';
import { hashTransferId } from '@light-drop/shared/protocol';

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
  const [snippetText, setSnippetText] = React.useState<string | null>(null);

  const decoderRef = React.useRef<FountainDecoder | null>(null);
  const manifestRef = React.useRef<TransferManifest | null>(null);
  const reconstructingRef = React.useRef(false);

  const handleDecodedFrame = React.useCallback(async (result: QRCodeResult) => {
    const binaryData = result.binaryData;
    if (!binaryData || binaryData.length === 0) return;

    const decoded = decodeBinaryFrame(binaryData);
    if (!decoded) return;

    if (decoded.type === 'manifest') {
      const manifest = decoded.manifest;
      
      if (manifestRef.current && manifestRef.current.transferId !== manifest.transferId) {
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

      if (receiver.startTime && currentDecoder.progress > 0 && currentDecoder.progress < 1) {
        const elapsed = Date.now() - receiver.startTime;
        const rate = currentDecoder.decodedCount / (elapsed / 1000);
        const remaining = manifest.totalBlocks - currentDecoder.decodedCount;
        const estimatedTimeRemaining = remaining / rate * 1000;
        setReceiverState({ estimatedTimeRemaining });
      }

      if (currentDecoder.isComplete && !reconstructingRef.current) {
        reconstructingRef.current = true;
        await attemptReconstruction(currentDecoder, manifest);
      }
    }
  }, [receiver.startTime, receiver.uniqueSymbolsReceived, receiver.duplicateSymbolsSkipped, setReceiverState]);

  const { startScanning, stopScanning, isScanning, videoRef } = useQRScanner({
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
        
        if (manifest.fileName === 'lightdrop-snippet.txt') {
          try {
            const text = new TextDecoder().decode(fileData);
            setSnippetText(text);
          } catch (e) {
            console.error('Failed to decode snippet text', e);
          }
        }

        stopScanning();
        toast({ title: 'Transfer Complete', description: manifest.fileName === 'lightdrop-snippet.txt' ? 'Text snippet received successfully' : `${manifest.fileName} received successfully` });
      } else {
        setReceiverState({ status: 'error', errorMessage: 'Checksum verification failed.' });
        toast({ title: 'Verification Failed', description: 'File integrity check failed.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Reconstruction error:', err);
      setReceiverState({ status: 'error', errorMessage: 'Failed to reconstruct file' });
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

  const handleCopy = async () => {
    if (snippetText) {
      try {
        await navigator.clipboard.writeText(snippetText);
        toast({ title: 'Copied', description: 'Text copied to clipboard' });
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to copy text', variant: 'destructive' });
      }
    }
  };

  const handleReset = () => {
    resetReceiver();
    setCurrentManifest(null);
    manifestRef.current = null;
    decoderRef.current = null;
    setDecoder(null);
    setReconstructedFile(null);
    setSnippetText(null);
    reconstructingRef.current = false;
    startScanning();
  };

  return (
    <div className="flex flex-col min-h-[100svh] bg-lightdrop-bg text-lightdrop-text font-mono font-[15px] leading-relaxed relative bg-[radial-gradient(circle_at_80%_-10%,rgba(88,200,255,0.07),transparent_35%)]">
      <Header />
      
      <main className="flex-1 flex flex-col items-center gap-[14px] p-5 w-full">
        <section className="text-center mb-4">
          <p className="m-0 mb-2 text-lightdrop-accent text-[11px] font-bold tracking-[0.14em] uppercase">This camera receives</p>
          <h1 className="m-0 text-lightdrop-accent text-[16px] tracking-[0.12em] uppercase">Point and receive</h1>
          <p className="mt-2 text-lightdrop-muted text-[13px] max-w-[640px] text-center">Point your camera at the sender's screen to receive the file.</p>
        </section>

        {!reconstructedFile && receiver.status !== 'error' && (
          <div className="relative w-[min(92vw,480px)] rounded-[10px] overflow-hidden bg-black aspect-video flex-none border border-lightdrop-line">
            <video
              ref={videoRef}
              className="w-full h-full object-cover block"
              playsInline
              muted
            />
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <button
                  onClick={startScanning}
                  className="px-6 py-3 bg-lightdrop-accent text-lightdrop-accent-ink rounded-lg font-bold hover:bg-lightdrop-accent-hi transition-colors"
                >
                  Start Camera
                </button>
              </div>
            )}
          </div>
        )}

        {isScanning && !currentManifest && (
          <div className="text-center text-lightdrop-muted text-[13px] mt-4">
            Waiting for QR codes...
          </div>
        )}

        {currentManifest && !reconstructedFile && receiver.status !== 'error' && (
          <div className="w-[min(92vw,480px)] flex flex-col gap-2 mt-4">
            <div className="flex justify-between items-end text-[13px] font-mono text-lightdrop-muted">
              <span className="truncate max-w-[200px] text-lightdrop-text">{currentManifest.fileName}</span>
              <span className="text-lightdrop-accent font-bold">{(receiver.progress || 0).toFixed(1)}%</span>
            </div>
            
            <div className="w-full h-[14px] bg-lightdrop-panel border border-lightdrop-line rounded-[7px] overflow-hidden flex-none">
              <div 
                className="h-full bg-lightdrop-accent transition-[width] duration-250 ease-out"
                style={{ width: `${receiver.progress || 0}%` }}
              />
            </div>
            
            <div className="flex justify-between text-[11px] text-lightdrop-muted uppercase tracking-[0.04em] mt-1">
              <span>{receiver.decodedBlocks} / {currentManifest.totalBlocks} Blocks</span>
              <span>{isReconstructing ? 'Reconstructing...' : 'Receiving...'}</span>
            </div>
          </div>
        )}

        {reconstructedFile && currentManifest && (
          <div className="w-[min(92vw,640px)] flex flex-col items-center gap-[14px] mt-4">
            <div className="text-lightdrop-text text-[22px] font-bold">SHA-256 verified ✓</div>
            
            {snippetText !== null ? (
              <>
                <p className="text-lightdrop-muted">Text Snippet Received</p>
                <div className="w-full relative group">
                  <textarea
                    readOnly
                    value={snippetText}
                    className="w-full h-[150px] bg-lightdrop-panel border border-lightdrop-line rounded-lg p-3 text-lightdrop-text font-sans resize-none focus:outline-none focus:border-lightdrop-accent transition-colors"
                  />
                </div>
                <button 
                  onClick={handleCopy}
                  className="inline-block w-full break-words text-lightdrop-accent-ink bg-lightdrop-accent rounded-lg px-[20px] py-[12px] text-[16px] font-bold no-underline transition-colors hover:bg-lightdrop-accent-hi mt-2"
                >
                  Copy to Clipboard
                </button>
              </>
            ) : (
              <>
                <p className="text-lightdrop-muted">File: {currentManifest.fileName} ({formatFileSize(currentManifest.fileSize)})</p>
                <button 
                  onClick={handleDownload}
                  className="inline-block max-w-full break-words text-lightdrop-accent-ink bg-lightdrop-accent rounded-lg px-[20px] py-[12px] text-[16px] font-bold no-underline transition-colors hover:bg-lightdrop-accent-hi mt-4"
                >
                  Save {currentManifest.fileName}
                </button>
              </>
            )}
            
            <button 
              onClick={handleReset}
              className="mt-4 px-4 py-2 border border-lightdrop-line rounded-lg text-lightdrop-muted text-[13px] hover:text-lightdrop-text hover:border-lightdrop-text transition-colors"
            >
              Receive another
            </button>
          </div>
        )}

        {receiver.status === 'error' && (
          <div className="w-[min(92vw,640px)] flex flex-col items-center gap-[14px] mt-4">
            <div className="text-lightdrop-red text-[22px] font-bold">Verification Failed ✗</div>
            <p className="text-lightdrop-muted">{receiver.errorMessage}</p>
            
            <button 
              onClick={handleReset}
              className="mt-4 px-4 py-2 border border-lightdrop-red text-lightdrop-red rounded-lg text-[13px] hover:bg-lightdrop-red/10 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}