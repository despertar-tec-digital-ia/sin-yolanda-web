import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { restoreHomePhotos } from '../scripts/home-photos-source-contract.mjs';
import { restoreGa4Source } from '../scripts/ga4-source-contract.mjs';
import { restoreUnifiedHours } from '../scripts/unified-hours-source-contract.mjs';
import { restoreGdlFocus } from '../scripts/gdl-focus-source-contract.mjs';
import { restoreSanDiegoOpening } from '../scripts/san-diego-opening-source-contract.mjs';

const read = file => readFileSync(new URL('../' + file, import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const contract = JSON.parse(read('scripts/home-photos-source-patches.json'));

test('approved photo changes retain full historical file guards and reject ambiguous patches', () => {
  for (const [file, entry] of Object.entries(contract.files)) {
    const source = restoreGa4Source(file, restoreUnifiedHours(file, restoreGdlFocus(file, restoreSanDiegoOpening(file, read(file).toString()))));
    assert.equal(hash(source), entry.afterSha256, file);
    assert.equal(hash(restoreHomePhotos(file, source)), entry.baselineSha256, file);
    assert.notEqual(hash(restoreHomePhotos(file, source + 'unapproved change')), entry.baselineSha256);
    assert.throws(() => restoreHomePhotos(file, source + entry.patches.at(-1).after), /Home photo patch/);
  }
});

test('hero uses only the approved set, preserving the existing selfie between the new photographs', () => {
  const html = read('index.html').toString();
  const hero = html.match(/<div class="hero-media"[\s\S]*?<div class="hero-copy/)[0];
  assert.equal((hero.match(/data-hero-slide/g) || []).length, 3);
  assert.equal((hero.match(/<picture/g) || []).length, 2);
  assert.ok(hero.indexOf('home-cocktail') < hero.indexOf('cantina-selfie'));
  assert.ok(hero.indexOf('cantina-selfie') < hero.indexOf('home-singing'));
  assert.doesNotMatch(hero, /cantina-duo|cantina-canto|rosa|pink|blur/i);
  assert.equal(hash(read('assets/media/cantina-selfie-1280.webp')), '1062e99f1c6e1ba55ebd88660727a6bb317bfb14febd22f252540ffc1b1a27ec');
  assert.equal((hero.match(/media="\(min-width:761px\) and \(min-aspect-ratio:1\/1\)"/g) || []).length, 2);
  assert.match(hero, /source[^>]* data-srcset="assets\/media\/home-singing-desktop/);
});

test('optimized photo exports are explicitly packaged and traceable to the selected source hashes', () => {
  const manifest = JSON.parse(read('scripts/public-manifest.json'));
  assert.equal(contract.images.length, 8);
  for (const image of contract.images) {
    assert.ok(manifest.assets.includes(image.file));
    assert.equal(hash(read(image.file)), image.sha256);
    assert.ok(image.width <= 1672 && image.bytes < 400000);
    assert.match(image.sourceSha256, /^[a-f0-9]{64}$/);
  }
});
