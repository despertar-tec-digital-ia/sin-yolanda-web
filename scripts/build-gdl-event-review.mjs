// Source-backed local preview. Never changes the approved agenda or public manifest.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, lstatSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { packagePublic } from './package-public.mjs';
import { integrateAgenda } from './editorial/branch-agenda.mjs';
import { renderGdlAgenda } from './editorial/gdl-agenda.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
assert.equal(process.argv[2], '--asset-root', 'Supply the private artwork directory.');
const assetRoot = resolve(process.argv[3]);
const output = resolve(root, process.argv[4] || '.artifacts/gdl-event-review/public');
assert.ok(output.startsWith(resolve(root, '.artifacts') + '/'));
const intake = JSON.parse(readFileSync(resolve(root, 'scripts/editorial/front-b-events.json')));
const current = JSON.parse(readFileSync(resolve(root, 'scripts/editorial/gdl-event-review.json')));
const previous = intake.records.filter(record => record.branchId === 'san-ignacio');
assert.equal(previous.length, 2);
assert.equal(current.branchId, 'san-ignacio');
assert.equal(current.publicationEnabled, false);
assert.equal(current.records.length, 2);
const records = [...previous, ...current.records];
const brujas = records.find(record => record.id === 'san-ignacio-brujas-20261031');
const solteras = records.find(record => record.id === 'san-ignacio-solteras-weekly');
const birthday = records.find(record => record.id === 'san-ignacio-cumpleanos-202610');
const canta = records.find(record => record.id === 'san-ignacio-canta-5-2026');
assert.equal(current.existingRecords.find(record => record.id === solteras.id).decision, 'candidate-local');
assert.equal(brujas.date, '2026-10-31');
assert.equal(solteras.recurrence.startsOn, null);
assert.equal(solteras.recurrence.endsOn, null);
assert.equal(intake.publicationEnabled, false);
const report = packagePublic({ root, destination: output, audience: 'review' });
const files = new Set(Object.keys(report.hashes));
mkdirSync(resolve(output, 'assets/review-agenda'), { recursive: true });
for (const name of ['branch-agenda.css', 'gdl-review.css', 'gdl-review-video.js']) {
  copyFileSync(resolve(root, 'scripts/editorial/' + name), resolve(output, 'assets/review-agenda/' + name));
  files.add('assets/review-agenda/' + name);
}
for (const record of records) {
  assert.equal(record.approval, null);
  assert.match(record.postUrl, /^https:\/\/www\.instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+\/$/);
  for (const media of [record.artwork, record.video].filter(Boolean)) {
  const source = resolve(assetRoot, media.privateFile);
  assert.equal(dirname(source), assetRoot);
  assert.ok(lstatSync(source).isFile() && !lstatSync(source).isSymbolicLink());
  assert.equal(createHash('sha256').update(readFileSync(source)).digest('hex'), media.sha256);
  const file = 'assets/review-agenda/' + media.privateFile;
  copyFileSync(source, resolve(output, file)); files.add(file);
  }
}
const html = renderGdlAgenda({ records, assetPrefix: '/assets/review-agenda' });
const file = 'guadalajara.html';
let source = readFileSync(resolve(output, file), 'utf8');
assert.ok(!source.includes('id="programacion-san-ignacio"'));
source = integrateAgenda(source, 'san-ignacio', html, 'es');
source = source.replace('</head>', '<link rel="stylesheet" href="/assets/review-agenda/gdl-review.css"></head>');
source = source.replace('</body>', '<script src="/assets/review-agenda/gdl-review-video.js" defer></script><aside class="sy-review-controls"><details><summary>Propuesta local · sin publicar</summary><p>Brujas: horario de sucursal autorizado.</p><p>Canta: horario, cupo y cierre de inscripción sin confirmar.</p><p>Solteras: incluida por Luis en la vista local; vigencia sin confirmar.</p></details></aside></body>');
writeFileSync(resolve(output, file), source);
const hashes = Object.fromEntries([...files].sort().map(file => [file, createHash('sha256').update(readFileSync(resolve(output, file))).digest('hex')]));
writeFileSync(resolve(dirname(output), 'release.json'), JSON.stringify({ ...report, audience: 'local-gdl-agenda-review', fileCount: files.size, hashes, publicationEnabled: false }, null, 2) + '\n');
writeFileSync(resolve(dirname(output), 'reconciliation.json'), JSON.stringify({ sources: ['scripts/editorial/front-b-events.json', 'scripts/editorial/gdl-event-review.json'], changedBaseFiles: [file], candidates: [brujas.id, canta.id, solteras.id, birthday.id], unresolvedPublicationData: [{ id: solteras.id, reason: 'unconfirmed-recurrence-period-and-own-hours' }], proposedExpiry: current.proposedExpiry, noPublicManifestChanges: true, analyticsEnabledOnLocalhost: false }, null, 2) + '\n');
console.log(JSON.stringify({ output, candidates: [brujas.id, canta.id, solteras.id, birthday.id], publicationEnabled: false }));
