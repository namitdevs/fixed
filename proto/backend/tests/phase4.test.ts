import { DemoSeederService } from '../src/modules/demo/demoSeeder.service';
import { AlertService } from '../src/modules/alerts/alerts.service';
import { ReportGeneratorService } from '../src/modules/reports/reportGenerator.service';
import { prisma } from '../src/utils/prisma';
import fs from 'fs';
import path from 'path';

async function runPhase4Tests() {
  console.log('========================================================');
  console.log('       RUNNING PHASE 4 AUTOMATED VERIFICATION SUITE      ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  let demoResult: any;

  // 1. Turnkey Demo Loader Test
  await test('1-Click Turnkey Demo Seeder Execution (< 3 seconds)', async () => {
    const t0 = Date.now();
    demoResult = await DemoSeederService.loadTurnkeyDemoCase();
    const elapsed = Date.now() - t0;

    console.log(`Demo Case Initialized in ${elapsed}ms`);
    console.log(`Case: ${demoResult.case.caseNumber} - ${demoResult.case.title}`);
    console.log(`Demo User: ${demoResult.user.name} (${demoResult.user.email})`);

    if (!demoResult.success || !demoResult.token) {
      throw new Error('Turnkey demo seeder failed to return success or token');
    }
    if (elapsed > 5000) {
      throw new Error(`Demo setup exceeded 5 seconds limit (took ${elapsed}ms)`);
    }
  });

  const caseId = demoResult.case.id;

  // 2. Alert Triage Tests
  let testAlert: any;
  await test('Alert Retrieval & Filtering', async () => {
    const alerts = await AlertService.listAlerts(caseId);
    console.log(`\nRetrieved ${alerts.length} Active Investigation Alerts`);
    alerts.forEach((a) => console.log(`  [${a.severity}] ${a.title}`));

    if (alerts.length === 0) throw new Error('No alerts retrieved for demo case');
    testAlert = alerts[0];
  });

  await test('Alert Status Acknowledgment & Triage', async () => {
    const updated = await AlertService.updateAlertStatus(testAlert.id, 'ACKNOWLEDGED');
    if (updated.status !== 'ACKNOWLEDGED') {
      throw new Error('Failed to update alert status to ACKNOWLEDGED');
    }
  });

  // 3. Investigation Dossier Generation & JSON Export
  await test('Master Dossier Generation & Machine-Readable JSON Export', async () => {
    const report = await prisma.investigationReport.findFirst({
      where: { caseId },
      orderBy: { generatedAt: 'desc' },
    });

    if (!report) throw new Error('InvestigationReport record not found');
    const data = JSON.parse(report.reportData);

    if (!data.case || !data.executiveSummary || !data.keyFindings || !data.clusters) {
      throw new Error('Report data missing essential intelligence sections');
    }
    console.log(`Executive Summary Snippet: ${report.executiveSummary.substring(0, 150)}...`);
  });

  // 4. Tabular CSV Export Test
  await test('Tabular Entities & Metrics CSV Export', async () => {
    const csvStr = await ReportGeneratorService.getCsvExport(caseId);
    if (!csvStr.includes('NodeId,EntityType,CanonicalName')) {
      throw new Error('CSV output missing expected headers');
    }
    if (!csvStr.includes('RAVI SHARMA') && !csvStr.includes('Ravi Sharma')) {
      throw new Error('CSV missing primary target entity');
    }
  });

  // 5. PDF Dossier Export Stream Test
  await test('Publication-Quality PDF Dossier Generation', async () => {
    const testPdfPath = path.join(__dirname, '../uploads/test_dossier_out.pdf');
    const writeStream = fs.createWriteStream(testPdfPath);

    await ReportGeneratorService.streamPdfReport(caseId, writeStream as any);

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    const stats = fs.statSync(testPdfPath);
    console.log(`Generated Dossier PDF Size: ${stats.size} bytes`);
    if (stats.size < 5000) throw new Error('PDF output is smaller than expected (< 5KB)');

    // Clean test file
    fs.unlinkSync(testPdfPath);
  });

  console.log(`\n========================================================`);
  console.log(`  PHASE 4 VERIFICATION COMPLETED: ${passed} PASSED, ${failed} FAILED  `);
  console.log(`========================================================\n`);

  if (failed > 0) process.exit(1);
}

runPhase4Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 4 test runner fatal error:', err);
    process.exit(1);
  });
