import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileGa4Bundle } from './analytics/ga4-bundle.mjs';

export const ga4Asset = 'assets/js/ga4-consent.js';
export const ga4Style = 'assets/css/ga4-consent.css';
const root = fileURLToPath(new URL('../', import.meta.url));

export function checkGa4Coverage(sourceRoot = root) {
  const read = path => readFileSync(resolve(sourceRoot, path), 'utf8');
  const manifest = JSON.parse(read('scripts/public-manifest.json'));
  assert.equal(read(ga4Asset), compileGa4Bundle(sourceRoot), 'Regenerate the GA4 bundle after changing its owners.');
  for (const asset of [ga4Asset, ga4Style]) assert.ok(manifest.assets.includes(asset));
  let measuredPages = 0;
  for (const page of manifest.pages) {
    const html = read(page);
    const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)]
      .filter(([,src]) => src.split('?')[0] === '/' + ga4Asset);
    const styles = [...html.matchAll(/<link\b[^>]*href="([^"]+)"[^>]*>/g)]
      .filter(([,href]) => href.split('?')[0] === '/' + ga4Style);
    if (page === '404.html') {
      assert.equal(scripts.length, 0); assert.equal(styles.length, 0); continue;
    }
    assert.equal(scripts.length, 1, page); assert.equal(styles.length, 1, page);
    assert.equal(scripts[0][1], '/' + ga4Asset + '?v=' + manifest.assetVersions[ga4Asset]);
    assert.equal(styles[0][1], '/' + ga4Style + '?v=' + manifest.assetVersions[ga4Style]);
    assert.match(scripts[0][0], /\bdefer\b/);
    assert.ok(html.indexOf('/assets/js/site-measurement.js?') < html.indexOf(scripts[0][0]), page + ': current owner must precede GA4');
    assert.doesNotMatch(html, /googletagmanager\.com|google-analytics\.com/, page + ': no direct pre-consent Google loader');
    measuredPages++;
  }
  return { measuredPages, excludedPages: ['404.html'] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--write') writeFileSync(resolve(root, ga4Asset), compileGa4Bundle(root));
  else assert.equal(process.argv[2], '--check');
  console.log(JSON.stringify(checkGa4Coverage()));
}
