"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternDetectorService = void 0;
const prisma_1 = require("../../utils/prisma");
class PatternDetectorService {
    /**
     * Run full suite of pattern detectors for a case.
     */
    static async detectAllPatterns(caseId) {
        const patterns = [];
        const txChains = await this.detectTransactionChains(caseId);
        patterns.push(...txChains);
        const commSpikes = await this.detectCommunicationSpikes(caseId);
        patterns.push(...commSpikes);
        const sharedInfra = await this.detectSharedInfrastructure(caseId);
        patterns.push(...sharedInfra);
        return patterns;
    }
    /**
     * Detect multi-hop transaction chains (e.g. A -> B -> C -> D).
     */
    static async detectTransactionChains(caseId) {
        const txns = await prisma_1.prisma.financialTransaction.findMany({
            where: { caseId },
            orderBy: { timestamp: 'asc' },
        });
        if (txns.length < 2)
            return [];
        const patterns = [];
        // Build directed adjacency map of transactions: sender -> [{ receiver, amount, timestamp, id, evidenceId }]
        const adj = new Map();
        for (const t of txns) {
            const list = adj.get(t.senderAccountId) || [];
            list.push(t);
            adj.set(t.senderAccountId, list);
        }
        // Depth-first search for chains of length >= 3 within 48-hour window
        const visitedChains = new Set();
        for (const t1 of txns) {
            const nextHops = adj.get(t1.receiverAccountId) || [];
            for (const t2 of nextHops) {
                const timeDiff = (t2.timestamp.getTime() - t1.timestamp.getTime()) / (1000 * 60 * 60); // hours
                if (timeDiff >= 0 && timeDiff <= 48) {
                    // Check for a 3rd hop
                    const thirdHops = adj.get(t2.receiverAccountId) || [];
                    for (const t3 of thirdHops) {
                        const timeDiff2 = (t3.timestamp.getTime() - t2.timestamp.getTime()) / (1000 * 60 * 60);
                        if (timeDiff2 >= 0 && timeDiff2 <= 48) {
                            const chainKey = `${t1.senderAccountId}->${t1.receiverAccountId}->${t2.receiverAccountId}->${t3.receiverAccountId}`;
                            if (!visitedChains.has(chainKey)) {
                                visitedChains.add(chainKey);
                                // Find corresponding Account GraphNodes
                                const accNodes = await prisma_1.prisma.graphNode.findMany({
                                    where: {
                                        caseId,
                                        entityType: 'ACCOUNT',
                                        canonicalValue: {
                                            in: [t1.senderAccountId, t1.receiverAccountId, t2.receiverAccountId, t3.receiverAccountId],
                                        },
                                    },
                                });
                                const evidenceIds = [t1.evidenceRecordId, t2.evidenceRecordId, t3.evidenceRecordId].filter(Boolean);
                                patterns.push({
                                    type: 'TRANSACTION_CHAIN',
                                    title: 'Rapid Multi-Hop Transaction Chain Detected',
                                    description: `Sequential fund transfer detected across 4 accounts: ${t1.senderAccountId} → ${t1.receiverAccountId} → ${t2.receiverAccountId} → ${t3.receiverAccountId} within 48 hours.`,
                                    severity: 'CRITICAL',
                                    involvedNodeIds: accNodes.map((n) => n.id),
                                    evidenceRecordIds: evidenceIds,
                                    metrics: {
                                        chainLength: 4,
                                        initialAmount: t1.amount,
                                        finalAmount: t3.amount,
                                        currency: t1.currency,
                                        startTime: t1.timestamp,
                                        endTime: t3.timestamp,
                                    },
                                });
                            }
                        }
                    }
                }
            }
        }
        return patterns;
    }
    /**
     * Detect sudden communication volume surges over baseline between two numbers.
     */
    static async detectCommunicationSpikes(caseId) {
        const calls = await prisma_1.prisma.callRecord.findMany({
            where: { caseId },
            orderBy: { timestamp: 'asc' },
        });
        if (calls.length < 4)
            return [];
        const patterns = [];
        // Group by pair & date
        const pairDailyCounts = new Map();
        for (const c of calls) {
            const pair = [c.callerPhone, c.receiverPhone].sort().join('<->');
            const dateKey = c.timestamp.toISOString().split('T')[0];
            if (!pairDailyCounts.has(pair)) {
                pairDailyCounts.set(pair, {});
            }
            const pairData = pairDailyCounts.get(pair);
            if (!pairData[dateKey]) {
                pairData[dateKey] = { count: 0, evidenceIds: [] };
            }
            pairData[dateKey].count++;
            if (c.evidenceRecordId)
                pairData[dateKey].evidenceIds.push(c.evidenceRecordId);
        }
        for (const [pair, dayMap] of pairDailyCounts.entries()) {
            const days = Object.keys(dayMap);
            const counts = days.map((d) => dayMap[d].count);
            const totalCalls = counts.reduce((a, b) => a + b, 0);
            for (const day of days) {
                const dayCount = dayMap[day].count;
                const otherDaysCount = totalCalls - dayCount;
                const otherDaysLen = Math.max(days.length - 1, 1);
                const baselineOthers = otherDaysCount / otherDaysLen;
                // Spike if dayCount >= 3 and is at least double the baseline of other days
                if (dayCount >= 3 && (dayCount >= baselineOthers * 2.0 || otherDaysCount === 0)) {
                    const [p1, p2] = pair.split('<->');
                    const phoneNodes = await prisma_1.prisma.graphNode.findMany({
                        where: { caseId, entityType: 'PHONE', canonicalValue: { in: [p1, p2] } },
                    });
                    patterns.push({
                        type: 'COMMUNICATION_SPIKE',
                        title: `Communication Activity Spike on ${day}`,
                        description: `Abnormal surge of ${dayCount} calls between ${p1} and ${p2} on ${day} (Baseline average: ${baselineOthers.toFixed(1)} calls/day).`,
                        severity: 'HIGH',
                        involvedNodeIds: phoneNodes.map((n) => n.id),
                        evidenceRecordIds: dayMap[day].evidenceIds,
                        metrics: {
                            date: day,
                            observedCount: dayCount,
                            baselineDailyAverage: Math.round(baselineOthers * 10) / 10,
                            spikeRatio: Math.round((dayCount / Math.max(baselineOthers, 1)) * 10) / 10,
                        },
                    });
                }
            }
        }
        return patterns;
    }
    /**
     * Detect shared infrastructure (multiple persons linked to the same phone, vehicle, or account).
     */
    static async detectSharedInfrastructure(caseId) {
        const patterns = [];
        // Find non-person nodes connected to >= 2 distinct PERSON nodes
        const infraNodes = await prisma_1.prisma.graphNode.findMany({
            where: {
                caseId,
                entityType: { in: ['PHONE', 'VEHICLE', 'ACCOUNT'] },
            },
            include: {
                inEdges: {
                    include: { sourceNode: true },
                },
                outEdges: {
                    include: { targetNode: true },
                },
            },
        });
        for (const node of infraNodes) {
            const linkedPersonIds = new Set();
            const linkedPersonNames = [];
            const checkNode = (other) => {
                if (other && other.entityType === 'PERSON') {
                    if (!linkedPersonIds.has(other.id)) {
                        linkedPersonIds.add(other.id);
                        linkedPersonNames.push(other.canonicalValue);
                    }
                }
            };
            node.inEdges.forEach((e) => checkNode(e.sourceNode));
            node.outEdges.forEach((e) => checkNode(e.targetNode));
            if (linkedPersonIds.size >= 2) {
                patterns.push({
                    type: 'SHARED_INFRASTRUCTURE',
                    title: `Shared ${node.entityType}: ${node.canonicalValue}`,
                    description: `The ${node.entityType.toLowerCase()} ${node.canonicalValue} is concurrently linked to multiple persons: ${linkedPersonNames.join(', ')}.`,
                    severity: 'HIGH',
                    involvedNodeIds: [node.id, ...Array.from(linkedPersonIds)],
                    evidenceRecordIds: node.evidenceRecordId ? [node.evidenceRecordId] : [],
                    metrics: {
                        infraType: node.entityType,
                        identifier: node.canonicalValue,
                        associatedPersonsCount: linkedPersonIds.size,
                        persons: linkedPersonNames,
                    },
                });
            }
        }
        return patterns;
    }
}
exports.PatternDetectorService = PatternDetectorService;
