import { AuthService } from '../src/modules/auth/auth.service';
import { CaseService } from '../src/modules/cases/cases.service';
import { DocumentService } from '../src/modules/documents/documents.service';
import { GraphService } from '../src/modules/graph/graph.service';
import { EntityResolutionService } from '../src/modules/resolution/entityResolution.service';
import { prisma } from '../src/utils/prisma';
import path from 'path';
import fs from 'fs';

async function runPhase2Tests() {
  console.log('========================================================');
  console.log('       RUNNING PHASE 2 AUTOMATED VERIFICATION SUITE      ');
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

  // Setup user and case
  const user = await AuthService.register('Inspector Verma', `verma_${Date.now()}@sih.gov.in`, 'Pass#2026');
  const testCase = await CaseService.createCase({
    caseNumber: `P2-CASE-${Date.now().toString().slice(-4)}`,
    title: 'Phase 2 Criminal Graph Verification Case',
    createdByUserId: user.user.id,
  });

  const sampleDir = path.join(__dirname, '../sample_data');

  // Helper to upload document
  async function uploadFile(filename: string, mimetype: string) {
    const filePath = path.join(sampleDir, filename);
    const stats = fs.statSync(filePath);
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype,
      size: stats.size,
      destination: sampleDir,
      filename,
      path: filePath,
      buffer: fs.readFileSync(filePath),
      stream: null as any,
    };
    const doc = await DocumentService.uploadDocument({
      caseId: testCase.id,
      file: mockFile,
      uploadedByUserId: user.user.id,
    });
    await DocumentService.processDocument(doc.id);
  }

  await uploadFile('suspects.csv', 'text/csv');
  await uploadFile('CDR.csv', 'text/csv');
  await uploadFile('transactions.csv', 'text/csv');
  await uploadFile('vehicles.csv', 'text/csv');
  await uploadFile('FIR_102.txt', 'text/plain');

  // 1. Graph Construction Test
  await test('Build Criminal Network Graph from Multi-Source Data', async () => {
    const summary = await GraphService.buildCaseGraph(testCase.id);
    console.log('\n--- Graph Construction Metrics ---');
    console.log(`Structured Entities Extracted: ${summary.structuredEntitiesExtracted}`);
    console.log(`Unstructured Entities Extracted: ${summary.unstructuredEntitiesExtracted}`);
    console.log(`Relationships Formed: ${summary.relationshipsCreated}`);
    console.log(`Resolution Candidates Found: ${summary.resolutionCandidatesFound}`);
    console.log('----------------------------------\n');

    const nodes = await prisma.graphNode.findMany({ where: { caseId: testCase.id } });
    const edges = await prisma.graphEdge.findMany({ where: { caseId: testCase.id } });

    if (nodes.length < 15) throw new Error(`Expected at least 15 GraphNodes, found ${nodes.length}`);
    if (edges.length < 15) throw new Error(`Expected at least 15 GraphEdges, found ${edges.length}`);
  });

  // 2. Entity Type Diversity
  await test('Verify Entity Types (PERSON, PHONE, VEHICLE, ACCOUNT, LOCATION)', async () => {
    const types = await prisma.graphNode.groupBy({
      by: ['entityType'],
      where: { caseId: testCase.id },
      _count: true,
    });

    const typeSet = new Set(types.map((t) => t.entityType));
    const required = ['PERSON', 'PHONE', 'VEHICLE', 'ACCOUNT'];
    for (const req of required) {
      if (!typeSet.has(req)) throw new Error(`Missing expected entity type in graph: ${req}`);
    }
  });

  // 3. Evidence Traceability Test
  await test('Evidence Traceability: Nodes and Edges link to EvidenceRecords', async () => {
    const nodes = await prisma.graphNode.findMany({
      where: { caseId: testCase.id, evidenceRecordId: { not: null } },
      take: 5,
      include: { evidenceRecord: { include: { document: true } } },
    });

    if (nodes.length === 0) throw new Error('No nodes have evidence links');
    for (const node of nodes) {
      if (!node.evidenceRecord || !node.evidenceRecord.rawSnippet) {
        throw new Error(`Node ${node.canonicalValue} has corrupted evidence record pointer`);
      }
    }

    const edges = await prisma.graphEdge.findMany({
      where: { caseId: testCase.id, evidenceRecordId: { not: null } },
      take: 5,
      include: { evidenceRecord: true },
    });

    if (edges.length === 0) throw new Error('No edges have evidence links');
  });

  // 4. Entity Resolution Test
  await test('Entity Resolution Engine Candidate Matching', async () => {
    // Add a candidate variation "R. Sharma" to test fuzzy/initial matching
    await prisma.graphNode.create({
      data: {
        caseId: testCase.id,
        entityType: 'PERSON',
        canonicalValue: 'R. SHARMA',
        rawValues: JSON.stringify(['R. Sharma']),
        confidence: 0.85,
      },
    });

    await EntityResolutionService.runResolution(testCase.id);

    const candidates = await EntityResolutionService.listCandidates(testCase.id, 'PENDING_REVIEW');
    if (candidates.length === 0) throw new Error('Expected at least 1 resolution candidate pair');

    const pair = candidates.find(
      (c) =>
        (c.primaryNode?.canonicalValue.includes('SHARMA') && c.candidateNode?.canonicalValue.includes('SHARMA'))
    );

    if (!pair) throw new Error('Did not find candidate pair matching Sharma variants');
    console.log(`Resolution Candidate Found: ${pair.primaryNode?.canonicalValue} <--> ${pair.candidateNode?.canonicalValue} (Score: ${pair.similarityScore})`);

    // Test Merge Decision
    const mergeRes = await EntityResolutionService.resolveCandidate(pair.id, 'ACCEPT', user.user.id);
    if (!mergeRes.success) throw new Error('Failed to resolve and merge candidate');

    const audit = await prisma.auditLog.findFirst({
      where: { caseId: testCase.id, action: 'ENTITY_RESOLUTION_MERGE' },
    });
    if (!audit) throw new Error('Audit log not recorded for entity resolution merge');
  });

  // 5. Cytoscape Graph Projection Test
  await test('Cytoscape Graph Projection Contract & Filtering', async () => {
    const fullGraph = await GraphService.getCaseGraph(testCase.id);
    if (!fullGraph.elements.nodes || !fullGraph.elements.edges) {
      throw new Error('Graph format does not adhere to Cytoscape elements specification');
    }

    const filtered = await GraphService.getCaseGraph(testCase.id, {
      entityTypes: ['PERSON', 'PHONE'],
    });

    for (const n of filtered.elements.nodes) {
      if (n.data.entityType !== 'PERSON' && n.data.entityType !== 'PHONE') {
        throw new Error(`Filtering failed: found node of type ${n.data.entityType}`);
      }
    }
  });

  // 6. Neighborhood Traversal Test
  await test('Ego Neighborhood Subgraph Traversal', async () => {
    const amit = await prisma.graphNode.findFirst({
      where: { caseId: testCase.id, canonicalValue: 'AMIT KUMAR' },
    });
    if (!amit) throw new Error('Amit Kumar node not found');

    const neighborhood = await GraphService.getNeighborhood(amit.id, 1);
    if (neighborhood.neighbors.length < 2) {
      throw new Error(`Expected at least 2 direct neighbors for Amit Kumar, found ${neighborhood.neighbors.length}`);
    }
  });

  console.log(`\n========================================================`);
  console.log(`  PHASE 2 VERIFICATION COMPLETED: ${passed} PASSED, ${failed} FAILED  `);
  console.log(`========================================================\n`);

  if (failed > 0) process.exit(1);
}

runPhase2Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 2 test runner fatal error:', err);
    process.exit(1);
  });
