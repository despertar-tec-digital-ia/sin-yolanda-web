import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prepareCentralSeoReview } from '../scripts/prepare-central-seo-review.mjs';
import { renderShell, schemas, canonical } from '../scripts/seo.mjs';
import { loadReviewPackage } from '../scripts/serve-review.mjs';

test('central SEO candidate preserves the approved hero, business facts and QR while directing group Guadalajara traffic to WordPress', () => {
  const candidate = prepareCentralSeoReview('.artifacts/seo-test-' + process.pid + '-' + Date.now() + '/public');
  const read = file => readFileSync(resolve(candidate.root, file), 'utf8');
  const prior = file => candidate.before.get(file).toString();
  loadReviewPackage(candidate.root);
  assert.match(read('_headers'), /X-Robots-Tag: noindex, nofollow/);
  for (const file of ['_redirects', 'sitemap.xml', 'robots.txt', 'assets/js/public-data.js', 'san-ignacio/menu/index.html', 'assets/menus/gdl-v82/original.pdf']) {
    assert.deepEqual(readFileSync(resolve(candidate.root, file)), candidate.before.get(file), file);
  }
  const hero = source => source.match(/<section class="home-hero home-hero-cinema"[\s\S]*?<\/section>/)?.[0];
  assert.ok(hero(prior('index.html')));
  assert.equal(hero(read('index.html')), hero(prior('index.html')));
  for (const file of ['index.html', 'locations.html', 'la-cantina.html', 'eventos.html', 'tienda.html']) {
    const html = read(file);
    assert.match(html, /href="https:\/\/sinyolandagdl\.com\/"/);
    assert.doesNotMatch(html, /<a[^>]+href="\/?guadalajara(?:\.html)?"/);
    const rendered = renderShell(html, new Date(), candidate.root);
    assert.match(rendered, /href="https:\/\/sinyolandagdl\.com\/"/);
    assert.doesNotMatch(rendered, /<a[^>]+href="\/?guadalajara(?:\.html)?"/);
  }
  for (const file of ['index.html', 'locations.html']) {
    assert.match(read(file), /class="brand-description"/);
    assert.match(read(file), /data-i18n-en="Sin Yolanda is a Mexican cantina/);
  }
  for (const file of Object.keys(candidate.report.hashes).filter(file => file.endsWith('.html'))) {
    assert.equal(canonical(read(file)), canonical(prior(file)), file);
    const restaurant = schemas(read(file)).find(item => item['@type'] === 'Restaurant');
    if (restaurant) {
      const original = schemas(prior(file)).find(item => item['@type'] === 'Restaurant');
      for (const field of ['telephone', 'address', 'openingHoursSpecification', 'hasMenu', 'acceptsReservations', 'sameAs']) assert.deepEqual(restaurant[field], original[field], file + ':' + field);
      assert.equal(restaurant.parentOrganization['@id'], 'https://sin-yolanda.com/#organization');
    }
  }
  const org = schemas(read('index.html')).flatMap(s => s['@graph'] ?? [s]).find(node => node['@type'] === 'Organization');
  assert.equal(org.subOrganization.length, 5);
  assert.ok(org.subOrganization.every(branch => !/san-diego|moreno-valley/.test(branch.url)));
  assert.equal(org.sameAs, undefined, 'Branch social accounts must not be invented as corporate accounts');
  assert.match(read('guadalajara.html'), /<title>Sin Yolanda Guadalajara \| Cantina y bar en Zapopan<\/title>/);
  assert.match(read('guadalajara.html'), /noches de micrófono abierto en Avenida San Ignacio 78/);
  assert.match(read('guadalajara.html'), /A cantar,<br>bailar y<br>brindar\./);
  assert.ok(!candidate.report.changedFiles.some(file => /\/menus\/|\.(webp|jpg|mp4|pdf)$/.test(file)));
});
