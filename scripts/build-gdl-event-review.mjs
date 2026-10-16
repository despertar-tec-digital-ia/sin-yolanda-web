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
const title = record => typeof record.title === 'string' ? record.title : record.title.es;
const art = record => `<figure class="sy-agenda-art"><a href="${esc(record.postUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(title(record))} en Instagram · abre otra pestaña"><img src="/assets/review-agenda/${esc(record.artwork.privateFile)}" width="${record.artwork.width}" height="${record.artwork.height}" alt="${esc(record.artworkAlt)}" loading="lazy" decoding="async"></a></figure>`;
const html = `<section class="sy-agenda" id="programacion-san-ignacio" aria-labelledby="programacion-san-ignacio-title" tabindex="-1"><div class="sy-agenda-inner"><h2 id="programacion-san-ignacio-title">La agenda de tu cantina.</h2>
<section class="sy-agenda-dates" aria-labelledby="agenda-san-ignacio-dates"><h3 id="agenda-san-ignacio-dates">Próximas fechas</h3><div class="sy-agenda-grid"><article class="sy-agenda-event" data-record="${brujas.id}">${art(brujas)}<div class="sy-agenda-copy"><time datetime="2026-10-31">31 de octubre</time><h4>${esc(brujas.title.es)}</h4><p>Noche temática de brujas y villanas. Premios a los mejores disfraces.</p><p class="sy-agenda-time">Horario de la sucursal: 7:00 p. m.–3:00 a. m. del día siguiente.</p></div></article></div></section>
<section class="sy-gdl-competition" id="agenda-san-ignacio-canta" aria-labelledby="agenda-san-ignacio-canta-title" data-record="${canta.id}"><div class="sy-gdl-competition-copy"><p class="sy-agenda-weekday">Miércoles · 5.ª edición</p><h3 id="agenda-san-ignacio-canta-title">Canta por<br>tu Cuenta</h3><p>Del 7 de octubre al 2 de diciembre. Sube al escenario o ven a apoyar a tu favorito.</p><dl class="sy-gdl-prizes"><div><dt>1.er lugar</dt><dd>$100,000 MXN <span>en efectivo</span></dd></div><div><dt>2.º lugar</dt><dd>$50,000 MXN <span>en efectivo</span></dd></div><div><dt>3.er lugar</dt><dd>$5,000 MXN <span>en consumo</span></dd></div></dl><p>Siete eliminatorias, una semifinal y la gran final el <time datetime="2026-12-02">2 de diciembre</time>.</p><p class="sy-gdl-terms">Para mayores de edad. Inscripción: envía un video cantando a capela el coro de una canción al (33) 1942 2709. Consulta requisitos y disponibilidad con la sucursal.</p><a class="sy-gdl-detail-link" href="${esc(canta.detailsUrl)}" target="_blank" rel="noopener noreferrer">Bases e inscripción<span class="sy-agenda-sr"> en Instagram · abre otra pestaña</span></a></div><div class="sy-gdl-video" data-agenda-video><a href="${esc(canta.postUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Canta por tu Cuenta en Instagram · abre otra pestaña"><video id="gdl-canta-video" muted loop playsinline preload="none" poster="/assets/review-agenda/${esc(canta.artwork.privateFile)}" width="720" height="1280" aria-label="Video de la convocatoria de Canta por tu Cuenta, sin sonido" data-src="/assets/review-agenda/${esc(canta.video.privateFile)}"></video></a><button type="button" data-video-toggle aria-controls="gdl-canta-video" hidden>Reproducir video</button></div></section>
<section class="sy-agenda-offers" aria-labelledby="agenda-san-ignacio-offers"><h3 id="agenda-san-ignacio-offers">Para celebrar en octubre</h3><article class="sy-agenda-offer" data-record="${birthday.id}">${art(birthday)}<div><p class="sy-agenda-weekday">Viernes y sábados · hasta el 31 de octubre</p><h4>${esc(birthday.title)}</h4><p>Si cumples años en octubre, celebra con botanas y shots al comprar una de las botellas participantes.</p><p>Los beneficios cambian según el paquete: Misil Maestro Dobel, Misil Herradura Plata, Misil Bacardí Blanco o botellas premium del cartel.</p><p>Reserva por mensaje directo en Instagram o al (33) 1018 6159.</p></div></article></section>
<details class="sy-gdl-held"><summary>En revisión: Jueves de Solteras</summary><p>La cuenta volvió a mencionarlo el 11 de octubre. Eso apoya que se repite, pero no confirma hasta cuándo ni su horario. No se incluye en la programación lista para publicar.</p><article class="sy-agenda-night" data-held-record="${solteras.id}"><div class="sy-agenda-night-copy"><h4>${esc(solteras.title.es)}</h4><p>Con tus amigas, drinks y dinámicas especiales.</p></div>${art(solteras)}</article></details>
</div></section>`;
const file = 'guadalajara.html';
let source = readFileSync(resolve(output, file), 'utf8');
assert.ok(!source.includes('id="programacion-san-ignacio"'));
source = integrateAgenda(source, 'san-ignacio', html, 'es');
source = source.replace('</head>', '<link rel="stylesheet" href="/assets/review-agenda/gdl-review.css"></head>');
source = source.replace('</body>', '<script src="/assets/review-agenda/gdl-review-video.js" defer></script><aside class="sy-review-controls"><details><summary>Propuesta local · sin publicar</summary><p>Brujas: horario de sucursal autorizado.</p><p>Canta: horario, cupo y cierre de inscripción sin confirmar.</p><p>Solteras: retenida hasta confirmar vigencia.</p></details></aside></body>');
writeFileSync(resolve(output, file), source);
const hashes = Object.fromEntries([...files].sort().map(file => [file, createHash('sha256').update(readFileSync(resolve(output, file))).digest('hex')]));
writeFileSync(resolve(dirname(output), 'release.json'), JSON.stringify({ ...report, audience: 'local-gdl-agenda-review', fileCount: files.size, hashes, publicationEnabled: false }, null, 2) + '\n');
writeFileSync(resolve(dirname(output), 'reconciliation.json'), JSON.stringify({ sources: ['scripts/editorial/front-b-events.json', 'scripts/editorial/gdl-event-review.json'], changedBaseFiles: [file], candidates: [brujas.id, canta.id, birthday.id], held: [{ id: solteras.id, reason: 'unconfirmed-recurrence-period-and-own-hours' }], proposedExpiry: current.proposedExpiry, noPublicManifestChanges: true, analyticsEnabledOnLocalhost: false }, null, 2) + '\n');
console.log(JSON.stringify({ output, candidates: [brujas.id, canta.id, birthday.id], held: solteras.id, publicationEnabled: false }));
