import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { config } from '../config';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0',
    database: dbStatus,
  });
});

router.get('/config', (_req: Request, res: Response) => {
  res.json({
    protocolVersion: 1,
    maxFileSize: 500 * 1024 * 1024,
    defaultChunkSize: 1024,
    defaultSpeed: 'BALANCED',
    defaultRedundancy: 'MEDIUM',
    supportedMimeTypes: ['*'],
  });
});

export default router;