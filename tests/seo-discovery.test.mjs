import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { read, schemas, canonical, renderShell, restoreSeoBaseline } from '../scripts/seo.mjs';

const manifest = JSON.parse(read('scripts/public-manifest.json'));
const pages = manifest.pages.filter(page => page !== '404.html');
const discovery = JSON.parse(read('discovery.json'));
const sitemap = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);

test('all public destinations are indexable, canonical, unique and in the sitemap; missing pages remain excluded', () => {
  assert.equal(pages.length, 23);
  assert.equal(sitemap.length, 23);
  assert.deepEqual(sitemap.sort(), pages.map(page => canonical(read(page))).sort());
  const titles = new Set();
  for (const file of pages) {
    const html = read(file);
    assert.doesNotMatch(html.match(/<head>[\s\S]*?<\/head>/)[0], /noindex|nofollow/);
    const url = canonical(html);
    assert.equal([...html.matchAll(/rel="canonical"/g)].length, 1, file);
    assert.ok(url.startsWith('https://sin-yolanda.com/'));
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    assert.ok(!titles.has(title), 'Duplicate title: ' + file); titles.add(title);
    assert.match(html, /<meta name="description" content="[^"]+"/);
    assert.ok(html.includes(`property="og:url" content="${url}"`));
    assert.match(html, /property="og:image" content="https:\/\/sin-yolanda\.com\//);
    const nodes = schemas(html).flatMap(item => item['@graph'] ?? [item]);
    assert.equal(nodes.filter(node => ['WebPage', 'CollectionPage'].includes(node['@type'])).length, 1, file);
    const page = nodes.find(node => ['WebPage', 'CollectionPage'].includes(node['@type']));
    assert.equal(page.url, url); assert.equal(page.inLanguage, html.match(/<html lang="([^"]+)"/)[1]);
    assert.ok(!nodes.some(node => ['Review', 'AggregateRating'].includes(node['@type'])));
  }
  assert.match(read('404.html'), /noindex/);
  assert.doesNotMatch(read('_headers'), /X-Robots-Tag:\s*noindex/);
  assert.match(read('robots.txt'), /Sitemap: https:\/\/sin-yolanda\.com\/sitemap\.xml/);
  assert.doesNotMatch(read('robots.txt'), /Disallow:\s*\/\s*$/m);
});

test('real bilingual editions have reciprocal hreflang and never invent menu translations', () => {
  for (const file of pages) {
    const html = read(file);
    for (const [, lang, href] of html.matchAll(/<link rel="alternate" hreflang="(es|en)" href="([^"]+)">/g)) {
      const target = pages.find(page => canonical(read(page)) === href);
      assert.ok(target, 'Unpublished language destination: ' + href);
      assert.equal(read(target).match(/<html lang="([^"]+)"/)[1], lang);
      assert.ok(read(target).includes(`href="${canonical(html)}"`), 'Missing reciprocal edition: ' + file);
    }
  }
  assert.match(read('houston/menu/index.html'), /<html lang="en"/);
  assert.equal(pages.includes('en/the-woodlands/menu/index.html'), false);
});

test('the five public shell templates provide crawlable native content and preserve the exact approved renderer', () => {
  for (const file of ['index.html', 'locations.html', 'la-cantina.html', 'eventos.html', 'tienda.html']) {
    const html = read(file);
    assert.match(html, /data-seo-prerendered="true"/);
    assert.match(html, /<main/); assert.match(html, /<h1/); assert.match(html, /<a[^>]+href="\/catering"/);
    const original = restoreSeoBaseline(file, html);
    assert.match(original, /<div id="site-shell"><\/div>/);
    assert.equal(renderShell(original, new Date('2026-10-12T22:00:00Z')), renderShell(html, new Date('2026-10-12T22:00:00Z')));
  }
});

test('discovery publishes five own-location records and only the visible Houston catering service', () => {
  assert.deepEqual(discovery.locations.map(location => location.id).sort(), ['el-paso', 'houston', 'san-antonio', 'san-ignacio', 'the-woodlands']);
  for (const location of discovery.locations) {
    const file = pages.find(page => canonical(read(page)) === location.url);
    const restaurant = schemas(read(file)).find(item => item['@type'] === 'Restaurant');
    assert.deepEqual(location.address, restaurant.address); assert.equal(location.telephone, restaurant.telephone);
    assert.equal(location.menu, restaurant.hasMenu); assert.equal(location.reservation, restaurant.acceptsReservations);
  }
  for (const file of ['catering.html', 'en/catering/index.html']) {
    const service = schemas(read(file)).flatMap(item => item['@graph'] ?? [item]).find(node => node['@type'] === 'Service');
    assert.equal(service.areaServed.name, 'Houston'); assert.equal(service.sameAs, discovery.catering.contact);
    assert.equal(service.offers, undefined); assert.equal(service.telephone, undefined);
  }
});

test('WebMCP exposes read-only public information with both API surfaces, without external side effects', async () => {
  const source = read('assets/js/webmcp.js');
  for (const surface of ['document', 'navigator', 'unsupported']) {
    const tools = [];
    const modelContext = { registerTool: async tool => { tools.push(tool); } };
    const context = { document: {}, navigator: {}, console, fetch: async (url, options) => {
      assert.equal(url, '/discovery.json'); assert.equal(options.credentials, 'omit');
      return { ok: true, json: async () => discovery };
    } };
    if (surface !== 'unsupported') context[surface].modelContext = modelContext;
    await vm.runInNewContext(source, context);
    assert.equal(tools.length, surface === 'unsupported' ? 0 : 3);
    for (const tool of tools) { assert.equal(tool.annotations.readOnlyHint, true); assert.equal(tool.annotations.consequentialHint, false); }
    if (!tools.length) continue;
    assert.equal(JSON.parse(await tools[0].execute({})).locations.length, 5);
    assert.equal(JSON.parse(await tools[1].execute({ location: 'el-paso' })).telephone, '+19153636330');
    await assert.rejects(tools[1].execute({ location: 'unknown' }), /Unknown location/);
    assert.equal(JSON.parse(await tools[2].execute({})).areaServed, 'Houston');
  }
  assert.doesNotMatch(source, /method:\s*['"]POST|location\.href\s*=|window\.open|localStorage|sendBeacon/);
});
