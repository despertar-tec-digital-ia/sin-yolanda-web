import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
test('retired branch is absent from public data, navigation, metadata and sitemap', () => {
  const context = { window: {} };
  vm.runInNewContext(readFileSync(new URL('assets/js/public-data.js', root), 'utf8'), context);
  assert.deepEqual(Array.from(context.window.SY_DATA.branches, branch => branch.id),
    ['san-ignacio', 'san-antonio', 'the-woodlands', 'houston', 'el-paso', 'moreno-valley', 'san-diego']);
  assert.ok(!context.window.SY_DATA.branches.some(branch => branch.id === 'maricarmen'));
  assert.doesNotMatch(readFileSync(new URL('assets/js/site.js', root), 'utf8'), /href=["']maricarmen(?:\.html|\/)/i);
  for (const path of ['locations.html', 'sitemap.xml']) {
    assert.doesNotMatch(readFileSync(new URL(path, root), 'utf8'), /maricarmen/i, path);
  }
  assert.ok(!existsSync(new URL('maricarmen.html', root)));
  assert.ok(existsSync(new URL('archive/retired/maricarmen.html', root)));
  assert.ok(existsSync(new URL('404.html', root)));
});
test('retirement is not a destructive menu rewrite', () => {
  assert.match(readFileSync(new URL('houston/menu/index.html', root), 'utf8'), /p4-shots-sin-yolanda-maricarmen/);
  assert.match(readFileSync(new URL('houston.html', root), 'utf8'), /<iframe/);
});
test('every consumer requests the updated scripts rather than cached retired data', () => {
  const { pages, assetVersion } = JSON.parse(readFileSync(new URL('scripts/public-manifest.json', root), 'utf8'));
  assert.equal(assetVersion, '20261008-source');
  for (const name of pages) {
    const html = readFileSync(new URL(name, root), 'utf8');
    for (const [,source] of html.matchAll(/src="(assets\/js\/(?:public-data|site)\.js[^\"]*)"/g)) {
      assert.ok(source.endsWith('?v=' + assetVersion), name);
    }
  }
});
