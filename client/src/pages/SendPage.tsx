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

  const handleCancel = () => {
    resetSender();
    setSelectedFile(null);
    setPrepared(null);
    setEstimates(null);
  };

  const handleSpeedChange = (speed: any) => setConfig({ speed });

  if (prepared) {
    return (
      <div className="flex flex-col min-h-[100svh] bg-decimen-bg text-decimen-text font-mono font-[15px] leading-relaxed relative bg-[radial-gradient(circle_at_80%_-10%,rgba(88,200,255,0.07),transparent_35%)]">
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
    <div className="flex flex-col min-h-[100svh] bg-decimen-bg text-decimen-text font-mono font-[15px] leading-relaxed relative bg-[radial-gradient(circle_at_80%_-10%,rgba(88,200,255,0.07),transparent_35%)]">
      <Header />
      <main className="flex-1 flex flex-col items-center gap-[14px] p-5 w-full">
        
        <section className="text-center mb-4">
          <p className="m-0 mb-2 text-decimen-accent text-[11px] font-bold tracking-[0.14em] uppercase">Screen → camera</p>
          <h1 className="m-0 text-decimen-accent text-[16px] tracking-[0.12em] uppercase">Send a file</h1>
          <p className="mt-2 text-decimen-muted text-[13px] max-w-[640px] text-center">Nothing leaves your device until you scan with a receiver.</p>
        </section>

        <div className="flex gap-2 p-1 border border-decimen-line rounded-full uppercase text-[11px] tracking-[0.06em] text-decimen-muted font-mono mb-4">
          <label className="flex items-center gap-2 px-3 py-1 bg-decimen-panel border border-decimen-line-bright rounded-full text-decimen-text cursor-pointer">
            <input type="radio" name="send-mode" value="file" defaultChecked className="hidden" />
            <span>File</span>
          </label>
          <label className="flex items-center gap-2 px-3 py-1 border border-transparent rounded-full cursor-pointer hover:text-decimen-text">
            <input type="radio" name="send-mode" value="snippet" disabled className="hidden" />
            <span className="opacity-50">Text snippet (Coming soon)</span>
          </label>
        </div>

        {!selectedFile ? (
          <div {...getRootProps()} className={cn(
            "relative w-[min(92vw,640px)] flex items-center gap-[14px] bg-decimen-panel border border-decimen-line-bright rounded-lg p-[14px_16px] cursor-pointer transition-colors hover:border-decimen-accent",
            isDragActive ? "border-decimen-accent bg-decimen-panel-strong" : ""
          )}>
            <input {...getInputProps()} className="absolute w-[1px] h-[1px] opacity-0 pointer-events-none" />
            <span className="flex-none text-decimen-accent-ink bg-decimen-accent border border-transparent rounded-md px-[14px] py-[8px] font-bold transition-colors">
              Select File
            </span>
            <span className="min-w-0 break-all text-decimen-accent font-bold">
              Any file · up to 500 MB
            </span>
          </div>
        ) : (
          <div className="relative w-[min(92vw,640px)] flex items-center gap-[14px] bg-[rgba(255,123,114,0.12)] border border-decimen-red rounded-lg p-[14px_16px] cursor-pointer">
            <span 
              onClick={() => setSelectedFile(null)}
              className="flex-none text-decimen-red bg-transparent border border-decimen-red rounded-md px-[14px] py-[8px] font-bold hover:bg-decimen-red hover:text-decimen-accent-ink transition-colors cursor-pointer"
            >
              Clear File
            </span>
            <span className="min-w-0 break-all text-decimen-accent font-bold flex flex-col">
              <span>{selectedFile.name}</span>
              <span className="text-[11px] text-decimen-muted">{formatFileSize(selectedFile.size)}</span>
            </span>
          </div>
        )}

        {selectedFile && (
          <details className="w-[min(92vw,640px)] bg-decimen-panel border border-decimen-line rounded-lg p-[8px_12px] open:pb-4 mt-2" open>
            <summary className="cursor-pointer text-decimen-text-dim text-[13px] font-bold uppercase tracking-[0.08em] select-none">
              Transfer settings
            </summary>
            
            <div className="flex flex-wrap gap-x-[18px] gap-y-[10px] pt-[10px]">
              <label className="flex flex-col gap-[3px] text-[11px] text-decimen-muted uppercase tracking-[0.08em]">
                <span>Block Size</span>
                <select 
                  value={config.blockSize}
                  onChange={(e) => setConfig({ blockSize: parseInt(e.target.value) })}
                  className="font-mono text-[16px] text-decimen-text bg-decimen-bg border border-decimen-line rounded-md px-[8px] py-[5px]"
                >
                  <option value={64}>64 bytes</option>
                  <option value={128}>128 bytes</option>
                  <option value={256}>256 bytes (default)</option>
                  <option value={512}>512 bytes</option>
                  <option value={1024}>1 KB</option>
                </select>
              </label>

              <label className="flex flex-col gap-[3px] text-[11px] text-decimen-muted uppercase tracking-[0.08em]">
                <span>Speed</span>
                <select 
                  value={config.speed}
                  onChange={(e) => setConfig({ speed: e.target.value as any })}
                  className="font-mono text-[16px] text-decimen-text bg-decimen-bg border border-decimen-line rounded-md px-[8px] py-[5px]"
                >
                  <option value="COMPATIBILITY">Compatibility (5 FPS)</option>
                  <option value="BALANCED">Balanced (10 FPS)</option>
                  <option value="FAST">Fast (15 FPS)</option>
                  <option value="EXTREME">Extreme (30 FPS)</option>
                  <option value="HYPER">Hyper (60 FPS)</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-[18px] gap-y-[10px] mt-[10px] pt-[9px] border-t border-decimen-line">
              <div className="min-w-0">
                <dt className="text-decimen-muted text-[10px] tracking-[0.08em] uppercase">Source Blocks</dt>
                <dd className="m-[2px_0_0] text-decimen-text text-[13px] break-all">{estimates?.totalBlocks || '—'}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-decimen-muted text-[10px] tracking-[0.08em] uppercase">Est. Duration</dt>
                <dd className="m-[2px_0_0] text-decimen-text text-[13px] break-all">{estimates?.estimatedDuration || '—'}</dd>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                className="w-full text-decimen-accent-ink bg-decimen-accent border-0 rounded-lg px-[36px] py-[14px] text-[18px] font-bold cursor-pointer transition-colors hover:bg-decimen-accent-hi disabled:opacity-50"
                onClick={() => processFile(selectedFile)}
                disabled={isProcessing}
              >
                {isProcessing ? 'Preparing...' : 'Start transmission'}
              </button>
            </div>
          </details>
        )}

        {!selectedFile && (
          <div className="text-decimen-muted text-[13px] text-center max-w-[640px] mt-4">
            Choose a file to begin
          </div>
        )}

        <div className="text-decimen-muted-dim text-[11px] text-center max-w-[640px] mt-8">
          Open Receive on the other device. Turn up this screen's brightness.
        </div>

      </main>
      <Footer />
    </div>
  );
}