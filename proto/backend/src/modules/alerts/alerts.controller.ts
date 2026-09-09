import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AlertService } from './alerts.service';

const updateAlertSchema = z.object({
  status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'DISMISSED']),
});

export class AlertController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { severity, status } = req.query;
      const alerts = await AlertService.listAlerts(req.params.caseId, {
        severity: severity as string,
        status: status as string,
      });

      res.status(200).json({
        success: true,
        data: { alerts, count: alerts.length },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateAlertSchema.parse(req.body);
      const updated = await AlertService.updateAlertStatus(req.params.alertId, data.status);
      res.status(200).json({
        success: true,
        message: `Alert status updated to ${data.status}`,
        data: { alert: updated },
      });
    } catch (err) {
      next(err);
    }
  }
}
