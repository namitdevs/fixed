import fs from 'fs';
import path from 'path';
import { prisma } from '../../utils/prisma';
import { IngestionService } from '../ingestion/ingestion.service';

export interface CreateDocumentDto {
  caseId: string;
  dataSourceId?: string;
  file: Express.Multer.File;
  uploadedByUserId?: string;
}

export class DocumentService {
  static async uploadDocument(dto: CreateDocumentDto) {
    const caseItem = await prisma.case.findUnique({ where: { id: dto.caseId } });
    if (!caseItem) {
      const err: any = new Error(`Case with ID ${dto.caseId} not found`);
      err.statusCode = 404;
      err.errorCode = 'CASE_NOT_FOUND';
      throw err;
    }

    const fileExt = path.extname(dto.file.originalname).replace('.', '').toUpperCase();
    const allowed = ['CSV', 'JSON', 'TXT', 'PDF'];
    if (!allowed.includes(fileExt)) {
      const err: any = new Error(`Unsupported file type .${fileExt}. Allowed: CSV, JSON, TXT, PDF`);
      err.statusCode = 400;
      err.errorCode = 'UNSUPPORTED_FILE_TYPE';
      throw err;
    }

    const document = await prisma.document.create({
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
    IngestionService.processDocument(document.id).catch((err) => {
      console.error(`Auto-ingestion background error for ${document.id}:`, err);
    });

    return document;
  }

  static async listByCase(caseId: string) {
    return await prisma.document.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      include: {
        dataSource: {
          select: { id: true, name: true, type: true },
        },
      },
    });
  }

  static async getById(id: string) {
    const doc = await prisma.document.findUnique({
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
      const err: any = new Error(`Document ${id} not found`);
      err.statusCode = 404;
      err.errorCode = 'DOCUMENT_NOT_FOUND';
      throw err;
    }

    return doc;
  }

  static async processDocument(id: string) {
    return await IngestionService.processDocument(id);
  }

  static async deleteDocument(id: string) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) {
      const err: any = new Error(`Document ${id} not found`);
      err.statusCode = 404;
      err.errorCode = 'DOCUMENT_NOT_FOUND';
      throw err;
    }

    if (fs.existsSync(doc.storagePath)) {
      try {
        fs.unlinkSync(doc.storagePath);
      } catch (e) {
        console.warn('Failed to delete file from disk:', e);
      }
    }

    return await prisma.document.delete({ where: { id } });
  }
}
