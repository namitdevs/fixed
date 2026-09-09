"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoSeederService = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma_1 = require("../../utils/prisma");
const auth_service_1 = require("../auth/auth.service");
const cases_service_1 = require("../cases/cases.service");
const documents_service_1 = require("../documents/documents.service");
const graph_service_1 = require("../graph/graph.service");
const relevanceScorer_service_1 = require("../analytics/relevanceScorer.service");
const reportGenerator_service_1 = require("../reports/reportGenerator.service");
const logger_1 = require("../../utils/logger");
class DemoSeederService {
    /**
     * 1-Click Turnkey Demo Seeder for SIH Judges:
     * Sets up "Operation Nightfall", ingests 5 data files, builds graph,
     * runs full analytics, generates alerts and dossier report in < 3 seconds.
     */
    static async loadTurnkeyDemoCase() {
        logger_1.logger.info('Initializing 1-Click Turnkey Demo Case (Operation Nightfall)...');
        const startTime = Date.now();
        // 1. Ensure Demo Investigator User exists
        let demoUser = await prisma_1.prisma.user.findUnique({ where: { email: 'demo.investigator@sih.gov.in' } });
        let token = '';
        if (!demoUser) {
            const reg = await auth_service_1.AuthService.register('Chief Inspector Vikram Rathore', 'demo.investigator@sih.gov.in', 'Demo#2026', 'INVESTIGATOR');
            demoUser = reg.user;
            token = reg.token;
        }
        else {
            const login = await auth_service_1.AuthService.login('demo.investigator@sih.gov.in', 'Demo#2026');
            token = login.token;
        }
        // 2. Clean existing demo case if present
        const existingCase = await prisma_1.prisma.case.findUnique({ where: { caseNumber: 'CASE-2026-001' } });
        if (existingCase) {
            await prisma_1.prisma.case.delete({ where: { id: existingCase.id } });
        }
        // 3. Create Case: Operation Nightfall
        const demoCase = await cases_service_1.CaseService.createCase({
            caseNumber: 'CASE-2026-001',
            title: 'Operation Nightfall: Hawala Layering & Inter-State Logistics',
            description: 'Targeted intelligence inquiry into coordinated financial laundering, fake shell accounts, ' +
                'and inter-state illicit transport routes operating between Chandigarh, Ambala, and New Delhi.',
            status: 'ACTIVE',
            priority: 'CRITICAL',
            createdByUserId: demoUser.id,
        });
        // 4. Ingest sample files
        const sampleDir = path_1.default.join(__dirname, '../../../sample_data');
        const sampleFiles = [
            { name: 'suspects.csv', type: 'text/csv' },
            { name: 'CDR.csv', type: 'text/csv' },
            { name: 'transactions.csv', type: 'text/csv' },
            { name: 'vehicles.csv', type: 'text/csv' },
            { name: 'FIR_102.txt', type: 'text/plain' },
        ];
        for (const f of sampleFiles) {
            const p = path_1.default.join(sampleDir, f.name);
            if (fs_1.default.existsSync(p)) {
                const stats = fs_1.default.statSync(p);
                const mockFile = {
                    fieldname: 'file',
                    originalname: f.name,
                    encoding: '7bit',
                    mimetype: f.type,
                    size: stats.size,
                    destination: sampleDir,
                    filename: f.name,
                    path: p,
                    buffer: fs_1.default.readFileSync(p),
                    stream: null,
                };
                const doc = await documents_service_1.DocumentService.uploadDocument({
                    caseId: demoCase.id,
                    file: mockFile,
                    uploadedByUserId: demoUser.id,
                });
                await documents_service_1.DocumentService.processDocument(doc.id);
            }
        }
        // Ingest PDF report if exists
        const pdfPath = path_1.default.join(sampleDir, 'police_report.pdf');
        if (fs_1.default.existsSync(pdfPath)) {
            const stats = fs_1.default.statSync(pdfPath);
            const mockPdf = {
                fieldname: 'file',
                originalname: 'police_report.pdf',
                encoding: '7bit',
                mimetype: 'application/pdf',
                size: stats.size,
                destination: sampleDir,
                filename: 'police_report.pdf',
                path: pdfPath,
                buffer: fs_1.default.readFileSync(pdfPath),
                stream: null,
            };
            const doc = await documents_service_1.DocumentService.uploadDocument({
                caseId: demoCase.id,
                file: mockPdf,
                uploadedByUserId: demoUser.id,
            });
            await documents_service_1.DocumentService.processDocument(doc.id);
        }
        // 5. Build Graph
        await graph_service_1.GraphService.buildCaseGraph(demoCase.id);
        // 6. Run Intelligence Analytics
        await relevanceScorer_service_1.RelevanceScorerService.runFullIntelligence(demoCase.id);
        // 7. Generate Master Investigation Dossier
        const report = await reportGenerator_service_1.ReportGeneratorService.generateCaseReport(demoCase.id, demoUser.id);
        const elapsedMs = Date.now() - startTime;
        logger_1.logger.info(`Turnkey Demo Case generated successfully in ${elapsedMs}ms`);
        return {
            success: true,
            case: demoCase,
            user: {
                id: demoUser.id,
                name: demoUser.name,
                email: demoUser.email,
                role: demoUser.role,
            },
            token,
            reportId: report.id,
            durationMs: elapsedMs,
        };
    }
}
exports.DemoSeederService = DemoSeederService;
