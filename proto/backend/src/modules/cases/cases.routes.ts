import { Router } from 'express';
import { CaseController } from './cases.controller';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', CaseController.create);
router.get('/', CaseController.list);
router.get('/:id', CaseController.getById);
router.patch('/:id', CaseController.update);
router.delete('/:id', CaseController.remove);

export default router;
