// Zagon testov v Node.js:  node tests/run-node.mjs
import { run } from './all.js';

const results = await run();
let failed = 0;
for (const r of results) {
  if (r.ok) console.log(`  ✓ ${r.name}`);
  else {
    failed++;
    console.log(`  ✗ ${r.name}\n      ${r.error}`);
  }
}
console.log(`\n${results.length - failed}/${results.length} testov uspešnih`);
process.exitCode = failed ? 1 : 0;
