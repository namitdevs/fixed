"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAssistantService = void 0;
const genai_1 = require("@google/genai");
const prisma_1 = require("../../utils/prisma");
const config_1 = require("../../config");
const logger_1 = require("../../utils/logger");
class AiAssistantService {
    /**
     * Process investigator natural language queries with grounded database context.
     */
    static async queryAssistant(caseId, question) {
        const qLower = question.toLowerCase();
        // 1. Structured Context Retrieval for the case
        const caseData = await prisma_1.prisma.case.findUnique({ where: { id: caseId } });
        if (!caseData)
            throw new Error(`Case ${caseId} not found`);
        // Fetch top relevant nodes in this case
        const topMetrics = await prisma_1.prisma.nodeMetric.findMany({
            where: { caseId },
            orderBy: { networkRelevanceScore: 'desc' },
            take: 10,
            include: {
                graphNode: {
                    include: {
                        evidenceRecord: { include: { document: true } },
                        outEdges: { include: { targetNode: true } },
                        inEdges: { include: { sourceNode: true } },
                    },
                },
            },
        });
        // Fetch active alerts
        const alerts = await prisma_1.prisma.alert.findMany({
            where: { caseId, status: 'ACTIVE' },
            take: 5,
        });
        // Determine if question mentions a specific entity
        const mentionedNode = topMetrics.find((m) => qLower.includes(m.graphNode.canonicalValue.toLowerCase()));
        // Build structured context text
        let contextText = `CASE SUMMARY: ${caseData.caseNumber} - ${caseData.title}\n`;
        contextText += `ACTIVE ALERTS: ${alerts.map((a) => `[${a.severity}] ${a.title}`).join('; ')}\n\n`;
        const citedEntities = [];
        const citedEvidence = [];
        if (mentionedNode) {
            const node = mentionedNode.graphNode;
            citedEntities.push({ id: node.id, name: node.canonicalValue, type: node.entityType });
            if (node.evidenceRecord) {
                citedEvidence.push({
                    id: node.evidenceRecord.id,
                    snippet: node.evidenceRecord.rawSnippet,
                    document: node.evidenceRecord.document.originalFilename,
                });
            }
            contextText += `TARGET ENTITY: ${node.canonicalValue} (${node.entityType})\n`;
            contextText += `- Network Relevance Score: ${mentionedNode.networkRelevanceScore}/100\n`;
            contextText += `- Degree Centrality: ${mentionedNode.degreeCentrality} connections\n`;
            contextText += `- Betweenness Centrality: ${mentionedNode.betweennessCentrality} (Bridge: ${mentionedNode.isPotentialBridge})\n`;
            contextText += `- Outgoing Relationships: ${node.outEdges.map((e) => `${e.relationshipType} -> ${e.targetNode.canonicalValue}`).join(', ')}\n`;
            contextText += `- Incoming Relationships: ${node.inEdges.map((e) => `${e.sourceNode.canonicalValue} -> ${e.relationshipType}`).join(', ')}\n`;
            if (node.evidenceRecord) {
                contextText += `- Evidence Record [ID: ${node.evidenceRecord.id}]: "${node.evidenceRecord.rawSnippet}" (Source: ${node.evidenceRecord.document.originalFilename})\n`;
            }
        }
        else {
            contextText += `TOP NETWORK ENTITIES:\n`;
            for (const m of topMetrics.slice(0, 5)) {
                contextText += `- ${m.graphNode.canonicalValue} (${m.graphNode.entityType}): Score ${m.networkRelevanceScore}/100, ${m.degreeCentrality} links\n`;
                citedEntities.push({
                    id: m.graphNode.id,
                    name: m.graphNode.canonicalValue,
                    type: m.graphNode.entityType,
                });
            }
        }
        // 2. Query Gemini if API Key is available
        if (config_1.config.geminiApiKey) {
            try {
                const ai = new genai_1.GoogleGenAI({ apiKey: config_1.config.geminiApiKey });
                const systemInstruction = 'You are an investigative decision-support AI copilot. ' +
                    'Answer the investigator query using ONLY the provided case facts. ' +
                    'Be objective, professional, and clear. ' +
                    'Cite specific evidence records and entity names. ' +
                    'CRITICAL RULE: Never declare that an individual is guilty or a criminal. Use terms like "observed connection", "high network relevance", or "investigative lead".';
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: `${systemInstruction}\n\nCONTEXT:\n${contextText}\n\nINVESTIGATOR QUESTION:\n${question}` },
                            ],
                        },
                    ],
                });
                const answerText = response.text || '';
                return {
                    answer: answerText,
                    citedEntities,
                    citedEvidence,
                    sourceMethod: 'GEMINI_AI',
                };
            }
            catch (err) {
                logger_1.logger.warn('Gemini API call fallback to deterministic reasoning:', err.message);
            }
        }
        // 3. High-Quality Deterministic Explanation Engine (turnkey fallback)
        let deterministicAnswer = '';
        if (mentionedNode) {
            const node = mentionedNode.graphNode;
            const factors = mentionedNode.relevanceFactors ? JSON.parse(mentionedNode.relevanceFactors) : [];
            const factorSummary = factors.map((f) => `• ${f.description} (+${f.contribution} pts)`).join('\n');
            deterministicAnswer =
                `### Investigative Assessment: ${node.canonicalValue}\n\n` +
                    `**Entity Type**: ${node.entityType}\n` +
                    `**Network Relevance Score**: ${mentionedNode.networkRelevanceScore}/100\n` +
                    `**Structural Role**: ${mentionedNode.isPotentialBridge ? 'Potential Network Bridge (High Betweenness)' : 'Direct Operational Node'}\n\n` +
                    `#### Key Contributing Relevance Factors:\n${factorSummary}\n\n` +
                    `#### Observed Connections:\n` +
                    `- Directly communicates with / transacts to ${node.outEdges.length} targets.\n` +
                    `- Receives incoming interactions from ${node.inEdges.length} sources.\n\n` +
                    `#### Primary Grounding Evidence:\n` +
                    (node.evidenceRecord
                        ? `Source: *${node.evidenceRecord.document.originalFilename}* (Row ${node.evidenceRecord.rowIndex || 'N/A'})\n` +
                            `> "${node.evidenceRecord.rawSnippet}"`
                        : `Synthesized from multi-source records.`);
        }
        else {
            deterministicAnswer =
                `### Case Network Overview: ${caseData.title} (${caseData.caseNumber})\n\n` +
                    `The investigation network contains **${topMetrics.length} high-relevance entities** and **${alerts.length} active alerts**.\n\n` +
                    `#### Top Identified Key Entities:\n` +
                    topMetrics
                        .slice(0, 4)
                        .map((m) => `• **${m.graphNode.canonicalValue}** (${m.graphNode.entityType}): Relevance ${m.networkRelevanceScore}/100, ${m.degreeCentrality} connections`)
                        .join('\n') +
                    `\n\n#### Active Critical Findings:\n` +
                    alerts.map((a) => `• [${a.severity}] **${a.title}**: ${a.description}`).join('\n');
        }
        return {
            answer: deterministicAnswer,
            citedEntities,
            citedEvidence,
            sourceMethod: 'DETERMINISTIC_ENGINE',
        };
    }
}
exports.AiAssistantService = AiAssistantService;
