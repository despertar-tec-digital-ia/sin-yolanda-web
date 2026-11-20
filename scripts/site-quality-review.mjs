// Compose a local candidate over the current, fully projected site. Never called by production.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, copyFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packagePublic} from './package-public.mjs';
import {projectQualitySeo} from './site-quality/seo-projection.mjs';
import {projectReviewedHours, reviewedHoursAssets} from './site-quality/reviewed-hours.mjs';
import {projectReviewedEventClock} from './site-quality/event-clock.mjs';
import {projectQualityNavigation} from './site-quality/navigation.mjs';

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
  const currentPages = () => new Map([...pages].map(([file, source]) => [file, changed.get(file) ?? source]));
  const hours = projectReviewedHours({pages: currentPages(), read: file => changed.get(file) ?? read(file), now});
  for (const pair of hours.files) changed.set(...pair);
  const eventClock = projectReviewedEventClock({pages: currentPages(), now});
  for (const pair of eventClock.files) changed.set(...pair);
  const navigation = projectQualityNavigation({pages: currentPages()});
  for (const pair of navigation.files) changed.set(...pair);
  const pilotPages = [], controlPages = [];
  for (const [file, source] of currentPages()) {
    const body = source.match(/<body\b[^>]*>/)?.[0] ?? '';
    const branch = body.match(/data-branch="([^"]+)"/)?.[1];
    const agenda = /class="[^"]*\bbranch-landing\b/.test(body) && branches.has(branch);
    const controls = /class="[^"]*\b(?:digital-menu-page|gdl-original-menu|ep-menu-page)\b/.test(body) || file === 'aviso-de-privacidad.html';
    if (!agenda && !controls) continue;
    assert.ok(!source.includes('data-site-quality-pilot='), 'Do not apply the pilot twice');
    const flag = agenda ? ' data-site-quality-pilot="agenda"' : ' data-site-quality-controls="targets"';
    const html = source.replace(/<body\b[^>]*>/, tag => tag.replace('>', flag + '>'))
      .replace('</head>', `<link rel="stylesheet" href="/${asset}?v=20261119-agenda-pilot"></head>`);
    changed.set(file, html); (agenda ? pilotPages : controlPages).push(file);
  }
  assert.equal(pilotPages.length, 8, 'Expected the four existing Texas locations in ES/EN');
  for (const [file, text] of changed) {
    assert.ok(Object.hasOwn(baseline.hashes, file), 'The pilot may only patch existing public files');
    writeFileSync(resolve(publicRoot, file), text);
  }
  assert.ok(Object.hasOwn(baseline.hashes, 'images/catering-review/pattern-band.webp'), 'Use only an existing published brand illustration');
  for (const file of [asset, ...reviewedHoursAssets]) copyFileSync(resolve(root, file), resolve(publicRoot, file));
  const files = [...new Set([...Object.keys(baseline.hashes), asset, ...reviewedHoursAssets])].sort();
  const hashes = Object.fromEntries(files.map(file => [file, hash(readFileSync(resolve(publicRoot, file)))]));
  const report = {...baseline, fileCount: files.length, hashes, publicDigest: hash(JSON.stringify(hashes)),
    publicationEnabled: false, productionIntegrated: false, qualityReview: {version: 2, base: baseline.commit, asOf: now, pilotPages, controlPages,
      seo: seo.metadata, hours: {...hours.metadata, eventEditorialExpiryReconciled: true}, eventClock: eventClock.metadata,
      navigation: navigation.metadata, changes: [...seo.changes, ...hours.changes, ...eventClock.changes, ...navigation.changes]}};
  writeFileSync(resolve(out, 'release.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildSiteQualityReview({root: resolve(import.meta.dirname, '..'), out: process.argv[2], now: process.argv[3]});
  console.log(JSON.stringify({audience: report.audience, fileCount: report.fileCount, publicationEnabled: false, pilotPages: report.qualityReview.pilotPages, seo: report.qualityReview.seo}));
}
