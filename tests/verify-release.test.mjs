import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyRelease } from '../scripts/verify-release.mjs';

const sha256 = source => createHash('sha256').update(source).digest('hex');
const origin = 'https://release.example';

function fixture(extraSources = {}, responses = {}) {
  const sources = { 'index.html': '<h1>Home</h1>', '404.html': '<h1>Not found</h1>',
    '_headers': '/*\n  X-Test: test\n', ...extraSources };
  const metadata = { version: 1, commit: 'a'.repeat(40), dirty: false, audience: 'limited-production',
    fileCount: Object.keys(sources).length,
    hashes: Object.fromEntries(Object.entries(sources).map(([file, source]) => [file, sha256(source)])) };
  const calls = [];
  const aliasFiles = { '/': 'index.html', '/404': '404.html', '/404/': '404.html',
    '/review': 'review.html', '/review/': 'review.html' };
  const fetchImpl = async (url, options) => {
    const path = url.pathname;
    calls.push({ url: new URL(url), options });
    if (responses[path]) return responses[path]();
    const file = aliasFiles[path] ?? path.slice(1);
    if (['_headers', '_redirects'].includes(file) || !Object.hasOwn(sources, file))
      return new Response('Not found', { status: 404 });
    return new Response(sources[file], { headers: {
      'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' } });
  };
  return { sources, metadata, calls, fetchImpl };
}

test('Cloudflare root control files are validated but never fetched or counted as served files', async () => {
  const f = fixture({ '_redirects': '/qr/gdl/menu /san-ignacio/menu/ 302\n' });
  const report = await verifyRelease({ origin, ...f });
  assert.equal(report.passed, true);
  assert.deepEqual(report.skippedFiles, ['_headers', '_redirects'].map(file => ({ file,
    reason: 'Cloudflare control file, not a served asset' })));
  assert.equal(report.summary.files, 2);
  assert.equal(report.summary.exactFiles, 2);
  assert.equal(report.summary.aliases, 3);
  assert.equal(report.summary.excludedRoutes, 10);
  assert.equal(report.releaseMetadataDigest, sha256(JSON.stringify(f.metadata)));
  assert.ok(!f.calls.some(({ url }) => ['/_headers', '/_redirects'].includes(url.pathname)));
  assert.ok(!report.observations.some(({ file }) => ['_headers', '_redirects'].includes(file)));
  assert.ok(f.calls.every(({ url, options }) => options.method === 'GET'
    && options.redirect === 'manual' && options.cache === 'no-store'
    && url.searchParams.has('sy-release-check')));
});

test('releases without optional redirects skip only the control file present', async () => {
  const f = fixture();
  const report = await verifyRelease({ origin, ...f });
  assert.equal(report.passed, true);
  assert.deepEqual(report.skippedFiles.map(({ file }) => file), ['_headers']);
  assert.equal(report.summary.files, 2);
  assert.equal(report.summary.exactFiles, 2);
});

test('unknown names and nested control-like files remain served assets with hash checks', async () => {
  const f = fixture({ '_redirects': '/qr/gdl/menu /san-ignacio/menu/ 302\n',
    '_redirects.bak': 'served backup', '_REDIRECTS': 'case-sensitive asset',
    'assets/_redirects': 'nested asset' });
  const report = await verifyRelease({ origin, ...f });
  assert.equal(report.passed, true);
  assert.equal(report.summary.files, 5);
  assert.equal(report.summary.exactFiles, 5);
  for (const file of ['_redirects.bak', '_REDIRECTS', 'assets/_redirects']) {
    assert.ok(f.calls.some(({ url }) => url.pathname === '/' + file));
    assert.ok(report.observations.some(item => item.file === file && item.exactHash));
    assert.ok(!report.skippedFiles.some(item => item.file === file));
  }
});

test('control hashes, malformed paths and existing metadata gates are checked before fetching', async () => {
  const invalid = [];
  for (const file of ['_headers', '_redirects']) {
    const f = fixture({ '_redirects': '/qr/gdl/menu /san-ignacio/menu/ 302\n' });
    f.metadata.hashes[file] = 'invalid';
    invalid.push([f, /Invalid release SHA-256/]);
  }
  for (const file of ['../_redirects', '/_redirects', '_redirects/..', 'assets//_redirects',
    '_redirects%2fsecret', '_redirects%5csecret', '%', 'docs/_redirects']) {
    const f = fixture({ [file]: 'unsafe file' });
    invalid.push([f, /Unsafe release file path/]);
  }
  for (const [change, pattern] of [
    [{ version: 2 }, /Unsupported release metadata/],
    [{ commit: 'short' }, /full commit SHA/],
    [{ dirty: true }, /dirty release/],
    [{ fileCount: 99 }, /Incomplete release file list/],
    [{ reviewPages: ['_headers'] }, /Invalid review page list/],
    [{ reviewPages: ['404.html', '404.html'] }, /Invalid review page list/],
  ]) {
    const f = fixture(); Object.assign(f.metadata, change); invalid.push([f, pattern]);
  }
  for (const file of ['index.html', '404.html', '_headers']) {
    const f = fixture(); delete f.metadata.hashes[file]; f.metadata.fileCount--;
    invalid.push([f, /Incomplete release file list/]);
  }
  for (const [f, pattern] of invalid) {
    await assert.rejects(verifyRelease({ origin, ...f }), pattern);
    assert.equal(f.calls.length, 0);
  }
  for (const unsafeOrigin of ['http://release.example', origin + '/path',
    'https://user:password@release.example', origin + '?query=yes', origin + '#fragment']) {
    const f = fixture();
    await assert.rejects(verifyRelease({ origin: unsafeOrigin, ...f }), /Use HTTPS|Use an origin/);
    assert.equal(f.calls.length, 0);
  }
});

test('served content, HTML content type and excluded-route status gates remain enforced', async () => {
  for (const [path, response, problem] of [
    ['/index.html', () => new Response('<h1>Changed</h1>', { headers: { 'Content-Type': 'text/html' } }), 'hash-mismatch'],
    ['/index.html', () => new Response('<h1>Home</h1>', { headers: { 'Content-Type': 'text/plain' } }), 'html-content-type-mismatch'],
    ['/index.html', () => new Response('Not found', { status: 404 }), 'release-file-not-200'],
    ['/dashboard', () => new Response('Unexpectedly public'), 'excluded-route-not-404'],
  ]) {
    const f = fixture({ '_redirects': '/qr/gdl/menu /san-ignacio/menu/ 302\n' }, { [path]: response });
    const report = await verifyRelease({ origin, ...f });
    assert.equal(report.passed, false);
    assert.ok(report.observations.find(item => item.path === path).problems.includes(problem));
  }
});

test('home and pending-review robots gates remain enforced', async () => {
  const home = fixture({}, { '/index.html': () => new Response('<h1>Home</h1>', {
    headers: { 'Content-Type': 'text/html', 'X-Robots-Tag': 'noindex' } }) });
  const homeReport = await verifyRelease({ origin, ...home });
  assert.equal(homeReport.passed, false);
  assert.ok(homeReport.observations.find(item => item.path === '/index.html').problems.includes('home-is-noindex'));
  for (const [source, passed] of [
    ['<h1>Review</h1>', false],
    ['<meta name="robots" content="noindex,nofollow"><h1>Review</h1>', true],
  ]) {
    const f = fixture({ 'review.html': source }); f.metadata.reviewPages = ['review.html'];
    const report = await verifyRelease({ origin, ...f });
    assert.equal(report.passed, passed);
    assert.equal(report.observations.find(item => item.path === '/review.html')
      .problems.includes('review-robots-meta-missing'), !passed);
  }
});

test('file redirects remain restricted to existing aliases on the same origin', async () => {
  const allowed = fixture({}, { '/index.html': () => new Response(null, { status: 301,
    headers: { Location: '/' } }) });
  assert.equal((await verifyRelease({ origin, ...allowed })).passed, true);
  for (const target of ['/_redirects', '/elsewhere', 'https://other.example/']) {
    const f = fixture({ '_redirects': '/qr/gdl/menu /san-ignacio/menu/ 302\n' }, {
      '/index.html': () => new Response(null, { status: 302, headers: { Location: target } }) });
    const report = await verifyRelease({ origin, ...f });
    assert.equal(report.passed, false);
    assert.ok(report.observations.find(item => item.path === '/index.html')
      .problems.includes('redirect-outside-file-aliases'));
    assert.ok(!f.calls.some(({ url }) => url.pathname === '/_redirects' || url.origin !== origin));
  }
});
