// Source-backed local preview. Never changes the approved agenda or public manifest.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, lstatSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { packagePublic } from './package-public.mjs';
import { integrateAgenda, escapeHtml as esc } from './editorial/branch-agenda.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
assert.equal(process.argv[2], '--asset-root', 'Supply the private artwork directory.');
const assetRoot = resolve(process.argv[3]);
const output = resolve(root, process.argv[4] || '.artifacts/gdl-event-review/public');
assert.ok(output.startsWith(resolve(root, '.artifacts') + '/'));
const intake = JSON.parse(readFileSync(resolve(root, 'scripts/editorial/front-b-events.json')));
const records = intake.records.filter(record => record.branchId === 'san-ignacio');
assert.equal(records.length, 2);
const brujas = records.find(record => record.id === 'san-ignacio-brujas-20261031');
const solteras = records.find(record => record.id === 'san-ignacio-solteras-weekly');
assert.equal(brujas.date, '2026-10-31');
assert.equal(solteras.recurrence.startsOn, null);
assert.equal(solteras.recurrence.endsOn, null);
assert.equal(intake.publicationEnabled, false);
const report = packagePublic({ root, destination: output, audience: 'review' });
const files = new Set(Object.keys(report.hashes));
mkdirSync(resolve(output, 'assets/review-agenda'), { recursive: true });
copyFileSync(resolve(root, 'scripts/editorial/branch-agenda.css'), resolve(output, 'assets/review-agenda/branch-agenda.css'));
files.add('assets/review-agenda/branch-agenda.css');
for (const record of records) {
  const source = resolve(assetRoot, record.artwork.privateFile);
  assert.equal(dirname(source), assetRoot);
  assert.ok(lstatSync(source).isFile() && !lstatSync(source).isSymbolicLink());
  assert.equal(createHash('sha256').update(readFileSync(source)).digest('hex'), record.artwork.sha256);
  assert.match(record.postUrl, /^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]+\/$/);
  const file = 'assets/review-agenda/' + record.artwork.privateFile;
  copyFileSync(source, resolve(output, file)); files.add(file);
}
const art = record => `<figure class="sy-agenda-art"><a href="${esc(record.postUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(record.title.es)} en Instagram · abre otra pestaña"><img src="/assets/review-agenda/${esc(record.artwork.privateFile)}" width="${record.artwork.width}" height="${record.artwork.height}" alt="${esc(record.artworkAlt)}" loading="lazy" decoding="async"></a></figure>`;
const html = `<section class="sy-agenda" id="programacion-san-ignacio" aria-labelledby="programacion-san-ignacio-title" tabindex="-1"><div class="sy-agenda-inner"><h2 id="programacion-san-ignacio-title">La agenda de tu cantina.</h2>
<section class="sy-agenda-dates" aria-labelledby="agenda-san-ignacio-dates"><h3 id="agenda-san-ignacio-dates">Próximas fechas</h3><div class="sy-agenda-grid"><article class="sy-agenda-event" data-record="${brujas.id}">${art(brujas)}<div class="sy-agenda-copy"><time datetime="2026-10-31">31 de octubre</time><h4>${esc(brujas.title.es)}</h4><p>Noche temática de brujas y villanas. Premios a los mejores disfraces.</p><p class="sy-agenda-time">Horario de la sucursal: 7:00 p. m.–3:00 a. m. del día siguiente.</p></div></article></div></section>
<section class="sy-agenda-weekly" aria-labelledby="agenda-san-ignacio-weekly"><h3 id="agenda-san-ignacio-weekly">Las noches de la semana</h3><div class="sy-agenda-weekly-grid"><article class="sy-agenda-night" data-record="${solteras.id}"><div class="sy-agenda-night-copy"><p class="sy-agenda-weekday">Jueves</p><h4>${esc(solteras.title.es)}</h4><p>Con tus amigas, drinks y dinámicas especiales.</p></div>${art(solteras)}</article></div></section>
</div></section>`;
const file = 'guadalajara.html';
let source = readFileSync(resolve(output, file), 'utf8');
assert.ok(!source.includes('id="programacion-san-ignacio"'));
source = integrateAgenda(source, 'san-ignacio', html, 'es');
source = source.replace('</head>', '<style>#programacion-san-ignacio .sy-agenda-night{grid-template-columns:minmax(0,1fr) 48%}#programacion-san-ignacio .sy-agenda-night-copy{padding:24px 20px}#programacion-san-ignacio .sy-agenda-night .sy-agenda-art img{aspect-ratio:3/4}@media(max-width:600px){#programacion-san-ignacio .sy-agenda-night-copy{padding:16px}#programacion-san-ignacio .sy-agenda-night h4{font-size:32px}#programacion-san-ignacio .sy-agenda-night p{font-size:12px}}</style></head>');
source = source.replace('</body>', '<aside class="sy-review-controls"><strong>Propuesta local · sin publicar</strong><p>Brujas: horario de sucursal autorizado por Luis.</p><p>Solteras: retenida hasta confirmar vigencia.</p></aside></body>');
writeFileSync(resolve(output, file), source);
const hashes = Object.fromEntries([...files].sort().map(file => [file, createHash('sha256').update(readFileSync(resolve(output, file))).digest('hex')]));
writeFileSync(resolve(dirname(output), 'release.json'), JSON.stringify({ ...report, audience: 'local-gdl-agenda-review', fileCount: files.size, hashes, publicationEnabled: false }, null, 2) + '\n');
writeFileSync(resolve(dirname(output), 'reconciliation.json'), JSON.stringify({ source: 'scripts/editorial/front-b-events.json', changedBaseFiles: [file], candidate: brujas.id, held: [{ id: solteras.id, reason: 'unconfirmed-recurrence-period-and-own-hours' }], proposedBrujasWindow: { publishFrom: 'on-explicit-approval', expiresAt: brujas.endsAt, expiryBasis: brujas.timeBasis }, noPublicManifestChanges: true, analyticsEnabledOnLocalhost: false }, null, 2) + '\n');
console.log(JSON.stringify({ output, candidate: brujas.id, held: solteras.id, publicationEnabled: false }));
