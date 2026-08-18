import mongoose, { Document, Schema } from 'mongoose';

export interface ITransferAnalytics extends Document {
  protocolVersion: string;
  fileSizeBucket: string;
  frameCount: number;
  durationMs: number;
  completed: boolean;
  redundancyLevel: string;
  chunkSize: number;
  createdAt: Date;
}

const TransferAnalyticsSchema = new Schema<ITransferAnalytics>({
  protocolVersion: { type: String, required: true },
  fileSizeBucket: { type: String, required: true },
  frameCount: { type: Number, required: true },
  durationMs: { type: Number, required: true },
  completed: { type: Boolean, required: true },
  redundancyLevel: { type: String, required: true },
  chunkSize: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

TransferAnalyticsSchema.index({ createdAt: -1 });
TransferAnalyticsSchema.index({ completed: 1 });

export const TransferAnalytics = mongoose.model<ITransferAnalytics>(
  'TransferAnalytics',
  TransferAnalyticsSchema
);