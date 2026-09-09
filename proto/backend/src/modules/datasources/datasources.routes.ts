import { Router } from 'express';
import { DataSourceController } from './datasources.controller';
import { authenticateToken } from '../../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

router.post('/', DataSourceController.create);
router.get('/', DataSourceController.listByCase);
router.get('/:id', DataSourceController.getById);

export default router;
