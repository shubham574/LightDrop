import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TransferMetadata, ReceiverState, SenderState, FramePayload } from '@optical-drop/shared/types';
import { DEFAULT_TRANSFER_CONFIG, TransferConfig } from '@/lib/protocol';

interface TransferStore {
  sender: SenderState;
  receiver: ReceiverState;
  currentTransfer: TransferMetadata | null;
  frames: Map<number, FramePayload>;
  config: TransferConfig;
  
  setSenderState: (state: Partial<SenderState>) => void;
  setReceiverState: (state: Partial<ReceiverState>) => void;
  setCurrentTransfer: (transfer: TransferMetadata | null) => void;
  addFrame: (frame: FramePayload) => void;
  clearFrames: () => void;
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
  totalFrames: 0,
  currentFrame: 0,
  progress: 0,
  speed: 'EXTREME',
  estimatedTimeRemaining: 0,
};

const initialReceiverState: ReceiverState = {
  transferId: null,
  fileName: null,
  mimeType: null,
  fileSize: 0,
  totalFrames: 0,
  receivedFrames: 0,
  missingFrames: [],
  progress: 0,
  status: 'scanning',
};

export const useTransferStore = create<TransferStore>()(
  persist(
    (set, get) => ({
      sender: initialSenderState,
      receiver: initialReceiverState,
      currentTransfer: null,
      frames: new Map(),
      config: DEFAULT_TRANSFER_CONFIG,
      
      setSenderState: (state) => set((prev) => ({
        sender: { ...prev.sender, ...state },
      })),
      
      setReceiverState: (state) => set((prev) => ({
        receiver: { ...prev.receiver, ...state },
      })),
      
      setCurrentTransfer: (transfer) => set({ currentTransfer: transfer }),
      
      addFrame: (frame) => set((prev) => {
        const newFrames = new Map(prev.frames);
        newFrames.set(frame.frameIndex, frame);
        return { frames: newFrames };
      }),
      
      clearFrames: () => set({ frames: new Map() }),
      
      setConfig: (config) => set((prev) => ({
        config: { ...prev.config, ...config },
      })),
      
      resetSender: () => set({ sender: initialSenderState, currentTransfer: null, frames: new Map() }),
      
      resetReceiver: () => set({ receiver: initialReceiverState, frames: new Map() }),
      
      resetAll: () => set({
        sender: initialSenderState,
        receiver: initialReceiverState,
        currentTransfer: null,
        frames: new Map(),
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