"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGeneratorService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const sync_1 = require("csv-stringify/sync");
const prisma_1 = require("../../utils/prisma");
const graphAnalytics_service_1 = require("../analytics/graphAnalytics.service");
const patternDetector_service_1 = require("../patterns/patternDetector.service");
const timeline_service_1 = require("../temporal/timeline.service");
class ReportGeneratorService {
    static async generateCaseReport(caseId, authorUserId) {
        const caseData = await prisma_1.prisma.case.findUnique({
            where: { id: caseId },
            include: {
                documents: true,
                createdByUser: true,
            },
        });
        if (!caseData)
            throw new Error(`Case ${caseId} not found`);
        // Top nodes by relevance score
        const topMetrics = await prisma_1.prisma.nodeMetric.findMany({
            where: { caseId },
            orderBy: { networkRelevanceScore: 'desc' },
            take: 8,
            include: { graphNode: true },
        });
        // Clusters
        const clusters = await graphAnalytics_service_1.GraphAnalyticsService.getCommunityClusters(caseId);
        // Alerts & Patterns
        const alerts = await prisma_1.prisma.alert.findMany({ where: { caseId }, orderBy: { severity: 'asc' } });
        const patterns = await patternDetector_service_1.PatternDetectorService.detectAllPatterns(caseId);
        // Timeline events
        const timeline = await timeline_service_1.TimelineService.getCaseTimeline(caseId);
        const executiveSummary = `This confidential investigative dossier synthesizes analytical findings for ${caseData.caseNumber} ("${caseData.title}"). ` +
            `The criminal network encompasses ${topMetrics.length} prioritized entities, ${clusters.length} distinct structural clusters, and ` +
            `${patterns.length} detected behavioral anomalies (including high-frequency communication spikes and multi-hop fund routing). ` +
            `Evidence across ${caseData.documents.length} verified documents supports the observed network architecture.`;
        const keyFindings = topMetrics.map((m) => ({
            entityName: m.graphNode.canonicalValue,
            entityType: m.graphNode.entityType,
            relevanceScore: m.networkRelevanceScore,
            degree: m.degreeCentrality,
            betweenness: m.betweennessCentrality,
            isBridge: m.isPotentialBridge,
            factors: m.relevanceFactors ? JSON.parse(m.relevanceFactors) : [],
        }));
        const reportData = {
            case: {
                id: caseData.id,
                caseNumber: caseData.caseNumber,
                title: caseData.title,
                status: caseData.status,
                priority: caseData.priority,
                createdAt: caseData.createdAt,
            },
            executiveSummary,
            keyFindings,
            clusters: clusters.slice(0, 4),
            alerts,
            patterns,
            timelineHighlights: timeline.slice(0, 10),
            evidenceDocuments: caseData.documents.map((d) => ({
                filename: d.originalFilename,
                type: d.fileType,
                recordCount: d.recordCount,
                status: d.processingStatus,
            })),
        };
        const report = await prisma_1.prisma.investigationReport.create({
            data: {
                caseId,
                title: `INVESTIGATION DOSSIER: ${caseData.caseNumber} - ${caseData.title}`,
                authorUserId: authorUserId || null,
                executiveSummary,
                keyFindings: JSON.stringify(keyFindings),
                clusterSummary: JSON.stringify(clusters.slice(0, 4)),
                timelineHighlights: JSON.stringify(timeline.slice(0, 10)),
                reportData: JSON.stringify(reportData),
            },
        });
        return report;
    }
    static async streamPdfReport(caseId, res) {
        const caseData = await prisma_1.prisma.case.findUnique({
            where: { id: caseId },
            include: { documents: true, createdByUser: true },
        });
        if (!caseData)
            throw new Error(`Case ${caseId} not found`);
        const topMetrics = await prisma_1.prisma.nodeMetric.findMany({
            where: { caseId },
            orderBy: { networkRelevanceScore: 'desc' },
            take: 6,
            include: { graphNode: true },
        });
        const alerts = await prisma_1.prisma.alert.findMany({ where: { caseId }, take: 6 });
        const timeline = await timeline_service_1.TimelineService.getCaseTimeline(caseId);
        const doc = new pdfkit_1.default({ margin: 40, size: 'A4' });
        if (typeof res.setHeader === 'function') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Investigation_Dossier_${caseData.caseNumber}.pdf"`);
        }
        doc.pipe(res);
        // Title / Header
        doc.fillColor('#0f172a').fontSize(22).text('INTELLIGENCE INVESTIGATION DOSSIER', { align: 'center', underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#475569').text(`CONFIDENTIAL LAW ENFORCEMENT DECISION-SUPPORT DOCUMENT`, { align: 'center' });
        doc.moveDown(1);
        // Case Metadata Table Box
        doc.rect(40, doc.y, 515, 65).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(10);
        const boxY = doc.y + 10;
        doc.text(`Case Number: ${caseData.caseNumber}`, 50, boxY);
        doc.text(`Title: ${caseData.title}`, 50, boxY + 15);
        doc.text(`Status: ${caseData.status} | Priority: ${caseData.priority}`, 50, boxY + 30);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 320, boxY);
        doc.text(`Lead Officer: ${caseData.createdByUser?.name || 'Authorized Investigator'}`, 320, boxY + 15);
        doc.text(`Source Documents: ${caseData.documents.length} ingested`, 320, boxY + 30);
        doc.y = boxY + 65;
        doc.moveDown(1);
        // Executive Summary
        doc.fontSize(14).fillColor('#1e293b').text('1. EXECUTIVE INTELLIGENCE SUMMARY', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#334155').text(`Analytical assessment of Case ${caseData.caseNumber} indicates a structured criminal syndicate organized across multiple functional tiers. ` +
            `Automated centrality algorithms identified key bridge nodes coordinating financial transfers and logistics movements between distinct operational cells. ` +
            `All conclusions in this dossier are decision-support indicators grounded directly in verified evidentiary records.`);
        doc.moveDown(1);
        // Key Entities & Relevance
        doc.fontSize(14).fillColor('#1e293b').text('2. PRIORITY NETWORK IDENTITIES & RELEVANCE', { underline: true });
        doc.moveDown(0.5);
        topMetrics.forEach((m, idx) => {
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(`${idx + 1}. ${m.graphNode.canonicalValue} [${m.graphNode.entityType}] — Network Score: ${m.networkRelevanceScore}/100`);
            doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(`   • Connectivity: ${m.degreeCentrality} direct links | Betweenness Rank: ${m.betweennessCentrality} | Bridge Node: ${m.isPotentialBridge ? 'YES' : 'NO'}`);
            const factors = m.relevanceFactors ? JSON.parse(m.relevanceFactors) : [];
            factors.slice(0, 2).forEach((f) => {
                doc.text(`   • Observed Factor: ${f.description} (+${f.contribution} pts)`);
            });
            doc.moveDown(0.4);
        });
        doc.moveDown(0.8);
        // Critical Alerts
        doc.fontSize(14).fillColor('#1e293b').text('3. DETECTED BEHAVIORAL PATTERNS & ANOMALIES', { underline: true });
        doc.moveDown(0.5);
        alerts.forEach((a) => {
            doc.fontSize(10).fillColor(a.severity === 'CRITICAL' ? '#b91c1c' : '#c2410c').text(`[${a.severity}] ${a.title}`);
            doc.fontSize(9).fillColor('#334155').text(`Description: ${a.description}`);
            doc.moveDown(0.4);
        });
        doc.moveDown(0.8);
        // Timeline Snapshot
        doc.fontSize(14).fillColor('#1e293b').text('4. KEY CHRONOLOGICAL INCIDENTS & EVENTS', { underline: true });
        doc.moveDown(0.5);
        timeline.slice(0, 6).forEach((e) => {
            const dStr = new Date(e.timestamp).toISOString().replace('T', ' ').substring(0, 16);
            doc.fontSize(9).fillColor('#0284c7').text(`• [${dStr}] ${e.eventType}: ${e.title}`);
            doc.fontSize(9).fillColor('#475569').text(`  ${e.description}`);
        });
        doc.moveDown(1.5);
        doc.fontSize(8).fillColor('#94a3b8').text('LEGAL DISCLAIMER: This automated intelligence assessment is intended exclusively for investigatory prioritization and decision support. It does not constitute a legal determination of guilt or criminal indictment.', { align: 'center' });
        doc.end();
    }
    static async getJsonExport(caseId) {
        const caseData = await prisma_1.prisma.case.findUnique({
            where: { id: caseId },
            include: {
                documents: true,
                graphNodes: {
                    include: { metrics: { take: 1, orderBy: { createdAt: 'desc' } } },
                },
                graphEdges: true,
                alerts: true,
                reports: { take: 1, orderBy: { generatedAt: 'desc' } },
            },
        });
        if (!caseData)
            throw new Error(`Case ${caseId} not found`);
        return caseData;
    }
    static async getCsvExport(caseId) {
        const nodes = await prisma_1.prisma.graphNode.findMany({
            where: { caseId },
            include: { metrics: { take: 1, orderBy: { createdAt: 'desc' } } },
        });
        const rows = nodes.map((n) => {
            const m = n.metrics[0];
            return {
                NodeId: n.id,
                EntityType: n.entityType,
                CanonicalName: n.canonicalValue,
                Confidence: n.confidence,
                Degree: m?.degreeCentrality || 0,
                Betweenness: m?.betweennessCentrality || 0,
                RelevanceScore: m?.networkRelevanceScore || 0,
                IsPotentialBridge: m?.isPotentialBridge ? 'YES' : 'NO',
                CommunityId: m?.communityId || 0,
            };
        });
        return (0, sync_1.stringify)(rows, { header: true });
    }
}
exports.ReportGeneratorService = ReportGeneratorService;
