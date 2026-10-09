import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { request } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createReviewServer, loadReviewPackage, startReviewServer } from '../scripts/serve-review.mjs';

const destination = 'https://sinyolandagdl.com/menu/?utm_source=qr&utm_medium=offline&utm_campaign=menu_guadalajara';
const redirectSource = ['/q/gdl-menu', '/q/gdl-menu/'].map(path => `${path} ${destination} 302`).join('\n') + '\n';

function fixture(t, { allowRedirects = true, source = redirectSource } = {}) {
  const repository = mkdtempSync(join(tmpdir(), 'sy-qr-review-'));
  t.after(() => rmSync(repository, { recursive: true, force: true }));
  const root = join(repository, '.artifacts', 'candidate', 'public');
  const sources = { 'index.html': '<h1>Home</h1>', '404.html': '<h1>Not found</h1>',
    'q/gdl-menu.html': '<h1>Asset must not override redirect</h1>', '_headers': '/*\n  X-Test: test\n',
    '_redirects': source };
  for (const [path, content] of Object.entries(sources)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  const files = Object.keys(sources).filter(path => allowRedirects || path !== '_redirects');
  const metadata = { version: 1, audience: 'review', fileCount: files.length,
    hashes: Object.fromEntries(files.map(path => [path, createHash('sha256').update(sources[path]).digest('hex')])) };
  writeFileSync(join(dirname(root), 'release.json'), JSON.stringify(metadata));
  return { repository, root, files };
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

test('QR GET and HEAD redirect before asset lookup on the two exact decoded paths', async t => {
  const f = fixture(t), candidate = loadReviewPackage(f.root, f.repository), origin = await serve(t, candidate);
  for (const path of ['/q/gdl-menu', '/q/gdl-menu/', '/q/%67dl-menu', '/q/gdl-menu?destination=https%3A%2F%2Fevil.example',
    '/q/gdl-menu/?utm_source=attacker&utm_campaign=other#fragment']) {
    for (const method of ['GET', 'HEAD']) {
      const res = await rawRequest(origin, path, method);
      assert.equal(res.status, 302, `${method} ${path}`);
      assert.equal(res.headers.location, destination);
      assert.equal(res.headers['cache-control'], 'no-store');
      assert.equal(res.headers['content-length'], '0');
      assert.equal(res.body, '');
    }
  }
});

test('QR redirects remain exact; nonmatching routes and control files return true 404', async t => {
  const origin = await serve(t, fixture(t));
  for (const path of ['/q/gdl-menu-other', '/q/gdl-menu/extra', '/q/GDL-menu', '/q/', '/_redirects', '/_redirects/', '/_headers']) {
    for (const method of ['GET', 'HEAD']) {
      const res = await rawRequest(origin, path, method);
      assert.equal(res.status, 404, `${method} ${path}`);
      assert.equal(res.headers.location, undefined);
      assert.equal(res.body, method === 'HEAD' ? '' : '<h1>Not found</h1>');
    }
  }
  const home = await rawRequest(origin, '/');
  assert.equal(home.status, 200); assert.equal(home.body, '<h1>Home</h1>');
});

test('QR routes retain GET/HEAD restrictions and unsafe-path rejection', async t => {
  const origin = await serve(t, fixture(t));
  const post = await rawRequest(origin, '/q/gdl-menu?destination=https://evil.example', 'POST');
  assert.equal(post.status, 405); assert.equal(post.headers.allow, 'GET, HEAD');
  assert.equal(post.headers.location, undefined);
  for (const path of ['/q%2fgdl-menu', '/q%5cgdl-menu', '/q/../q/gdl-menu', '/q/%2e/gdl-menu',
    '/q//gdl-menu', '//q/gdl-menu', '/q/gdl-menu%00', '/q/gdl-menu%']) {
    const res = await rawRequest(origin, path);
    assert.equal(res.status, 400, path); assert.equal(res.headers.location, undefined);
  }
});

test('only an allowlisted redirect control file is parsed', async t => {
  const f = fixture(t, { allowRedirects: false, source: 'invalid incidental redirect file' });
  const origin = await serve(t, f);
  assert.equal((await rawRequest(origin, '/_redirects')).status, 404);
  const asset = await rawRequest(origin, '/q/gdl-menu');
  assert.equal(asset.status, 200); assert.equal(asset.headers.location, undefined);
  assert.equal(asset.body, '<h1>Asset must not override redirect</h1>');
});

test('allowlisted redirect controls must be validated regular files', t => {
  const invalid = fixture(t, { source: '/q/gdl-menu https://evil.example/ 302\n' });
  assert.throws(() => createReviewServer(invalid));
  const linked = fixture(t), outside = join(linked.repository, 'outside-redirects');
  writeFileSync(outside, redirectSource); unlinkSync(join(linked.root, '_redirects'));
  symlinkSync(outside, join(linked.root, '_redirects'));
  assert.throws(() => createReviewServer(linked), /Symlinks/);
});
