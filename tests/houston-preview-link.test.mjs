import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const previewUrl = 'houston.html';
const dataSource = readFileSync(new URL('../assets/js/public-data.js', import.meta.url), 'utf8');
const siteSource = readFileSync(new URL('../assets/js/site.js', import.meta.url), 'utf8');
const context = { window: {} };
vm.runInNewContext(dataSource, context);
const scriptContent = html => {
  const seen = new Set();
  const read = path => {
    if (seen.has(path)) return '';
    seen.add(path);
    const url = new URL(path, new URL('../', import.meta.url));
    const source = readFileSync(url, 'utf8');
    return source + [...source.matchAll(/\bimport\s*["'](\.[^"']+)["']/g)].map(([,child]) => read(new URL(child, url).href)).join('\n');
  };
  return [...html.matchAll(/<script\b[^>]*src="\/(_astro\/[^"]+)"/g)].map(([,path]) => read(path)).join('\n');
};

test('Houston points to its official page while other branches keep their existing links', () => {
  const branches = context.window.SY_DATA.branches;
  assert.equal(branches.find(({ id }) => id === 'houston').page, previewUrl);
  for (const branch of branches.filter(({ id }) => id !== 'houston')) {
    assert.notEqual(branch.page, previewUrl, `${branch.id} must keep its own destination`);
  }
  assert.match(siteSource, /<a href="houston\.html">Houston/);
  assert.doesNotMatch(siteSource, /demo-sin-yolanda\.despertartdigital\.cloud\/houston/);
});

test('Houston candidate has current source menu, shared facts, privacy and reciprocal languages', () => {
  const branch = JSON.parse(readFileSync(new URL('../scripts/branch-import-manifest.json', import.meta.url), 'utf8')).houston.facts;
  for (const file of ['houston.html', 'en/houston/index.html']) {
    const html = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(schemas.length, 1);
    const schema = JSON.parse(schemas[0][1]);
    assert.equal(schema.address.streetAddress, branch.street);
    assert.equal(schema.telephone, branch.phone.e164);
    assert.equal(schema.hasMenu, 'https://sin-yolanda.com/houston/menu/');
    assert.equal(schema.acceptsReservations, branch.reservation.url);
    assert.match(html, /href="https:\/\/sin-yolanda\.com\/aviso-de-privacidad"/);
    assert.match(html, /hreflang="es" href="https:\/\/sin-yolanda\.com\/houston"/);
    assert.match(html, /hreflang="en" href="https:\/\/sin-yolanda\.com\/en\/houston\/"/);
    const scripts = scriptContent(html);
    assert.match(scripts, /sy-lang/);
    assert.match(scripts, /reservation_click/);
    assert.doesNotMatch(html, /menu-sy-houston\.despertartdigital\.cloud|href="\/pruebas\//);
    assert.match(html.match(/<iframe\b[^>]+>/)[0], /loading="lazy"/);
  }
  assert.match(readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8'), /<loc>https:\/\/sin-yolanda\.com\/en\/houston\/<\/loc>/,
    'The exact public migration destination is indexable without certifying business approval');
});

test('customer menu is included with all 126 offers and no review UI', () => {
  const html = readFileSync(new URL('../houston/menu/index.html', import.meta.url), 'utf8');
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema['@type'], 'Menu');
  assert.equal(schema.hasMenuSection.flatMap(section => section.hasMenuItem).length, 126);
  assert.match(html, /content="index,follow,max-image-preview:large"/);
  assert.match(html, /data-import-audience="review"/);
  assert.doesNotMatch(html, /Prueba local|Editorial review pending|href="\/pruebas\//);
  assert.match(html, /href="\/en\/houston\/"/, 'English menu returns to the English page of the same branch');
  assert.match(scriptContent(html), /reservation_click/);
});

test('importer fails closed without explicit source or branch authorization', () => {
  const cwd = new URL('../', import.meta.url);
  const before = readFileSync(new URL('../index.html', import.meta.url));
  assert.throws(() => execFileSync(process.execPath, ['scripts/import-houston.mjs', '--dry-run'], {cwd, stdio:'pipe'}), /Command failed/);
  assert.throws(() => execFileSync(process.execPath, ['scripts/import-houston.mjs', '--branch', 'el-paso', '--dry-run'], {cwd, stdio:'pipe'}), /Command failed/);
  assert.deepEqual(readFileSync(new URL('../index.html', import.meta.url)), before);
});

test('the official Houston page has the verified interactive map, local assets and SEO routes', () => {
  for (const [file, lang, canonical] of [
    ['houston.html', 'es', 'https://sin-yolanda.com/houston'],
    ['en/houston/index.html', 'en', 'https://sin-yolanda.com/en/houston/'],
  ]) {
    const html = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(html, new RegExp(`<html lang="${lang}">`));
    assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large">/);
    assert.match(html, /data-import-audience="review"/);
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
    assert.match(html, /https:\/\/www\.google\.com\/maps\/embed\?pb=/);
    assert.match(html, /0x8640c19b1c06c689%3A0xaac06ea799d5fea1/);
    assert.match(html, /href="https:\/\/www\.opentable\.com\/r\/sin-yolanda-houston"/);
    assert.match(html, /href="\/#ubicaciones"/);
    assert.doesNotMatch(html, /demo-sin-yolanda\.despertartdigital\.cloud|data-google-branch-map/);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    for (const [asset] of html.matchAll(/\/(?:_astro|fonts|images|licenses)\/[A-Za-z0-9._~%/-]+/g)) {
      assert.ok(existsSync(new URL(`..${asset}`, import.meta.url)), `${file} -> ${asset}`);
    }
  }
});
