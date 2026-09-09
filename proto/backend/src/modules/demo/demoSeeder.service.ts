import path from 'path';
import fs from 'fs';
import { prisma } from '../../utils/prisma';
import { AuthService } from '../auth/auth.service';
import { CaseService } from '../cases/cases.service';
import { DocumentService } from '../documents/documents.service';
import { GraphService } from '../graph/graph.service';
import { RelevanceScorerService } from '../analytics/relevanceScorer.service';
import { ReportGeneratorService } from '../reports/reportGenerator.service';
import { logger } from '../../utils/logger';

export class DemoSeederService {
  /**
   * 1-Click Turnkey Demo Seeder for SIH Judges:
   * Sets up "Operation Nightfall", ingests 5 data files, builds graph,
   * runs full analytics, generates alerts and dossier report in < 3 seconds.
   */
  static async loadTurnkeyDemoCase() {
    logger.info('Initializing 1-Click Turnkey Demo Case (Operation Nightfall)...');
    const startTime = Date.now();

    // 1. Ensure Demo Investigator User exists
    let demoUser = await prisma.user.findUnique({ where: { email: 'demo.investigator@sih.gov.in' } });
    let token = '';

    if (!demoUser) {
      const reg = await AuthService.register(
        'Chief Inspector Vikram Rathore',
        'demo.investigator@sih.gov.in',
        'Demo#2026',
        'INVESTIGATOR'
      );
      demoUser = reg.user as any;
      token = reg.token;
    } else {
      const login = await AuthService.login('demo.investigator@sih.gov.in', 'Demo#2026');
      token = login.token;
    }

    // 2. Clean existing demo case if present
    const existingCase = await prisma.case.findUnique({ where: { caseNumber: 'CASE-2026-001' } });
    if (existingCase) {
      await prisma.case.delete({ where: { id: existingCase.id } });
    }

    // 3. Create Case: Operation Nightfall
    const demoCase = await CaseService.createCase({
      caseNumber: 'CASE-2026-001',
      title: 'Operation Nightfall: Hawala Layering & Inter-State Logistics',
      description:
        'Targeted intelligence inquiry into coordinated financial laundering, fake shell accounts, ' +
        'and inter-state illicit transport routes operating between Chandigarh, Ambala, and New Delhi.',
      status: 'ACTIVE',
      priority: 'CRITICAL',
      createdByUserId: demoUser!.id,
    });

    // 4. Ingest sample files
    const sampleDir = path.join(__dirname, '../../../sample_data');
    const sampleFiles = [
      { name: 'suspects.csv', type: 'text/csv' },
      { name: 'CDR.csv', type: 'text/csv' },
      { name: 'transactions.csv', type: 'text/csv' },
      { name: 'vehicles.csv', type: 'text/csv' },
      { name: 'FIR_102.txt', type: 'text/plain' },
    ];

    for (const f of sampleFiles) {
      const p = path.join(sampleDir, f.name);
      if (fs.existsSync(p)) {
        const stats = fs.statSync(p);
        const mockFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: f.name,
          encoding: '7bit',
          mimetype: f.type,
          size: stats.size,
          destination: sampleDir,
          filename: f.name,
          path: p,
          buffer: fs.readFileSync(p),
          stream: null as any,
        };

        const doc = await DocumentService.uploadDocument({
          caseId: demoCase.id,
          file: mockFile,
          uploadedByUserId: demoUser!.id,
        });
        await DocumentService.processDocument(doc.id);
      }
    }

    // Ingest PDF report if exists
    const pdfPath = path.join(sampleDir, 'police_report.pdf');
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      const mockPdf: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'police_report.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: stats.size,
        destination: sampleDir,
        filename: 'police_report.pdf',
        path: pdfPath,
        buffer: fs.readFileSync(pdfPath),
        stream: null as any,
      };
      const doc = await DocumentService.uploadDocument({
        caseId: demoCase.id,
        file: mockPdf,
        uploadedByUserId: demoUser!.id,
      });
      await DocumentService.processDocument(doc.id);
    }

    // 5. Build Graph
    await GraphService.buildCaseGraph(demoCase.id);

    // 6. Run Intelligence Analytics
    await RelevanceScorerService.runFullIntelligence(demoCase.id);

    // 7. Generate Master Investigation Dossier
    const report = await ReportGeneratorService.generateCaseReport(demoCase.id, demoUser!.id);

    const elapsedMs = Date.now() - startTime;
    logger.info(`Turnkey Demo Case generated successfully in ${elapsedMs}ms`);

    return {
      success: true,
      case: demoCase,
      user: {
        id: demoUser!.id,
        name: demoUser!.name,
        email: demoUser!.email,
        role: demoUser!.role,
      },
      token,
      reportId: report.id,
      durationMs: elapsedMs,
    };
  }
}
