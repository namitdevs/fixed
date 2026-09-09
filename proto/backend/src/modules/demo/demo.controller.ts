import { Request, Response, NextFunction } from 'express';
import { DemoSeederService } from './demoSeeder.service';

export class DemoController {
  static async load(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await DemoSeederService.loadTurnkeyDemoCase();
      res.status(200).json({
        success: true,
        message: 'Turnkey demo investigation case initialized in under 3 seconds',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
