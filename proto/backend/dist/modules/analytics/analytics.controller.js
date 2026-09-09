"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const zod_1 = require("zod");
const relevanceScorer_service_1 = require("./relevanceScorer.service");
const graphAnalytics_service_1 = require("./graphAnalytics.service");
const patternDetector_service_1 = require("../patterns/patternDetector.service");
const timeline_service_1 = require("../temporal/timeline.service");
const aiAssistant_service_1 = require("../assistant/aiAssistant.service");
const prisma_1 = require("../../utils/prisma");
const assistantQuerySchema = zod_1.z.object({
    question: zod_1.z.string().min(2, 'Question must be at least 2 characters'),
});
class AnalyticsController {
    static async runAnalytics(req, res, next) {
        try {
            const summary = await relevanceScorer_service_1.RelevanceScorerService.runFullIntelligence(req.params.caseId);
            res.status(200).json({
                success: true,
                message: 'Graph intelligence and relevance scoring completed',
                data: summary,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getOverview(req, res, next) {
        try {
            const caseId = req.params.caseId;
            const latestRun = await prisma_1.prisma.analysisRun.findFirst({
                where: { caseId },
                orderBy: { createdAt: 'desc' },
            });
            const topNodes = await prisma_1.prisma.nodeMetric.findMany({
                where: { caseId },
                orderBy: { networkRelevanceScore: 'desc' },
                take: 5,
                include: { graphNode: true },
            });
            const alerts = await prisma_1.prisma.alert.findMany({
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
        }
        catch (err) {
            next(err);
        }
    }
    static async getCentrality(req, res, next) {
        try {
            const results = await graphAnalytics_service_1.GraphAnalyticsService.runAnalytics(req.params.caseId);
            // Sort by betweenness & degree
            results.sort((a, b) => b.betweenness - a.betweenness || b.totalDegree - a.totalDegree);
            res.status(200).json({
                success: true,
                data: { centrality: results, count: results.length },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getCommunities(req, res, next) {
        try {
            const clusters = await graphAnalytics_service_1.GraphAnalyticsService.getCommunityClusters(req.params.caseId);
            res.status(200).json({
                success: true,
                data: { clusters, clusterCount: clusters.length },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getPatterns(req, res, next) {
        try {
            const patterns = await patternDetector_service_1.PatternDetectorService.detectAllPatterns(req.params.caseId);
            res.status(200).json({
                success: true,
                data: { patterns, count: patterns.length },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getTimeline(req, res, next) {
        try {
            const { startDate, endDate, eventType, nodeId } = req.query;
            const events = await timeline_service_1.TimelineService.getCaseTimeline(req.params.caseId, {
                startDate: startDate ? new Date(String(startDate)) : undefined,
                endDate: endDate ? new Date(String(endDate)) : undefined,
                eventType: eventType,
                nodeId: nodeId,
            });
            res.status(200).json({
                success: true,
                data: { timeline: events, count: events.length },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getNodeScore(req, res, next) {
        try {
            const score = await relevanceScorer_service_1.RelevanceScorerService.getNodeScore(req.params.nodeId);
            res.status(200).json({
                success: true,
                data: { score },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async queryAssistant(req, res, next) {
        try {
            const data = assistantQuerySchema.parse(req.body);
            const answer = await aiAssistant_service_1.AiAssistantService.queryAssistant(req.params.caseId, data.question);
            res.status(200).json({
                success: true,
                data: answer,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AnalyticsController = AnalyticsController;
