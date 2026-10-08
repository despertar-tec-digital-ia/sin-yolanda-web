// GET-only deployment smoke. Receipts contain hashes and HTTP metadata, never response bodies.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const excludedPaths = ['/dashboard', '/dashboard.html', '/assets/js/mock-data.js',
  '/deploy_pages.py', '/docs/WORKFLOW.md', '/archive', '/archive/',
  '/maricarmen', '/maricarmen.html', '/__sy_release_missing__'];
const safeFile = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.%/-]+$/.test(value) || /%(?:2f|5c|00)/i.test(value)) return false;
  let decoded;
  try { decoded = decodeURIComponent(value); } catch { return false; }
  return !decoded.startsWith('/') && decoded.split('/').every(part => part && !part.startsWith('.'))
    && !/(?:^|\/)(?:archive|pruebas|docs|tests|scripts|node_modules|dashboard|listings|reputation|requests|reports|review-detail|maricarmen)(?:\.html|\/|$)|(?:^|\/)(?:mock-data\.js|app\.js|deploy_pages\.py)$/i.test(decoded);
};
const sha256 = value => createHash('sha256').update(value).digest('hex');
const noindex = value => /(?:^|[\s,:])noindex(?:$|[\s,;])/i.test(value ?? '');
const nofollow = value => /(?:^|[\s,:])nofollow(?:$|[\s,;])/i.test(value ?? '');
const safeHeader = value => value?.replace(/[\r\n\x00-\x1f]/g, '').slice(0, 256) ?? null;

function aliases(file) {
  if (!file.endsWith('.html')) return ['/' + file];
  const literal = '/' + file;
  const clean = file === 'index.html' ? '/' : file.endsWith('/index.html')
    ? '/' + file.slice(0, -'index.html'.length) : '/' + file.slice(0, -'.html'.length);
  const other = clean === '/' ? '/' : clean.endsWith('/') ? clean.slice(0, -1) : clean + '/';
  return [...new Set([literal, clean, other])];
}

function robotsMeta(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].flatMap(([tag]) => {
    const name = tag.match(/\bname\s*=\s*(["'])(.*?)\1/i)?.[2];
    const content = tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i)?.[2];
    return name?.toLowerCase() === 'robots' && content !== undefined ? [content] : [];
  }).join(',');
}

function validate(origin, metadata) {
  const url = new URL(origin);
  assert.ok(url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)), 'Use HTTPS or a loopback test origin');
  assert.ok(!url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'Use an origin without credentials, path, query or fragment');
  assert.equal(metadata?.version, 1, 'Unsupported release metadata');
  assert.match(metadata.commit ?? '', /^[a-f0-9]{40}$/, 'Release requires a full commit SHA');
  assert.equal(metadata.dirty, false, 'Do not certify a dirty release');
  assert.ok(metadata.hashes && typeof metadata.hashes === 'object' && !Array.isArray(metadata.hashes), 'Release hashes are required');
  const files = Object.keys(metadata.hashes);
  assert.ok(files.length > 0 && files.length === metadata.fileCount && ['index.html', '404.html', '_headers'].every(file => files.includes(file)), 'Incomplete release file list');
  for (const file of files) {
    assert.ok(safeFile(file), 'Unsafe release file path');
    assert.match(metadata.hashes[file], /^[a-f0-9]{64}$/, 'Invalid release SHA-256');
  }
  const reviewPages = metadata.reviewPages ?? [];
  assert.ok(Array.isArray(reviewPages) && new Set(reviewPages).size === reviewPages.length
    && reviewPages.every(file => files.includes(file) && file.endsWith('.html')), 'Invalid review page list');
  return { url, files, reviewPages: new Set(reviewPages) };
}

export async function verifyRelease({ origin, metadata, fetchImpl = globalThis.fetch } = {}) {
  const { url: base, files, reviewPages } = validate(origin, metadata);
  const run = randomUUID(), startedAt = new Date().toISOString();
  const tasks = files.filter(file => file !== '_headers').flatMap(file => aliases(file).map((path, index) => ({ file, path, kind: index === 0 ? 'file' : 'alias' })));
  tasks.push(...excludedPaths.map(path => ({ path, kind: 'excluded' })));
  let cursor = 0;
  const observations = new Array(tasks.length);

  async function inspect(task) {
    const expectedHash = task.file ? metadata.hashes[task.file] : null;
    const observation = { ...task, expectedHash, observedHash: null, exactHash: null, status: null,
      bytes: 0, finalPath: null, redirects: [], robotsHeader: null, problems: [] };
    let current = new URL(task.path, base);
    const permitted = task.file ? new Set(aliases(task.file)) : new Set([task.path]);
    try {
      for (let hop = 0; hop <= 5; hop++) {
        current.search = ''; // Never propagate arbitrary redirect query parameters.
        current.searchParams.set('sy-release-check', run);
        const response = await fetchImpl(current, { method: 'GET', redirect: 'manual', cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Accept-Encoding': 'identity' }, signal: AbortSignal.timeout(30000) });
        observation.status = response.status;
        observation.finalPath = current.pathname;
        observation.robotsHeader = safeHeader(response.headers.get('x-robots-tag'));
        if (task.kind === 'excluded') {
          await response.body?.cancel();
          if (response.status !== 404) observation.problems.push('excluded-route-not-404');
          return observation;
        }
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location');
          await response.body?.cancel();
          if (!location || hop === 5) { observation.problems.push('invalid-or-excessive-redirect'); return observation; }
          const next = new URL(location, current);
          if (next.origin !== base.origin || next.username || next.password || next.hash || !permitted.has(next.pathname)) {
            observation.problems.push('redirect-outside-file-aliases'); return observation;
          }
          observation.redirects.push({ status: response.status, from: current.pathname, to: next.pathname });
          current = next;
          continue;
        }
        if (response.status !== 200) {
          await response.body?.cancel();
          observation.problems.push('release-file-not-200'); return observation;
        }
        const hash = createHash('sha256'), html = [], isHtml = task.file.endsWith('.html');
        for await (const chunk of response.body ?? []) {
          hash.update(chunk); observation.bytes += chunk.length;
          if (isHtml && observation.bytes <= 8 * 1024 * 1024) html.push(Buffer.from(chunk));
        }
        observation.observedHash = hash.digest('hex');
        observation.exactHash = observation.observedHash === expectedHash;
        if (!observation.exactHash) observation.problems.push('hash-mismatch');
        if (isHtml) {
          if (observation.bytes > 8 * 1024 * 1024) observation.problems.push('html-too-large-to-inspect');
          const source = Buffer.concat(html).toString('utf8'), robots = robotsMeta(source);
          observation.metaNoindex = noindex(robots); observation.metaNofollow = nofollow(robots);
          observation.cloudflareEmailObfuscation = /data-cfemail\s*=|\/cdn-cgi\/scripts\/[^"'\s>]*email-decode\.min\.js/i.test(source);
          if (!/^text\/html(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')) observation.problems.push('html-content-type-mismatch');
          if (reviewPages.has(task.file) && (!observation.metaNoindex || !observation.metaNofollow)) observation.problems.push('review-robots-meta-missing');
          if (task.file === 'index.html' && (noindex(observation.robotsHeader) || observation.metaNoindex)) observation.problems.push('home-is-noindex');
        }
        return observation;
      }
    } catch (error) {
      // Do not log fetch error messages: a provider may include response content or URLs.
      observation.problems.push(error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'request-timeout' : 'request-failed');
      return observation;
    }
  }

  await Promise.all(Array.from({ length: Math.min(5, tasks.length) }, async () => {
    while (cursor < tasks.length) { const index = cursor++; observations[index] = await inspect(tasks[index]); }
  }));
  const failed = observations.filter(item => item.problems.length);
  return { version: 1, startedAt, completedAt: new Date().toISOString(), origin: base.origin,
    commit: metadata.commit, audience: metadata.audience, publicDigest: metadata.publicDigest ?? null,
    releaseMetadataDigest: sha256(JSON.stringify(metadata)), getOnly: true, concurrency: 5,
    skippedFiles: [{ file: '_headers', reason: 'Cloudflare control file, not a served asset' }],
    passed: failed.length === 0,
    summary: { files: files.length - 1, aliases: observations.filter(item => item.kind === 'alias').length,
      excludedRoutes: excludedPaths.length, exactFiles: observations.filter(item => item.kind === 'file' && item.exactHash).length,
      hashMismatches: observations.filter(item => item.exactHash === false).length, failedChecks: failed.length },
    observations };
}

function writeReceipt(output, releasePath, report) {
  const path = resolve(output), artifacts = resolve(repositoryRoot, '.artifacts');
  assert.ok(path.startsWith(artifacts + sep) && path.endsWith('.json'), 'Write a JSON receipt under ignored .artifacts');
  assert.notEqual(path, releasePath, 'Do not overwrite release metadata');
  assert.ok(!existsSync(path), 'Use a fresh verification receipt');
  const publicRoot = resolve(dirname(releasePath), 'public');
  assert.ok(path !== publicRoot && !path.startsWith(publicRoot + sep), 'Receipt must remain outside the public directory');
  // Refuse any alternate public package or symlink inside the report ancestry.
  let part = repositoryRoot;
  for (const segment of relative(repositoryRoot, dirname(path)).split(sep)) {
    assert.notEqual(segment, 'public', 'Receipt cannot be inside a public package');
    part = resolve(part, segment);
    if (existsSync(part)) assert.ok(lstatSync(part).isDirectory() && !lstatSync(part).isSymbolicLink(), 'Receipt parent must be a regular directory');
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), options = {};
    assert.ok(args.length === 6, 'Provide --origin, --release and --output');
    for (let index = 0; index < args.length; index += 2) {
      const key = args[index];
      assert.ok(['--origin', '--release', '--output'].includes(key) && !options[key] && args[index + 1] && !args[index + 1].startsWith('--'), 'Invalid verification arguments');
      options[key] = args[index + 1];
    }
    const releasePath = resolve(options['--release']);
    assert.ok(lstatSync(releasePath).isFile() && !lstatSync(releasePath).isSymbolicLink(), 'Release metadata must be a regular file');
    const metadata = JSON.parse(readFileSync(releasePath, 'utf8'));
    // Check output constraints before any remote request, without creating a report yet.
    const output = resolve(options['--output']);
    assert.ok(output.startsWith(resolve(repositoryRoot, '.artifacts') + sep) && output.endsWith('.json')
      && !existsSync(output) && output !== releasePath && !relative(repositoryRoot, output).split(sep).includes('public'), 'Use a fresh ignored receipt outside public packages');
    const report = await verifyRelease({ origin: options['--origin'], metadata });
    writeReceipt(output, releasePath, report);
    console.log(JSON.stringify({ passed: report.passed, commit: report.commit, origin: report.origin, ...report.summary, report: output }));
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ passed: false, setupFailed: true, error: error?.code === 'ERR_ASSERTION' ? error.message.split('\n')[0] : 'Verification setup failed; inspect inputs locally' }));
    process.exitCode = 2;
  }
}
