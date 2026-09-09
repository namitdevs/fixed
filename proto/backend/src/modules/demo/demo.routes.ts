import { Router } from 'express';
import { DemoController } from './demo.controller';

const router = Router();

// Public endpoint for 1-click evaluation by judges
router.post('/load', DemoController.load);

export default router;
