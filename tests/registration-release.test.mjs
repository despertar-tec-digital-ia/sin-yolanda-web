import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publicSourceDigest } from '../scripts/package-public.mjs';
import { prepareRegistrationRelease } from '../scripts/prepare-registration-release.mjs';
import { qrMenuDestination, qrRegistrationDestination } from '../scripts/qr-redirects.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'sy-registration-release-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  const baseline = join(root, '.artifacts', 'baseline'), baselinePublic = join(baseline, 'public');
  mkdirSync(baselinePublic, { recursive: true });
  const content = { 'index.html': '<!doctype html><title>Baseline home</title>',
    '404.html': '<!doctype html><title>Missing</title>', '_headers': '/*\n  X-Content-Type-Options: nosniff\n',
    '_redirects': ['/q/gdl-menu', '/q/gdl-menu/'].map(path => `${path} ${qrMenuDestination} 302\n`).join('') };
  for (const [path, source] of Object.entries(content)) {
    writeFileSync(join(root, path), source); writeFileSync(join(baselinePublic, path), source);
  }
  const hashes = Object.fromEntries(Object.entries(content).map(([path, source]) => [path,
    createHash('sha256').update(source).digest('hex')]));
  writeFileSync(join(root, 'scripts/public-manifest.json'), JSON.stringify({ version: 1,
    pages: ['index.html', '404.html'], assets: ['_headers', '_redirects'] }));
  const record = { version: 1, commit: 'a'.repeat(40), dirty: false, audience: 'limited-production',
    fileCount: 4, hashes, publicDigest: publicSourceDigest(hashes) };
  writeFileSync(join(baseline, 'release.json'), JSON.stringify(record));
  writeFileSync(join(root, '_redirects'), content._redirects + ['/q/el-paso-registro', '/q/el-paso-registro/']
    .map(path => `${path} ${qrRegistrationDestination} 302\n`).join(''));
  return { root, baseline, baselinePublic, record,
    destination: label => join(root, '.artifacts', label), options(label) {
      return { root, baseline, destination: this.destination(label) };
    } };
}

test('unapproved preparation preserves all baseline files and produces no release approval', t => {
  const f = fixture(t), report = prepareRegistrationRelease(f.options('candidate'));
  assert.equal(report.releaseApproved, false); assert.equal(report.deployed, false);
  assert.equal(report.ghlCaptureVerifiedByThisHelper, false); assert.equal(report.remoteBaselineRevalidationRequired, true);
  assert.deepEqual(report.changedFiles, ['_redirects']); assert.equal(report.preservedFileCount, 3);
  for (const path of ['index.html', '404.html', '_headers']) {
    assert.deepEqual(readFileSync(join(report.publicDirectory, path)), readFileSync(join(f.baselinePublic, path)));
  }
  const candidate = JSON.parse(readFileSync(join(f.destination('candidate'), 'candidate.json')));
  assert.equal(candidate.audience, 'local-candidate'); assert.equal(candidate.releaseApproved, false);
  assert.ok(!existsSync(join(f.destination('candidate'), 'release.json')));
  assert.ok(!existsSync(join(report.publicDirectory, 'candidate.json')));
  assert.throws(() => prepareRegistrationRelease(f.options('candidate')), /overwrite/);
});

test('preparation rejects drift, altered baseline and extra baseline files before creating output', t => {
  for (const change of ['source', 'baseline', 'extra', 'receipt']) {
    const f = fixture(t), out = f.destination('reject');
    if (change === 'source') writeFileSync(join(f.root, 'index.html'), 'changed home');
    if (change === 'baseline') writeFileSync(join(f.baselinePublic, 'index.html'), 'changed baseline');
    if (change === 'extra') writeFileSync(join(f.baselinePublic, 'private.txt'), 'unlisted fixture');
    if (change === 'receipt') writeFileSync(join(f.baseline, 'release.json'), JSON.stringify({ ...f.record, dirty: true }));
    assert.throws(() => prepareRegistrationRelease(f.options('reject')));
    assert.ok(!existsSync(out));
  }
});

test('preparation rejects symlinks, broad output targets and missing human approval', t => {
  const f = fixture(t);
  symlinkSync(join(f.root, 'index.html'), join(f.baselinePublic, 'linked.html'));
  assert.throws(() => prepareRegistrationRelease(f.options('symlink')), /symlinks/);
  assert.ok(!existsSync(f.destination('symlink')));
  assert.throws(() => prepareRegistrationRelease({ ...f.options('broad'), destination: f.root }), /inside repository/);
  symlinkSync(f.baselinePublic, join(f.root, '.artifacts', 'linked-parent'));
  assert.throws(() => prepareRegistrationRelease({ ...f.options('linked-output'),
    destination: join(f.root, '.artifacts', 'linked-parent', 'fresh') }), /Output parent/);
  assert.ok(!existsSync(join(f.baselinePublic, 'fresh')));
  const cleanFixture = fixture(t);
  assert.throws(() => prepareRegistrationRelease({ ...cleanFixture.options('unapproved'),
    approval: join(cleanFixture.root, 'missing-approval.json') }));
  assert.ok(!existsSync(cleanFixture.destination('unapproved')));
});
