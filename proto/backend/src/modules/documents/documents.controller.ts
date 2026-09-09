import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { DocumentService } from './documents.service';
import { config } from '../../config';

// Ensure upload directory exists
const uploadDir = config.fileStoragePath;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export class DocumentController {
  static async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          errorCode: 'NO_FILE_UPLOADED',
          message: 'No file was provided in the request',
        });
        return;
      }

      const document = await DocumentService.uploadDocument({
        caseId: req.params.caseId,
        dataSourceId: req.body.dataSourceId,
        file: req.file,
        uploadedByUserId: req.user?.id,
      });

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully and queued for ingestion',
        data: { document },
      });
    } catch (err) {
      next(err);
    }
  }

  static async listByCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documents = await DocumentService.listByCase(req.params.caseId);
      res.status(200).json({
        success: true,
        data: { documents, count: documents.length },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const document = await DocumentService.getById(req.params.id);
      res.status(200).json({
        success: true,
        data: { document },
      });
    } catch (err) {
      next(err);
    }
  }

  static async reprocess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await DocumentService.processDocument(req.params.id);
      res.status(200).json({
        success: result.success,
        message: result.success ? 'Document processed successfully' : 'Document processing failed',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await DocumentService.deleteDocument(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}
