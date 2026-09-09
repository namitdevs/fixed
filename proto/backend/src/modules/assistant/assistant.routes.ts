import { Router } from 'express';
import { AnalyticsController } from '../analytics/analytics.controller';
import { authenticateToken } from '../../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

router.post('/query', AnalyticsController.queryAssistant);

export default router;
