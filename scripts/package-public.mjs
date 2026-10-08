// Static, self-contained release: nothing outside the reviewed allowlist is copied.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const forbiddenRoute = /(?:^|\/)(?:dashboard|listings|reputation|requests|reports|review-detail|maricarmen)(?:\.html|\/|$)/i;
const forbiddenFile = /(?:^|\/)(?:archive|pruebas|docs|tests|node_modules|\.git|\.env[^/]*|mock-data\.js|app\.js)(?:\/|$)/i;
const allowedExtension = /\.(?:html|css|js|json|xml|txt|webp|png|jpg|jpeg|svg|mp4|woff2?|ttf)$/i;

export function inspectPublic(root = projectRoot) {
  const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/public-manifest.json'), 'utf8'));
  assert.equal(manifest.version, 1, 'Unsupported public manifest');
  const files = [...manifest.pages, ...manifest.assets];
  assert.equal(new Set(files).size, files.length, 'Duplicate manifest entry');
  assert.ok(manifest.pages.includes('404.html'), 'Required true 404 fallback');
  for (const path of files) {
    assert.ok(/^[a-zA-Z0-9_.%/-]+$/.test(path) && !path.startsWith('/') && !path.split('/').some(p => !p || p === '..' || p.startsWith('.')), 'Unsafe public path');
    assert.ok(!forbiddenRoute.test(path) && !forbiddenFile.test(path), 'Forbidden public file: ' + path);
    assert.ok(allowedExtension.test(path) || path === '_headers', 'Unsupported file: ' + path);
    let part = root;
    for (const segment of path.split('/')) {
      part = resolve(part, segment);
      assert.ok(!lstatSync(part).isSymbolicLink(), 'Symlinks cannot enter release: ' + path);
    }
    assert.ok(lstatSync(part).isFile(), 'Not a regular file: ' + path);
    if (/\.(?:html|js)$/.test(path)) {
      const source = readFileSync(part, 'utf8');
      assert.ok(!/assets\/js\/mock-data\.js|(?:href|src)=["']\/?(?:dashboard|listings|reputation|requests|reports|review-detail)(?:\.html|\/|["'#?])/i.test(source), 'Public code references retired demo: ' + path);
      assert.ok(!/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|(?:ghp|github_pat)_[A-Za-z0-9_]{20,}/.test(source), 'Credential-like content; inspect locally without logging values');
    }
  }
  assert.ok(manifest.pages.every(p => p.endsWith('.html')), 'Pages must be HTML');
  const reviewPages = manifest.reviewPages ?? [];
  assert.ok(Array.isArray(reviewPages) && new Set(reviewPages).size === reviewPages.length
    && reviewPages.every(path => manifest.pages.includes(path)), 'Invalid review-only page list');
  for (const path of reviewPages) assert.match(readFileSync(resolve(root, path), 'utf8'),
    /<meta name="robots" content="noindex,nofollow">/, 'Review page must remain noindex: ' + path);
  return { manifest, files: files.sort() };
}

export function publicSourceDigest(hashes) {
  const sorted = Object.fromEntries(Object.keys(hashes).sort().map(path => [path, hashes[path]]));
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}

function inspectLimitedApproval({ root, approval, commit, dirty, publicDigest, out }) {
  assert.ok(typeof approval === 'string' && approval.trim(), 'Limited production requires an explicit approval JSON file');
  const approvalPath = resolve(approval);
  assert.ok(approvalPath !== out && !approvalPath.startsWith(out + sep), 'Approval belongs outside the public directory');
  assert.ok(lstatSync(approvalPath).isFile() && !lstatSync(approvalPath).isSymbolicLink(), 'Approval must be a regular JSON file');
  const record = JSON.parse(readFileSync(approvalPath, 'utf8'));
  assert.ok(record && typeof record === 'object' && !Array.isArray(record), 'Invalid limited approval object');
  assert.equal(record.version, 1, 'Unsupported limited approval version');
  assert.equal(record.targetOrigin, 'https://sin-yolanda.com', 'Limited approval target must be the exact official origin');
  assert.equal(record.authorizer, 'Luis', 'Limited approval requires authorizer Luis');
  assert.match(record.sourceCommit ?? '', /^[a-f0-9]{40}$/, 'Approval sourceCommit must be a full commit SHA');
  assert.match(record.publicDigest ?? '', /^[a-f0-9]{64}$/, 'Approval publicDigest must be a SHA-256 digest');
  assert.ok(typeof record.authorization === 'string' && record.authorization.trim(), 'Approval authorization text is required');
  assert.ok(commit && !dirty, 'Limited production requires an actual clean Git HEAD');
  assert.equal(realpathSync(execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).trim()),
    realpathSync(root), 'Limited production must use the repository root');
  try {
    assert.equal(execFileSync('git', ['cat-file', '-t', record.sourceCommit],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(), 'commit');
    execFileSync('git', ['merge-base', '--is-ancestor', record.sourceCommit, commit],
      { cwd: root, stdio: ['ignore', 'ignore', 'ignore'] });
  } catch {
    assert.fail('Approval sourceCommit must exist and be an ancestor of HEAD');
  }
  assert.equal(record.publicDigest, publicDigest, 'Approval publicDigest differs from inspected public sources');
  // Keep only the authorization contract in the external receipt, never arbitrary
  // fields from an approval file, and do not alter commercial approval flags.
  return { version: record.version, targetOrigin: record.targetOrigin, authorizer: record.authorizer,
    sourceCommit: record.sourceCommit, publicDigest: record.publicDigest, authorization: record.authorization };
}

export function packagePublic({ root = projectRoot, destination, metadata, audience = 'production', approval } = {}) {
  assert.ok(['production', 'review', 'limited-production'].includes(audience), 'Unknown package audience');
  assert.ok(approval === undefined || audience === 'limited-production', 'Approval applies only to the explicit limited-production audience');
  assert.ok(destination, 'Provide a fresh artifact directory');
  const out = resolve(destination);
  assert.notEqual(out, resolve(root), 'Output cannot be repository root');
  assert.ok(!existsSync(out), 'Refuse to overwrite an existing directory');
  const reportPath = metadata ? resolve(metadata) : null;
  if (reportPath) {
    assert.ok(reportPath !== out && !reportPath.startsWith(out + sep), 'Release metadata belongs outside public directory');
    assert.ok(!existsSync(reportPath), 'Refuse to overwrite release metadata');
  }
  const { files, manifest } = inspectPublic(root); // Validate everything before creating any output.
  assert.ok(audience !== 'production' || !(manifest.reviewPages ?? []).length,
    'Review-only pages cannot enter a production package; use an explicit local review audience');
  const hashes = Object.fromEntries(files.map(path => [path, createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex')]));
  const publicDigest = publicSourceDigest(hashes); // Source bytes, before review-only header mutation.
  let commit = null;
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
  const dirty = commit ? Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) : true;
  const approved = audience === 'limited-production'
    ? inspectLimitedApproval({ root, approval, commit, dirty, publicDigest, out }) : null;
  for (const path of files) {
    mkdirSync(dirname(resolve(out, path)), { recursive: true });
    copyFileSync(resolve(root, path), resolve(out, path));
  }
  if (audience === 'review') {
    // Protect the entire candidate, including its unchanged indexable home, if served by a preview host.
    const headers = resolve(out, '_headers');
    writeFileSync(headers, readFileSync(headers, 'utf8') + '\n/*\n  X-Robots-Tag: noindex, nofollow\n');
    hashes._headers = createHash('sha256').update(readFileSync(headers)).digest('hex');
  }
  const report = { version: 1, commit, dirty, audience, reviewPages: manifest.reviewPages ?? [], fileCount: files.length, hashes, publicDigest,
    ...(approved ? { approval: approved } : {}) };
  if (reportPath) {
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const destination = process.argv[2];
  const flag = process.argv.indexOf('--audience');
  const audience = flag < 0 ? 'production' : process.argv[flag + 1];
  const approvalFlag = process.argv.indexOf('--approval');
  const approval = approvalFlag < 0 ? undefined : process.argv[approvalFlag + 1];
  const report = packagePublic({ destination, audience, approval, metadata: destination ? resolve(destination, '../release.json') : undefined });
  console.log(JSON.stringify({ commit: report.commit, dirty: report.dirty, audience: report.audience, fileCount: report.fileCount, publicDigest: report.publicDigest }));
}
