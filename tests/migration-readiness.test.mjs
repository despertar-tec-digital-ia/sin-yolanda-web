import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const manifest = JSON.parse(read('scripts/public-manifest.json'));
const imports = JSON.parse(read('scripts/branch-import-manifest.json'));
const policy = JSON.parse(read('scripts/indexation-policy.json'));
const redirects = JSON.parse(read('scripts/legacy-redirects/sin-yolanda-legacy-redirects/redirects.json'));
const sitemap = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, href]) => href);
const tags = (html, name) => [...html.matchAll(new RegExp('<' + name + '\\b[^>]*>', 'g'))].map(match => match[0]);
const attribute = (tag, name) => tag.match(new RegExp('\\s' + name + '="([^"]*)"'))?.[1];
const canonical = html => {
  const values = tags(html, 'link').filter(tag => attribute(tag, 'rel') === 'canonical').map(tag => attribute(tag, 'href'));
  assert.equal(values.length, 1, 'Each migration page needs exactly one canonical.');
  return values[0];
};
const robots = html => tags(html, 'meta').filter(tag => attribute(tag, 'name') === 'robots').map(tag => attribute(tag, 'content'));
const expectedIndexable = [
  'houston.html', 'en/houston/index.html', 'houston/menu/index.html',
  'san-antonio.html', 'en/san-antonio/index.html', 'san-antonio/menu/index.html', 'en/san-antonio/menu/index.html',
  'the-woodlands.html', 'en/the-woodlands/index.html', 'the-woodlands/menu/index.html',
  'san-ignacio.html', 'san-ignacio/menu/index.html',
];
const protectedPages = ['catering.html', 'el-paso.html', 'en/catering/index.html', 'en/el-paso/index.html'];

test('technical indexation is limited to the 12 pinned branch/menu pages and does not grant commercial approval', () => {
  assert.equal(policy.version, 1);
  assert.equal(policy.authorizer, 'Luis');
  assert.equal(policy.authorizedOn, '2026-10-08');
  assert.match(policy.sourceRef, /^[a-f0-9]{40}$/);
  assert.deepEqual([...policy.pages].sort(), [...expectedIndexable].sort());
  assert.equal(new Set(policy.pages).size, 12);
  assert.equal(new Set(sitemap).size, sitemap.length, 'Sitemap URLs may not be duplicated.');
  for (const page of policy.pages) {
    assert.ok(manifest.pages.includes(page), 'Missing public destination: ' + page);
    assert.ok(!manifest.reviewPages.includes(page), 'Promoted route is still review-only: ' + page);
    const html = read(page);
    assert.deepEqual(robots(html), ['index,follow,max-image-preview:large'], page);
    assert.ok(html.includes('data-import-source-ref="' + policy.sourceRef + '"'), 'Indexation approval is source-specific: ' + page);
    assert.match(html, /data-import-audience="review"/, 'Keep import provenance separate from technical indexation.');
    const selection = Object.values(imports).find(item => item.routes.some(route => route.to === page));
    assert.ok(selection, 'Every indexed import remains explicitly selected.');
    assert.equal(selection.sourceRef, policy.sourceRef);
    assert.equal(selection.publicationApproved, false, 'Technical indexation must not erase commercial gates.');
    const route = selection.routes.find(item => item.to === page);
    assert.equal(canonical(html), route.canonical, page);
    assert.equal(sitemap.filter(url => url === route.canonical).length, 1, 'Canonical must appear exactly once in sitemap: ' + page);
  }
});

test('El Paso and Catering keep four review-only noindex pages outside the sitemap', () => {
  assert.deepEqual([...manifest.reviewPages].sort(), protectedPages);
  for (const page of protectedPages) {
    assert.ok(manifest.pages.includes(page));
    assert.ok(!policy.pages.includes(page));
    const html = read(page);
    assert.deepEqual(robots(html), ['noindex,nofollow'], page);
    assert.equal(sitemap.includes(canonical(html)), false, page);
  }
  for (const id of ['el-paso', 'catering']) {
    assert.equal(imports[id].publicationApproved, false);
    assert.ok(imports[id].blockingReasons.length > 0);
  }
});

test('all 16 legacy rules land directly on existing indexable canonicals and real fragment anchors', () => {
  assert.equal(redirects.targetOrigin, 'https://sin-yolanda.com');
  assert.equal(redirects.status, 301);
  const destinations = new Map(policy.pages.map(page => [canonical(read(page)), { page, html: read(page) }]));
  assert.equal(destinations.size, policy.pages.length);
  const rules = Object.entries(redirects.sites).flatMap(([host, paths]) => Object.entries(paths).map(([path, target]) => ({ host, path, target })));
  assert.equal(rules.length, 16);
  for (const rule of rules) {
    const destination = new URL(rule.target, redirects.targetOrigin);
    assert.equal(destination.origin, redirects.targetOrigin);
    assert.equal(destination.search, '', 'The declared route itself may not contain an arbitrary query.');
    const direct = destinations.get(destination.origin + destination.pathname);
    assert.ok(direct, rule.host + rule.path + ': redirect must use an exact canonical, not an alias or review page.');
    assert.deepEqual(robots(direct.html), ['index,follow,max-image-preview:large']);
    if (destination.hash) {
      const ids = [...direct.html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
      assert.ok(ids.includes(decodeURIComponent(destination.hash.slice(1))), 'Missing redirect anchor: ' + rule.target);
    }
  }
});

test('San Antonio menu ES/EN hreflang is reciprocal and The Woodlands keeps its real Spanish-only menu', () => {
  const expected = {
    es: 'https://sin-yolanda.com/san-antonio/menu/',
    en: 'https://sin-yolanda.com/en/san-antonio/menu/',
    'x-default': 'https://sin-yolanda.com/san-antonio/menu/',
  };
  for (const page of ['san-antonio/menu/index.html', 'en/san-antonio/menu/index.html']) {
    const alternates = tags(read(page), 'link').filter(tag => attribute(tag, 'rel') === 'alternate' && attribute(tag, 'hreflang'));
    assert.equal(alternates.length, 3, page);
    assert.deepEqual(Object.fromEntries(alternates.map(tag => [attribute(tag, 'hreflang'), attribute(tag, 'href')])), expected, page);
  }
  assert.ok(!manifest.pages.includes('en/the-woodlands/menu/index.html'));
  assert.equal(imports['the-woodlands'].routes.filter(route => route.kind === 'menu').length, 1);
  assert.match(read('the-woodlands/menu/index.html'), /<html lang="es"/);
  for (const page of ['the-woodlands.html', 'en/the-woodlands/index.html', 'the-woodlands/menu/index.html']) {
    const html = read(page);
    assert.doesNotMatch(html, /(?:href|url)="[^"<>]*\/en\/the-woodlands\/menu(?:\/|["?#])/);
    const menuLinks = tags(html, 'a').filter(tag => attribute(tag, 'href') === '/the-woodlands/menu/');
    if (!page.includes('/menu/')) {
      assert.ok(menuLinks.length > 0);
      assert.ok(menuLinks.every(tag => attribute(tag, 'hreflang') === 'es'), 'English ficha must identify the Spanish menu honestly.');
    }
  }
});

test('404 assets and navigation stay valid when served at an arbitrarily deep unknown path', () => {
  const html = read('404.html');
  assert.match(html, /<meta name="sy-analytics" content="excluded:404">/);
  assert.deepEqual(robots(html), ['noindex, follow']);
  const refs = [...html.matchAll(/\b(?:href|src)="([^"<>]+)"/g)].map(([, value]) => value);
  const bases = ['https://sin-yolanda.com/unknown/nested/path', 'https://sin-yolanda.com/en/unknown/deeper/'];
  for (const ref of refs) {
    if (/^[a-z]+:|^#/.test(ref)) continue;
    assert.ok(ref.startsWith('/') && !ref.startsWith('//'), 'Root-relative local reference required on 404: ' + ref);
    const targets = bases.map(base => new URL(ref, base).href);
    assert.equal(targets[0], targets[1]);
    const path = new URL(targets[0]).pathname.slice(1);
    assert.ok(path === '' || [...manifest.assets, ...manifest.pages].includes(path) || manifest.pages.includes(path + '.html'), '404 links a missing public resource: ' + ref);
  }
  assert.doesNotMatch(html, /site-analytics\.js|analytics\.despertartdigital/);
});

function importerContext(branchId, dryRun = false) {
  const selection = { ...imports[branchId], facts: undefined };
  const branch = { id: branchId, slug: branchId, publicEnabled: true, operationalStatus: 'open', phone: {}, reservation: {} };
  const writes = [];
  const forbiddenWrite = (...args) => { writes.push(args); throw new Error('Unexpected mutation before reimport gate.'); };
  const context = {
    process: { argv: ['node', '/official/scripts/import-branches.mjs', '--branch', branchId, '--audience', 'review', '--source-root', '/donor', '--source-ref', policy.sourceRef, ...(dryRun ? ['--dry-run'] : [])] },
    resolve, dirname, relative,
    readFileSync(path) {
      if (path === '/official/scripts/branch-import-manifest.json') return JSON.stringify({ [branchId]: selection });
      if (path === '/official/scripts/indexation-policy.json') return JSON.stringify(policy);
      if (path === '/donor/src/data/public-branches.json') return JSON.stringify([branch]);
      throw new Error('Unexpected read before reimport gate: ' + path);
    },
    execFileSync(command, args) {
      assert.equal(command, 'git');
      if (args.join(' ') === 'rev-parse HEAD') return policy.sourceRef;
      if (args.join(' ') === 'status --porcelain') return '';
      throw new Error('Unexpected subprocess before reimport gate.');
    },
    realpathSync: path => path,
    existsSync: () => { throw new Error('Dry-run reached source validation.'); },
    lstatSync: () => { throw new Error('Unexpected file stat before reimport gate.'); },
    copyFileSync: forbiddenWrite, mkdirSync: forbiddenWrite, writeFileSync: forbiddenWrite,
    console: { log: () => { throw new Error('Unexpected import completion.'); } },
  };
  return { context, writes };
}
const vmScript = path => read(path).replace(/^import[^\n]*\n/gm, '').replaceAll('import.meta.dirname', '"/official/scripts"');

test('reimport guards block resetting promoted routes before any writes, while dry-run remains available', () => {
  for (const id of ['houston', 'san-antonio', 'the-woodlands', 'san-ignacio']) {
    const run = importerContext(id);
    assert.throws(() => vm.runInNewContext(vmScript('scripts/import-branches.mjs'), run.context), /Promoted migration routes require a new explicit source\/indexation decision/);
    assert.equal(run.writes.length, 0, id);
  }
  const dryRun = importerContext('houston', true);
  assert.throws(() => vm.runInNewContext(vmScript('scripts/import-branches.mjs'), dryRun.context), /Dry-run reached source validation/);
  assert.equal(dryRun.writes.length, 0);
  const reads = [], writes = [];
  assert.throws(() => vm.runInNewContext(vmScript('scripts/sync-review-imports.mjs'), {
    assert, resolve, process: { argv: [] },
    readFileSync(path) { reads.push(path); assert.equal(path, '/official/scripts/indexation-policy.json'); return JSON.stringify(policy); },
    writeFileSync(...args) { writes.push(args); throw new Error('Unexpected sync mutation.'); },
  }), /Existing migration indexation requires a new explicit source\/indexation decision/);
  assert.equal(reads.length, 1);
  assert.equal(writes.length, 0, 'The old review sync cannot silently remove indexed canonicals from the sitemap.');
});
