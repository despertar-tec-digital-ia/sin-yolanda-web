import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const pages = ['houston.html', 'en/houston/index.html'];
const manifest = JSON.parse(read('scripts/public-manifest.json'));
const baseline = JSON.parse(read('scripts/seo-baseline.json'));
const asset = 'assets/css/houston-header.css';
const link = `<link rel="stylesheet" href="/${asset}?v=${manifest.assetVersions[asset]}">`;

test('the overlay correction is versioned, Houston-only and retained by SEO regeneration', () => {
  assert.ok(manifest.assets.includes(asset));
  assert.equal(manifest.assetVersions[asset], '20261012-overlay');
  for (const file of manifest.pages) {
    const html = read(file);
    assert.equal(html.includes(link), pages.includes(file), file);
    if (pages.includes(file)) {
      assert.equal(html.split(link).length, 2, file + ': single stylesheet');
      assert.ok(html.indexOf(link) > html.indexOf('/_astro/BranchLanding.DjLMrFlp.css'));
      assert.ok(baseline[file].head.includes(link), file + ': reusable SEO head');
      assert.ok(html.includes('/_astro/BranchLanding.astro_astro_type_script_index_0_lang.ZQG6QDdt.js'));
    }
  }
});

test('the imported header stylesheet and scroll/focus behavior are not replaced', () => {
  const original = JSON.parse(read('scripts/demo-promotion.json'));
  const file = '_astro/BranchLanding.DjLMrFlp.css';
  const expected = original.exactDemo[file] || original.preserved[file];
  assert.ok(expected, 'Original asset must have a complete integrity record');
  assert.equal(createHash('sha256').update(read(file)).digest('hex'), expected);
  assert.match(read('_astro/houston-scroll-header.BxWPzCxQ.js'), /focusin/);
});
