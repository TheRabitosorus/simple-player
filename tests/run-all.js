// Runs every t_*.js test one after the other; exits non-zero if any fails.
const { spawnSync } = require('child_process');
const fs = require('fs');
const files = fs.readdirSync(__dirname).filter(f => /^t_.*\.js$/.test(f)).sort();
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [require('path').join(__dirname, f)], { encoding: 'utf8', timeout: 120000 });
  const ok = r.status === 0;
  console.log((ok ? 'PASS ' : 'FAIL ') + f);
  if (!ok) { failed++; console.log((r.stdout || '') + (r.stderr || '')); }
}
console.log(failed ? failed + ' test(s) failed' : 'all ' + files.length + ' tests passed');
process.exit(failed ? 1 : 0);
