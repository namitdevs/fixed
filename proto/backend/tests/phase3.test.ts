import { AuthService } from '../src/modules/auth/auth.service';
import { CaseService } from '../src/modules/cases/cases.service';
import { DocumentService } from '../src/modules/documents/documents.service';
import { GraphService } from '../src/modules/graph/graph.service';
import { GraphAnalyticsService } from '../src/modules/analytics/graphAnalytics.service';
import { PatternDetectorService } from '../src/modules/patterns/patternDetector.service';
import { RelevanceScorerService } from '../src/modules/analytics/relevanceScorer.service';
import { TimelineService } from '../src/modules/temporal/timeline.service';
import { AiAssistantService } from '../src/modules/assistant/aiAssistant.service';
import { prisma } from '../src/utils/prisma';
import path from 'path';
import fs from 'fs';

async function runPhase3Tests() {
  console.log('========================================================');
  console.log('       RUNNING PHASE 3 AUTOMATED VERIFICATION SUITE      ');
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
  const user = await AuthService.register('Special Agent Rao', `rao_${Date.now()}@sih.gov.in`, 'RaoPass#2026');
  const testCase = await CaseService.createCase({
    caseNumber: `P3-CASE-${Date.now().toString().slice(-4)}`,
    title: 'Phase 3 Intelligence Verification Case',
    createdByUserId: user.user.id,
  });

  const sampleDir = path.join(__dirname, '../sample_data');

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

  await GraphService.buildCaseGraph(testCase.id);

  // 1. Centrality Analytics Test
  let centralityResults: any[] = [];
  await test('Degree & Betweenness Centrality Calculation', async () => {
    centralityResults = await GraphAnalyticsService.runAnalytics(testCase.id);
    if (centralityResults.length === 0) throw new Error('Centrality analytics returned empty results');

    // Find top betweenness entities
    centralityResults.sort((a, b) => b.betweenness - a.betweenness);
    const topBridge = centralityResults[0];

    console.log('\n--- Top Network Bridges & Central Nodes ---');
    centralityResults.slice(0, 5).forEach((c) => {
      console.log(`${c.canonicalValue} (${c.entityType}) - Degree: ${c.totalDegree}, Betweenness: ${c.betweenness}, Bridge: ${c.isPotentialBridge}`);
    });
    console.log('-------------------------------------------\n');

    if (!topBridge || topBridge.totalDegree === 0) {
      throw new Error('Failed to identify top central entity');
    }
  });

  // 2. Louvain Communities Test
  await test('Louvain Community Detection Clustering', async () => {
    const clusters = await GraphAnalyticsService.getCommunityClusters(testCase.id);
    console.log(`Discovered ${clusters.length} Community Clusters in Network`);
    if (clusters.length < 2) {
      throw new Error(`Expected at least 2 distinct clusters, found ${clusters.length}`);
    }
  });

  // 3. Pattern Detection Tests
  await test('Suspicious Pattern Detection: Chains, Spikes & Shared Infra', async () => {
    const patterns = await PatternDetectorService.detectAllPatterns(testCase.id);

    console.log('\n--- Detected Suspicious Network Patterns ---');
    patterns.forEach((p) => {
      console.log(`[${p.severity}] ${p.type}: ${p.title}`);
    });
    console.log('--------------------------------------------\n');

    const hasTxChain = patterns.some((p) => p.type === 'TRANSACTION_CHAIN');
    const hasSpike = patterns.some((p) => p.type === 'COMMUNICATION_SPIKE');

    if (!hasTxChain) throw new Error('Failed to detect multi-hop transaction chain');
    if (!hasSpike) throw new Error('Failed to detect communication spike');
  });

  // 4. Relevance Scorer & Alerts Test
  await test('0-100 Network Relevance Scoring & Automated Alerts', async () => {
    const intel = await RelevanceScorerService.runFullIntelligence(testCase.id);
    if (intel.nodesScored === 0) throw new Error('No nodes scored in intelligence run');

    const topScored = await prisma.nodeMetric.findMany({
      where: { caseId: testCase.id },
      orderBy: { networkRelevanceScore: 'desc' },
      take: 3,
      include: { graphNode: true },
    });

    console.log('\n--- Highest Network Relevance Entities ---');
    for (const s of topScored) {
      console.log(`${s.graphNode.canonicalValue}: Score ${s.networkRelevanceScore}/100`);
      const factors = JSON.parse(s.relevanceFactors || '[]');
      factors.forEach((f: any) => console.log(`  -> ${f.description} (+${f.contribution} pts)`));
    }
    console.log('-------------------------------------------\n');

    if (topScored[0].networkRelevanceScore < 50) {
      throw new Error('Expected top suspect to achieve significant relevance score (>50)');
    }

    const alerts = await prisma.alert.findMany({ where: { caseId: testCase.id } });
    if (alerts.length === 0) throw new Error('Expected Alert records to be generated');
  });

  // 5. Timeline Sequencing Test
  await test('Temporal Event Timeline Sequencing', async () => {
    const timeline = await TimelineService.getCaseTimeline(testCase.id);
    if (timeline.length < 10) throw new Error(`Expected >= 10 timeline events, found ${timeline.length}`);

    // Verify chronological sorting
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i].timestamp.getTime() < timeline[i - 1].timestamp.getTime()) {
        throw new Error('Timeline events not sorted in chronological order');
      }
    }
  });

  // 6. AI Assistant Test
  await test('Grounded AI Assistant Query & Explainability', async () => {
    const res = await AiAssistantService.queryAssistant(
      testCase.id,
      'Why is Ravi Sharma considered a high network relevance entity?'
    );

    console.log('\n--- AI Copilot Query Response ---');
    console.log(`Method: ${res.sourceMethod}`);
    console.log(`Cited Entities: ${res.citedEntities.map((e) => e.name).join(', ')}`);
    console.log(`Answer Snippet:\n${res.answer.substring(0, 350)}...`);
    console.log('---------------------------------\n');

    if (res.citedEntities.length === 0) throw new Error('Assistant failed to cite entities');
    if (!res.answer.includes('Ravi Sharma') && !res.answer.includes('RAVI SHARMA')) {
      throw new Error('Assistant response did not mention target entity');
    }
    if (res.answer.toLowerCase().includes('is guilty') || res.answer.toLowerCase().includes('is a criminal')) {
      throw new Error('AI assistant violated neutrality guideline by asserting guilt');
    }
  });

  console.log(`\n========================================================`);
  console.log(`  PHASE 3 VERIFICATION COMPLETED: ${passed} PASSED, ${failed} FAILED  `);
  console.log(`========================================================\n`);

  if (failed > 0) process.exit(1);
}

runPhase3Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 3 test runner fatal error:', err);
    process.exit(1);
  });
