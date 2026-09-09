import { Router } from 'express';
import { GraphController } from './graph.controller';
import { authenticateToken } from '../../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

// Graph projection & traversal
router.post('/build', GraphController.buildGraph);
router.get('/', GraphController.getGraph);
router.get('/nodes/:nodeId', GraphController.getNode);
router.get('/edges/:edgeId', GraphController.getEdge);
router.get('/neighborhood/:nodeId', GraphController.getNeighborhood);

// Entity resolution
router.get('/resolution-candidates', GraphController.listResolutionCandidates);
router.post('/resolution/:candidateId', GraphController.resolveCandidate);

export default router;
