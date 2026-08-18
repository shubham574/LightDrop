import { Router, Request, Response } from 'express';
import { recordTransferAnalytics, getAnalyticsSummary } from '../services/analytics';
import { AnalyticsData } from '../services/analytics';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body as AnalyticsData;
    
    if (!data.protocolVersion || !data.fileSize || !data.frameCount || !data.durationMs) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const analytics = await recordTransferAnalytics(data);
    res.status(201).json({ success: true, id: analytics._id });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to record analytics' });
  }
});

router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const summary = await getAnalyticsSummary();
    res.json(summary);
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
});

export default router;