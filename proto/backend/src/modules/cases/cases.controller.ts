import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CaseService } from './cases.service';

const createCaseSchema = z.object({
  caseNumber: z.string().min(3, 'Case number is required e.g. CASE-2026-001'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'UNDER_REVIEW', 'ON_HOLD', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

const updateCaseSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'UNDER_REVIEW', 'ON_HOLD', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

export class CaseController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createCaseSchema.parse(req.body);
      const caseItem = await CaseService.createCase({
        ...data,
        createdByUserId: req.user!.id,
      });

      res.status(201).json({
        success: true,
        message: 'Investigation case created successfully',
        data: { case: caseItem },
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, status, priority } = req.query;
      const cases = await CaseService.listCases({
        search: search as string,
        status: status as string,
        priority: priority as string,
      });

      res.status(200).json({
        success: true,
        data: { cases, count: cases.length },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const caseItem = await CaseService.getCaseById(req.params.id);
      res.status(200).json({
        success: true,
        data: { case: caseItem },
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateCaseSchema.parse(req.body);
      const updated = await CaseService.updateCase(req.params.id, data);
      res.status(200).json({
        success: true,
        message: 'Case updated successfully',
        data: { case: updated },
      });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await CaseService.deleteCase(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Case archived/deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}
