'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { cn, formatFileSize } from '@/lib/utils';
import { Header, Footer } from './LandingPage';
import { QRTransmissionEngine } from '@/components/sender/QRTransmissionEngine';
import { prepareTransfer, getTransferEstimates, PreparedTransfer } from '@/lib/protocol';
import { useTransferStore } from '@/stores/transferStore';
import { useToast } from '@/hooks/useToast';

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

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > 500 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Maximum file size is 500MB', variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
      setSendMode('file');
      setEstimates(getTransferEstimates(file.size, config));
    }
  }, [config, toast]);

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
    if (sendMode === 'snippet' && textSnippet) {
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
    setEstimates(null);
  };

  const handleSpeedChange = (speed: any) => setConfig({ speed });

  if (prepared) {
    return (
      <div className="flex flex-col min-h-[100svh] bg-lightdrop-bg text-lightdrop-text font-mono font-[15px] leading-relaxed relative bg-[radial-gradient(circle_at_80%_-10%,rgba(88,200,255,0.07),transparent_35%)]">
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

  return (
    <div className="flex flex-col min-h-[100svh] bg-lightdrop-bg text-lightdrop-text font-mono font-[15px] leading-relaxed relative bg-[radial-gradient(circle_at_80%_-10%,rgba(88,200,255,0.07),transparent_35%)]">
      <Header />
      <main className="flex-1 flex flex-col items-center gap-[14px] p-5 w-full">
        
        <section className="text-center mb-4">
          <p className="m-0 mb-2 text-lightdrop-accent text-[11px] font-bold tracking-[0.14em] uppercase">Screen → camera</p>
          <h1 className="m-0 text-lightdrop-accent text-[16px] tracking-[0.12em] uppercase">Send a file</h1>
          <p className="mt-2 text-lightdrop-muted text-[13px] max-w-[640px] text-center">Nothing leaves your device until you scan with a receiver.</p>
        </section>

        <div className="flex gap-2 p-1 border border-lightdrop-line rounded-full uppercase text-[11px] tracking-[0.06em] text-lightdrop-muted font-mono mb-4">
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

        {sendMode === 'snippet' ? (
          <div className="relative w-[min(92vw,640px)] flex flex-col gap-2">
            <textarea
              className="w-full h-[150px] bg-lightdrop-panel border border-lightdrop-line rounded-lg p-3 text-lightdrop-text font-sans resize-none focus:outline-none focus:border-lightdrop-accent transition-colors"
              placeholder="Type or paste text/link here..."
              value={textSnippet}
              onChange={(e) => setTextSnippet(e.target.value)}
            />
          </div>
        ) : !selectedFile ? (
          <div {...getRootProps()} className={cn(
            "relative w-[min(92vw,640px)] flex items-center gap-[14px] bg-lightdrop-panel border border-lightdrop-line-bright rounded-lg p-[14px_16px] cursor-pointer transition-colors hover:border-lightdrop-accent",
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
          <div className="relative w-[min(92vw,640px)] flex items-center gap-[14px] bg-[rgba(255,123,114,0.12)] border border-lightdrop-red rounded-lg p-[14px_16px] cursor-pointer">
            <span 
              onClick={() => setSelectedFile(null)}
              className="flex-none text-lightdrop-red bg-transparent border border-lightdrop-red rounded-md px-[14px] py-[8px] font-bold hover:bg-lightdrop-red hover:text-lightdrop-accent-ink transition-colors cursor-pointer"
            >
              Clear File
            </span>
            <span className="min-w-0 break-all text-lightdrop-accent font-bold flex flex-col">
              <span>{selectedFile.name}</span>
              <span className="text-[11px] text-lightdrop-muted">{formatFileSize(selectedFile.size)}</span>
            </span>
          </div>
        )}

        {(selectedFile || (sendMode === 'snippet' && textSnippet.length > 0)) && (
          <details className="w-[min(92vw,640px)] bg-lightdrop-panel border border-lightdrop-line rounded-lg p-[8px_12px] open:pb-4 mt-2" open>
            <summary className="cursor-pointer text-lightdrop-text-dim text-[13px] font-bold uppercase tracking-[0.08em] select-none">
              Transfer settings
            </summary>
            
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
                </select>
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

            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-[18px] gap-y-[10px] mt-[10px] pt-[9px] border-t border-lightdrop-line">
              <div className="min-w-0">
                <dt className="text-lightdrop-muted text-[10px] tracking-[0.08em] uppercase">Source Blocks</dt>
                <dd className="m-[2px_0_0] text-lightdrop-text text-[13px] break-all">{estimates?.totalBlocks || '—'}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-lightdrop-muted text-[10px] tracking-[0.08em] uppercase">Est. Duration</dt>
                <dd className="m-[2px_0_0] text-lightdrop-text text-[13px] break-all">{estimates?.estimatedDuration || '—'}</dd>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                className="w-full text-lightdrop-accent-ink bg-lightdrop-accent border-0 rounded-lg px-[36px] py-[14px] text-[18px] font-bold cursor-pointer transition-colors hover:bg-lightdrop-accent-hi disabled:opacity-50"
                onClick={handleStartTransmission}
                disabled={isProcessing}
              >
                {isProcessing ? 'Preparing...' : 'Start transmission'}
              </button>
            </div>
          </details>
        )}

        {sendMode === 'file' && !selectedFile && (
          <div className="text-lightdrop-muted text-[13px] text-center max-w-[640px] mt-4">
            Choose a file to begin
          </div>
        )}

        <div className="text-lightdrop-muted-dim text-[11px] text-center max-w-[640px] mt-8">
          Open Receive on the other device. Turn up this screen's brightness.
        </div>

      </main>
      <Footer />
    </div>
  );
}