import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticateToken } from '../../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

router.post('/generate', ReportsController.generate);
router.get('/export/pdf', ReportsController.exportPdf);
router.get('/export/json', ReportsController.exportJson);
router.get('/export/csv', ReportsController.exportCsv);

export default router;
