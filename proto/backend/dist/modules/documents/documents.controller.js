"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentController = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const documents_service_1 = require("./documents.service");
const config_1 = require("../../config");
// Ensure upload directory exists
const uploadDir = config_1.config.fileStoragePath;
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});
exports.uploadMiddleware = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});
class DocumentController {
    static async upload(req, res, next) {
        try {
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    errorCode: 'NO_FILE_UPLOADED',
                    message: 'No file was provided in the request',
                });
                return;
            }
            const document = await documents_service_1.DocumentService.uploadDocument({
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
        }
        catch (err) {
            next(err);
        }
    }
    static async listByCase(req, res, next) {
        try {
            const documents = await documents_service_1.DocumentService.listByCase(req.params.caseId);
            res.status(200).json({
                success: true,
                data: { documents, count: documents.length },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getById(req, res, next) {
        try {
            const document = await documents_service_1.DocumentService.getById(req.params.id);
            res.status(200).json({
                success: true,
                data: { document },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async reprocess(req, res, next) {
        try {
            const result = await documents_service_1.DocumentService.processDocument(req.params.id);
            res.status(200).json({
                success: result.success,
                message: result.success ? 'Document processed successfully' : 'Document processing failed',
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async remove(req, res, next) {
        try {
            await documents_service_1.DocumentService.deleteDocument(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Document deleted successfully',
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.DocumentController = DocumentController;
