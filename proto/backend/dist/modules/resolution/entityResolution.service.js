"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityResolutionService = void 0;
const prisma_1 = require("../../utils/prisma");
class EntityResolutionService {
    /**
     * Run pairwise candidate detection for all PERSON entities in a case.
     */
    static async runResolution(caseId) {
        const personNodes = await prisma_1.prisma.graphNode.findMany({
            where: { caseId, entityType: 'PERSON' },
            include: {
                outEdges: true,
                inEdges: true,
            },
        });
        let candidatesCreated = 0;
        for (let i = 0; i < personNodes.length; i++) {
            for (let j = i + 1; j < personNodes.length; j++) {
                const nodeA = personNodes[i];
                const nodeB = personNodes[j];
                const matchResult = this.evaluateMatch(nodeA, nodeB);
                if (matchResult.isCandidate) {
                    // Check if candidate pair already exists
                    const existing = await prisma_1.prisma.entityResolutionCandidate.findFirst({
                        where: {
                            caseId,
                            OR: [
                                { primaryNodeId: nodeA.id, candidateNodeId: nodeB.id },
                                { primaryNodeId: nodeB.id, candidateNodeId: nodeA.id },
                            ],
                        },
                    });
                    if (!existing) {
                        await prisma_1.prisma.entityResolutionCandidate.create({
                            data: {
                                caseId,
                                primaryNodeId: nodeA.id,
                                candidateNodeId: nodeB.id,
                                similarityScore: matchResult.score,
                                matchReasons: JSON.stringify(matchResult.reasons),
                                status: 'PENDING_REVIEW',
                            },
                        });
                        candidatesCreated++;
                    }
                }
            }
        }
        return candidatesCreated;
    }
    static async listCandidates(caseId, status) {
        const where = { caseId };
        if (status) {
            where.status = status.toUpperCase();
        }
        const candidates = await prisma_1.prisma.entityResolutionCandidate.findMany({
            where,
            orderBy: { similarityScore: 'desc' },
        });
        // Populate node metadata for investigator review UI
        const populated = await Promise.all(candidates.map(async (c) => {
            const primary = await prisma_1.prisma.graphNode.findUnique({ where: { id: c.primaryNodeId } });
            const candidate = await prisma_1.prisma.graphNode.findUnique({ where: { id: c.candidateNodeId } });
            return {
                ...c,
                matchReasons: JSON.parse(c.matchReasons),
                primaryNode: primary,
                candidateNode: candidate,
            };
        }));
        return populated;
    }
    static async resolveCandidate(candidateId, action, userId) {
        const candidate = await prisma_1.prisma.entityResolutionCandidate.findUnique({
            where: { id: candidateId },
        });
        if (!candidate) {
            const err = new Error(`Resolution candidate ${candidateId} not found`);
            err.statusCode = 404;
            err.errorCode = 'CANDIDATE_NOT_FOUND';
            throw err;
        }
        if (action === 'REJECT') {
            const updated = await prisma_1.prisma.entityResolutionCandidate.update({
                where: { id: candidateId },
                data: {
                    status: 'REJECTED',
                    reviewedByUserId: userId || null,
                    reviewedAt: new Date(),
                },
            });
            return { success: true, message: 'Candidate match rejected', candidate: updated };
        }
        // If ACCEPT: Merge candidateNode into primaryNode
        const primary = await prisma_1.prisma.graphNode.findUnique({ where: { id: candidate.primaryNodeId } });
        const secondary = await prisma_1.prisma.graphNode.findUnique({ where: { id: candidate.candidateNodeId } });
        if (!primary || !secondary) {
            throw new Error('One or both nodes to merge no longer exist');
        }
        // 1. Move all secondary outEdges to primary
        await prisma_1.prisma.graphEdge.updateMany({
            where: { sourceNodeId: secondary.id },
            data: { sourceNodeId: primary.id },
        });
        // 2. Move all secondary inEdges to primary
        await prisma_1.prisma.graphEdge.updateMany({
            where: { targetNodeId: secondary.id },
            data: { targetNodeId: primary.id },
        });
        // 3. Update primary rawValues with secondary rawValues
        const primaryRaws = primary.rawValues ? JSON.parse(primary.rawValues) : [];
        const secRaws = secondary.rawValues ? JSON.parse(secondary.rawValues) : [];
        const mergedRaws = Array.from(new Set([...primaryRaws, ...secRaws, secondary.canonicalValue]));
        await prisma_1.prisma.graphNode.update({
            where: { id: primary.id },
            data: {
                rawValues: JSON.stringify(mergedRaws),
            },
        });
        // 4. Update candidate status
        const updatedCandidate = await prisma_1.prisma.entityResolutionCandidate.update({
            where: { id: candidateId },
            data: {
                status: 'ACCEPTED_MERGED',
                reviewedByUserId: userId || null,
                reviewedAt: new Date(),
            },
        });
        // 5. Delete or archive merged secondary node
        await prisma_1.prisma.graphNode.delete({ where: { id: secondary.id } });
        // 6. Log audit entry
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: userId || null,
                caseId: candidate.caseId,
                action: 'ENTITY_RESOLUTION_MERGE',
                resource: 'GraphNode',
                details: JSON.stringify({
                    primaryNodeId: primary.id,
                    mergedNodeId: secondary.id,
                    primaryCanonical: primary.canonicalValue,
                    secondaryCanonical: secondary.canonicalValue,
                }),
            },
        });
        return { success: true, message: 'Entities successfully merged and edges re-routed', candidate: updatedCandidate };
    }
    static evaluateMatch(nodeA, nodeB) {
        const reasons = [];
        let score = 0;
        const valA = nodeA.canonicalValue.toUpperCase();
        const valB = nodeB.canonicalValue.toUpperCase();
        // 1. String similarity (Levenshtein ratio)
        const levSim = this.stringSimilarity(valA, valB);
        if (levSim > 0.85) {
            score += 0.60;
            reasons.push(`High name similarity (${(levSim * 100).toFixed(0)}%)`);
        }
        else if (levSim > 0.65) {
            score += 0.35;
            reasons.push(`Moderate name similarity (${(levSim * 100).toFixed(0)}%)`);
        }
        // 2. Initials + Last Name Match (e.g. "R. SHARMA" vs "RAVI SHARMA")
        if (this.isInitialsMatch(valA, valB)) {
            score += 0.40;
            reasons.push('Name and initial pattern match (e.g. R. Sharma vs Ravi Sharma)');
        }
        // 3. Shared raw values / aliases
        const rawsA = nodeA.rawValues ? JSON.parse(nodeA.rawValues) : [];
        const rawsB = nodeB.rawValues ? JSON.parse(nodeB.rawValues) : [];
        const sharedRaw = rawsA.some((r) => rawsB.includes(r));
        if (sharedRaw) {
            score += 0.30;
            reasons.push('Shared raw identifier or alias recorded');
        }
        score = Math.min(1.0, Math.round(score * 100) / 100);
        return {
            isCandidate: score >= 0.65,
            score,
            reasons,
        };
    }
    static stringSimilarity(s1, s2) {
        let longer = s1;
        let shorter = s2;
        if (s1.length < s2.length) {
            longer = s2;
            shorter = s1;
        }
        const longerLength = longer.length;
        if (longerLength === 0)
            return 1.0;
        const editDistance = this.levenshtein(longer, shorter);
        return (longerLength - editDistance) / longerLength;
    }
    static levenshtein(s1, s2) {
        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                }
                else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0)
                costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }
    static isInitialsMatch(a, b) {
        const partsA = a.replace(/[\.]/g, '').split(/\s+/);
        const partsB = b.replace(/[\.]/g, '').split(/\s+/);
        if (partsA.length < 2 || partsB.length < 2)
            return false;
        // Check if last names match and first initial matches
        const lastA = partsA[partsA.length - 1];
        const lastB = partsB[partsB.length - 1];
        if (lastA === lastB) {
            if (partsA[0][0] === partsB[0][0]) {
                return true;
            }
        }
        return false;
    }
}
exports.EntityResolutionService = EntityResolutionService;
