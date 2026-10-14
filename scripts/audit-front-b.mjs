// Read-only editorial preflight. Never renders, tracks, schedules or deploys.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { checkAnalyticsCoverage } from './sync-site-analytics.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const data = JSON.parse(read('scripts/editorial/front-b-events.json'));
const sourceReview = JSON.parse(read('scripts/editorial/front-b-sources.json'));
const designReview = JSON.parse(read('scripts/editorial/front-b-review.json'));
const manifest = JSON.parse(read('scripts/public-manifest.json'));
assert.equal(data.mode, 'editorial-preparation-only');
assert.equal(data.publicationEnabled, false);
assert.equal(data.schedulerEnabled, false);
const sources = new Map(data.sources.map(source => [source.id, source]));
assert.equal(sources.size, data.sources.length, 'Source IDs must be unique.');
const ids = new Set();
const zones = { 'san-ignacio': 'America/Mexico_City', houston: 'America/Chicago', 'san-antonio': 'America/Chicago', 'the-woodlands': 'America/Chicago' };
for (const source of sources.values()) {
  const url = new URL(source.url);
  assert.equal(url.protocol, 'https:');
  assert.ok(['docs.google.com', 'drive.google.com', 'www.instagram.com'].includes(url.hostname));
  assert.equal(url.search, '', 'Evidence uses stable links, never signed media URLs.');
}
for (const record of data.records) {
  assert.match(record.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(!ids.has(record.id), 'Event IDs must be unique.');
  ids.add(record.id);
  assert.ok(sources.has(record.sourceRef), 'Every event needs observed provenance.');
  assert.equal(record.timeZone, zones[record.branchId], 'Do not extrapolate another branch.');
  assert.equal(record.editorialStatus, 'draft', 'This preparation contains no operational approvals.');
  assert.equal(record.approval, null);
  if (record.branchId === 'san-ignacio') {
    assert.equal(record.timeBasis, 'branch-hours-fallback-authorized-by-Luis-20261013');
    assert.ok(record.hoursLabel.includes('horario propio del evento no confirmado'));
    if (record.date) {
      assert.equal(record.startsAt, '2026-10-31T19:00:00-06:00');
      assert.equal(record.endsAt, '2026-11-01T03:00:00-06:00');
      assert.ok(Date.parse(record.endsAt) > Date.parse(record.startsAt));
    } else {
      assert.equal(record.recurrence.endsNextDay, true);
      assert.equal(record.recurrence.startsOn, null);
      assert.equal(record.recurrence.endsOn, null);
    }
  } else {
    assert.equal(record.startsAt, null, 'Do not infer event hours from opening hours.');
    assert.equal(record.endsAt, null);
    assert.ok(record.blockers.includes('exact-start-end'));
  }
  assert.equal(record.publishFrom, null, 'Editorial lead time requires a decision.');
  assert.equal(record.expiresAt, null);
  assert.ok(record.title.es.trim());
  if (record.date) {
    assert.match(record.date, /^2026-\d{2}-\d{2}$/);
    assert.equal(new Date(record.date + 'T00:00:00Z').toISOString().slice(0, 10), record.date);
  }
  assert.ok(record.blockers.includes('operational-approval'));
  if (record.artwork) {
    assert.match(record.artwork.sha256, /^[a-f0-9]{64}$/);
    assert.ok(record.artworkAlt && record.postUrl);
    assert.match(record.postUrl, /^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]+\/$/);
    assert.equal(record.rights, 'review-only');
  }
}
const publicFiles = [...manifest.pages, ...manifest.assets];
assert.ok(publicFiles.every(path => !path.startsWith('scripts/') && !path.startsWith('docs/') && !path.includes('front-b-events')));
const productionHashes = publicFiles.map(path => [path, createHash('sha256').update(readFileSync(new URL('../' + path, import.meta.url))).digest('hex')]);
console.log(JSON.stringify({ mode: 'dry-run', observedOn: data.observedOn, recordCount: ids.size,
  eligibleIds: [], pending: data.records.map(({ id, blockers }) => ({ id, blockers })),
  sourceReview: { observedPostCount: sourceReview.posts.length, verifiedTicketSources: sourceReview.tickets.length,
    designUnitCount: Object.values(designReview.branches).reduce((count, branch) => count + branch.units.length, 0),
    // This is a semantic projection, not another 26 approved events or a live schedule.
    openIssues: sourceReview.openIssues }, analytics: checkAnalyticsCoverage(),
  publicManifestSha256: createHash('sha256').update(JSON.stringify(productionHashes)).digest('hex'),
  schedulerInstalledByThisChange: false, realTransportVerifiedByThisChange: false }, null, 2));
