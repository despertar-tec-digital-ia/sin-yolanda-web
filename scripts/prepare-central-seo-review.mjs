// Local review only. Production sources and the approved publication pipeline stay untouched.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packagePublic, publicSourceDigest, projectRoot } from './package-public.mjs';
import { renderShell, schemas } from './seo.mjs';

export const copy = {
  homeTitle: 'Sin Yolanda | Cantinas en México y Estados Unidos',
  homeDescription: 'Encuentra tu cantina Sin Yolanda en México y Estados Unidos. Consulta las sucursales, sus menús, agenda y opciones para reservar.',
  homeIntro: 'Sin Yolanda es una cantina mexicana para comer, brindar y cantar. Encuentra tu sucursal en México o Estados Unidos y consulta su menú, agenda y reservaciones.',
  homeIntroEn: 'Sin Yolanda is a Mexican cantina for food, drinks and singing. Find your location in Mexico or the United States and explore its menu, events and reservations.',
  gdlTitle: 'Sin Yolanda Guadalajara | Cantina y bar en Zapopan',
  gdlDescription: 'Sin Yolanda Guadalajara: cantina y bar en la zona de Chapalita, Zapopan. Comida, cócteles y micrófono abierto en Avenida San Ignacio 78.',
  gdlIntro: 'Sin Yolanda Guadalajara es una cantina y bar en la zona de Chapalita, Zapopan. Comida, cócteles y noches de micrófono abierto en Avenida San Ignacio 78. Consulta la agenda y el menú para armar tu visita.',
};
const origin = 'https://sin-yolanda.com';
const hash = value => createHash('sha256').update(value).digest('hex');
const escape = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length - 1, 1, 'Candidate source changed: ' + before.slice(0, 80));
  return source.replace(before, after);
}
function metadata(html, title, description) {
  return html.replace(/<title>[^<]+<\/title>/, `<title>${escape(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]+/, '$1' + escape(description))
    .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]+/g, '$1' + escape(title))
    .replace(/(<meta (?:property="og:description"|name="twitter:description") content=")[^"]+/g, '$1' + escape(description));
}

export function prepareCentralSeoReview(destination) {
  const out = resolve(projectRoot, destination);
  assert.ok(out.startsWith(resolve(projectRoot, '.artifacts') + '/'), 'Use a fresh ignored artifact directory');
  const reportPath = resolve(out, '../release.json');
  const report = packagePublic({ destination: out, metadata: reportPath, audience: 'review' });
  const before = new Map(Object.keys(report.hashes).map(file => [file, readFileSync(resolve(out, file))]));
  const read = file => readFileSync(resolve(out, file), 'utf8');
  const write = (file, value) => { assert.ok(before.has(file), 'Cannot add public files'); writeFileSync(resolve(out, file), value); };

  // Keep the internal page identity. Only the principal group navigation uses WordPress.
  let site = read('assets/js/site.js');
  for (const [name, next] of [['publicFooter', 'groupFooter'], ['groupFooter', 'venueShowcase'], ['venueShowcase', 'openingAnnouncement']]) {
    const start = site.indexOf(`  function ${name}(`), end = site.indexOf(`  function ${next}(`, start);
    assert.ok(start >= 0 && end > start);
    const body = site.slice(start, end);
    assert.ok(body.includes('${branch.page}'));
    site = site.slice(0, start) + body.replaceAll('${branch.page}', '${branch.id === "san-ignacio" ? branch.website : branch.page}') + site.slice(end);
  }
  site = replaceOnce(site,
    '<h2 id="venue-heading">Cuál te queda</h2><p class="venue-geography">México y Estados Unidos</p></div></div>',
    `<h2 id="venue-heading">Cuál te queda</h2><p class="venue-geography">México y Estados Unidos</p></div><p class="brand-description" data-i18n-es="${escape(copy.homeIntro)}" data-i18n-en="${escape(copy.homeIntroEn)}">${copy.homeIntro}</p></div>`);
  site = replaceOnce(site, '<p>Elige tu sucursal para consultar cómo llegar, la carta y las reservaciones.</p>',
    `<p class="brand-description" data-i18n-es="${escape(copy.homeIntro)}" data-i18n-en="${escape(copy.homeIntroEn)}">${copy.homeIntro}</p>`);
  write('assets/js/site.js', site);
  const css = '\n/* Brand description in the existing location selector; hero remains unchanged. */\n.venue-showcase .section-heading > .brand-description { max-width: 43ch; margin: 0; font-size: 17px; line-height: 1.65; color: var(--muted); }\n@media (max-width:700px) { .venue-showcase .section-heading > .brand-description { margin-top: 16px; font-size: 16px; } }\n';
  write('assets/css/venue-selector.css', read('assets/css/venue-selector.css') + css);

  const shellPages = ['index.html', 'locations.html', 'la-cantina.html', 'eventos.html', 'tienda.html'];
  for (const file of shellPages) {
    let html = read(file);
    const rendered = renderShell(html, new Date(), out);
    assert.ok(rendered);
    html = html.replace(/(<div id="site-shell" data-seo-prerendered="true">)[\s\S]*?(<\/div><!-- seo-shell-end -->)/, (_, start, end) => start + rendered + end);
    write(file, html);
  }
  write('index.html', metadata(read('index.html'), copy.homeTitle, copy.homeDescription));
  let gdl = metadata(read('guadalajara.html'), copy.gdlTitle, copy.gdlDescription);
  gdl = replaceOnce(gdl,
    'Una cantina para cantar, brindar y compartir la mesa. Explora el menú de Guadalajara.', copy.gdlIntro);
  write('guadalajara.html', gdl);

  // Connect existing, confirmed operating locations, without inventing corporate social accounts.
  const restaurantFiles = Object.keys(report.hashes).filter(file => file.endsWith('.html') && schemas(read(file)).some(item => item['@type'] === 'Restaurant'));
  const branches = restaurantFiles.filter(file => !file.startsWith('en/')).map(file => schemas(read(file)).find(node => node['@type'] === 'Restaurant'));
  const organizationId = origin + '/#organization';
  for (const file of Object.keys(report.hashes).filter(file => file.endsWith('.html'))) {
    let html = read(file);
    html = html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (_, start, source, end) => {
      const schema = JSON.parse(source);
      const nodes = schema['@graph'] ?? [schema];
      for (const node of nodes) {
        if (node['@type'] === 'Restaurant') node.parentOrganization = { '@id': organizationId };
        if (node['@type'] === 'Organization' && node['@id'] === organizationId) {
          node.description = 'Marca de cantinas mexicanas en México y Estados Unidos.';
          node.subOrganization = branches.map(branch => ({ '@id': branch['@id'], '@type': 'Restaurant', name: branch.name, url: branch.url }));
        }
        if (['WebPage', 'CollectionPage'].includes(node['@type'])) {
          if (file === 'index.html') { node.name = copy.homeTitle; node.description = copy.homeDescription; node.mainEntity = { '@id': organizationId }; }
          if (file === 'guadalajara.html') { node.name = copy.gdlTitle; node.description = copy.gdlDescription; }
        }
      }
      return start + JSON.stringify(schema).replaceAll('<', '\\u003c') + end;
    });
    // Preview package has its own versioned assets; never contaminate the live cached rendition.
    html = html.replace(/(assets\/js\/site\.js\?v=)[a-z0-9-]+/g, (_, prefix) => prefix + '20261025-central-seo-review')
      .replace(/(assets\/css\/venue-selector\.css\?v=)[a-z0-9-]+/g, (_, prefix) => prefix + '20261025-central-seo-review');
    write(file, html);
  }
  report.hashes = Object.fromEntries(Object.keys(report.hashes).map(file => [file, hash(readFileSync(resolve(out, file)))]));
  report.publicDigest = publicSourceDigest(report.hashes);
  report.reviewPreparation = 'central-seo-20261025';
  report.changedFiles = Object.keys(report.hashes).filter(file => hash(before.get(file)) !== report.hashes[file]);
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  const delta = { version: 1, baselineCommit: report.commit, audience: 'local-review-only',
    changedFiles: report.changedFiles, patches: Object.fromEntries(report.changedFiles.map(file => [file, { beforeSha256: hash(before.get(file)), afterSha256: report.hashes[file] }])),
    preserved: ['hero markup/media', 'Guadalajara WordPress', 'all QR redirects', 'menus', 'hours', 'reservations', 'sitemap', 'canonical URLs'],
    pendingPublication: true };
  writeFileSync(resolve(out, '../scope.json'), JSON.stringify(delta, null, 2) + '\n');
  return { root: out, report, before };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const candidate = prepareCentralSeoReview(process.argv[2]);
  console.log(JSON.stringify({ root: candidate.root, files: candidate.report.fileCount, changed: candidate.report.changedFiles, audience: candidate.report.audience }));
}
