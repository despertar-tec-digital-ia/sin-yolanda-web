import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { inspectPublic, packagePublic, projectRoot, publicSourceDigest } from '../scripts/package-public.mjs';

function fixture(t) {
  const temporary = mkdtempSync(join(tmpdir(), 'sy-limited-release-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = join(temporary, 'source');
  // Reuse real existing commits. No fixture commits, identity overrides, network
  // access, changes to the source repo, or dependency on a donor checkout.
  execFileSync('git', ['clone', '--quiet', '--shared', projectRoot, root], { stdio: 'pipe' });
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim(), '');
  const hashes = Object.fromEntries(inspectPublic(root).files.map(path => [path,
    createHash('sha256').update(readFileSync(join(root, path))).digest('hex')]));
  const publicDigest = createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
  const record = { version: 1, targetOrigin: 'https://sin-yolanda.com', authorizer: 'Luis', sourceCommit,
    publicDigest, authorization: 'Publish this exact candidate with its pending review flags retained.' };
  function approval(change = {}, label = 'approval') {
    const path = join(root, '.artifacts', label + '.json');
    mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify({ ...record, ...change }));
    return path;
  }
  return { root, hashes, publicDigest, record, approval, destination: label => join(root, '.artifacts', label, 'public') };
}

test('public digest is deterministic and includes unmodified source headers', () => {
  const hashes = { 'styles.css': 'a'.repeat(64), '_headers': 'b'.repeat(64), 'index.html': 'c'.repeat(64) };
  const sorted = Object.fromEntries(Object.keys(hashes).sort().map(path => [path, hashes[path]]));
  assert.equal(publicSourceDigest(hashes), createHash('sha256').update(JSON.stringify(sorted)).digest('hex'));
  assert.equal(publicSourceDigest(hashes), publicSourceDigest(Object.fromEntries(Object.entries(hashes).reverse())));
  assert.notEqual(publicSourceDigest(hashes), publicSourceDigest({ ...hashes, _headers: 'd'.repeat(64) }));
});

test('limited release requires approval and default production remains fail-closed', t => {
  const f = fixture(t);
  assert.ok(inspectPublic(f.root).manifest.reviewPages.length > 0);
  for (const options of [{}, { audience: 'limited-production' }]) {
    const destination = f.destination(options.audience ?? 'default');
    assert.throws(() => packagePublic({ root: f.root, destination, ...options }), /Review-only pages|explicit approval/);
    assert.ok(!existsSync(destination));
  }
  const approval = f.approval();
  assert.throws(() => packagePublic({ root: f.root, destination: f.destination('wrong-audience'), approval }), /explicit limited-production audience/);
  assert.ok(!existsSync(f.destination('wrong-audience')));
});

test('limited approval schema, target, authorizer and source digest are strict before output', t => {
  const f = fixture(t);
  const invalid = [
    [{ version: 2 }, /approval version/],
    [{ targetOrigin: 'https://demo-sin-yolanda.despertartdigital.cloud' }, /exact official origin/],
    [{ targetOrigin: 'https://sin-yolanda.com/' }, /exact official origin/],
    [{ authorizer: 'Other' }, /authorizer Luis/],
    [{ authorization: '  ' }, /authorization text/],
    [{ sourceCommit: 'short' }, /full commit SHA/],
    [{ sourceCommit: 'f'.repeat(40) }, /exist and be an ancestor/],
    [{ publicDigest: 'invalid' }, /SHA-256 digest/],
    [{ publicDigest: '0'.repeat(64) }, /differs from inspected public sources/],
  ];
  invalid.forEach(([change, pattern], index) => {
    const destination = f.destination('invalid-' + index);
    assert.throws(() => packagePublic({ root: f.root, destination, audience: 'limited-production',
      approval: f.approval(change, 'invalid-' + index) }), pattern);
    assert.ok(!existsSync(destination));
  });
});

test('limited release requires a real clean HEAD and cannot package a dirty source', t => {
  const f = fixture(t), approval = f.approval();
  writeFileSync(join(f.root, 'index.html'), readFileSync(join(f.root, 'index.html'), 'utf8') + '\n<!-- dirty -->\n');
  const destination = f.destination('dirty');
  assert.throws(() => packagePublic({ root: f.root, destination, audience: 'limited-production', approval }), /actual clean Git HEAD/);
  assert.ok(!existsSync(destination));
});

test('limited release preserves page noindex, headers and approval flags; receipt is never public', t => {
  const f = fixture(t), approval = f.approval({ extraPrivateField: 'must not enter receipt' });
  const destination = f.destination('limited'), metadata = join(dirname(destination), 'release.json');
  const sourceHeaders = readFileSync(join(f.root, '_headers'), 'utf8');
  const sourceManifest = readFileSync(join(f.root, 'scripts/branch-import-manifest.json'), 'utf8');
  const report = packagePublic({ root: f.root, destination, metadata, audience: 'limited-production', approval });
  assert.equal(report.dirty, false); assert.equal(report.audience, 'limited-production');
  assert.equal(report.publicDigest, f.publicDigest); assert.deepEqual(report.hashes, f.hashes);
  assert.deepEqual(report.approval, f.record);
  assert.deepEqual(JSON.parse(readFileSync(metadata, 'utf8')), report);
  assert.equal(readFileSync(join(destination, '_headers'), 'utf8'), sourceHeaders);
  assert.doesNotMatch(readFileSync(join(destination, '_headers'), 'utf8'), /X-Robots-Tag:\s*noindex/);
  for (const page of report.reviewPages) assert.match(readFileSync(join(destination, page), 'utf8'),
    /<meta name="robots" content="noindex,nofollow">/);
  assert.equal(readFileSync(join(f.root, 'scripts/branch-import-manifest.json'), 'utf8'), sourceManifest);
  for (const path of ['release.json', 'approval.json', 'scripts', 'archive']) assert.ok(!existsSync(join(destination, path)));
});

test('review audience stays noindex globally but its publicDigest uses source bytes', t => {
  const f = fixture(t), destination = f.destination('review');
  const report = packagePublic({ root: f.root, destination, audience: 'review' });
  assert.equal(report.publicDigest, f.publicDigest); assert.equal(report.approval, undefined);
  assert.match(readFileSync(join(destination, '_headers'), 'utf8'), /X-Robots-Tag: noindex, nofollow/);
  assert.notEqual(publicSourceDigest(report.hashes), report.publicDigest);
});

test('limited release still requires review pages to retain noindex before authorization', t => {
  const f = fixture(t), page = inspectPublic(f.root).manifest.reviewPages[0];
  writeFileSync(join(f.root, page), readFileSync(join(f.root, page), 'utf8').replace('<meta name="robots" content="noindex,nofollow">', ''));
  const destination = f.destination('missing-page-gate');
  assert.throws(() => packagePublic({ root: f.root, destination, audience: 'limited-production', approval: f.approval() }), /Review page must remain noindex/);
  assert.ok(!existsSync(destination));
});
