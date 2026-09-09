import Graph from 'graphology';
import betweennessCentrality from 'graphology-metrics/centrality/betweenness';
import louvain from 'graphology-communities-louvain';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

export interface CentralityResult {
  nodeId: string;
  canonicalValue: string;
  entityType: string;
  totalDegree: number;
  inDegree: number;
  outDegree: number;
  betweenness: number;
  communityId: number;
  isPotentialBridge: boolean;
}

export class GraphAnalyticsService {
  /**
   * Build in-memory Graphology graph from database records for a case
   */
  static async buildGraphologyGraph(caseId: string): Promise<Graph> {
    const graph = new Graph({ multi: true, type: 'directed' });

    const nodes = await prisma.graphNode.findMany({ where: { caseId } });
    const edges = await prisma.graphEdge.findMany({ where: { caseId } });

    for (const node of nodes) {
      if (!graph.hasNode(node.id)) {
        graph.addNode(node.id, {
          canonicalValue: node.canonicalValue,
          entityType: node.entityType,
        });
      }
    }

    for (const edge of edges) {
      if (graph.hasNode(edge.sourceNodeId) && graph.hasNode(edge.targetNodeId)) {
        try {
          graph.addEdgeWithKey(edge.id, edge.sourceNodeId, edge.targetNodeId, {
            relationshipType: edge.relationshipType,
            weight: edge.weight,
            isEvent: edge.isEvent,
          });
        } catch (e) {
          // ignore duplicate edge keys
        }
      }
    }

    return graph;
  }

  /**
   * Run full graph intelligence:
   * Computes Degree, Betweenness Centrality, and Louvain Communities.
   */
  static async runAnalytics(caseId: string): Promise<CentralityResult[]> {
    const graph = await this.buildGraphologyGraph(caseId);

    if (graph.order === 0) {
      return [];
    }

    // 1. Betweenness Centrality
    let betweennessScores: Record<string, number> = {};
    try {
      betweennessScores = betweennessCentrality(graph);
    } catch (err) {
      logger.warn('Betweenness centrality computation fallback:', err);
      graph.forEachNode((nodeId) => {
        betweennessScores[nodeId] = 0;
      });
    }

    // 2. Louvain Community Detection (requires undirected view or undirected graph)
    const undirectedGraph = new Graph({ type: 'undirected' });
    graph.forEachNode((nodeId, attr) => undirectedGraph.addNode(nodeId, attr));
    graph.forEachEdge((edgeId, attr, source, target) => {
      if (!undirectedGraph.hasEdge(source, target) && source !== target) {
        undirectedGraph.addEdge(source, target);
      }
    });

    let communities: Record<string, number> = {};
    try {
      communities = louvain(undirectedGraph);
    } catch (err) {
      logger.warn('Louvain community detection fallback:', err);
      let comp = 0;
      undirectedGraph.forEachNode((nodeId) => {
        communities[nodeId] = comp++;
      });
    }

    // 3. Compile Centrality & Bridge Metrics
    const results: CentralityResult[] = [];
    const maxBetweenness = Math.max(...Object.values(betweennessScores), 0.0001);

    graph.forEachNode((nodeId, attr: any) => {
      const inDeg = graph.inDegree(nodeId);
      const outDeg = graph.outDegree(nodeId);
      const totalDeg = graph.degree(nodeId);
      const rawBetweenness = betweennessScores[nodeId] || 0;
      const normBetweenness = Math.round((rawBetweenness / maxBetweenness) * 1000) / 1000;
      const commId = communities[nodeId] !== undefined ? communities[nodeId] : 0;

      // Identify potential bridges:
      // A node is a potential bridge if it has high betweenness (> 0.20) or connects to multiple distinct communities
      const neighborCommunities = new Set<number>();
      graph.forEachNeighbor(nodeId, (neighborId) => {
        if (communities[neighborId] !== undefined) {
          neighborCommunities.add(communities[neighborId]);
        }
      });

      const isPotentialBridge = normBetweenness > 0.25 || neighborCommunities.size >= 2;

      results.push({
        nodeId,
        canonicalValue: attr.canonicalValue,
        entityType: attr.entityType,
        totalDegree: totalDeg,
        inDegree: inDeg,
        outDegree: outDeg,
        betweenness: normBetweenness,
        communityId: commId,
        isPotentialBridge,
      });
    });

    return results;
  }

  static async getCommunityClusters(caseId: string) {
    const analysis = await this.runAnalytics(caseId);
    const clusterMap = new Map<number, CentralityResult[]>();

    for (const item of analysis) {
      const list = clusterMap.get(item.communityId) || [];
      list.push(item);
      clusterMap.set(item.communityId, list);
    }

    const clusters = Array.from(clusterMap.entries()).map(([commId, members]) => {
      // Find top central node in cluster
      members.sort((a, b) => b.totalDegree - a.totalDegree);
      const bridgeCount = members.filter((m) => m.isPotentialBridge).length;

      return {
        communityId: commId,
        size: members.length,
        leadEntity: members[0]?.canonicalValue || 'Unknown',
        potentialBridges: bridgeCount,
        members: members.map((m) => ({
          nodeId: m.nodeId,
          canonicalValue: m.canonicalValue,
          entityType: m.entityType,
          degree: m.totalDegree,
          betweenness: m.betweenness,
          isPotentialBridge: m.isPotentialBridge,
        })),
      };
    });

    clusters.sort((a, b) => b.size - a.size);
    return clusters;
  }
}
