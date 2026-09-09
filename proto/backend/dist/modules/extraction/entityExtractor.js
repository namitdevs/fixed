"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityExtractor = void 0;
const prisma_1 = require("../../utils/prisma");
const normalizer_1 = require("../../utils/normalizer");
class EntityExtractor {
    /**
     * Extract entities from structured records (Calls, Transactions, Suspects, Vehicles)
     * in the specified case and project them as GraphNodes.
     */
    static async extractStructuredEntities(caseId) {
        let createdCount = 0;
        // 1. Extract from Persons
        const persons = await prisma_1.prisma.person.findMany({ where: { caseId } });
        for (const p of persons) {
            const node = await this.upsertGraphNode({
                caseId,
                entityType: 'PERSON',
                canonicalValue: p.canonicalName,
                rawValue: p.rawName,
                confidence: p.confidence,
                evidenceRecordId: p.evidenceRecordId || undefined,
                entityRefId: p.id,
                metadata: {
                    aliases: p.aliases ? JSON.parse(p.aliases) : [],
                    gender: p.gender,
                    nationality: p.nationality,
                    notes: p.notes,
                },
            });
            if (node)
                createdCount++;
        }
        // 2. Extract from Phones
        const phones = await prisma_1.prisma.phone.findMany({ where: { caseId } });
        for (const ph of phones) {
            const node = await this.upsertGraphNode({
                caseId,
                entityType: 'PHONE',
                canonicalValue: ph.canonicalNumber,
                rawValue: ph.rawNumber,
                confidence: 1.0,
                evidenceRecordId: ph.evidenceRecordId || undefined,
                entityRefId: ph.id,
                metadata: { serviceProvider: ph.serviceProvider },
            });
            if (node)
                createdCount++;
        }
        // 3. Extract from CallRecords (caller & receiver)
        const calls = await prisma_1.prisma.callRecord.findMany({ where: { caseId } });
        for (const c of calls) {
            await this.upsertGraphNode({
                caseId,
                entityType: 'PHONE',
                canonicalValue: c.callerPhone,
                rawValue: c.callerPhone,
                confidence: 1.0,
                evidenceRecordId: c.evidenceRecordId || undefined,
            });
            await this.upsertGraphNode({
                caseId,
                entityType: 'PHONE',
                canonicalValue: c.receiverPhone,
                rawValue: c.receiverPhone,
                confidence: 1.0,
                evidenceRecordId: c.evidenceRecordId || undefined,
            });
        }
        // 4. Extract from FinancialTransactions (sender & receiver accounts)
        const txns = await prisma_1.prisma.financialTransaction.findMany({ where: { caseId } });
        for (const t of txns) {
            await this.upsertGraphNode({
                caseId,
                entityType: 'ACCOUNT',
                canonicalValue: t.senderAccountId,
                rawValue: t.senderAccountId,
                confidence: 1.0,
                evidenceRecordId: t.evidenceRecordId || undefined,
            });
            await this.upsertGraphNode({
                caseId,
                entityType: 'ACCOUNT',
                canonicalValue: t.receiverAccountId,
                rawValue: t.receiverAccountId,
                confidence: 1.0,
                evidenceRecordId: t.evidenceRecordId || undefined,
            });
        }
        // 5. Extract from Vehicles
        const vehicles = await prisma_1.prisma.vehicle.findMany({ where: { caseId } });
        for (const v of vehicles) {
            const node = await this.upsertGraphNode({
                caseId,
                entityType: 'VEHICLE',
                canonicalValue: v.registrationNumber,
                rawValue: v.registrationNumber,
                confidence: 1.0,
                evidenceRecordId: v.evidenceRecordId || undefined,
                entityRefId: v.id,
                metadata: { make: v.make, model: v.model, color: v.color },
            });
            if (node)
                createdCount++;
        }
        return createdCount;
    }
    /**
     * Extract entities from unstructured text (EvidenceRecords from TXT, PDF, FIRs).
     * Uses deterministic regex and rule-based lexicon matching.
     */
    static async extractUnstructuredEntities(caseId) {
        const records = await prisma_1.prisma.evidenceRecord.findMany({
            where: {
                caseId,
                sourceType: { in: ['FIR', 'FIR_REPORT', 'PDF_REPORT', 'PDF_DOCUMENT', 'TXT_DOCUMENT'] },
            },
        });
        let extractedCount = 0;
        // Heuristic entity dictionaries & regex
        const phoneRegex = /(?:\+91[\-\s]?)?[6-9]\d{9}\b/g;
        const vehicleRegex = /\b[A-Z]{2}[-\s]?[0-9]{2}[-\s]?[A-Z]{1,2}[-\s]?[0-9]{4}\b/gi;
        const accountRegex = /\bACC[-\s]?[0-9]{4,8}\b/gi;
        // Recognized investigative names in synthetic scenarios
        const knownPersonNames = [
            'Ravi Sharma',
            'Amit Kumar',
            'Mohit Singh',
            'Sahil Verma',
            'Raj Malhotra',
            'Karan Khanna',
            'R. Sharma',
            'Ravi S.',
            'A. Kumar',
        ];
        const knownLocations = [
            'Sector 17',
            'Sector 17 Market',
            'Chandigarh',
            'Ambala',
            'New Delhi',
            'Mohali',
            'National Highway 44',
        ];
        for (const record of records) {
            const text = record.rawSnippet;
            // 1. Phone numbers
            const phoneMatches = text.match(phoneRegex);
            if (phoneMatches) {
                for (const raw of phoneMatches) {
                    const norm = (0, normalizer_1.normalizePhone)(raw);
                    await this.upsertGraphNode({
                        caseId,
                        entityType: 'PHONE',
                        canonicalValue: norm.canonical,
                        rawValue: norm.raw,
                        confidence: 0.98,
                        evidenceRecordId: record.id,
                    });
                    extractedCount++;
                }
            }
            // 2. Vehicles
            const vehicleMatches = text.match(vehicleRegex);
            if (vehicleMatches) {
                for (const raw of vehicleMatches) {
                    const norm = (0, normalizer_1.normalizeVehiclePlate)(raw);
                    await this.upsertGraphNode({
                        caseId,
                        entityType: 'VEHICLE',
                        canonicalValue: norm.canonical,
                        rawValue: norm.raw,
                        confidence: 0.95,
                        evidenceRecordId: record.id,
                    });
                    extractedCount++;
                }
            }
            // 3. Accounts
            const accountMatches = text.match(accountRegex);
            if (accountMatches) {
                for (const raw of accountMatches) {
                    const norm = (0, normalizer_1.normalizeAccountNumber)(raw);
                    await this.upsertGraphNode({
                        caseId,
                        entityType: 'ACCOUNT',
                        canonicalValue: norm.canonical,
                        rawValue: norm.raw,
                        confidence: 0.95,
                        evidenceRecordId: record.id,
                    });
                    extractedCount++;
                }
            }
            // 4. Person Names
            for (const name of knownPersonNames) {
                if (text.toLowerCase().includes(name.toLowerCase())) {
                    const norm = (0, normalizer_1.normalizePersonName)(name);
                    await this.upsertGraphNode({
                        caseId,
                        entityType: 'PERSON',
                        canonicalValue: norm.canonical,
                        rawValue: name,
                        confidence: 0.90,
                        evidenceRecordId: record.id,
                    });
                    extractedCount++;
                }
            }
            // 5. Locations
            for (const loc of knownLocations) {
                if (text.toLowerCase().includes(loc.toLowerCase())) {
                    await this.upsertGraphNode({
                        caseId,
                        entityType: 'LOCATION',
                        canonicalValue: loc.toUpperCase(),
                        rawValue: loc,
                        confidence: 0.88,
                        evidenceRecordId: record.id,
                    });
                    extractedCount++;
                }
            }
        }
        return extractedCount;
    }
    static async upsertGraphNode(data) {
        if (!data.canonicalValue)
            return null;
        const existing = await prisma_1.prisma.graphNode.findFirst({
            where: {
                caseId: data.caseId,
                entityType: data.entityType,
                canonicalValue: data.canonicalValue,
            },
        });
        if (existing) {
            let rawValues = [];
            try {
                rawValues = existing.rawValues ? JSON.parse(existing.rawValues) : [];
            }
            catch (e) {
                rawValues = [];
            }
            if (!rawValues.includes(data.rawValue)) {
                rawValues.push(data.rawValue);
            }
            return await prisma_1.prisma.graphNode.update({
                where: { id: existing.id },
                data: {
                    rawValues: JSON.stringify(rawValues),
                    confidence: Math.max(existing.confidence, data.confidence),
                    evidenceRecordId: existing.evidenceRecordId || data.evidenceRecordId,
                },
            });
        }
        return await prisma_1.prisma.graphNode.create({
            data: {
                caseId: data.caseId,
                entityType: data.entityType,
                canonicalValue: data.canonicalValue,
                rawValues: JSON.stringify([data.rawValue]),
                confidence: data.confidence,
                evidenceRecordId: data.evidenceRecordId || null,
                entityRefId: data.entityRefId || null,
                metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            },
        });
    }
}
exports.EntityExtractor = EntityExtractor;
