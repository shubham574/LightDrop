import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TransferManifest, ReceiverState, SenderState } from '@optical-drop/shared/types';
import { DEFAULT_TRANSFER_CONFIG, TransferConfig } from '@/lib/protocol';

interface TransferStore {
  sender: SenderState;
  receiver: ReceiverState;
  currentManifest: TransferManifest | null;
  config: TransferConfig;
  
  setSenderState: (state: Partial<SenderState>) => void;
  setReceiverState: (state: Partial<ReceiverState>) => void;
  setCurrentManifest: (manifest: TransferManifest | null) => void;
  setConfig: (config: Partial<TransferConfig>) => void;
  resetSender: () => void;
  resetReceiver: () => void;
  resetAll: () => void;
}

const initialSenderState: SenderState = {
  status: 'idle',
  fileName: null,
  fileSize: 0,
  mimeType: null,
  totalBlocks: 0,
  symbolsEmitted: 0,
  loopCount: 0,
  speed: 'EXTREME',
};

const initialReceiverState: ReceiverState = {
  transferId: null,
  fileName: null,
  mimeType: null,
  fileSize: 0,
  totalBlocks: 0,
  decodedBlocks: 0,
  uniqueSymbolsReceived: 0,
  duplicateSymbolsSkipped: 0,
  progress: 0,
  status: 'scanning',
};

export const useTransferStore = create<TransferStore>()(
  persist(
    (set) => ({
      sender: initialSenderState,
      receiver: initialReceiverState,
      currentManifest: null,
      config: DEFAULT_TRANSFER_CONFIG,
      
      setSenderState: (state) => set((prev) => ({
        sender: { ...prev.sender, ...state },
      })),
      
      setReceiverState: (state) => set((prev) => ({
        receiver: { ...prev.receiver, ...state },
      })),
      
      setCurrentManifest: (manifest) => set({ currentManifest: manifest }),
      
      setConfig: (config) => set((prev) => ({
        config: { ...prev.config, ...config },
      })),
      
      resetSender: () => set({ sender: initialSenderState, currentManifest: null }),
      
      resetReceiver: () => set({ receiver: initialReceiverState }),
      
      resetAll: () => set({
        sender: initialSenderState,
        receiver: initialReceiverState,
        currentManifest: null,
      }),
    }),
    {
      name: 'optical-drop-transfer',
      partialize: (state) => ({
        config: state.config,
      }),
    }
  )
);