"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSourceService = void 0;
const prisma_1 = require("../../utils/prisma");
class DataSourceService {
    static async create(data) {
        const caseItem = await prisma_1.prisma.case.findUnique({ where: { id: data.caseId } });
        if (!caseItem) {
            const err = new Error(`Case with ID ${data.caseId} not found`);
            err.statusCode = 404;
            err.errorCode = 'CASE_NOT_FOUND';
            throw err;
        }
        return await prisma_1.prisma.dataSource.create({
            data: {
                caseId: data.caseId,
                name: data.name,
                type: data.type.toUpperCase(),
                description: data.description || null,
                uploadedByUserId: data.uploadedByUserId || null,
            },
        });
    }
    static async listByCase(caseId) {
        return await prisma_1.prisma.dataSource.findMany({
            where: { caseId },
            orderBy: { createdAt: 'desc' },
            include: {
                documents: {
                    select: {
                        id: true,
                        filename: true,
                        fileType: true,
                        fileSize: true,
                        processingStatus: true,
                        recordCount: true,
                        createdAt: true,
                    },
                },
            },
        });
    }
    static async getById(id) {
        const ds = await prisma_1.prisma.dataSource.findUnique({
            where: { id },
            include: {
                documents: true,
            },
        });
        if (!ds) {
            const err = new Error(`DataSource with ID ${id} not found`);
            err.statusCode = 404;
            err.errorCode = 'DATA_SOURCE_NOT_FOUND';
            throw err;
        }
        return ds;
    }
}
exports.DataSourceService = DataSourceService;
