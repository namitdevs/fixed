"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseService = void 0;
const prisma_1 = require("../../utils/prisma");
class CaseService {
    static async createCase(data) {
        const existing = await prisma_1.prisma.case.findUnique({
            where: { caseNumber: data.caseNumber },
        });
        if (existing) {
            const err = new Error(`Case with number ${data.caseNumber} already exists`);
            err.statusCode = 400;
            err.errorCode = 'CASE_NUMBER_EXISTS';
            throw err;
        }
        return await prisma_1.prisma.case.create({
            data: {
                caseNumber: data.caseNumber,
                title: data.title,
                description: data.description || null,
                status: data.status?.toUpperCase() || 'ACTIVE',
                priority: data.priority?.toUpperCase() || 'MEDIUM',
                createdByUserId: data.createdByUserId,
            },
            include: {
                createdByUser: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    }
    static async listCases(filter) {
        const where = {};
        if (filter?.status) {
            where.status = filter.status.toUpperCase();
        }
        if (filter?.priority) {
            where.priority = filter.priority.toUpperCase();
        }
        if (filter?.search) {
            where.OR = [
                { caseNumber: { contains: filter.search } },
                { title: { contains: filter.search } },
                { description: { contains: filter.search } },
            ];
        }
        const cases = await prisma_1.prisma.case.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                createdByUser: {
                    select: { id: true, name: true, email: true },
                },
                _count: {
                    select: {
                        documents: true,
                        dataSources: true,
                        graphNodes: true,
                        graphEdges: true,
                        alerts: true,
                    },
                },
            },
        });
        return cases;
    }
    static async getCaseById(id) {
        const caseData = await prisma_1.prisma.case.findUnique({
            where: { id },
            include: {
                createdByUser: {
                    select: { id: true, name: true, email: true },
                },
                _count: {
                    select: {
                        documents: true,
                        dataSources: true,
                        evidenceRecords: true,
                        persons: true,
                        phones: true,
                        vehicles: true,
                        locations: true,
                        organizations: true,
                        accounts: true,
                        calls: true,
                        transactions: true,
                        incidents: true,
                        graphNodes: true,
                        graphEdges: true,
                        alerts: true,
                        reports: true,
                    },
                },
            },
        });
        if (!caseData) {
            const err = new Error(`Case with ID ${id} not found`);
            err.statusCode = 404;
            err.errorCode = 'CASE_NOT_FOUND';
            throw err;
        }
        return caseData;
    }
    static async updateCase(id, data) {
        const existing = await prisma_1.prisma.case.findUnique({ where: { id } });
        if (!existing) {
            const err = new Error(`Case with ID ${id} not found`);
            err.statusCode = 404;
            err.errorCode = 'CASE_NOT_FOUND';
            throw err;
        }
        return await prisma_1.prisma.case.update({
            where: { id },
            data: {
                title: data.title ?? existing.title,
                description: data.description !== undefined ? data.description : existing.description,
                status: data.status?.toUpperCase() ?? existing.status,
                priority: data.priority?.toUpperCase() ?? existing.priority,
            },
        });
    }
    static async deleteCase(id) {
        const existing = await prisma_1.prisma.case.findUnique({ where: { id } });
        if (!existing) {
            const err = new Error(`Case with ID ${id} not found`);
            err.statusCode = 404;
            err.errorCode = 'CASE_NOT_FOUND';
            throw err;
        }
        return await prisma_1.prisma.case.delete({ where: { id } });
    }
}
exports.CaseService = CaseService;
