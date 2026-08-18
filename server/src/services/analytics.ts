import { TransferAnalytics, ITransferAnalytics } from '../models/TransferAnalytics';
import { getFileSizeBucket } from '@optical-drop/shared/protocol';

export interface AnalyticsData {
  protocolVersion: string;
  fileSize: number;
  frameCount: number;
  durationMs: number;
  completed: boolean;
  redundancyLevel: string;
  chunkSize: number;
}

export async function recordTransferAnalytics(data: AnalyticsData): Promise<ITransferAnalytics> {
  const analytics = new TransferAnalytics({
    protocolVersion: data.protocolVersion,
    fileSizeBucket: getFileSizeBucket(data.fileSize),
    frameCount: data.frameCount,
    durationMs: data.durationMs,
    completed: data.completed,
    redundancyLevel: data.redundancyLevel,
    chunkSize: data.chunkSize,
  });
  return analytics.save();
}

export async function getAnalyticsSummary(): Promise<{
  totalTransfers: number;
  completedTransfers: number;
  averageDuration: number;
  averageFrameCount: number;
  byFileSize: Record<string, { count: number; completed: number }>;
  byProtocolVersion: Record<string, number>;
}> {
  const [totalResult, completedResult, aggResult, byFileSizeResult, byProtocolResult] = await Promise.all([
    TransferAnalytics.countDocuments(),
    TransferAnalytics.countDocuments({ completed: true }),
    TransferAnalytics.aggregate([
      { $group: { _id: null, avgDuration: { $avg: '$durationMs' }, avgFrames: { $avg: '$frameCount' } } },
    ]),
    TransferAnalytics.aggregate([
      {
        $group: {
          _id: '$fileSizeBucket',
          count: { $sum: 1 },
          completed: { $sum: { $cond: ['$completed', 1, 0] } },
        },
      },
    ]),
    TransferAnalytics.aggregate([
      { $group: { _id: '$protocolVersion', count: { $sum: 1 } } },
    ]),
  ]);

  const totalTransfers = totalResult;
  const completedTransfers = completedResult;
  const averageDuration = aggResult[0]?.avgDuration || 0;
  const averageFrameCount = aggResult[0]?.avgFrames || 0;

  const byFileSize: Record<string, { count: number; completed: number }> = {};
  for (const item of byFileSizeResult) {
    byFileSize[item._id] = { count: item.count, completed: item.completed };
  }

  const byProtocolVersion: Record<string, number> = {};
  for (const item of byProtocolResult) {
    byProtocolVersion[item._id] = item.count;
  }

  return {
    totalTransfers,
    completedTransfers,
    averageDuration,
    averageFrameCount,
    byFileSize,
    byProtocolVersion,
  };
}