import { prisma } from '../../utils/prisma';
import { GraphAnalyticsService } from './graphAnalytics.service';
import { PatternDetectorService, DetectedPattern } from '../patterns/patternDetector.service';

export interface ScoreBreakdown {
  score: number;
  factors: Array<{
    factor: string;
    contribution: number;
    description: string;
    evidenceIds: string[];
  }>;
}

export class RelevanceScorerService {
  /**
   * Run the complete analytics & scoring cycle, persist NodeMetric rows,
   * and generate Alert records for detected patterns.
   */
  static async runFullIntelligence(caseId: string) {
    const startTime = Date.now();

    // 1. Create AnalysisRun record
    const run = await prisma.analysisRun.create({
      data: {
        caseId,
        runType: 'FULL_INTELLIGENCE',
        status: 'RUNNING',
      },
    });

    // 2. Compute Graph Centrality & Communities
    const centralityList = await GraphAnalyticsService.runAnalytics(caseId);

    // 3. Detect Patterns (chains, spikes, shared infra)
    const patterns = await PatternDetectorService.detectAllPatterns(caseId);

    // 4. Calculate 0-100 Relevance Score for each node
    const maxDegree = Math.max(...centralityList.map((c) => c.totalDegree), 1);

    for (const c of centralityList) {
      const factors: ScoreBreakdown['factors'] = [];
      let totalScore = 0;

      // Factor A: Degree Centrality (up to 30 pts)
      const degreePts = Math.round((c.totalDegree / maxDegree) * 30);
      if (degreePts > 0) {
        factors.push({
          factor: 'DEGREE_CONNECTIVITY',
          contribution: degreePts,
          description: `Direct network connectivity with ${c.totalDegree} entities (${c.inDegree} in / ${c.outDegree} out)`,
          evidenceIds: [],
        });
        totalScore += degreePts;
      }

      // Factor B: Betweenness Centrality / Bridge (up to 30 pts)
      if (c.betweenness > 0.05) {
        const betweennessPts = Math.min(30, Math.round(c.betweenness * 30));
        factors.push({
          factor: 'NETWORK_BRIDGE',
          contribution: betweennessPts,
          description: `High structural betweenness (${c.betweenness}) controlling communication pathways between distinct clusters`,
          evidenceIds: [],
        });
        totalScore += betweennessPts;
      } else if (c.isPotentialBridge) {
        factors.push({
          factor: 'COMMUNITY_BRIDGE',
          contribution: 15,
          description: 'Identified as bridging cross-community connections',
          evidenceIds: [],
        });
        totalScore += 15;
      }

      // Factor C: Pattern Involvements (Spikes, Chains, Shared Infra) (up to 40 pts)
      const relatedPatterns = patterns.filter((p) => p.involvedNodeIds.includes(c.nodeId));
      for (const p of relatedPatterns) {
        let pts = 15;
        if (p.type === 'TRANSACTION_CHAIN') pts = 25;
        if (p.type === 'COMMUNICATION_SPIKE') pts = 20;

        factors.push({
          factor: p.type,
          contribution: pts,
          description: p.title,
          evidenceIds: p.evidenceRecordIds,
        });
        totalScore += pts;
      }

      const finalScore = Math.min(100, totalScore);

      // Persist NodeMetric
      await prisma.nodeMetric.create({
        data: {
          caseId,
          analysisRunId: run.id,
          graphNodeId: c.nodeId,
          degreeCentrality: c.totalDegree,
          inDegree: c.inDegree,
          outDegree: c.outDegree,
          betweennessCentrality: c.betweenness,
          communityId: c.communityId,
          networkRelevanceScore: finalScore,
          relevanceFactors: JSON.stringify(factors),
          isPotentialBridge: c.isPotentialBridge,
        },
      });
    }

    // 5. Convert high-severity patterns into Alert records
    for (const p of patterns) {
      await prisma.alert.create({
        data: {
          caseId,
          analysisRunId: run.id,
          severity: p.severity,
          alertType: p.type,
          title: p.title,
          description: p.description,
          involvedNodeIds: JSON.stringify(p.involvedNodeIds),
          evidenceRecordIds: JSON.stringify(p.evidenceRecordIds),
          status: 'ACTIVE',
        },
      });
    }

    // 6. Complete AnalysisRun
    const duration = Date.now() - startTime;
    const nodeCount = await prisma.graphNode.count({ where: { caseId } });
    const edgeCount = await prisma.graphEdge.count({ where: { caseId } });

    await prisma.analysisRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        nodeCount,
        edgeCount,
        executionDurationMs: duration,
      },
    });

    return {
      analysisRunId: run.id,
      nodesScored: centralityList.length,
      patternsDetected: patterns.length,
      durationMs: duration,
    };
  }

  static async getNodeScore(graphNodeId: string) {
    const metric = await prisma.nodeMetric.findFirst({
      where: { graphNodeId },
      orderBy: { createdAt: 'desc' },
      include: {
        graphNode: true,
      },
    });

    if (!metric) return null;

    return {
      nodeId: metric.graphNodeId,
      canonicalValue: metric.graphNode.canonicalValue,
      entityType: metric.graphNode.entityType,
      networkRelevanceScore: metric.networkRelevanceScore,
      degreeCentrality: metric.degreeCentrality,
      betweennessCentrality: metric.betweennessCentrality,
      communityId: metric.communityId,
      isPotentialBridge: metric.isPotentialBridge,
      factors: metric.relevanceFactors ? JSON.parse(metric.relevanceFactors) : [],
    };
  }
}
