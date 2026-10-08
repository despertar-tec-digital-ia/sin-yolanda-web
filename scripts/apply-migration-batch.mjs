// Mechanical, scoped migration edits. No network, publication or business approval mutation.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { analyticsAsset, syncSiteAnalyticsHtml } from './sync-site-analytics.mjs';

const root = resolve(import.meta.dirname, '..');
assert.equal(process.argv[2], '--apply', 'An explicit --apply is required for the authorized migration batch.');
const read = path => readFileSync(resolve(root, path), 'utf8');
const policy = JSON.parse(read('scripts/indexation-policy.json'));
const manifest = JSON.parse(read('scripts/public-manifest.json'));
assert.equal(policy.authorizer, 'Luis');
assert.equal(policy.pages.length, 12);
const oldVersion = manifest.assetVersion;
manifest.assetVersion = '20261008-migration-measurement';
manifest.assets = [...new Set([...manifest.assets, analyticsAsset])];
const updates = new Map();
for (const page of manifest.pages) {
  let html = read(page).replaceAll(`?v=${oldVersion}`, `?v=${manifest.assetVersion}`);
  if (policy.pages.includes(page)) {
    assert.ok(html.includes(`data-import-source-ref="${policy.sourceRef}"`), 'Reapprove a changed source revision: ' + page);
    assert.match(html, /<meta name="robots" content="(?:noindex,nofollow|index,follow,max-image-preview:large)">/);
    html = html.replace(/<meta name="robots" content="[^"]+">/, '<meta name="robots" content="index,follow,max-image-preview:large">');
    if (['san-antonio/menu/index.html', 'en/san-antonio/menu/index.html'].includes(page)) {
      html = html.replace(/<link rel="alternate" hreflang="(?:es|en|x-default)"[^>]*>/g, '');
      html = html.replace('</head>', '<link rel="alternate" hreflang="es" href="https://sin-yolanda.com/san-antonio/menu/"><link rel="alternate" hreflang="en" href="https://sin-yolanda.com/en/san-antonio/menu/"><link rel="alternate" hreflang="x-default" href="https://sin-yolanda.com/san-antonio/menu/"></head>');
    }
  }
  if (page === '404.html') html = html.replace('href="styles.css?', 'href="/styles.css?')
    .replace('href="assets/media/', 'href="/assets/media/').replace('href="locations.html"', 'href="/locations"')
    .replace('src="assets/js/', 'src="/assets/js/');
  updates.set(page, syncSiteAnalyticsHtml(html, page, manifest.assetVersion));
}
manifest.reviewPages = manifest.reviewPages.filter(page => !policy.pages.includes(page));
assert.deepEqual([...manifest.reviewPages].sort(), ['catering.html', 'el-paso.html', 'en/catering/index.html', 'en/el-paso/index.html']);
let sitemap = read('sitemap.xml');
for (const page of policy.pages) {
  const canonical = updates.get(page).match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  assert.ok(canonical?.startsWith('https://sin-yolanda.com/'));
  if (!sitemap.includes(`<loc>${canonical}</loc>`)) sitemap = sitemap.replace('</urlset>', `  <url><loc>${canonical}</loc></url>\n</urlset>`);
}
for (const [page, html] of updates) writeFileSync(resolve(root, page), html);
writeFileSync(resolve(root, 'sitemap.xml'), sitemap);
writeFileSync(resolve(root, 'scripts/public-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ indexedPages: policy.pages.length, measuredPages: manifest.pages.length - 1, protectedPages: manifest.reviewPages.length, version: manifest.assetVersion }));
