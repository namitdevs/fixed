import { Router } from 'express';
import { AlertController } from './alerts.controller';
import { authenticateToken } from '../../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

router.get('/', AlertController.list);
router.patch('/:alertId', AlertController.updateStatus);

export default router;
