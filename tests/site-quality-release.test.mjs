import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, rmSync, mkdtempSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {packagePublic} from '../scripts/package-public.mjs';
import {projectPublicRelease} from '../scripts/editorial/public-release.mjs';
import {buildSiteQualityReview} from '../scripts/site-quality-review.mjs';
import {auditSiteQuality} from '../scripts/audit-site-quality.mjs';
import {planAgendaRefresh} from '../scripts/plan-agenda-refresh.mjs';
import {qualitySource, restoreQualitySource} from '../scripts/site-quality/source-contract.mjs';

const root = resolve(import.meta.dirname, '..');
const hash = text => createHash('sha256').update(text).digest('hex');

test('the manifest delta restores historical bytes exactly and never hides an unrelated or ambiguous change', () => {
  const file = qualitySource.file, source = readFileSync(resolve(root, file), 'utf8');
  assert.equal(hash(source), qualitySource.afterSha256);
  const restored = restoreQualitySource(file, source);
  assert.equal(hash(restored), qualitySource.beforeSha256);
  assert.equal(restoreQualitySource(file, restored), restored);
  assert.notEqual(hash(restoreQualitySource(file, source + 'unrelated edit')), qualitySource.beforeSha256);
  assert.throws(() => restoreQualitySource(file, source + qualitySource.patches[0].after), /ambiguous/);
  for (const asset of ['site-quality-pilot.css', 'gbp-hours-model.js', 'gbp-hours-client.js', 'site-quality-controls.js']) {
    assert.throws(() => restoreQualitySource(file, source.replace(asset, 'unreviewed.js')), /changed/);
  }
});

test('normal package and protected review use the same final bytes with only preview headers differing', t => {
  const out = mkdtempSync(resolve(root, '.artifacts/release-parity-'));
  t.after(() => rmSync(out, {recursive: true, force: true}));
  const now = '2026-11-24T18:00:00Z';
  const normal = packagePublic({root, now, destination: resolve(out, 'normal/public'), metadata: resolve(out, 'normal/release.json')});
  const review = buildSiteQualityReview({root, now, out: resolve(out, 'review')});
  assert.equal(normal.qualityBuildIntegrated, true);
  assert.equal(normal.publicationEnabled, false, 'A build is not a production authorization');
  assert.equal(normal.audience, 'production');
  assert.equal(normal.fileCount, 405); assert.equal(review.fileCount, 405);
  assert.deepEqual(Object.keys(normal.hashes), Object.keys(review.hashes));
  for (const [file, digest] of Object.entries(normal.hashes)) if (file !== '_headers') assert.equal(review.hashes[file], digest, file);
  assert.doesNotMatch(readFileSync(resolve(out, 'normal/public/_headers'), 'utf8'), /X-Robots-Tag: noindex, nofollow/);
  assert.match(readFileSync(resolve(out, 'review/public/_headers'), 'utf8'), /X-Robots-Tag: noindex, nofollow/);
  const audit = auditSiteQuality({artifact: resolve(out, 'normal/public'), now});
  assert.equal(audit.seo.passed, true); assert.equal(audit.commercial.passed, true);
  assert.equal(audit.attribution.passed, true);
  assert.equal(audit.attribution.placements, 7);
  assert.throws(() => packagePublic({root, destination: resolve(out, 'rejected'), quality: false}), /Only local review/);
});

test('scheduled refresh uses final quality data and refuses an unreleased branch', async () => {
  const now = '2026-11-25T22:00:00Z', commit = 'a'.repeat(40);
  const final = projectPublicRelease(root, {now, commit});
  assert.equal(final.quality.pilotPages.length, 8);
  const loader = async url => {
    const path = new URL(url).pathname;
    const file = path === '/houston' ? 'houston.html' : path.slice(1);
    return new Response(final.files.get(file) ?? readFileSync(resolve(root, file), 'utf8'));
  };
  const identical = await planAgendaRefresh({root, commit, now, fetchImpl: loader});
  assert.equal(identical.changed, false); assert.equal(identical.reason, 'unchanged-approved-agenda');
  const next = await planAgendaRefresh({root, commit, now: '2026-11-26T08:00:00Z', fetchImpl: loader});
  assert.equal(next.changed, true, 'Local midnight/closing changes must be retained by the scheduled lane');
  const withheld = await planAgendaRefresh({root, commit: 'b'.repeat(40), now, fetchImpl: loader});
  assert.equal(withheld.changed, false); assert.equal(withheld.reason, 'main-revision-not-live');
  for (const file of ['houston.html', 'en/houston/index.html', 'el-paso.html', 'en/el-paso/index.html']) {
    const html = final.files.get(file);
    assert.ok(html.includes('data-site-quality-pilot="agenda"'));
    assert.ok(html.includes('sy-reviewed-hours-data'));
    assert.doesNotMatch(html, /src="\/assets\/js\/october-hours\.js/);
  }
  const digestText = final.files.get('houston.html').replace(/ data-agenda-render-digest="[a-f0-9]+"/, '');
  const changed = new Map(final.files); changed.set('houston.html', digestText);
  assert.equal(hash(JSON.stringify([...changed].sort(([a], [b]) => a.localeCompare(b)).map(([file, text]) => [file, hash(text)]))), final.metadata.renderDigest);
});
