import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { homeSelection, restoreHomeSelection } from '../scripts/home-selection-source-contract.mjs';
import { renderShell } from '../scripts/seo.mjs';

const read = file => readFileSync(new URL('../' + file, import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');

test('reviewed home selection preserves exact image bytes and every prior file guard', () => {
  for (const [file, entry] of Object.entries(homeSelection.files)) {
    const source = read(file).toString();
    assert.equal(hash(source), entry.afterSha256, file);
    const prior = restoreHomeSelection(file, source);
    assert.equal(hash(prior), entry.beforeSha256, file);
    assert.equal(restoreHomeSelection(file, prior), prior, file + ': prior source is accepted');
    assert.notEqual(hash(restoreHomeSelection(file, source + 'unknown edit')), entry.beforeSha256);
    assert.throws(() => restoreHomeSelection(file, source + entry.patches[0].after), /Home selection patch/);
    assert.throws(() => restoreHomeSelection(file, source.replace(entry.patches[0].after, 'unknown edit') + '\n/* 20261029-home-photos */'), /Home selection patch/);
  }
  const manifest = JSON.parse(read('scripts/public-manifest.json'));
  const previous = JSON.parse(restoreHomeSelection('scripts/public-manifest.json', read('scripts/public-manifest.json').toString()));
  assert.deepEqual(manifest.pages, previous.pages);
  assert.deepEqual(manifest.assets.filter(p => !previous.assets.includes(p)), homeSelection.images.map(i => i.file));
  assert.equal(homeSelection.images.length, 4);
  for (const image of homeSelection.images) {
    assert.equal(hash(read(image.file)), image.sha256, image.file);
    assert.equal(read(image.file).length, image.bytes);
    assert.ok(image.bytes < 300000);
  }
});

test('static home, directory and runtime use the approved photographs while preserving the hero and branch pages', () => {
  const home = read('index.html').toString();
  const hero = value => value.match(/<section class="[^\"]*home-hero-cinema[\s\S]*?<\/section>/)?.[0];
  assert.ok(hero(home));
  assert.equal(hero(home), hero(restoreHomeSelection('index.html', home)));
  for (const file of ['index.html', 'locations.html']) {
    const source = read(file).toString();
    for (const html of [source, renderShell(source, new Date('2026-10-29T18:00:00Z'))]) {
      assert.match(html, /src="images\/home-20261029\/el-paso.webp"/);
      if (file === 'index.html') for (const name of ['microphone', 'friends', 'celebrations']) assert.ok(html.includes('images/home-20261029/' + name + '.webp'));
    }
    assert.match(source, /site\.js\?v=20261029-home-photos/);
    assert.match(source, /public-data\.js\?v=20261029-home-photos/);
  }
  const context = { window: {} }; vm.runInNewContext(read('assets/js/public-data.js').toString(), context);
  const current = context.window.SY_DATA;
  const oldContext = { window: {} }; vm.runInNewContext(restoreHomeSelection('assets/js/public-data.js',read('assets/js/public-data.js').toString()),oldContext);
  for (const branch of current.branches) {
    const previous = oldContext.window.SY_DATA.branches.find(b => b.id === branch.id);
    if (branch.id !== 'el-paso') assert.deepEqual(JSON.parse(JSON.stringify(branch)), JSON.parse(JSON.stringify(previous)));
    else {
      assert.equal(branch.venuePhoto, 'images/home-20261029/el-paso.webp');
      const omitPhoto = b => Object.fromEntries(Object.entries(b).filter(([k]) => !['venuePhoto','venuePhotoSet','venuePhotoWidth','venuePhotoHeight','venuePosition'].includes(k)));
      assert.deepEqual(JSON.parse(JSON.stringify(omitPhoto(branch))), JSON.parse(JSON.stringify(omitPhoto(previous))));
    }
  }
  assert.match(read('el-paso.html').toString(), /images\/approved-20261026\/el-paso-people/);
});
