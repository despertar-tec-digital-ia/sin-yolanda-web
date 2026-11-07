import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { restoreCiudadJuarezOpening } from '../scripts/ciudad-juarez-opening-source-contract.mjs';
import { ciudadJuarezPriority, restoreCiudadJuarezPriority } from '../scripts/ciudad-juarez-priority-source-contract.mjs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');

test('Ciudad Juárez opening changes restore the exact earlier source and reject drift', () => {
  const contract = JSON.parse(read('scripts/ciudad-juarez-opening-source-patches.json'));
  for (const [file, entry] of Object.entries(contract.files)) {
    const source = read(file);
    const priority = ciudadJuarezPriority.files[file];
    assert.equal(hash(source.replaceAll('\r\n', '\n')), priority?.afterSha256 || entry.afterSha256, file);
    if (priority) {
      const beforePriority = restoreCiudadJuarezPriority(file, source);
      assert.equal(hash(beforePriority), priority.beforeSha256, file + ': priority restores the opening release');
      assert.equal(restoreCiudadJuarezPriority(file, beforePriority), beforePriority, file + ': priority idempotent');
      assert.throws(() => restoreCiudadJuarezPriority(file, source + priority.patches.at(-1).after), /Ciudad Juárez priority patch/);
    }
    const restored = restoreCiudadJuarezOpening(file, source);
    assert.equal(hash(restored), entry.beforeSha256, file);
    assert.equal(restoreCiudadJuarezOpening(file, restored), restored, file + ': idempotent');
    assert.notEqual(hash(restoreCiudadJuarezOpening(file, source + 'unapproved edit')), entry.beforeSha256, file + ': unknown edits remain visible to older guards');
    assert.throws(() => restoreCiudadJuarezOpening(file, source + entry.patches.at(-1).after), /Ciudad Juárez opening patch/);
  }
  assert.equal(restoreCiudadJuarezOpening('unrelated.txt', 'preserved'), 'preserved');
});

test('Ciudad Juárez landing is a pre-opening WebPage without operating claims', () => {
  const html = read('ciudad-juarez.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/sin-yolanda\.com\/ciudad-juarez">/);
  assert.match(html, /Sin Yolanda llega muy pronto a Ciudad Juárez\./);
  assert.match(html, /Después de Ciudad Juárez[\s\S]*San Diego y Moreno Valley/);
  assert.doesNotMatch(html, /(?:@type":"Restaurant|@type":"Menu|@type":"Service|tel:|wa\.me|opentable|google\.com\/maps|<iframe\b|hasMenu|acceptsReservations)/i);
  const schema = JSON.parse(html.match(/<script id="seo-page" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const nodes = schema['@graph'];
  assert.equal(nodes.filter(node => node['@type'] === 'WebPage').length, 1);
  assert.ok(!nodes.some(node => ['Restaurant', 'Menu', 'Service', 'LocalBusiness'].includes(node['@type'])));
});
