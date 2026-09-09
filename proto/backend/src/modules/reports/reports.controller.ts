import { Request, Response, NextFunction } from 'express';
import { ReportGeneratorService } from './reportGenerator.service';

export class ReportsController {
  static async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await ReportGeneratorService.generateCaseReport(req.params.caseId, req.user?.id);
      res.status(201).json({
        success: true,
        message: 'Investigation report generated successfully',
        data: { report },
      });
    } catch (err) {
      next(err);
    }
  }

  static async exportPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ReportGeneratorService.streamPdfReport(req.params.caseId, res);
    } catch (err) {
      next(err);
    }
  }

  static async exportJson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ReportGeneratorService.getJsonExport(req.params.caseId);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="Case_${req.params.caseId}_Export.json"`);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const csvStr = await ReportGeneratorService.getCsvExport(req.params.caseId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="Case_${req.params.caseId}_Entities.csv"`);
      res.status(200).send(csvStr);
    } catch (err) {
      next(err);
    }
  }
}
