import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticateToken } from '../../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

router.post('/run', AnalyticsController.runAnalytics);
router.get('/overview', AnalyticsController.getOverview);
router.get('/centrality', AnalyticsController.getCentrality);
router.get('/communities', AnalyticsController.getCommunities);
router.get('/patterns', AnalyticsController.getPatterns);
router.get('/timeline', AnalyticsController.getTimeline);
router.get('/nodes/:nodeId/score', AnalyticsController.getNodeScore);

export default router;
