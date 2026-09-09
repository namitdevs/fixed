import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DataSourceService } from './datasources.service';

const createDataSourceSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  type: z.enum(['CDR', 'TRANSACTION', 'FIR', 'SURVEILLANCE', 'VEHICLE', 'SUSPECT', 'SOCIAL_MEDIA']),
  description: z.string().optional(),
});

export class DataSourceController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createDataSourceSchema.parse(req.body);
      const ds = await DataSourceService.create({
        caseId: req.params.caseId,
        name: data.name,
        type: data.type,
        description: data.description,
        uploadedByUserId: req.user?.id,
      });

      res.status(201).json({
        success: true,
        message: 'DataSource created successfully',
        data: { dataSource: ds },
      });
    } catch (err) {
      next(err);
    }
  }

  static async listByCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dataSources = await DataSourceService.listByCase(req.params.caseId);
      res.status(200).json({
        success: true,
        data: { dataSources, count: dataSources.length },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ds = await DataSourceService.getById(req.params.id);
      res.status(200).json({
        success: true,
        data: { dataSource: ds },
      });
    } catch (err) {
      next(err);
    }
  }
}
