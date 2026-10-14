// An isolated review artifact. No production HTML, CSS, manifest or tracking changes.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
assert.equal(process.argv[2], '--asset-root', 'Supply the explicit private artwork directory.');
const assetRoot = resolve(process.argv[3]);
const output = resolve(root, process.argv[4] || '.artifacts/event-design-review/public');
assert.ok(output.startsWith(resolve(root, '.artifacts') + '/'));
assert.ok(!existsSync(output), 'Use a new review directory; never replace an earlier artifact.');
const data = JSON.parse(readFileSync(resolve(root, 'scripts/editorial/front-b-review.json')));
const registry = JSON.parse(readFileSync(resolve(root, 'scripts/editorial/front-b-sources.json')));
assert.equal(data.publicationEnabled, false);
const sources = new Map([...registry.posts, ...registry.tickets].map(source => [source.id, source.url]));
mkdirSync(resolve(output, 'art'), { recursive: true });
mkdirSync(resolve(output, 'fonts'));
const files = new Set(['index.html', '404.html', 'review.css', 'review.js', 'fonts/bebas-neue-400.woff2']);
copyFileSync(resolve(root, 'fonts/bebas-neue-400.woff2'), resolve(output, 'fonts/bebas-neue-400.woff2'));
for (const branch of Object.values(data.branches)) {
  for (const artwork of [branch.calendarArt, ...branch.units.map(unit => unit.artwork)].filter(Boolean)) {
    const source = resolve(assetRoot, artwork.file);
    assert.equal(dirname(source), assetRoot, 'Artwork must be a direct regular asset.');
    assert.equal(createHash('sha256').update(readFileSync(source)).digest('hex'), artwork.sha256);
    copyFileSync(source, resolve(output, 'art', artwork.file));
    files.add('art/' + artwork.file);
  }
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sourceLink = (id, label = 'Ver publicación') => `<a href="${esc(sources.get(id))}" target="_blank" rel="noopener noreferrer">${label}<span class="sr"> · abre otra pestaña</span></a>`;
const image = (artwork, source, title, cls = '') => artwork ? `<a class="art ${cls}" href="${esc(sources.get(source))}" target="_blank" rel="noopener noreferrer" aria-label="Ver publicación de ${esc(title)} · abre otra pestaña"><img src="art/${esc(artwork.file)}" width="${artwork.width}" height="${artwork.height}" alt="${esc(title)}" loading="lazy"></a>` : '';
const day = date => `<time datetime="${date}"><strong>${Number(date.slice(8))}</strong><span>${date.slice(5, 7) === '10' ? 'octubre' : 'noviembre'}</span></time>`;
const weekdays = ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'];
const timing = unit => unit.start ? `${unit.start}${unit.end ? '–' + unit.end : ' en adelante'}` : 'Horario propio por confirmar';
function event(unit, external = false) {
  const editorialPost = unit.sourceRefs.find(id => registry.posts.some(post => post.id === id));
  return `<article class="date-unit ${unit.artwork ? '' : 'date-unit-text'}" data-record="${esc(unit.id)}">
    ${image(unit.artwork, unit.imageSource, unit.title)}<div class="event-copy">
      ${day(unit.date)}<h3>${esc(unit.title)}</h3><p class="time">${timing(unit)}</p>
      <p>${esc(unit.detail)}</p>${external ? `<p class="venue">${esc(unit.venue.name)}<br>${esc(unit.venue.city)}${unit.venue.address ? ' · ' + esc(unit.venue.address) : ''}</p>` : ''}
      ${unit.admission === 'invitation-only' ? '<p class="admission">Solo por invitación</p>' : ''}
      <div class="event-actions">${unit.action ? sourceLink(unit.action, 'Ver boletos') : sourceLink(unit.sourceRefs[0], 'Ver detalles')}${unit.action && editorialPost ? sourceLink(editorialPost, 'Publicación') : ''}</div>
    </div></article>`;
}
function branchView(id, branch) {
  const dated = branch.units.filter(unit => unit.temporalKind === 'dated' && !unit.venue && !unit.sourceConflict).sort((a, b) => a.date.localeCompare(b.date));
  const weekly = branch.units.filter(unit => ['weekly', 'weekday-slot'].includes(unit.temporalKind) && ['recurring-night', 'theme-night'].includes(unit.semanticKind) && !unit.sourceConflict);
  const offers = branch.units.filter(unit => unit.semanticKind === 'offer' || unit.semanticKind === 'brunch')
    .sort((a, b) => (a.weekday || 7) - (b.weekday || 7));
  const external = branch.units.filter(unit => unit.venue?.kind === 'external');
  return `<section class="branch-view" id="branch-${id}" aria-labelledby="branch-name-${id}" ${id === 'houston' ? '' : 'hidden'} style="--brand:${branch.theme === 'brand' ? '#bd4a15' : '#8b1820'}">
    <div class="venue-heading"><p>La agenda de tu cantina</p><h1 id="branch-name-${id}">Lo que viene.<span>${esc(branch.name)}</span></h1></div>
    ${dated.length ? `<section class="upcoming" aria-labelledby="dates-${id}"><h2 id="dates-${id}">Próximas fechas</h2><div class="dates ${dated.length === 3 ? 'dates-three' : ''}">${dated.map(unit => event(unit)).join('')}</div></section>` : ''}
    ${weekly.length ? `<section class="rhythm" aria-labelledby="weekly-${id}"><div class="section-intro"><h2 id="weekly-${id}">${id === 'el-paso' ? 'Entre semana' : 'Las noches de la semana'}</h2><p>Encuentra el día para venir a cantar.</p></div><div class="weekly-units">${weekly.map(unit => `<article class="weekly-unit" data-record="${esc(unit.id)}"><div><p class="weekday">${weekdays[unit.weekday]}</p><h3>${esc(unit.title)}</h3><p>${esc(unit.detail)}</p>${sourceLink(unit.sourceRefs[0])}</div>${image(unit.artwork, unit.imageSource, unit.title, 'weekly-art')}</article>`).join('')}</div></section>` : ''}
    ${offers.length ? `<section class="offers" aria-labelledby="offers-${id}"><h2 id="offers-${id}">${offers[0].semanticKind === 'brunch' ? 'El plan de día' : 'Para comer y brindar'}</h2>${offers.map(unit => `<article class="offer ${unit.artwork ? '' : 'offer-text'}" data-record="${esc(unit.id)}">${image(unit.artwork, unit.imageSource, unit.title)}<div><p class="weekday">${weekdays[unit.weekday]}${unit.start ? ' · ' + timing(unit) : ''}</p><h3>${esc(unit.title)}</h3><p>${esc(unit.detail)}</p>${unit.conditions ? `<p class="conditions">${esc(unit.conditions)}</p>` : ''}${sourceLink(unit.sourceRefs[0], 'Consultar publicación')}</div></article>`).join('')}</section>` : ''}
    ${external.length ? `<section class="outside" aria-labelledby="outside-${id}"><h2 id="outside-${id}">Fuera de la cantina</h2><p class="outside-intro">Estas actividades tienen su propio lugar y forma de acceso.</p><div class="dates">${external.map(unit => event(unit, true)).join('')}</div></section>` : ''}
    <details class="source-board"><summary>Ver cartelera publicada de ${esc(branch.name)}</summary><p>El cartel reúne varios planes; cada fecha y promoción conserva sus condiciones.</p>${image(branch.calendarArt, branch.calendarSource, 'Cartelera de ' + branch.name)}</details>
    <details class="editorial-notes"><summary>Pendientes para publicar esta propuesta</summary><ul>${branch.notes.map(note => `<li>${esc(note)}</li>`).join('')}</ul><p>Fuentes observadas, con oferta/derechos/vigencia en revisión. No hay medición, compra ni envío desde este prototipo.</p></details>
  </section>`;
}
writeFileSync(resolve(output, 'index.html'), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Sin Yolanda · propuesta de agenda</title><link rel="stylesheet" href="review.css"><script defer src="review.js"></script></head><body><div class="review-bar">Revisión local · fuentes del 13 de octubre · sin publicación</div><header><a href="#main" class="brand">SIN YOLANDA<small>La cantina</small></a><span>Programación por sucursal</span></header><main id="main"><nav class="branch-picker" aria-label="Elegir sucursal para revisar">${Object.entries(data.branches).map(([id, branch]) => `<button data-branch="${id}" aria-pressed="${id === 'houston'}">${esc(branch.name)}</button>`).join('')}</nav>${Object.entries(data.branches).map(([id, branch]) => branchView(id, branch)).join('')}</main><footer><p>Sin Yolanda</p><span>Una agenda propia para cada cantina.</span></footer></body></html>`);
writeFileSync(resolve(output, '404.html'), '<!doctype html><html lang="es"><meta charset="utf-8"><title>Revisión local</title><p>Esta ruta no pertenece al prototipo.</p><a href="/">Volver</a></html>');
copyFileSync(resolve(root, 'scripts/editorial/review.css'), resolve(output, 'review.css'));
copyFileSync(resolve(root, 'scripts/editorial/review.js'), resolve(output, 'review.js'));
const hashes = Object.fromEntries([...files].sort().map(file => [file, createHash('sha256').update(readFileSync(resolve(output, file))).digest('hex')]));
writeFileSync(resolve(dirname(output), 'release.json'), JSON.stringify({ version: 1, commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), audience: 'local-review', fileCount: files.size, hashes }, null, 2));
console.log(JSON.stringify({ output, fileCount: files.size, publicationEnabled: false, analyticsEnabled: false }));
