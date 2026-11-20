// Compose a local candidate over the current, fully projected site. Never called by production.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, copyFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packagePublic} from './package-public.mjs';
import {projectQualitySeo} from './site-quality/seo-projection.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const asset = 'assets/css/site-quality-pilot.css';
const branches = new Set(['houston', 'san-antonio', 'the-woodlands', 'el-paso']);
export function buildSiteQualityReview({root, out, now = new Date().toISOString()} = {}) {
  root = resolve(root); out = resolve(out);
  assert.ok(out.startsWith(resolve(root, '.artifacts') + '/'), 'Review must stay in ignored local artifacts');
  assert.ok(!existsSync(out), 'Use a fresh review directory');
  const publicRoot = resolve(out, 'public');
  const baseline = packagePublic({root, destination: publicRoot, metadata: resolve(out, 'baseline-release.json'), audience: 'review', now});
  const read = file => readFileSync(resolve(publicRoot, file), 'utf8');
  const pages = new Map(Object.keys(baseline.hashes).filter(file => file.endsWith('.html')).map(file => [file, read(file)]));
  const seo = projectQualitySeo({pages, read});
  const changed = new Map(seo.files);
  const pilotPages = [];
  for (const [file, source] of pages) {
    const body = source.match(/<body\b[^>]*>/)?.[0] ?? '';
    if (!/class="[^"]*\bbranch-landing\b/.test(body)) continue;
    const branch = body.match(/data-branch="([^"]+)"/)?.[1];
    if (!branches.has(branch)) continue;
    assert.ok(!source.includes('data-site-quality-pilot='), 'Do not apply the pilot twice');
    const current = changed.get(file) ?? source;
    const html = current.replace(/<body\b[^>]*>/, tag => tag.replace('>', ' data-site-quality-pilot="agenda">'))
      .replace('</head>', `<link rel="stylesheet" href="/${asset}?v=20261119-agenda-pilot"></head>`);
    changed.set(file, html); pilotPages.push(file);
  }
  assert.equal(pilotPages.length, 8, 'Expected the four existing Texas locations in ES/EN');
  for (const [file, text] of changed) {
    assert.ok(Object.hasOwn(baseline.hashes, file), 'The pilot may only patch existing public files');
    writeFileSync(resolve(publicRoot, file), text);
  }
  assert.ok(Object.hasOwn(baseline.hashes, 'images/catering-review/pattern-band.webp'), 'Use only an existing published brand illustration');
  copyFileSync(resolve(root, asset), resolve(publicRoot, asset));
  const files = [...Object.keys(baseline.hashes), asset].sort();
  const hashes = Object.fromEntries(files.map(file => [file, hash(readFileSync(resolve(publicRoot, file)))]));
  const report = {...baseline, fileCount: files.length, hashes, publicDigest: hash(JSON.stringify(hashes)),
    publicationEnabled: false, productionIntegrated: false, qualityReview: {version: 1, base: baseline.commit, asOf: now, pilotPages, seo: seo.metadata, changes: seo.changes}};
  writeFileSync(resolve(out, 'release.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildSiteQualityReview({root: resolve(import.meta.dirname, '..'), out: process.argv[2], now: process.argv[3]});
  console.log(JSON.stringify({audience: report.audience, fileCount: report.fileCount, publicationEnabled: false, pilotPages: report.qualityReview.pilotPages, seo: report.qualityReview.seo}));
}
