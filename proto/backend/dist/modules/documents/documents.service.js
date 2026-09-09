"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../../utils/prisma");
const ingestion_service_1 = require("../ingestion/ingestion.service");
class DocumentService {
    static async uploadDocument(dto) {
        const caseItem = await prisma_1.prisma.case.findUnique({ where: { id: dto.caseId } });
        if (!caseItem) {
            const err = new Error(`Case with ID ${dto.caseId} not found`);
            err.statusCode = 404;
            err.errorCode = 'CASE_NOT_FOUND';
            throw err;
        }
        const fileExt = path_1.default.extname(dto.file.originalname).replace('.', '').toUpperCase();
        const allowed = ['CSV', 'JSON', 'TXT', 'PDF'];
        if (!allowed.includes(fileExt)) {
            const err = new Error(`Unsupported file type .${fileExt}. Allowed: CSV, JSON, TXT, PDF`);
            err.statusCode = 400;
            err.errorCode = 'UNSUPPORTED_FILE_TYPE';
            throw err;
        }
        const document = await prisma_1.prisma.document.create({
            data: {
                caseId: dto.caseId,
                dataSourceId: dto.dataSourceId || null,
                filename: dto.file.filename,
                originalFilename: dto.file.originalname,
                fileType: fileExt,
                fileSize: dto.file.size,
                storagePath: dto.file.path,
                processingStatus: 'PENDING',
                uploadedByUserId: dto.uploadedByUserId || null,
            },
        });
        // Automatically trigger ingestion in background/async
        ingestion_service_1.IngestionService.processDocument(document.id).catch((err) => {
            console.error(`Auto-ingestion background error for ${document.id}:`, err);
        });
        return document;
    }
    static async listByCase(caseId) {
        return await prisma_1.prisma.document.findMany({
            where: { caseId },
            orderBy: { createdAt: 'desc' },
            include: {
                dataSource: {
                    select: { id: true, name: true, type: true },
                },
            },
        });
    }
    static async getById(id) {
        const doc = await prisma_1.prisma.document.findUnique({
            where: { id },
            include: {
                dataSource: true,
                case: {
                    select: { id: true, caseNumber: true, title: true },
                },
                _count: {
                    select: { evidenceRecords: true },
                },
            },
        });
        if (!doc) {
            const err = new Error(`Document ${id} not found`);
            err.statusCode = 404;
            err.errorCode = 'DOCUMENT_NOT_FOUND';
            throw err;
        }
        return doc;
    }
    static async processDocument(id) {
        return await ingestion_service_1.IngestionService.processDocument(id);
    }
    static async deleteDocument(id) {
        const doc = await prisma_1.prisma.document.findUnique({ where: { id } });
        if (!doc) {
            const err = new Error(`Document ${id} not found`);
            err.statusCode = 404;
            err.errorCode = 'DOCUMENT_NOT_FOUND';
            throw err;
        }
        if (fs_1.default.existsSync(doc.storagePath)) {
            try {
                fs_1.default.unlinkSync(doc.storagePath);
            }
            catch (e) {
                console.warn('Failed to delete file from disk:', e);
            }
        }
        return await prisma_1.prisma.document.delete({ where: { id } });
    }
}
exports.DocumentService = DocumentService;
