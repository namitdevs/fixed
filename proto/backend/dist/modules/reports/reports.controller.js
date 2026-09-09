"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const reportGenerator_service_1 = require("./reportGenerator.service");
class ReportsController {
    static async generate(req, res, next) {
        try {
            const report = await reportGenerator_service_1.ReportGeneratorService.generateCaseReport(req.params.caseId, req.user?.id);
            res.status(201).json({
                success: true,
                message: 'Investigation report generated successfully',
                data: { report },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async exportPdf(req, res, next) {
        try {
            await reportGenerator_service_1.ReportGeneratorService.streamPdfReport(req.params.caseId, res);
        }
        catch (err) {
            next(err);
        }
    }
    static async exportJson(req, res, next) {
        try {
            const data = await reportGenerator_service_1.ReportGeneratorService.getJsonExport(req.params.caseId);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="Case_${req.params.caseId}_Export.json"`);
            res.status(200).json(data);
        }
        catch (err) {
            next(err);
        }
    }
    static async exportCsv(req, res, next) {
        try {
            const csvStr = await reportGenerator_service_1.ReportGeneratorService.getCsvExport(req.params.caseId);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="Case_${req.params.caseId}_Entities.csv"`);
            res.status(200).send(csvStr);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ReportsController = ReportsController;
