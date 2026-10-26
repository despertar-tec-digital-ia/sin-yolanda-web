import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { restoreCentralSeo } from '../scripts/central-seo-source-contract.mjs';
import { applyCentralSeoHtml, centralBranchReferences, centralSeoCopy } from '../scripts/central-seo.mjs';
import { schemas, canonical, renderShell } from '../scripts/seo.mjs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const contract = JSON.parse(read('scripts/central-seo-source-patches.json'));
const manifest = JSON.parse(read('scripts/public-manifest.json'));
const pages = manifest.pages.map(file => [file, read(file)]);

test('central SEO restores exact prior bytes and rejects missing or ambiguous approved patches', () => {
  for (const [file, item] of Object.entries(contract.files)) {
    const html = read(file);
    assert.equal(hash(html), item.afterSha256, file);
    assert.equal(hash(restoreCentralSeo(file, html)), item.beforeSha256, file);
    assert.notEqual(hash(restoreCentralSeo(file, html + 'unknown edit')), item.beforeSha256);
    assert.throws(() => restoreCentralSeo(file, html + item.patches.at(-1).after), /Central SEO patch/);
    assert.throws(() => restoreCentralSeo(file, html.replace(item.patches[0].after, 'unknown edit')), /Central SEO patch/);
  }
});

test('all menus, QR, home renderer, styles, media and other out-of-scope public files retain exact bytes', () => {
  const files = [...manifest.pages, ...manifest.assets].sort();
  assert.deepEqual([...Object.keys(contract.files), ...Object.keys(contract.protected)].sort(), files);
  for (const [file, expected] of Object.entries(contract.protected)) {
    assert.equal(hash(readFileSync(new URL('../' + file, import.meta.url))), expected, file);
  }
  for (const file of ['assets/js/site.js', 'assets/js/public-data.js', 'styles.css', '_redirects', 'sitemap.xml']) assert.ok(contract.protected[file]);
  assert.ok(files.filter(file => /\/menu\/|\/menus\/|\.pdf$/.test(file)).every(file => contract.protected[file]));
});

test('the full home body and the light selector are unchanged, with Guadalajara opening the central location', () => {
  const html = read('index.html'), prior = restoreCentralSeo('index.html', html);
  const body = value => value.match(/<body\b[\s\S]*<\/body>/)[0];
  assert.equal(body(html), body(prior));
  assert.doesNotMatch(body(html), /brand-description|Sin Yolanda es una cantina mexicana para/);
  for (const file of ['index.html', 'locations.html', 'la-cantina.html', 'eventos.html', 'tienda.html']) {
    const initial = read(file), runtime = renderShell(initial);
    for (const source of [initial, runtime]) {
      assert.match(source, /<a[^>]+href="guadalajara"/);
      assert.doesNotMatch(source, /<a[^>]+href="https:\/\/sinyolandagdl\.com\/"/);
    }
  }
});

test('SEO identity is coherent and repeatable without changing branch facts or menu metadata', () => {
  const refs = centralBranchReferences(pages);
  assert.equal(refs.length, 5);
  const org = schemas(read('index.html')).flatMap(node => node['@graph'] ?? [node]).find(node => node['@type'] === 'Organization');
  assert.deepEqual(org.subOrganization, refs);
  assert.equal(org.sameAs, undefined);
  for (const [file, html] of pages) {
    assert.equal(applyCentralSeoHtml(file, html, refs), html, file + ': idempotent generation');
    const previous = restoreCentralSeo(file, html);
    assert.equal(canonical(html), canonical(previous), file);
    const restaurant = schemas(html).find(node => node['@type'] === 'Restaurant');
    if (restaurant) {
      const original = schemas(previous).find(node => node['@type'] === 'Restaurant');
      assert.deepEqual(restaurant.parentOrganization, { '@id': 'https://sin-yolanda.com/#organization' });
      delete restaurant.parentOrganization;
      assert.deepEqual(restaurant, original, file + ': all operational facts preserved');
    }
  }
  assert.ok(read('guadalajara.html').includes(centralSeoCopy.gdlIntro));
  const body = html => html.match(/<body\b[\s\S]*<\/body>/)[0];
  const gdl = read('guadalajara.html');
  assert.equal(body(gdl).replace(centralSeoCopy.gdlIntro, 'Una cantina para cantar, brindar y compartir la mesa. Explora el menú de Guadalajara.'), body(restoreCentralSeo('guadalajara.html', gdl)));
});
