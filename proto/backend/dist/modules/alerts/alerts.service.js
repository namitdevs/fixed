"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertService = void 0;
const prisma_1 = require("../../utils/prisma");
class AlertService {
    static async listAlerts(caseId, filter) {
        const where = { caseId };
        if (filter?.severity)
            where.severity = filter.severity.toUpperCase();
        if (filter?.status)
            where.status = filter.status.toUpperCase();
        const alerts = await prisma_1.prisma.alert.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        return alerts.map((a) => ({
            ...a,
            involvedNodeIds: a.involvedNodeIds ? JSON.parse(a.involvedNodeIds) : [],
            evidenceRecordIds: a.evidenceRecordIds ? JSON.parse(a.evidenceRecordIds) : [],
        }));
    }
    static async updateAlertStatus(alertId, status) {
        const alert = await prisma_1.prisma.alert.findUnique({ where: { id: alertId } });
        if (!alert) {
            const err = new Error(`Alert ${alertId} not found`);
            err.statusCode = 404;
            err.errorCode = 'ALERT_NOT_FOUND';
            throw err;
        }
        return await prisma_1.prisma.alert.update({
            where: { id: alertId },
            data: { status },
        });
    }
}
exports.AlertService = AlertService;
