// Coordinate explicit imported review pages and their dependencies; never publishes.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const snapshotFlag = process.argv.indexOf('--snapshot');
assert.ok(snapshotFlag >= 0, 'Explicit preserved source snapshot required');
const snapshot = process.argv[snapshotFlag + 1];
assert.match(snapshot ?? '', /^archive\/source-snapshots\/[a-z0-9-]+\/manifest\.json$/, 'Snapshot must be an archived public source manifest');
const preserved = JSON.parse(readFileSync(resolve(root, snapshot), 'utf8'));
assert.ok(preserved.complete && preserved.branches.length === 5 && preserved.sources.every(item => item.stable), 'Five stable live branch snapshots required before replacing fiches');
const ids = ['houston', 'san-antonio', 'the-woodlands', 'san-ignacio', 'el-paso', 'catering'];
const selections = JSON.parse(readFileSync(resolve(root, 'scripts/branch-import-manifest.json'), 'utf8'));
const reports = ids.map(id => JSON.parse(readFileSync(resolve(root, `.artifacts/import-review-${id}.json`), 'utf8')));
for (let index = 0; index < reports.length; index++) {
  const report = reports[index], selection = selections[ids[index]];
  assert.ok(report.selection === ids[index] && report.audience === 'review' && report.dryRun === false && report.importReady,
    'Import must be completed explicitly for each selection');
  assert.equal(report.sourceRef, selection.sourceRef, 'Unpinned donor revision');
  assert.deepEqual(report.routes, selection.routes, 'Unexpected imported route');
  for (const {to} of report.routes) {
    const html = readFileSync(resolve(root, to), 'utf8');
    assert.ok(html.includes(`data-import-source-ref="${report.sourceRef}"`) && html.includes('data-import-audience="review"')
      && html.includes('<meta name="robots" content="noindex,nofollow">'), 'Missing local-only page provenance');
  }
}
assert.equal(new Set(reports.map(report => report.sourceRef)).size, 1, 'One donor revision per integration batch');
const manifestPath = resolve(root, 'scripts/public-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const oldVersion = manifest.assetVersion;
manifest.reviewPages = reports.flatMap(report => report.routes.map(route => route.to));
manifest.pages = [...new Set([...manifest.pages, ...manifest.reviewPages])];
manifest.assets = [...new Set([...manifest.assets, ...reports.flatMap(report => report.assets)])];
manifest.assetVersion = '20261008-branch-review';
for (const path of manifest.pages) {
  const file = resolve(root, path), html = readFileSync(file, 'utf8');
  const updated = html.replaceAll(`?v=${oldVersion}`, `?v=${manifest.assetVersion}`);
  if (updated !== html) writeFileSync(file, updated);
}
const reviewCanonicals = new Set(reports.flatMap(report => report.routes.map(route => route.canonical)));
const sitemapPath = resolve(root, 'sitemap.xml');
const sitemap = readFileSync(sitemapPath, 'utf8').replace(/\s*<url>[\s\S]*?<\/url>/g,
  entry => reviewCanonicals.has(entry.match(/<loc>([^<]+)<\/loc>/)?.[1]) ? '' : entry);
writeFileSync(sitemapPath, sitemap);
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({reviewPages: manifest.reviewPages.length, pages: manifest.pages.length,
  files: manifest.pages.length + manifest.assets.length, preservedSnapshot: snapshot, audience: 'local-review', deployment: false}));
