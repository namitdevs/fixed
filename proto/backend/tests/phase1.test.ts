import path from 'path';
import fs from 'fs';
import { AuthService } from '../src/modules/auth/auth.service';
import { CaseService } from '../src/modules/cases/cases.service';
import { DataSourceService } from '../src/modules/datasources/datasources.service';
import { DocumentService } from '../src/modules/documents/documents.service';
import { prisma } from '../src/utils/prisma';

async function runPhase1Tests() {
  console.log('========================================================');
  console.log('       RUNNING PHASE 1 AUTOMATED VERIFICATION SUITE      ');
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

  // 1. Auth Tests
  let testUser: any;
  let authToken: string;

  await test('User Registration & Password Hashing', async () => {
    const email = `investigator_${Date.now()}@sih.gov.in`;
    const res = await AuthService.register('Inspector Sharma', email, 'SecurePass#2026', 'INVESTIGATOR');
    if (!res.user || !res.token) throw new Error('Registration failed to return user or token');
    if (res.user.email !== email) throw new Error('Email mismatch');
    testUser = res.user;
    authToken = res.token;
  });

  await test('User Authentication / Login', async () => {
    const res = await AuthService.login(testUser.email, 'SecurePass#2026');
    if (!res.token) throw new Error('Login failed to return token');
  });

  // 2. Case Management Tests
  let testCase: any;

  await test('Case Creation with Structured Metadata', async () => {
    const caseNum = `CASE-${Date.now().toString().slice(-4)}`;
    testCase = await CaseService.createCase({
      caseNumber: caseNum,
      title: 'Operation Nightfall - Phase 1 Verification',
      description: 'Coordinated hawala and cross-border logistics investigation',
      status: 'ACTIVE',
      priority: 'HIGH',
      createdByUserId: testUser.id,
    });

    if (!testCase.id || testCase.status !== 'ACTIVE') {
      throw new Error('Case creation failed or status mismatch');
    }
  });

  await test('Case Search & Filtering', async () => {
    const list = await CaseService.listCases({ search: 'Nightfall', status: 'ACTIVE' });
    if (list.length === 0) throw new Error('Case search failed to find created case');
  });

  // 3. Data Source Creation
  let cdrDataSource: any;
  await test('Data Source Registration', async () => {
    cdrDataSource = await DataSourceService.create({
      caseId: testCase.id,
      name: 'Central Telecom CDR Dump',
      type: 'CDR',
      description: 'Call Detail Records from tower nodes',
      uploadedByUserId: testUser.id,
    });
    if (!cdrDataSource.id) throw new Error('Data Source creation failed');
  });

  // 4. File Ingestion Pipeline Tests
  const sampleDir = path.join(__dirname, '../sample_data');

  await test('Ingest CDR CSV & Verify Provenance', async () => {
    const cdrPath = path.join(sampleDir, 'CDR.csv');
    const fileStats = fs.statSync(cdrPath);

    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'CDR.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      size: fileStats.size,
      destination: sampleDir,
      filename: 'CDR.csv',
      path: cdrPath,
      buffer: fs.readFileSync(cdrPath),
      stream: null as any,
    };

    const doc = await DocumentService.uploadDocument({
      caseId: testCase.id,
      dataSourceId: cdrDataSource.id,
      file: mockFile,
      uploadedByUserId: testUser.id,
    });

    // Wait for ingestion processing
    const result = await DocumentService.processDocument(doc.id);
    if (!result.success) throw new Error(`CDR Ingestion failed: ${result.error}`);
    if (result.recordsImported < 10) throw new Error(`Expected >= 10 CDR records, got ${result.recordsImported}`);

    const calls = await prisma.callRecord.findMany({ where: { caseId: testCase.id } });
    if (calls.length === 0) throw new Error('No CallRecords saved to database');
  });

  await test('Ingest Financial Transactions CSV', async () => {
    const txnPath = path.join(sampleDir, 'transactions.csv');
    const fileStats = fs.statSync(txnPath);

    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'transactions.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      size: fileStats.size,
      destination: sampleDir,
      filename: 'transactions.csv',
      path: txnPath,
      buffer: fs.readFileSync(txnPath),
      stream: null as any,
    };

    const doc = await DocumentService.uploadDocument({
      caseId: testCase.id,
      file: mockFile,
      uploadedByUserId: testUser.id,
    });

    const result = await DocumentService.processDocument(doc.id);
    if (!result.success) throw new Error(`Transaction Ingestion failed: ${result.error}`);

    const txns = await prisma.financialTransaction.findMany({ where: { caseId: testCase.id } });
    if (txns.length === 0) throw new Error('No FinancialTransactions saved to database');
  });

  await test('Ingest Suspects CSV & Normalization', async () => {
    const suspPath = path.join(sampleDir, 'suspects.csv');
    const fileStats = fs.statSync(suspPath);

    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'suspects.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      size: fileStats.size,
      destination: sampleDir,
      filename: 'suspects.csv',
      path: suspPath,
      buffer: fs.readFileSync(suspPath),
      stream: null as any,
    };

    const doc = await DocumentService.uploadDocument({
      caseId: testCase.id,
      file: mockFile,
      uploadedByUserId: testUser.id,
    });

    const result = await DocumentService.processDocument(doc.id);
    if (!result.success) throw new Error(`Suspect Ingestion failed: ${result.error}`);

    const persons = await prisma.person.findMany({ where: { caseId: testCase.id } });
    if (persons.length === 0) throw new Error('No Person records saved');
    // Check normalization: "Ravi Sharma" -> "RAVI SHARMA"
    const ravi = persons.find((p) => p.canonicalName === 'RAVI SHARMA');
    if (!ravi) throw new Error('Canonical normalization for RAVI SHARMA failed');
  });

  await test('Ingest Unstructured FIR TXT Document', async () => {
    const firPath = path.join(sampleDir, 'FIR_102.txt');
    const fileStats = fs.statSync(firPath);

    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'FIR_102.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      size: fileStats.size,
      destination: sampleDir,
      filename: 'FIR_102.txt',
      path: firPath,
      buffer: fs.readFileSync(firPath),
      stream: null as any,
    };

    const doc = await DocumentService.uploadDocument({
      caseId: testCase.id,
      file: mockFile,
      uploadedByUserId: testUser.id,
    });

    const result = await DocumentService.processDocument(doc.id);
    if (!result.success) throw new Error(`FIR Ingestion failed: ${result.error}`);

    const evidence = await prisma.evidenceRecord.findMany({ where: { documentId: doc.id } });
    if (evidence.length === 0) throw new Error('No EvidenceRecords created for FIR');
  });

  await test('Ingest Police Report PDF & Text Extraction', async () => {
    const pdfPath = path.join(sampleDir, 'police_report.pdf');
    const fileStats = fs.statSync(pdfPath);

    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'police_report.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: fileStats.size,
      destination: sampleDir,
      filename: 'police_report.pdf',
      path: pdfPath,
      buffer: fs.readFileSync(pdfPath),
      stream: null as any,
    };

    const doc = await DocumentService.uploadDocument({
      caseId: testCase.id,
      file: mockFile,
      uploadedByUserId: testUser.id,
    });

    const result = await DocumentService.processDocument(doc.id);
    if (!result.success) throw new Error(`PDF Ingestion failed: ${result.error}`);

    const evidence = await prisma.evidenceRecord.findMany({ where: { documentId: doc.id } });
    if (evidence.length === 0) throw new Error('No EvidenceRecords created for PDF');
  });

  // 5. Case Workspace Verification
  await test('Case Workspace Aggregation Integrity', async () => {
    const workspace = await CaseService.getCaseById(testCase.id);
    const counts = workspace._count;

    console.log('\n--- Case Workspace Imported Records Summary ---');
    console.log(`Documents: ${counts.documents}`);
    console.log(`Evidence Records: ${counts.evidenceRecords}`);
    console.log(`Persons: ${counts.persons}`);
    console.log(`Phones: ${counts.phones}`);
    console.log(`Call Records: ${counts.calls}`);
    console.log(`Financial Transactions: ${counts.transactions}`);
    console.log('-----------------------------------------------\n');

    if (counts.documents < 5) throw new Error('Expected at least 5 documents');
    if (counts.evidenceRecords < 20) throw new Error('Expected at least 20 evidence records');
    if (counts.calls < 10) throw new Error('Expected at least 10 call records');
    if (counts.transactions < 5) throw new Error('Expected at least 5 transactions');
  });

  console.log(`\n========================================================`);
  console.log(`  PHASE 1 VERIFICATION COMPLETED: ${passed} PASSED, ${failed} FAILED  `);
  console.log(`========================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase1Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
  });
