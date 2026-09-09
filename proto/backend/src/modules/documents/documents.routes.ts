import { Router } from 'express';
import { DocumentController, uploadMiddleware } from './documents.controller';
import { authenticateToken } from '../../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

router.post('/upload', uploadMiddleware.single('file'), DocumentController.upload);
router.get('/', DocumentController.listByCase);
router.get('/:id', DocumentController.getById);
router.post('/:id/process', DocumentController.reprocess);
router.delete('/:id', DocumentController.remove);

export default router;
