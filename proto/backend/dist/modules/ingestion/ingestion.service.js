"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionService = void 0;
const fs_1 = __importDefault(require("fs"));
const sync_1 = require("csv-parse/sync");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const prisma_1 = require("../../utils/prisma");
const logger_1 = require("../../utils/logger");
const normalizer_1 = require("../../utils/normalizer");
class IngestionService {
    /**
     * Process an uploaded document by parsing its contents, creating EvidenceRecords,
     * and populating structured tables.
     */
    static async processDocument(documentId) {
        const document = await prisma_1.prisma.document.findUnique({
            where: { id: documentId },
            include: { case: true, dataSource: true },
        });
        if (!document) {
            throw new Error(`Document ${documentId} not found`);
        }
        await prisma_1.prisma.document.update({
            where: { id: documentId },
            data: { processingStatus: 'PROCESSING', processingError: null },
        });
        try {
            if (!fs_1.default.existsSync(document.storagePath)) {
                throw new Error(`Storage file missing at path: ${document.storagePath}`);
            }
            const fileBuffer = fs_1.default.readFileSync(document.storagePath);
            const fileType = document.fileType.toUpperCase();
            let recordsCount = 0;
            let warningsCount = 0;
            // Identify source type from dataSource or filename
            const inferredSourceType = (document.dataSource?.type ||
                this.inferSourceType(document.originalFilename)).toUpperCase();
            if (fileType === 'CSV') {
                const result = await this.processCsv(document.id, document.caseId, fileBuffer, inferredSourceType);
                recordsCount = result.records;
                warningsCount = result.warnings;
            }
            else if (fileType === 'JSON') {
                const result = await this.processJson(document.id, document.caseId, fileBuffer, inferredSourceType);
                recordsCount = result.records;
                warningsCount = result.warnings;
            }
            else if (fileType === 'PDF') {
                const result = await this.processPdf(document.id, document.caseId, fileBuffer, inferredSourceType);
                recordsCount = result.records;
                warningsCount = result.warnings;
            }
            else if (fileType === 'TXT') {
                const result = await this.processTxt(document.id, document.caseId, fileBuffer, inferredSourceType);
                recordsCount = result.records;
                warningsCount = result.warnings;
            }
            else {
                throw new Error(`Unsupported file type: ${fileType}`);
            }
            await prisma_1.prisma.document.update({
                where: { id: documentId },
                data: {
                    processingStatus: 'COMPLETED',
                    recordCount: recordsCount,
                    warningCount: warningsCount,
                },
            });
            if (document.dataSourceId) {
                await prisma_1.prisma.dataSource.update({
                    where: { id: document.dataSourceId },
                    data: { status: 'COMPLETED' },
                });
            }
            return {
                success: true,
                documentId,
                sourceType: inferredSourceType,
                recordsImported: recordsCount,
                warnings: warningsCount,
            };
        }
        catch (err) {
            logger_1.logger.error(`Ingestion failed for document ${documentId}:`, err);
            await prisma_1.prisma.document.update({
                where: { id: documentId },
                data: {
                    processingStatus: 'FAILED',
                    processingError: err.message || 'Unknown processing error',
                },
            });
            if (document.dataSourceId) {
                await prisma_1.prisma.dataSource.update({
                    where: { id: document.dataSourceId },
                    data: { status: 'FAILED' },
                });
            }
            return {
                success: false,
                documentId,
                sourceType: document.dataSource?.type || 'UNKNOWN',
                recordsImported: 0,
                warnings: 0,
                error: err.message,
            };
        }
    }
    static inferSourceType(filename) {
        const fn = filename.toLowerCase();
        if (fn.includes('cdr') || fn.includes('call'))
            return 'CDR';
        if (fn.includes('transact') || fn.includes('bank') || fn.includes('fin'))
            return 'TRANSACTION';
        if (fn.includes('suspect') || fn.includes('person'))
            return 'SUSPECT';
        if (fn.includes('vehicle') || fn.includes('reg'))
            return 'VEHICLE';
        if (fn.includes('fir') || fn.includes('report') || fn.includes('police'))
            return 'FIR';
        return 'GENERIC';
    }
    static async processCsv(documentId, caseId, buffer, sourceType) {
        const rawContent = buffer.toString('utf-8');
        const records = (0, sync_1.parse)(rawContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });
        let count = 0;
        let warnings = 0;
        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            const rowIndex = i + 1;
            const snippet = Object.entries(row)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' | ');
            // Create EvidenceRecord
            const evidence = await prisma_1.prisma.evidenceRecord.create({
                data: {
                    documentId,
                    caseId,
                    sourceType,
                    rowIndex,
                    rawSnippet: snippet,
                    parsedData: JSON.stringify(row),
                    confidence: 1.0,
                },
            });
            // Map to structured entities based on headers
            try {
                await this.mapStructuredRow(caseId, evidence.id, row, sourceType);
                count++;
            }
            catch (err) {
                warnings++;
                logger_1.logger.warn(`Row ${rowIndex} structured mapping warning:`, err);
            }
        }
        return { records: count, warnings };
    }
    static async processJson(documentId, caseId, buffer, sourceType) {
        const jsonStr = buffer.toString('utf-8');
        const parsed = JSON.parse(jsonStr);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        let count = 0;
        let warnings = 0;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const snippet = JSON.stringify(item);
            const evidence = await prisma_1.prisma.evidenceRecord.create({
                data: {
                    documentId,
                    caseId,
                    sourceType,
                    rowIndex: i + 1,
                    rawSnippet: snippet.substring(0, 1000),
                    parsedData: snippet,
                    confidence: 1.0,
                },
            });
            try {
                await this.mapStructuredRow(caseId, evidence.id, item, sourceType);
                count++;
            }
            catch (err) {
                warnings++;
            }
        }
        return { records: count, warnings };
    }
    static async processTxt(documentId, caseId, buffer, sourceType) {
        const text = buffer.toString('utf-8');
        const paragraphs = text
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter(Boolean);
        let count = 0;
        for (let i = 0; i < paragraphs.length; i++) {
            const para = paragraphs[i];
            await prisma_1.prisma.evidenceRecord.create({
                data: {
                    documentId,
                    caseId,
                    sourceType: sourceType || 'TXT_DOCUMENT',
                    rowIndex: i + 1,
                    rawSnippet: para.substring(0, 2000),
                    confidence: 1.0,
                },
            });
            count++;
        }
        return { records: count, warnings: 0 };
    }
    static async processPdf(documentId, caseId, buffer, sourceType) {
        try {
            const pdfData = await (0, pdf_parse_1.default)(buffer);
            const text = pdfData.text || '';
            const pages = text.split('\f').filter(Boolean);
            let count = 0;
            for (let p = 0; p < pages.length; p++) {
                const pageText = pages[p].trim();
                if (!pageText)
                    continue;
                const paragraphs = pageText
                    .split(/\n\s*\n/)
                    .map((pr) => pr.trim())
                    .filter(Boolean);
                for (let r = 0; r < paragraphs.length; r++) {
                    await prisma_1.prisma.evidenceRecord.create({
                        data: {
                            documentId,
                            caseId,
                            sourceType: sourceType || 'PDF_REPORT',
                            pageNumber: p + 1,
                            rowIndex: r + 1,
                            rawSnippet: paragraphs[r].substring(0, 2000),
                            confidence: 0.95,
                        },
                    });
                    count++;
                }
            }
            return { records: count, warnings: 0 };
        }
        catch (err) {
            logger_1.logger.warn(`PDF parse fallback error: ${err.message}`);
            // If PDF text extraction fails, record a single evidence snippet without crashing
            await prisma_1.prisma.evidenceRecord.create({
                data: {
                    documentId,
                    caseId,
                    sourceType: sourceType || 'PDF_DOCUMENT',
                    rawSnippet: `[PDF Binary Upload: ${buffer.length} bytes. Text extraction limited]`,
                    confidence: 0.5,
                },
            });
            return { records: 1, warnings: 1 };
        }
    }
    /**
     * Maps a structured data object (from CSV or JSON) to appropriate relational entities.
     */
    static async mapStructuredRow(caseId, evidenceRecordId, row, sourceType) {
        const keys = Object.keys(row).reduce((acc, k) => {
            acc[k.toLowerCase().replace(/[\s\-_]/g, '')] = row[k];
            return acc;
        }, {});
        // 1. Call Record (CDR)
        const caller = keys['caller'] || keys['callerphone'] || keys['from'] || keys['sourcephone'];
        const receiver = keys['receiver'] || keys['receiverphone'] || keys['to'] || keys['targetphone'];
        if (caller && receiver) {
            const normCaller = (0, normalizer_1.normalizePhone)(caller);
            const normReceiver = (0, normalizer_1.normalizePhone)(receiver);
            const timestamp = (0, normalizer_1.normalizeIsoDate)(keys['timestamp'] || keys['calldate'] || keys['datetime'] || keys['time']);
            const duration = parseInt(keys['duration'] || keys['durationsec'] || '0', 10);
            const callType = keys['calltype'] || keys['type'] || 'VOICE';
            await prisma_1.prisma.callRecord.create({
                data: {
                    caseId,
                    callerPhone: normCaller.canonical,
                    receiverPhone: normReceiver.canonical,
                    timestamp,
                    durationSec: isNaN(duration) ? 0 : duration,
                    callType: String(callType).toUpperCase(),
                    evidenceRecordId,
                },
            });
            return;
        }
        // 2. Financial Transaction
        const sender = keys['sender'] || keys['senderaccount'] || keys['fromaccount'] || keys['sourceaccount'];
        const recipient = keys['receiver'] || keys['receiveraccount'] || keys['toaccount'] || keys['targetaccount'];
        const amountStr = keys['amount'] || keys['txnamount'] || keys['value'];
        if (sender && recipient && amountStr) {
            const normSender = (0, normalizer_1.normalizeAccountNumber)(sender);
            const normReceiver = (0, normalizer_1.normalizeAccountNumber)(recipient);
            const amount = parseFloat(amountStr.replace(/[^0-9\.]/g, ''));
            const timestamp = (0, normalizer_1.normalizeIsoDate)(keys['timestamp'] || keys['txndate'] || keys['date']);
            const ref = keys['txnref'] || keys['transactionid'] || keys['reference'] || `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await prisma_1.prisma.financialTransaction.create({
                data: {
                    caseId,
                    transactionRef: String(ref),
                    senderAccountId: normSender.canonical,
                    receiverAccountId: normReceiver.canonical,
                    amount: isNaN(amount) ? 0 : amount,
                    currency: keys['currency'] || 'INR',
                    timestamp,
                    transactionType: (keys['transactiontype'] || 'TRANSFER').toUpperCase(),
                    evidenceRecordId,
                },
            });
            return;
        }
        // 3. Suspect / Person
        const name = keys['name'] || keys['personname'] || keys['suspectname'] || keys['fullname'];
        if (name) {
            const normName = (0, normalizer_1.normalizePersonName)(name);
            const phone = keys['phone'] || keys['phonenumber'] || keys['mobile'] || keys['contact'];
            const notes = keys['notes'] || keys['role'] || keys['allegation'];
            const gender = keys['gender'];
            const nationality = keys['nationality'];
            const person = await prisma_1.prisma.person.create({
                data: {
                    caseId,
                    canonicalName: normName.canonical,
                    rawName: normName.raw,
                    aliases: keys['aliases'] ? JSON.stringify([keys['aliases']]) : null,
                    gender: gender ? String(gender) : null,
                    nationality: nationality ? String(nationality) : null,
                    notes: notes ? String(notes) : null,
                    evidenceRecordId,
                },
            });
            if (phone) {
                const normPhone = (0, normalizer_1.normalizePhone)(phone);
                await prisma_1.prisma.phone.create({
                    data: {
                        caseId,
                        canonicalNumber: normPhone.canonical,
                        rawNumber: normPhone.raw,
                        ownerPersonId: person.id,
                        evidenceRecordId,
                    },
                });
            }
            return;
        }
        // 4. Vehicle
        const plate = keys['registrationnumber'] || keys['vehiclenumber'] || keys['platenumber'] || keys['regno'];
        if (plate) {
            const normPlate = (0, normalizer_1.normalizeVehiclePlate)(plate);
            await prisma_1.prisma.vehicle.create({
                data: {
                    caseId,
                    registrationNumber: normPlate.canonical,
                    make: keys['make'] ? String(keys['make']) : null,
                    model: keys['model'] ? String(keys['model']) : null,
                    color: keys['color'] ? String(keys['color']) : null,
                    evidenceRecordId,
                },
            });
            return;
        }
    }
}
exports.IngestionService = IngestionService;
