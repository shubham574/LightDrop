'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { cn, formatFileSize } from '@/lib/utils';
import { Header, Footer } from './LandingPage';
import { QRTransmissionEngine } from '@/components/sender/QRTransmissionEngine';
import { prepareTransfer, getTransferEstimates, PreparedTransfer } from '@/lib/protocol';
import { useTransferStore } from '@/stores/transferStore';
import { useToast } from '@/hooks/useToast';
import { optimizeImageForTransfer } from '@/lib/image/optimizeImage';
import {
  encodeSimpleText,
  isSimpleTextEligible,
  MAX_SIMPLE_TEXT_BYTES,
} from '@/lib/simpleTextTransfer';
import { QRDisplay } from '@/components/qr/QRDisplay';

export function SendPage() {
  const { toast } = useToast();
  const { 
    setSenderState, 
    setCurrentManifest, 
    resetSender,
    config,
    setConfig 
  } = useTransferStore();
  
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [sendMode, setSendMode] = React.useState<'file' | 'snippet'>('file');
  const [textSnippet, setTextSnippet] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [prepared, setPrepared] = React.useState<PreparedTransfer | null>(null);
  const [estimates, setEstimates] = React.useState<any>(null);
  const [optimizeImages, setOptimizeImages] = React.useState(true);
  const [originalFileSize, setOriginalFileSize] = React.useState<number | null>(null);

  // Simple text mode: single static QR (no fountain needed)
  const [simpleTextData, setSimpleTextData] = React.useState<Uint8Array | null>(null);

  const onDrop = React.useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      let file = acceptedFiles[0];
      if (file.size > 500 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Maximum file size is 500MB', variant: 'destructive' });
        return;
      }
      if (file.type.startsWith('image/') && optimizeImages) {
        setOriginalFileSize(file.size);
        const optimized = await optimizeImageForTransfer(file);
        if (optimized.size === file.size) {
           setOriginalFileSize(null);
        }
        file = optimized;
      } else {
        setOriginalFileSize(null);
      }
      setSelectedFile(file);
      setSendMode('file');
      setEstimates(getTransferEstimates(file.size, config));
    }
  }, [config, toast, optimizeImages]);

  React.useEffect(() => {
    if (sendMode === 'file' && selectedFile) {
      setEstimates(getTransferEstimates(selectedFile.size, config));
    } else if (sendMode === 'snippet' && textSnippet) {
      const blob = new Blob([textSnippet], { type: 'text/plain' });
      setEstimates(getTransferEstimates(blob.size, config));
    } else {
      setEstimates(null);
    }
  }, [selectedFile, textSnippet, sendMode, config]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: false });

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setSenderState({ status: 'preparing' });
    
    try {
      const transfer = await prepareTransfer(file, {
        blockSize: config.blockSize,
        speed: config.speed,
      });
      
      setPrepared(transfer);
      setCurrentManifest(transfer.manifest);
      setSenderState({ 
        status: 'transmitting',
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        totalBlocks: transfer.manifest.totalBlocks,
      });
    } catch (error) {
      console.error('File processing error:', error);
      toast({ title: 'Error', description: 'Failed to process file', variant: 'destructive' });
      setSenderState({ status: 'error', errorMessage: 'Failed to process file' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartTransmission = () => {
    if (sendMode === 'snippet' && textSnippet.trim()) {
      // Simple mode for short text — single static QR, instant
      if (isSimpleTextEligible(textSnippet)) {
        try {
          const encoded = encodeSimpleText(textSnippet);
          setSimpleTextData(encoded);
          return;
        } catch (err) {
          console.error('Simple text encode failed:', err);
          // Fallback to fountain mode
        }
      }
      // Long text: fountain coding
      const snippetFile = new File([textSnippet], 'lightdrop-snippet.txt', { type: 'text/plain' });
      processFile(snippetFile);
    } else if (sendMode === 'file' && selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleCancel = () => {
    resetSender();
    setSelectedFile(null);
    setTextSnippet('');
    setPrepared(null);
    setSimpleTextData(null);
    setEstimates(null);
  };

  const handleSpeedChange = (speed: any) => setConfig({ speed });

  // --- Simple text mode: single static QR ---
  if (simpleTextData) {
    return (
      <div className="flex flex-col min-h-[100svh] bg-lightdrop-bg text-lightdrop-text font-mono font-[15px] leading-relaxed relative">
        <Header />
        <main className="flex-1 flex flex-col items-center gap-4 p-5">
          <section className="text-center mb-2">
            <p className="text-lightdrop-accent text-[11px] font-bold tracking-[0.14em] uppercase mb-1">⚡ Single QR · Instant Send</p>
            <h1 className="text-lightdrop-accent text-[16px] tracking-[0.12em] uppercase">Scan this code</h1>
            <p className="mt-2 text-lightdrop-muted text-[13px] max-w-[480px] text-center">
              Point the receiver's camera at this QR code. Text is received in one scan.
            </p>
          </section>

          <div className="bg-white rounded-[10px] p-4 sm:p-5 flex items-center justify-center w-[min(92vw,55vh)] aspect-square mx-auto">
            <QRDisplay data={simpleTextData} className="w-full h-full object-contain" />
          </div>

          <div className="bg-lightdrop-panel border border-lightdrop-line rounded-lg p-3 max-w-[min(92vw,480px)] w-full">
            <div className="text-lightdrop-muted text-[10px] uppercase tracking-[0.08em] mb-1">Your text</div>
            <div className="text-lightdrop-text text-[13px] break-words line-clamp-4 whitespace-pre-wrap">{textSnippet}</div>
          </div>

          <button
            className="mt-2 px-6 py-3 border border-lightdrop-line text-lightdrop-muted rounded-lg font-bold hover:border-lightdrop-text hover:text-lightdrop-text transition-colors cursor-pointer"
            onClick={handleCancel}
          >
            ← Back
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  // --- Fountain mode: animated QR stream ---
  if (prepared) {
    return (
      <div className="flex flex-col min-h-[100svh] bg-lightdrop-bg text-lightdrop-text font-mono font-[15px] leading-relaxed relative">
        <Header />
        <main className="flex-1 flex flex-col items-center p-5">
          <QRTransmissionEngine
            encoder={prepared.encoder}
            manifest={prepared.manifest}
            onCancel={handleCancel}
            onSpeedChange={handleSpeedChange}
            initialSpeed={config.speed}
          />
        </main>
        <Footer />
      </div>
    );
  }

  // --- Input form ---
  const snippetReady = sendMode === 'snippet' && textSnippet.trim().length > 0;
  const fileReady = sendMode === 'file' && !!selectedFile;
  const canSend = snippetReady || fileReady;
  const isInstant = sendMode === 'snippet' && isSimpleTextEligible(textSnippet);

  return (
    <div className="flex flex-col min-h-[100svh] bg-lightdrop-bg text-lightdrop-text font-mono font-[15px] leading-relaxed relative bg-[radial-gradient(circle_at_80%_-10%,rgba(88,200,255,0.07),transparent_35%)]">
      <Header />
      <main className="flex-1 flex flex-col items-center gap-[14px] p-5 w-full">
        
        <section className="text-center mb-2">
          <p className="m-0 mb-2 text-lightdrop-accent text-[11px] font-bold tracking-[0.14em] uppercase">Screen → camera</p>
          <h1 className="m-0 text-lightdrop-accent text-[16px] tracking-[0.12em] uppercase">Send a file or text</h1>
          <p className="mt-2 text-lightdrop-muted text-[13px] max-w-[640px] text-center">Nothing leaves your device — data travels via QR codes displayed on screen.</p>
        </section>

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 border border-lightdrop-line rounded-full uppercase text-[11px] tracking-[0.06em] text-lightdrop-muted font-mono mb-2">
          <label className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer transition-colors",
            sendMode === 'file' ? "bg-lightdrop-panel border border-lightdrop-line-bright text-lightdrop-text" : "border border-transparent hover:text-lightdrop-text"
          )}>
            <input type="radio" name="send-mode" value="file" checked={sendMode === 'file'} onChange={() => setSendMode('file')} className="hidden" />
            <span>File</span>
          </label>
          <label className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer transition-colors",
            sendMode === 'snippet' ? "bg-lightdrop-panel border border-lightdrop-line-bright text-lightdrop-text" : "border border-transparent hover:text-lightdrop-text"
          )}>
            <input type="radio" name="send-mode" value="snippet" checked={sendMode === 'snippet'} onChange={() => setSendMode('snippet')} className="hidden" />
            <span>Text / Link</span>
          </label>
        </div>

        {/* --- TEXT / LINK MODE --- */}
        {sendMode === 'snippet' && (
          <div className="w-[min(92vw,640px)] flex flex-col gap-3">
            <textarea
              className="w-full h-[140px] bg-lightdrop-panel border border-lightdrop-line rounded-lg p-3 text-lightdrop-text font-sans text-[15px] resize-none focus:outline-none focus:border-lightdrop-accent transition-colors"
              placeholder="Paste a URL, type a message, share a password…"
              value={textSnippet}
              onChange={(e) => setTextSnippet(e.target.value)}
              autoFocus
            />
            
            {textSnippet.trim().length > 0 && (
              <>
                {/* Mode badge */}
                <div className="flex items-center justify-between text-[11px] text-lightdrop-muted">
                  <span>{new TextEncoder().encode(textSnippet).length} bytes</span>
                  {isInstant ? (
                    <span className="text-lightdrop-green font-bold">⚡ Instant single-QR</span>
                  ) : (
                    <span>Fountain mode (animated QR stream)</span>
                  )}
                </div>

                {/* Action button — always visible, no hidden panel needed */}
                <button
                  className="w-full text-lightdrop-accent-ink bg-lightdrop-accent border-0 rounded-lg px-[36px] py-[14px] text-[18px] font-bold cursor-pointer transition-colors hover:bg-lightdrop-accent-hi disabled:opacity-50"
                  onClick={handleStartTransmission}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Preparing…' : isInstant ? '⚡ Show QR' : 'Start transmission'}
                </button>

                {/* Advanced settings — collapsible, only for fountain mode */}
                {!isInstant && (
                  <details className="bg-lightdrop-panel border border-lightdrop-line rounded-lg p-[8px_12px] open:pb-4">
                    <summary className="cursor-pointer text-lightdrop-text-dim text-[13px] font-bold uppercase tracking-[0.08em] select-none">
                      Advanced settings
                    </summary>
                    <div className="flex flex-wrap gap-x-[18px] gap-y-[10px] pt-[10px]">
                      <label className="flex flex-col gap-[3px] text-[11px] text-lightdrop-muted uppercase tracking-[0.08em]">
                        <span>Block Size</span>
                        <select
                          value={config.blockSize}
                          onChange={(e) => setConfig({ blockSize: parseInt(e.target.value) })}
                          className="font-mono text-[15px] text-lightdrop-text bg-lightdrop-bg border border-lightdrop-line rounded-md px-[8px] py-[5px]"
                        >
                          <option value={64}>64 bytes</option>
                          <option value={128}>128 bytes</option>
                          <option value={256}>256 bytes (default)</option>
                          <option value={512}>512 bytes</option>
                          <option value={1024}>1 KB</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-[3px] text-[11px] text-lightdrop-muted uppercase tracking-[0.08em]">
                        <span>Speed</span>
                        <select
                          value={config.speed}
                          onChange={(e) => setConfig({ speed: e.target.value as any })}
                          className="font-mono text-[15px] text-lightdrop-text bg-lightdrop-bg border border-lightdrop-line rounded-md px-[8px] py-[5px]"
                        >
                          <option value="COMPATIBILITY">Compatibility (5 FPS)</option>
                          <option value="BALANCED">Balanced (10 FPS)</option>
                          <option value="FAST">Fast (15 FPS)</option>
                          <option value="EXTREME">Extreme (30 FPS)</option>
                          <option value="HYPER">Hyper (60 FPS)</option>
                        </select>
                      </label>
                    </div>
                    {estimates && (
                      <div className="grid grid-cols-2 gap-x-4 mt-3 pt-2 border-t border-lightdrop-line text-[11px]">
                        <div>
                          <dt className="text-lightdrop-muted uppercase tracking-[0.08em]">Source Blocks</dt>
                          <dd className="text-lightdrop-text mt-0.5">{estimates.totalBlocks}</dd>
                        </div>
                        <div>
                          <dt className="text-lightdrop-muted uppercase tracking-[0.08em]">Est. Duration</dt>
                          <dd className="text-lightdrop-text mt-0.5">{estimates.estimatedDuration}</dd>
                        </div>
                      </div>
                    )}
                  </details>
                )}
              </>
            )}
          </div>
        )}

        {/* --- FILE MODE --- */}
        {sendMode === 'file' && (
          <div className="w-[min(92vw,640px)] flex flex-col gap-3">
            {!selectedFile ? (
              <div {...getRootProps()} className={cn(
                "relative flex items-center gap-[14px] bg-lightdrop-panel border border-lightdrop-line-bright rounded-lg p-[14px_16px] cursor-pointer transition-colors hover:border-lightdrop-accent",
                isDragActive ? "border-lightdrop-accent bg-lightdrop-panel-strong" : ""
              )}>
                <input {...getInputProps()} className="absolute w-[1px] h-[1px] opacity-0 pointer-events-none" />
                <span className="flex-none text-lightdrop-accent-ink bg-lightdrop-accent border border-transparent rounded-md px-[14px] py-[8px] font-bold transition-colors">
                  Select File
                </span>
                <span className="min-w-0 break-all text-lightdrop-accent font-bold">
                  Any file · up to 500 MB
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-[14px] bg-[rgba(255,123,114,0.12)] border border-lightdrop-red rounded-lg p-[14px_16px]">
                <span 
                  onClick={() => setSelectedFile(null)}
                  className="flex-none text-lightdrop-red bg-transparent border border-lightdrop-red rounded-md px-[14px] py-[8px] font-bold hover:bg-lightdrop-red hover:text-lightdrop-accent-ink transition-colors cursor-pointer"
                >
                  Clear
                </span>
                <span className="min-w-0 break-all text-lightdrop-accent font-bold flex flex-col">
                  <span>{selectedFile.name}</span>
                  <span className="text-[11px] text-lightdrop-muted">
                    {originalFileSize && originalFileSize !== selectedFile.size ? (
                      <span className="text-lightdrop-green">{formatFileSize(originalFileSize)} → {formatFileSize(selectedFile.size)}</span>
                    ) : (
                      formatFileSize(selectedFile.size)
                    )}
                  </span>
                </span>
              </div>
            )}

            {selectedFile && (
              <>
                {/* Action button */}
                <button
                  className="w-full text-lightdrop-accent-ink bg-lightdrop-accent border-0 rounded-lg px-[36px] py-[14px] text-[18px] font-bold cursor-pointer transition-colors hover:bg-lightdrop-accent-hi disabled:opacity-50"
                  onClick={handleStartTransmission}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Preparing…' : 'Start transmission'}
                </button>

                {/* Advanced settings */}
                <details className="bg-lightdrop-panel border border-lightdrop-line rounded-lg p-[8px_12px] open:pb-4">
                  <summary className="cursor-pointer text-lightdrop-text-dim text-[13px] font-bold uppercase tracking-[0.08em] select-none">
                    Advanced settings
                  </summary>

                  <label className="flex items-center gap-2 mt-3 mb-2 font-mono text-[11px] text-lightdrop-muted cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={optimizeImages} 
                      onChange={(e) => setOptimizeImages(e.target.checked)} 
                      className="cursor-pointer"
                    />
                    Optimize images before sending
                  </label>

                  <div className="flex flex-wrap gap-x-[18px] gap-y-[10px] pt-[10px]">
                    <label className="flex flex-col gap-[3px] text-[11px] text-lightdrop-muted uppercase tracking-[0.08em]">
                      <span>Block Size</span>
                      <select 
                        value={config.blockSize}
                        onChange={(e) => setConfig({ blockSize: parseInt(e.target.value) })}
                        className="font-mono text-[16px] text-lightdrop-text bg-lightdrop-bg border border-lightdrop-line rounded-md px-[8px] py-[5px]"
                      >
                        <option value={64}>64 bytes</option>
                        <option value={128}>128 bytes</option>
                        <option value={256}>256 bytes (default)</option>
                        <option value={512}>512 bytes</option>
                        <option value={1024}>1 KB</option>
                        <option value={1536}>1.5 KB</option>
                        <option value={2048}>2 KB — best lighting</option>
                      </select>
                      <span className="text-[10px] text-lightdrop-muted mt-1">Larger blocks need brighter, steadier scan</span>
                    </label>

                    <label className="flex flex-col gap-[3px] text-[11px] text-lightdrop-muted uppercase tracking-[0.08em]">
                      <span>Speed</span>
                      <select 
                        value={config.speed}
                        onChange={(e) => setConfig({ speed: e.target.value as any })}
                        className="font-mono text-[16px] text-lightdrop-text bg-lightdrop-bg border border-lightdrop-line rounded-md px-[8px] py-[5px]"
                      >
                        <option value="COMPATIBILITY">Compatibility (5 FPS)</option>
                        <option value="BALANCED">Balanced (10 FPS)</option>
                        <option value="FAST">Fast (15 FPS)</option>
                        <option value="EXTREME">Extreme (30 FPS)</option>
                        <option value="HYPER">Hyper (60 FPS)</option>
                      </select>
                    </label>
                  </div>

                  {estimates && (
                    <div className="grid grid-cols-2 gap-x-4 mt-3 pt-2 border-t border-lightdrop-line text-[11px]">
                      <div>
                        <dt className="text-lightdrop-muted uppercase tracking-[0.08em]">Source Blocks</dt>
                        <dd className="text-lightdrop-text mt-0.5">{estimates.totalBlocks}</dd>
                      </div>
                      <div>
                        <dt className="text-lightdrop-muted uppercase tracking-[0.08em]">Est. Duration</dt>
                        <dd className="text-lightdrop-text mt-0.5">{estimates.estimatedDuration}</dd>
                      </div>
                    </div>
                  )}
                </details>
              </>
            )}

            {!selectedFile && (
              <div className="text-lightdrop-muted text-[13px] text-center mt-2">
                Drag a file here, or click Select File
              </div>
            )}
          </div>
        )}

        <div className="text-lightdrop-muted-dim text-[11px] text-center max-w-[640px] mt-6">
          Open Receive on the other device and turn up your screen brightness.
        </div>

      </main>
      <Footer />
    </div>
  );
}