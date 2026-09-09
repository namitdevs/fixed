"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineService = void 0;
const prisma_1 = require("../../utils/prisma");
class TimelineService {
    static async getCaseTimeline(caseId, filter) {
        const events = [];
        // 1. Calls
        const calls = await prisma_1.prisma.callRecord.findMany({
            where: {
                caseId,
                timestamp: {
                    gte: filter?.startDate,
                    lte: filter?.endDate,
                },
            },
        });
        for (const c of calls) {
            events.push({
                id: c.id,
                timestamp: c.timestamp,
                eventType: 'CALL',
                title: `Phone Call: ${c.callerPhone} → ${c.receiverPhone}`,
                description: `Duration: ${c.durationSec}s | Channel: ${c.callType}`,
                involvedEntities: [c.callerPhone, c.receiverPhone],
                evidenceRecordId: c.evidenceRecordId || undefined,
                durationSec: c.durationSec,
            });
        }
        // 2. Financial Transactions
        const txns = await prisma_1.prisma.financialTransaction.findMany({
            where: {
                caseId,
                timestamp: {
                    gte: filter?.startDate,
                    lte: filter?.endDate,
                },
            },
        });
        for (const t of txns) {
            events.push({
                id: t.id,
                timestamp: t.timestamp,
                eventType: 'TRANSACTION',
                title: `Fund Transfer: ${t.senderAccountId} → ${t.receiverAccountId}`,
                description: `Amount: ${t.currency} ${t.amount.toLocaleString()} | Ref: ${t.transactionRef}`,
                involvedEntities: [t.senderAccountId, t.receiverAccountId],
                evidenceRecordId: t.evidenceRecordId || undefined,
                amount: t.amount,
            });
        }
        // 3. Incidents
        const incidents = await prisma_1.prisma.incident.findMany({
            where: {
                caseId,
                occurredAt: {
                    gte: filter?.startDate,
                    lte: filter?.endDate,
                },
            },
        });
        for (const inc of incidents) {
            events.push({
                id: inc.id,
                timestamp: inc.occurredAt,
                eventType: 'INCIDENT',
                title: `Incident: ${inc.title}`,
                description: inc.description || 'Reported investigative incident',
                involvedEntities: [],
                evidenceRecordId: inc.evidenceRecordId || undefined,
            });
        }
        // 4. Graph Event Edges (Meetings, Visits)
        const eventEdges = await prisma_1.prisma.graphEdge.findMany({
            where: {
                caseId,
                isEvent: true,
                eventTimestamp: {
                    gte: filter?.startDate,
                    lte: filter?.endDate,
                    not: null,
                },
            },
            include: {
                sourceNode: true,
                targetNode: true,
            },
        });
        for (const edge of eventEdges) {
            let meta = {};
            try {
                if (edge.metadata)
                    meta = JSON.parse(edge.metadata);
            }
            catch (e) { }
            events.push({
                id: edge.id,
                timestamp: edge.eventTimestamp,
                eventType: edge.relationshipType === 'MET' ? 'MEETING' : 'OTHER',
                title: `${edge.relationshipType}: ${edge.sourceNode.canonicalValue} → ${edge.targetNode.canonicalValue}`,
                description: meta.location ? `Location: ${meta.location}` : `Observed network interaction`,
                involvedEntities: [edge.sourceNode.canonicalValue, edge.targetNode.canonicalValue],
                evidenceRecordId: edge.evidenceRecordId || undefined,
                location: meta.location,
            });
        }
        // Sort chronologically
        events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        // Filter by eventType if specified
        if (filter?.eventType) {
            return events.filter((e) => e.eventType === filter.eventType);
        }
        return events;
    }
}
exports.TimelineService = TimelineService;
