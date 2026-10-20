const { execSync } = require('child_process');

console.log('====================================================');
console.log('       FOODFLOW PRO - FULL TEST RUNNER             ');
console.log('====================================================\n');

const suites = [
  { name: 'Dev 1: Core Logic Suite', cmd: 'node test_suite.js' },
  { name: 'Dev 2: KDS & Waiter Suite', cmd: 'node test_dev2_suite.js' },
  { name: 'Dev 3: Delivery & Socket Suite', cmd: 'node test_dev3_suite.js' },
  { name: 'Dev 4: Manager & Admin Suite', cmd: 'node test_dev4_suite.js' }
];

let allPassed = true;

for (const suite of suites) {
  try {
    const output = execSync(suite.cmd, { stdio: 'pipe' }).toString();
    console.log(output);
  } catch (err) {
    console.error(`❌ Suite failed: ${suite.name}`);
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    allPassed = false;
    break;
  }
}

if (allPassed) {
  console.log('\n🎉 ALL DEVELOPER TEST SUITES PASSED (Dev 1, 2, 3 & 4)!\n');
  process.exit(0);
} else {
  process.exit(1);
}
