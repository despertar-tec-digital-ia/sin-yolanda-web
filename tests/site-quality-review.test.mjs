import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {buildSiteQualityReview} from '../scripts/site-quality-review.mjs';

const root = resolve(import.meta.dirname, '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('quality pilot stays opt-in, preserves the existing site and cannot introduce new public routes', t => {
  const out = resolve(root, '.artifacts/quality-review-test-' + process.pid);
  t.after(() => rmSync(out, {recursive: true, force: true}));
  const report = buildSiteQualityReview({root, out, now: '2026-11-19T23:00:00Z'});
  const baseline = JSON.parse(readFileSync(resolve(out, 'baseline-release.json')));
  assert.equal(report.publicationEnabled, false);
  assert.equal(report.productionIntegrated, false);
  assert.equal(report.audience, 'review');
  const allowed = new Set([...report.qualityReview.pilotPages, ...report.qualityReview.changes.map(change => change.file)]);
  for (const [file, expected] of Object.entries(baseline.hashes)) {
    if (!allowed.has(file)) assert.equal(hash(readFileSync(resolve(out, 'public', file))), expected, file + ' must remain unchanged');
  }
  assert.equal(report.fileCount, baseline.fileCount + 1);
  for (const file of report.qualityReview.pilotPages) {
    const html = readFileSync(resolve(out, 'public', file), 'utf8');
    assert.equal((html.match(/data-catering-teaser=/g) ?? []).length, 1);
    assert.ok(html.includes('data-site-quality-pilot="agenda"'));
    const original = html.replace(' data-site-quality-pilot="agenda"', '')
      .replace('<link rel="stylesheet" href="/assets/css/site-quality-pilot.css?v=20261119-agenda-pilot">', '');
    assert.equal(hash(original), baseline.hashes[file], file + ': hero, menu, provider, data and navigation are unchanged');
  }
  const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/public-manifest.json')));
  assert.ok(!manifest.assets.includes('assets/css/site-quality-pilot.css'));
  assert.ok(!readFileSync(resolve(root, 'scripts/editorial/public-site.mjs'), 'utf8').includes('site-quality/'));
  assert.throws(() => buildSiteQualityReview({root, out: resolve(root, 'published-quality')}), /ignored local/);
  assert.throws(() => buildSiteQualityReview({root, out}), /fresh/);
});
