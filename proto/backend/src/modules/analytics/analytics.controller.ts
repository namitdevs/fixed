import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RelevanceScorerService } from './relevanceScorer.service';
import { GraphAnalyticsService } from './graphAnalytics.service';
import { PatternDetectorService } from '../patterns/patternDetector.service';
import { TimelineService } from '../temporal/timeline.service';
import { AiAssistantService } from '../assistant/aiAssistant.service';
import { prisma } from '../../utils/prisma';

const assistantQuerySchema = z.object({
  question: z.string().min(2, 'Question must be at least 2 characters'),
});

export class AnalyticsController {
  static async runAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await RelevanceScorerService.runFullIntelligence(req.params.caseId);
      res.status(200).json({
        success: true,
        message: 'Graph intelligence and relevance scoring completed',
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const caseId = req.params.caseId;
      const latestRun = await prisma.analysisRun.findFirst({
        where: { caseId },
        orderBy: { createdAt: 'desc' },
      });

      const topNodes = await prisma.nodeMetric.findMany({
        where: { caseId },
        orderBy: { networkRelevanceScore: 'desc' },
        take: 5,
        include: { graphNode: true },
      });

      const alerts = await prisma.alert.findMany({
        where: { caseId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: {
          latestRun,
          topEntities: topNodes.map((n) => ({
            id: n.graphNodeId,
            canonicalValue: n.graphNode.canonicalValue,
            entityType: n.graphNode.entityType,
            relevanceScore: n.networkRelevanceScore,
            isPotentialBridge: n.isPotentialBridge,
            degree: n.degreeCentrality,
          })),
          activeAlertsCount: alerts.length,
          alerts,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCentrality(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const results = await GraphAnalyticsService.runAnalytics(req.params.caseId);
      // Sort by betweenness & degree
      results.sort((a, b) => b.betweenness - a.betweenness || b.totalDegree - a.totalDegree);

      res.status(200).json({
        success: true,
        data: { centrality: results, count: results.length },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCommunities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clusters = await GraphAnalyticsService.getCommunityClusters(req.params.caseId);
      res.status(200).json({
        success: true,
        data: { clusters, clusterCount: clusters.length },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPatterns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patterns = await PatternDetectorService.detectAllPatterns(req.params.caseId);
      res.status(200).json({
        success: true,
        data: { patterns, count: patterns.length },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate, eventType, nodeId } = req.query;
      const events = await TimelineService.getCaseTimeline(req.params.caseId, {
        startDate: startDate ? new Date(String(startDate)) : undefined,
        endDate: endDate ? new Date(String(endDate)) : undefined,
        eventType: eventType as string,
        nodeId: nodeId as string,
      });

      res.status(200).json({
        success: true,
        data: { timeline: events, count: events.length },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getNodeScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const score = await RelevanceScorerService.getNodeScore(req.params.nodeId);
      res.status(200).json({
        success: true,
        data: { score },
      });
    } catch (err) {
      next(err);
    }
  }

  static async queryAssistant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = assistantQuerySchema.parse(req.body);
      const answer = await AiAssistantService.queryAssistant(req.params.caseId, data.question);
      res.status(200).json({
        success: true,
        data: answer,
      });
    } catch (err) {
      next(err);
    }
  }
}
