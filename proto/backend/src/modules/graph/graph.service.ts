import { prisma } from '../../utils/prisma';
import { EntityExtractor } from '../extraction/entityExtractor';
import { RelationshipExtractor } from '../extraction/relationshipExtractor';
import { EntityResolutionService } from '../resolution/entityResolution.service';

export interface GraphFilterOptions {
  entityTypes?: string[];
  relationshipTypes?: string[];
  minConfidence?: number;
  limit?: number;
}

export class GraphService {
  /**
   * Run the complete Phase 2 pipeline:
   * Structured extraction -> Unstructured extraction -> Relationship extraction -> Entity resolution pairing.
   */
  static async buildCaseGraph(caseId: string) {
    const structEntities = await EntityExtractor.extractStructuredEntities(caseId);
    const unstructEntities = await EntityExtractor.extractUnstructuredEntities(caseId);
    const relationships = await RelationshipExtractor.extractRelationships(caseId);
    const candidatePairs = await EntityResolutionService.runResolution(caseId);

    return {
      structuredEntitiesExtracted: structEntities,
      unstructuredEntitiesExtracted: unstructEntities,
      relationshipsCreated: relationships,
      resolutionCandidatesFound: candidatePairs,
    };
  }

  /**
   * Return the Cytoscape-formatted graph projection for a case.
   */
  static async getCaseGraph(caseId: string, options?: GraphFilterOptions) {
    const whereNode: any = { caseId };
    if (options?.entityTypes && options.entityTypes.length > 0) {
      whereNode.entityType = { in: options.entityTypes };
    }
    if (options?.minConfidence) {
      whereNode.confidence = { gte: options.minConfidence };
    }

    const limit = options?.limit || 300;

    const nodes = await prisma.graphNode.findMany({
      where: whereNode,
      take: limit,
      include: {
        metrics: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const nodeIds = nodes.map((n) => n.id);

    const whereEdge: any = {
      caseId,
      sourceNodeId: { in: nodeIds },
      targetNodeId: { in: nodeIds },
    };

    if (options?.relationshipTypes && options.relationshipTypes.length > 0) {
      whereEdge.relationshipType = { in: options.relationshipTypes };
    }
    if (options?.minConfidence) {
      whereEdge.confidence = { gte: options.minConfidence };
    }

    const edges = await prisma.graphEdge.findMany({
      where: whereEdge,
      take: limit * 2,
    });

    // Format for Cytoscape.js
    const cyNodes = nodes.map((n) => {
      const metric = n.metrics[0];
      return {
        data: {
          id: n.id,
          label: n.canonicalValue,
          entityType: n.entityType,
          canonicalValue: n.canonicalValue,
          confidence: n.confidence,
          evidenceRecordId: n.evidenceRecordId,
          degree: metric?.degreeCentrality || 0,
          betweenness: metric?.betweennessCentrality || 0,
          relevanceScore: metric?.networkRelevanceScore || 0,
          communityId: metric?.communityId || 0,
          isPotentialBridge: metric?.isPotentialBridge || false,
        },
      };
    });

    const cyEdges = edges.map((e) => {
      let meta: any = {};
      try {
        if (e.metadata) meta = JSON.parse(e.metadata);
      } catch (err) {}

      return {
        data: {
          id: e.id,
          source: e.sourceNodeId,
          target: e.targetNodeId,
          label: e.relationshipType,
          relationshipType: e.relationshipType,
          isEvent: e.isEvent,
          eventTimestamp: e.eventTimestamp,
          confidence: e.confidence,
          weight: e.weight,
          evidenceRecordId: e.evidenceRecordId,
          amount: meta.amount,
          durationSec: meta.durationSec,
          location: meta.location,
        },
      };
    });

    return {
      elements: {
        nodes: cyNodes,
        edges: cyEdges,
      },
      stats: {
        totalNodes: cyNodes.length,
        totalEdges: cyEdges.length,
      },
    };
  }

  static async getNodeDetails(nodeId: string) {
    const node = await prisma.graphNode.findUnique({
      where: { id: nodeId },
      include: {
        evidenceRecord: {
          include: { document: true },
        },
        metrics: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        outEdges: {
          include: { targetNode: true },
        },
        inEdges: {
          include: { sourceNode: true },
        },
      },
    });

    if (!node) {
      const err: any = new Error(`Node ${nodeId} not found`);
      err.statusCode = 404;
      err.errorCode = 'NODE_NOT_FOUND';
      throw err;
    }

    return node;
  }

  static async getEdgeDetails(edgeId: string) {
    const edge = await prisma.graphEdge.findUnique({
      where: { id: edgeId },
      include: {
        sourceNode: true,
        targetNode: true,
        evidenceRecord: {
          include: { document: true },
        },
      },
    });

    if (!edge) {
      const err: any = new Error(`Edge ${edgeId} not found`);
      err.statusCode = 404;
      err.errorCode = 'EDGE_NOT_FOUND';
      throw err;
    }

    return edge;
  }

  static async getNeighborhood(nodeId: string, hops: number = 1) {
    const node = await prisma.graphNode.findUnique({ where: { id: nodeId } });
    if (!node) {
      const err: any = new Error(`Node ${nodeId} not found`);
      err.statusCode = 404;
      err.errorCode = 'NODE_NOT_FOUND';
      throw err;
    }

    const directOut = await prisma.graphEdge.findMany({
      where: { sourceNodeId: nodeId },
      include: { targetNode: true },
    });

    const directIn = await prisma.graphEdge.findMany({
      where: { targetNodeId: nodeId },
      include: { sourceNode: true },
    });

    const neighborNodes = new Map<string, any>();
    neighborNodes.set(node.id, node);

    directOut.forEach((e) => neighborNodes.set(e.targetNode.id, e.targetNode));
    directIn.forEach((e) => neighborNodes.set(e.sourceNode.id, e.sourceNode));

    return {
      centerNode: node,
      neighbors: Array.from(neighborNodes.values()),
      edges: [...directOut, ...directIn],
    };
  }
}
