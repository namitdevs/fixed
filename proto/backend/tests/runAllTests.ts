import { spawnSync } from 'child_process';

const suites = [
  'tests/phase1.test.ts',
  'tests/phase2.test.ts',
  'tests/phase3.test.ts',
  'tests/phase4.test.ts',
];

console.log('========================================================');
console.log('    RUNNING UNIFIED END-TO-END TEST SUITE (PHASES 1-4)  ');
console.log('========================================================');

let allPassed = true;

for (const suite of suites) {
  console.log(`\n>> Executing ${suite}...`);
  const result = spawnSync('npx.cmd', ['ts-node', suite], { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`[FAIL] ${suite} exited with code ${result.status}`);
    allPassed = false;
    break;
  }
}

if (!allPassed) {
  console.error('\n[FATAL] One or more test suites failed.');
  process.exit(1);
} else {
  console.log('\n========================================================');
  console.log('  ALL TEST SUITES (PHASES 1-4) PASSED CONCURRENTLY!     ');
  console.log('========================================================\n');
  process.exit(0);
}