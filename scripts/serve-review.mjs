// Local-only review of one packaged candidate. This is not a deployment server.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createReadStream, closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

function validFile(path) {
  return typeof path === 'string' && /^[A-Za-z0-9_.%/-]+$/.test(path) && !path.startsWith('/') &&
    path.split('/').every(part => part && !part.startsWith('.'));
}

function regularPath(root, path) {
  assert.ok(lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink(), 'Review root cannot be a symlink');
  let current = root;
  for (const part of path.split('/')) {
    current = resolve(current, part);
    assert.ok(!lstatSync(current).isSymbolicLink(), 'Symlinks are not review files');
  }
  assert.ok(lstatSync(current).isFile(), 'Review file is not regular');
  assert.ok(realpathSync(current).startsWith(realpathSync(root) + sep), 'Review file escapes package');
  return current;
}

export function loadReviewPackage(packageRoot, repositoryRoot = projectRoot) {
  assert.ok(packageRoot, 'Provide the explicit packaged review directory');
  const root = resolve(packageRoot), artifacts = resolve(repositoryRoot, '.artifacts');
  assert.ok(root.startsWith(artifacts + sep), 'Review directory must be an ignored artifact, not the checkout');
  let current = repositoryRoot;
  for (const part of relative(repositoryRoot, root).split(sep)) {
    current = resolve(current, part);
    assert.ok(!lstatSync(current).isSymbolicLink(), 'Review root cannot contain symlinks');
  }
  assert.ok(lstatSync(root).isDirectory(), 'Review root must be a directory');
  const metadataPath = resolve(dirname(root), 'release.json');
  assert.ok(!lstatSync(metadataPath).isSymbolicLink(), 'Release metadata cannot be a symlink');
  const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
  assert.equal(metadata.version, 1, 'Unsupported release metadata');
  const files = Object.keys(metadata.hashes ?? {});
  assert.ok(files.length > 0 && files.length === metadata.fileCount && files.includes('404.html'), 'Incomplete release allowlist');
  for (const path of files) {
    assert.ok(validFile(path), 'Unsafe release path');
    assert.match(metadata.hashes[path], /^[a-f0-9]{64}$/, 'Invalid release hash');
    const content = readFileSync(regularPath(root, path));
    assert.equal(createHash('sha256').update(content).digest('hex'), metadata.hashes[path], 'Packaged file differs from release hash: ' + path);
  }
  return { root, files, metadata };
}

export function createReviewServer({ root, files } = {}) {
  assert.ok(root && lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink(), 'Explicit regular package root required');
  assert.ok(Array.isArray(files) && files.length > 0 && files.every(validFile), 'Explicit safe file allowlist required');
  assert.equal(new Set(files).size, files.length, 'Duplicate review files');
  const allowed = new Set(files.filter(path => path !== '_headers'));
  assert.ok(allowed.has('404.html'), 'Required true 404 fallback');
  for (const file of allowed) regularPath(root, file);
  const plain = (res, status, message, head = false) => {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow' });
    res.end(head ? undefined : message);
  };
  return createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      plain(res, 405, 'Only GET and HEAD are accepted');
      return;
    }
    const head = req.method === 'HEAD';
    let path;
    try {
      const raw = (req.url ?? '').split(/[?#]/)[0];
      assert.ok(raw.startsWith('/') && !raw.startsWith('//') && !/%(?:2f|5c)/i.test(raw));
      path = decodeURIComponent(raw);
      assert.ok(!/[\\\0]/.test(path) && !path.split('/').some(part => part === '.' || part === '..') && !/\/\//.test(path));
    } catch {
      plain(res, 400, 'Invalid review path', head);
      return;
    }
    const requestPath = path.replace(/^\//, '').replace(/\/$/, '');
    // Prefer extensionless HTML over a sibling directory containing its menu.
    const candidates = !requestPath ? ['index.html'] : path.endsWith('/') && extname(requestPath)
      ? [] : [requestPath, requestPath + '.html', requestPath + '/index.html'];
    const selected = candidates.find(candidate => allowed.has(candidate));
    const target = selected ?? '404.html', status = selected ? 200 : 404;
    let fd;
    try {
      const file = regularPath(root, target);
      fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
      const stat = fstatSync(fd);
      assert.ok(stat.isFile(), 'Not a regular review file');
      let start = 0, end = stat.size - 1, responseStatus = status;
      const range = req.headers.range;
      if (range && selected && stat.size) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2])) {
          res.setHeader('Content-Range', 'bytes */' + stat.size);
          closeSync(fd); fd = undefined;
          plain(res, 416, 'Invalid byte range', head);
          return;
        }
        if (!match[1]) start = Math.max(0, stat.size - Number(match[2]));
        else start = Number(match[1]);
        if (match[2] && match[1]) end = Math.min(end, Number(match[2]));
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) {
          res.setHeader('Content-Range', 'bytes */' + stat.size);
          closeSync(fd); fd = undefined;
          plain(res, 416, 'Unsatisfiable byte range', head);
          return;
        }
        responseStatus = 206;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      }
      res.writeHead(responseStatus, { 'Content-Type': contentTypes[extname(target).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': stat.size ? end - start + 1 : 0, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow' });
      if (head || !stat.size) { closeSync(fd); fd = undefined; res.end(); return; }
      const stream = createReadStream(file, { fd, start, end, autoClose: true });
      fd = undefined;
      stream.on('error', () => res.destroy());
      res.on('close', () => stream.destroy());
      stream.pipe(res);
    } catch {
      if (fd !== undefined) closeSync(fd);
      if (!res.headersSent) plain(res, 403, 'File is outside the permitted package', head);
      else res.destroy();
    }
  });
}

export async function startReviewServer({ root, files, port = 8798 } = {}) {
  assert.ok(Number.isInteger(port) && port >= 0 && port <= 65535, 'Invalid local port');
  const server = createReviewServer({ root, files });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', accept); });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const candidate = loadReviewPackage(process.argv[2]);
  const port = process.argv[3] === undefined ? 8798 : Number(process.argv[3]);
  const server = await startReviewServer({ ...candidate, port });
  console.log(JSON.stringify({ origin: 'http://127.0.0.1:' + server.address().port, root: candidate.root,
    fileCount: candidate.files.length, commit: candidate.metadata.commit, audience: candidate.metadata.audience }));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
}
