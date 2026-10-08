import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { request } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, unlinkSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createReviewServer, loadReviewPackage, startReviewServer } from '../scripts/serve-review.mjs';

function fixture(t) {
  const repository = mkdtempSync(join(tmpdir(), 'sy-review-server-'));
  t.after(() => rmSync(repository, { recursive: true, force: true }));
  const root = join(repository, '.artifacts', 'candidate', 'public');
  const sources = { 'index.html': '<h1>Home</h1>', 'houston.html': '<h1>Houston location</h1>',
    'houston/menu/index.html': '<h1>Houston menu</h1>', 'en/houston/index.html': '<h1>Houston EN</h1>',
    '404.html': '<h1>Not found</h1>', 'assets/logo.svg': '<svg></svg>', 'assets/video.mp4': '0123456789', '_headers': '/*\n  X-Test: test\n' };
  for (const [path, source] of Object.entries(sources)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), source);
  }
  const metadata = { version: 1, fileCount: Object.keys(sources).length, audience: 'review',
    hashes: Object.fromEntries(Object.entries(sources).map(([path, source]) => [path, createHash('sha256').update(source).digest('hex')])) };
  writeFileSync(join(dirname(root), 'release.json'), JSON.stringify(metadata));
  return { repository, root, files: Object.keys(sources), metadata };
}
async function serve(t, options) {
  const server = await startReviewServer({ ...options, port: 0 });
  t.after(() => new Promise(resolve => server.close(resolve)));
  assert.equal(server.address().address, '127.0.0.1');
  return 'http://127.0.0.1:' + server.address().port;
}
function rawRequest(origin, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request(origin, { path, method }, res => {
      let body = ''; res.setEncoding('utf8'); res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject); req.end();
  });
}
test('review packages require an ignored explicit root and matching release hashes', t => {
  const f = fixture(t);
  assert.deepEqual(loadReviewPackage(f.root, f.repository).files, f.files);
  assert.throws(() => loadReviewPackage(f.repository, f.repository), /ignored artifact/);
  writeFileSync(join(f.root, 'houston.html'), '<h1>Changed after packaging</h1>');
  assert.throws(() => loadReviewPackage(f.root, f.repository), /release hash/);
});
test('clean branch paths prefer HTML over menu directories; nested indexes remain usable', async t => {
  const f = fixture(t), origin = await serve(t, f);
  for (const path of ['/houston', '/houston/', '/houston.html', '/houston/?v=test']) {
    const res = await rawRequest(origin, path);
    assert.equal(res.status, 200); assert.equal(res.body, '<h1>Houston location</h1>');
    assert.match(res.headers['content-type'], /text\/html/);
  }
  for (const path of ['/houston/menu', '/houston/menu/', '/houston/menu/index.html'])
    assert.equal((await rawRequest(origin, path)).body, '<h1>Houston menu</h1>');
  for (const path of ['/en/houston', '/en/houston/'])
    assert.equal((await rawRequest(origin, path)).body, '<h1>Houston EN</h1>');
  assert.equal((await rawRequest(origin, '/')).body, '<h1>Home</h1>');
});
test('true 404, no directory listings and no unlisted incidental files', async t => {
  const f = fixture(t); writeFileSync(join(f.root, 'accidental.html'), 'private incidental');
  const origin = await serve(t, f);
  for (const path of ['/unknown', '/accidental.html', '/assets/', '/_headers', '/houston.html/']) {
    const res = await rawRequest(origin, path);
    assert.equal(res.status, 404); assert.equal(res.body, '<h1>Not found</h1>');
    assert.match(res.headers['x-robots-tag'], /noindex/);
  }
});
test('GET/HEAD only; safe media ranges and no bodies for HEAD', async t => {
  const origin = await serve(t, fixture(t));
  const head = await rawRequest(origin, '/houston', 'HEAD');
  assert.equal(head.status, 200); assert.equal(head.body, ''); assert.equal(head.headers['content-length'], '25');
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const res = await rawRequest(origin, '/houston', method);
    assert.equal(res.status, 405); assert.equal(res.headers.allow, 'GET, HEAD');
  }
  const ranged = await fetch(origin + '/assets/video.mp4', { headers: { Range: 'bytes=2-5' } });
  assert.equal(ranged.status, 206); assert.equal(await ranged.text(), '2345');
  assert.equal(ranged.headers.get('content-range'), 'bytes 2-5/10');
  assert.equal((await fetch(origin + '/assets/video.mp4', { headers: { Range: 'bytes=90-' } })).status, 416);
});
test('reject traversal, encoded separators, malformed escapes and symlinks', async t => {
  const f = fixture(t), origin = await serve(t, f);
  for (const path of ['/../houston.html', '/%2e%2e/houston.html', '/assets/%2f../houston.html',
    '/assets/%5c..%5chouston.html', '/%00', '/%', '//houston', '/./houston'])
    assert.equal((await rawRequest(origin, path)).status, 400, path);
  const outside = join(f.repository, 'outside.html'); writeFileSync(outside, 'private outside');
  unlinkSync(join(f.root, 'houston.html')); symlinkSync(outside, join(f.root, 'houston.html'));
  assert.equal((await rawRequest(origin, '/houston')).status, 403);
  assert.throws(() => createReviewServer(f), /Symlinks/);
  assert.throws(() => loadReviewPackage(f.root, f.repository), /Symlinks/);
});
test('review allowlist rejects unsafe paths and duplicate entries', t => {
  const f = fixture(t);
  for (const path of ['../outside.html', '/houston.html', '.env', 'assets//logo.svg', 'assets/./logo.svg'])
    assert.throws(() => createReviewServer({ ...f, files: [...f.files, path] }), /safe file allowlist/);
  assert.throws(() => createReviewServer({ ...f, files: [...f.files, 'index.html'] }), /Duplicate/);
});
test('linked ancestor directories and a replaced root are never served', async t => {
  const f = fixture(t), origin = await serve(t, f);
  const originalAssets = join(f.root, 'original-assets');
  renameSync(join(f.root, 'assets'), originalAssets);
  symlinkSync(originalAssets, join(f.root, 'assets'));
  assert.equal((await rawRequest(origin, '/assets/logo.svg')).status, 403);
  unlinkSync(join(f.root, 'assets')); renameSync(originalAssets, join(f.root, 'assets'));
  const originalRoot = f.root + '-original';
  renameSync(f.root, originalRoot); symlinkSync(originalRoot, f.root);
  assert.equal((await rawRequest(origin, '/houston')).status, 403);
});
