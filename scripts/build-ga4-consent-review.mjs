// Review the exact current public candidate on loopback; host guards prevent Google sends.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packagePublic } from './package-public.mjs';
import { checkGa4Coverage } from './sync-ga4.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, process.argv[2] || '.artifacts/ga4-consent-review/public');
assert.ok(output.startsWith(resolve(root, '.artifacts') + sep));
checkGa4Coverage(root);
const report = packagePublic({ root, destination: output, audience: 'review' });
writeFileSync(resolve(dirname(output), 'release.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, fileCount: report.fileCount, audience: report.audience }));
