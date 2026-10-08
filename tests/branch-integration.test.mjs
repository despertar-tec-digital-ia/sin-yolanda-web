import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const importManifest = JSON.parse(read('scripts/branch-import-manifest.json'));
const publicManifest = JSON.parse(read('scripts/public-manifest.json'));
const archiveRoot = 'archive/source-snapshots/karina-public-20261008-0924/';
const archived = JSON.parse(read(archiveRoot + 'manifest.json'));
const context = { window: {} };
vm.runInNewContext(read('assets/js/public-data.js'), context);
const registry = context.window.SY_DATA.branches;
const branchIds = ['houston', 'san-antonio', 'the-woodlands', 'san-ignacio', 'el-paso'];
const routePath = route => new URL(route.canonical).pathname;
const decode = text => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
const normalized = href => new URL(decode(href), 'https://sin-yolanda.com/').pathname
  .replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/';
const links = html => [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)].map(([, href]) => decode(href));
const schemas = html => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  .map(([, json]) => JSON.parse(json));
const heading = html => decode(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '')
  .replace(/<[^>]+>/g, '').trim();
const allRoutes = Object.values(importManifest).flatMap(selection => selection.routes);

test('current public Karina branch information is archived before replacement, not discarded or promoted to verified facts', () => {
  assert.equal(archived.complete, true);
  assert.equal(archived.rawSourcesStored, false);
  assert.equal(archived.origin, 'https://sin-yolanda.com');
  assert.deepEqual(archived.branches.map(branch => branch.id).sort(), [...branchIds].sort());
  assert.ok(archived.sources.every(source => source.status === 200 && source.stable));
  assert.equal(archived.errors.length, 0);
  for (const entry of archived.branches) {
    const snapshot = JSON.parse(read(archiveRoot + entry.file));
    assert.equal(snapshot.branchId, entry.id);
    assert.equal(snapshot.registry.id, entry.id);
    assert.equal(snapshot.businessConfirmation, 'unverified-observed-source');
    assert.equal(snapshot.provenance.sha256, entry.sourceSha256);
    assert.match(snapshot.provenance.sha256, /^[a-f0-9]{64}$/);
    assert.ok(snapshot.rendered.text.length > 0);
    assert.ok(snapshot.rendered.headings.some(item => item.level === 'h1'));
    assert.ok(snapshot.rendered.links.length > 0);
    assert.ok(!publicManifest.pages.includes(archiveRoot + entry.file));
  }
  assert.deepEqual(archived.registry.announcementsWithoutPage.sort(), ['moreno-valley', 'san-diego']);
  // The earlier phone remains evidence, not an excuse to overwrite Luis's confirmation.
  assert.notEqual(JSON.parse(read(archiveRoot + 'houston.json')).registry.phoneIntl,
    importManifest.houston.facts.phone.e164);
});

for (const [id, selection] of Object.entries(importManifest)) {
  for (const route of selection.routes) {
    test(`local imported ${route.to} preserves exact route/language and review provenance`, () => {
      const html = read(route.to);
      assert.ok(publicManifest.pages.includes(route.to));
      assert.ok(publicManifest.reviewPages.includes(route.to));
      assert.equal(selection.publicationApproved, false);
      assert.match(selection.sourceRef, /^[a-f0-9]{40}$/);
      assert.ok(html.includes('data-import-source-ref="' + selection.sourceRef + '"'));
      assert.match(html, /data-import-audience="review"/);
      assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
      assert.ok(html.includes('<html lang="' + route.lang + '"'));
      assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
      assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
      assert.ok(html.includes('<link rel="canonical" href="' + route.canonical + '">'));
      assert.doesNotMatch(html, /href="\/(?:en\/)?pruebas\//);
      assert.doesNotMatch(html, /href="\/#sucursales"/);
      assert.doesNotMatch(html, /demo-sin-yolanda\.despertartdigital\.cloud/);
      assert.ok(links(html).includes('/#ubicaciones'));
      if (id !== 'catering') {
        const attribute = route.kind === 'menu' ? 'data-branch-id' : 'data-branch';
        assert.ok(html.includes(attribute + '="' + id + '"'));
      }
    });
  }
}

for (const id of branchIds) {
  const selection = importManifest[id];
  for (const route of selection.routes.filter(route => route.kind !== 'menu')) {
    test(`branch ${id} ${route.lang} keeps own Restaurant facts, Google map and connected menus`, () => {
      const html = read(route.to);
      const [schema] = schemas(html);
      assert.equal(schemas(html).length, 1);
      assert.equal(schema['@type'], 'Restaurant');
      assert.equal(schema.url, route.canonical);
      assert.equal(schema['@id'], 'https://sin-yolanda.com/' + id + '#restaurant');
      assert.equal(schema.address.streetAddress, selection.facts.street);
      assert.equal(schema.address.addressLocality, selection.facts.city);
      assert.equal(schema.address.postalCode, selection.facts.postalCode);
      assert.equal(schema.telephone, selection.facts.phone?.e164);
      assert.equal(schema.acceptsReservations, selection.facts.reservation?.url);
      if (selection.facts.phone) assert.ok(links(html).includes('tel:' + selection.facts.phone.e164));
      if (selection.facts.reservation) assert.ok(links(html).includes(selection.facts.reservation.url));
      assert.ok(links(html).includes('/'));
      const frames = [...html.matchAll(/<iframe\b[^>]*src="([^"]+)"[^>]*>/g)];
      assert.equal(frames.length, 1);
      const map = new URL(decode(frames[0][1]));
      assert.equal(map.origin, 'https://www.google.com');
      assert.equal(map.pathname, '/maps/embed');
      assert.ok(map.searchParams.get('pb').includes(selection.mapIdentity));
      assert.ok(map.searchParams.get('pb').includes(selection.mapName));
      assert.equal(map.searchParams.has('key'), false);
      assert.match(frames[0][0], /loading="lazy"/);
      const ownMenus = selection.routes.filter(candidate => candidate.kind === 'menu');
      const menuLinks = links(html).filter(href => /\/menu\/?$/.test(new URL(href, 'https://sin-yolanda.com').pathname));
      if (ownMenus.length) {
        assert.ok(menuLinks.length > 0);
        assert.ok(menuLinks.every(href => ownMenus.some(menu => normalized(href) === normalized(menu.canonical))));
        const expected = ownMenus.find(menu => menu.lang === route.lang) ?? ownMenus[0];
        assert.equal(normalized(schema.hasMenu), normalized(expected.canonical));
        assert.ok(menuLinks.some(href => normalized(href) === normalized(expected.canonical)));
      } else {
        assert.equal(schema.hasMenu, undefined);
        assert.equal(menuLinks.length, 0);
      }
      const ownLanguages = selection.routes.filter(candidate => candidate.kind !== 'menu');
      for (const alternate of ownLanguages) {
        assert.ok(html.includes('hreflang="' + alternate.lang + '" href="' + alternate.canonical + '"'));
      }
      const record = registry.find(branch => branch.id === id);
      assert.equal(record.page, selection.routes.find(candidate => candidate.lang === 'es' && candidate.kind !== 'menu').to);
      assert.equal(schema.name, record.name);
    });
  }
}

test('Guadalajara display rename preserves Chapalita, original avenue, IDs, URL and media provenance', () => {
  const html = read('san-ignacio.html');
  const [schema] = schemas(html);
  assert.equal(heading(html), 'Sin Yolanda Guadalajara');
  assert.equal(schema.name, 'Sin Yolanda Guadalajara');
  assert.equal(schema.address.streetAddress, 'Avenida San Ignacio 78');
  assert.match(schema.description, /Avenida San Ignacio 78, Zapopan/);
  assert.match(html, /Zona Chapalita, Zapopan/);
  assert.match(html, /id="san-ignacio"/);
  assert.match(html, /id="visita-san-ignacio"/);
  assert.match(html, /images\/branch-review\/san-ignacio-hero-/);
  assert.doesNotMatch(html, /Avenida Guadalajara|\/guadalajara(?:\/|"|#)/);
  assert.match(read('san-ignacio/menu/index.html'), /<p>Guadalajara<\/p>/);
  const oldSnapshot = JSON.parse(read(archiveRoot + 'san-ignacio.json'));
  assert.match(oldSnapshot.registry.address, /San Ignacio 78/);
  assert.equal(oldSnapshot.registry.shortName, 'Guadalajara');
});

for (const id of branchIds) {
  const selection = importManifest[id];
  for (const route of selection.routes.filter(route => route.kind === 'menu')) {
    test(`menu ${route.to} returns to its own branch and does not fabricate another edition`, () => {
      const html = read(route.to);
      assert.ok(html.includes('data-branch-id="' + id + '"'));
      assert.match(html, /class="digital-menu-group /);
      assert.doesNotMatch(html, /Prueba local|Editorial review pending|About this menu preview|Local design review/);
      const ownBranch = selection.routes.find(candidate => candidate.kind !== 'menu' && candidate.lang === route.lang)
        ?? selection.routes.find(candidate => candidate.kind !== 'menu' && candidate.lang === 'es');
      assert.ok(links(html).some(href => normalized(href) === normalized(ownBranch.canonical)));
      const editions = links(html).filter(href => /\/menu\/?$/.test(new URL(href, 'https://sin-yolanda.com').pathname));
      assert.ok(editions.every(href => selection.routes.some(edition => edition.kind === 'menu' && normalized(edition.canonical) === normalized(href))));
      assert.ok(!schemas(html).some(schema => schema['@type'] === 'Restaurant'));
    });
  }
}

test('Houston ES and EN deliberately share the existing English menu, not a fabricated translation', () => {
  assert.equal(importManifest.houston.routes.filter(route => route.kind === 'menu').length, 1);
  for (const file of ['houston.html', 'en/houston/index.html']) {
    const html = read(file);
    const anchors = html.match(/<a\b[^>]*href="\/houston\/menu\/"[^>]*>/g) ?? [];
    assert.ok(anchors.length > 0);
    assert.ok(anchors.every(anchor => /hreflang="en"/.test(anchor)));
  }
  assert.match(read('houston/menu/index.html'), /<html lang="en"/);
  assert.ok(!publicManifest.pages.includes('en/houston/menu/index.html'));
});

test('El Paso stays preopening without borrowed menu, hours, telephone or reservation', () => {
  assert.equal(importManifest['el-paso'].routes.some(route => route.kind === 'menu'), false);
  for (const route of importManifest['el-paso'].routes) {
    const html = read(route.to), [schema] = schemas(html);
    assert.match(html, /data-status="coming-soon"/);
    assert.equal(schema.hasMenu, undefined);
    assert.equal(schema.telephone, undefined);
    assert.equal(schema.openingHoursSpecification, undefined);
    assert.equal(schema.acceptsReservations, undefined);
    assert.doesNotMatch(html, /href="(?:tel:|https:\/\/(?:www\.)?opentable\.com\/|https:\/\/wa\.me\/)/);
    assert.ok(links(html).includes('https://www.instagram.com/sinyolandaelpaso/'));
  }
});

test('future branches are announcements only, and Maricarmen does not return through imported navigation', () => {
  for (const id of ['moreno-valley', 'san-diego']) {
    const record = registry.find(branch => branch.id === id);
    assert.equal(record.page, '#');
    assert.equal(record.status, 'coming-soon');
    assert.ok(!Object.hasOwn(importManifest, id));
    assert.ok(!publicManifest.pages.some(page => page === id + '.html' || page.includes('/' + id + '/')));
  }
  assert.ok(!registry.some(branch => branch.id === 'maricarmen'));
  assert.ok(!Object.hasOwn(importManifest, 'maricarmen'));
  for (const route of allRoutes) {
    assert.doesNotMatch(read(route.to), /href="\/(?:en\/)?maricarmen(?:\/|"|#)|data-branch(?:-id)?="maricarmen"/);
  }
  assert.ok(!publicManifest.pages.some(page => /(?:^|\/)maricarmen(?:\.|\/)/.test(page)));
});

test('Catering remains an explicitly selected connected review page, not a commercial media approval', () => {
  for (const route of importManifest.catering.routes) {
    const html = read(route.to);
    assert.match(html, /data-catering-direction="fiesta"/);
    assert.ok(links(html).includes('/'));
    assert.ok(links(html).includes('/#ubicaciones'));
    assert.ok(links(html).some(href => normalized(href) === '/en/catering'));
    assert.ok(links(html).some(href => normalized(href) === '/catering'));
  }
  assert.ok(importManifest.houston.blockingReasons.some(reason => /Catering/.test(reason)));
  assert.ok(importManifest.catering.blockingReasons.some(reason => /review-only/.test(reason)));
});
