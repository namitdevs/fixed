"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertController = void 0;
const zod_1 = require("zod");
const alerts_service_1 = require("./alerts.service");
const updateAlertSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACTIVE', 'ACKNOWLEDGED', 'DISMISSED']),
});
class AlertController {
    static async list(req, res, next) {
        try {
            const { severity, status } = req.query;
            const alerts = await alerts_service_1.AlertService.listAlerts(req.params.caseId, {
                severity: severity,
                status: status,
            });
            res.status(200).json({
                success: true,
                data: { alerts, count: alerts.length },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async updateStatus(req, res, next) {
        try {
            const data = updateAlertSchema.parse(req.body);
            const updated = await alerts_service_1.AlertService.updateAlertStatus(req.params.alertId, data.status);
            res.status(200).json({
                success: true,
                message: `Alert status updated to ${data.status}`,
                data: { alert: updated },
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AlertController = AlertController;
