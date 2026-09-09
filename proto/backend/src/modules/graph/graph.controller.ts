import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GraphService } from './graph.service';
import { EntityResolutionService } from '../resolution/entityResolution.service';

const resolveCandidateSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT']),
});

export class GraphController {
  static async buildGraph(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await GraphService.buildCaseGraph(req.params.caseId);
      res.status(200).json({
        success: true,
        message: 'Case graph successfully extracted and projected',
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getGraph(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityTypes, relationshipTypes, minConfidence, limit } = req.query;

      const graph = await GraphService.getCaseGraph(req.params.caseId, {
        entityTypes: entityTypes ? String(entityTypes).split(',') : undefined,
        relationshipTypes: relationshipTypes ? String(relationshipTypes).split(',') : undefined,
        minConfidence: minConfidence ? parseFloat(String(minConfidence)) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
      });

      res.status(200).json({
        success: true,
        data: graph,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getNode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const node = await GraphService.getNodeDetails(req.params.nodeId);
      res.status(200).json({
        success: true,
        data: { node },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getEdge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const edge = await GraphService.getEdgeDetails(req.params.edgeId);
      res.status(200).json({
        success: true,
        data: { edge },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getNeighborhood(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const neighborhood = await GraphService.getNeighborhood(req.params.nodeId);
      res.status(200).json({
        success: true,
        data: neighborhood,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listResolutionCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as string;
      const candidates = await EntityResolutionService.listCandidates(req.params.caseId, status);
      res.status(200).json({
        success: true,
        data: { candidates, count: candidates.length },
      });
    } catch (err) {
      next(err);
    }
  }

  static async resolveCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = resolveCandidateSchema.parse(req.body);
      const result = await EntityResolutionService.resolveCandidate(
        req.params.candidateId,
        data.action,
        req.user?.id
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
