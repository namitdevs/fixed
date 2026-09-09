"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseController = void 0;
const zod_1 = require("zod");
const cases_service_1 = require("./cases.service");
const createCaseSchema = zod_1.z.object({
    caseNumber: zod_1.z.string().min(3, 'Case number is required e.g. CASE-2026-001'),
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters'),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['ACTIVE', 'UNDER_REVIEW', 'ON_HOLD', 'CLOSED']).optional(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});
const updateCaseSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).optional(),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['ACTIVE', 'UNDER_REVIEW', 'ON_HOLD', 'CLOSED']).optional(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});
class CaseController {
    static async create(req, res, next) {
        try {
            const data = createCaseSchema.parse(req.body);
            const caseItem = await cases_service_1.CaseService.createCase({
                ...data,
                createdByUserId: req.user.id,
            });
            res.status(201).json({
                success: true,
                message: 'Investigation case created successfully',
                data: { case: caseItem },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async list(req, res, next) {
        try {
            const { search, status, priority } = req.query;
            const cases = await cases_service_1.CaseService.listCases({
                search: search,
                status: status,
                priority: priority,
            });
            res.status(200).json({
                success: true,
                data: { cases, count: cases.length },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getById(req, res, next) {
        try {
            const caseItem = await cases_service_1.CaseService.getCaseById(req.params.id);
            res.status(200).json({
                success: true,
                data: { case: caseItem },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const data = updateCaseSchema.parse(req.body);
            const updated = await cases_service_1.CaseService.updateCase(req.params.id, data);
            res.status(200).json({
                success: true,
                message: 'Case updated successfully',
                data: { case: updated },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async remove(req, res, next) {
        try {
            await cases_service_1.CaseService.deleteCase(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Case archived/deleted successfully',
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.CaseController = CaseController;
