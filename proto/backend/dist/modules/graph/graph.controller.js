"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphController = void 0;
const zod_1 = require("zod");
const graph_service_1 = require("./graph.service");
const entityResolution_service_1 = require("../resolution/entityResolution.service");
const resolveCandidateSchema = zod_1.z.object({
    action: zod_1.z.enum(['ACCEPT', 'REJECT']),
});
class GraphController {
    static async buildGraph(req, res, next) {
        try {
            const summary = await graph_service_1.GraphService.buildCaseGraph(req.params.caseId);
            res.status(200).json({
                success: true,
                message: 'Case graph successfully extracted and projected',
                data: summary,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getGraph(req, res, next) {
        try {
            const { entityTypes, relationshipTypes, minConfidence, limit } = req.query;
            const graph = await graph_service_1.GraphService.getCaseGraph(req.params.caseId, {
                entityTypes: entityTypes ? String(entityTypes).split(',') : undefined,
                relationshipTypes: relationshipTypes ? String(relationshipTypes).split(',') : undefined,
                minConfidence: minConfidence ? parseFloat(String(minConfidence)) : undefined,
                limit: limit ? parseInt(String(limit), 10) : undefined,
            });
            res.status(200).json({
                success: true,
                data: graph,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getNode(req, res, next) {
        try {
            const node = await graph_service_1.GraphService.getNodeDetails(req.params.nodeId);
            res.status(200).json({
                success: true,
                data: { node },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getEdge(req, res, next) {
        try {
            const edge = await graph_service_1.GraphService.getEdgeDetails(req.params.edgeId);
            res.status(200).json({
                success: true,
                data: { edge },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getNeighborhood(req, res, next) {
        try {
            const neighborhood = await graph_service_1.GraphService.getNeighborhood(req.params.nodeId);
            res.status(200).json({
                success: true,
                data: neighborhood,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async listResolutionCandidates(req, res, next) {
        try {
            const status = req.query.status;
            const candidates = await entityResolution_service_1.EntityResolutionService.listCandidates(req.params.caseId, status);
            res.status(200).json({
                success: true,
                data: { candidates, count: candidates.length },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async resolveCandidate(req, res, next) {
        try {
            const data = resolveCandidateSchema.parse(req.body);
            const result = await entityResolution_service_1.EntityResolutionService.resolveCandidate(req.params.candidateId, data.action, req.user?.id);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.GraphController = GraphController;
