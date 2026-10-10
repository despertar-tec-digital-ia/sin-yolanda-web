// Prepare a complete additive candidate against the verified live baseline. Never upload/approve.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectPublic, publicSourceDigest } from './package-public.mjs';
import { assertNoLinkAncestors, projectRoot, readSource, statIfPresent } from './package-intake-preview.mjs';
import { packageIntakePublic, publicPath } from './package-intake-public.mjs';
import { parseQrRedirects, qrRegistrationDestination } from './qr-redirects.mjs';

export const ownRegistrationBaseline = Object.freeze({
  deployment: '8d176362-71a8-4267-b881-6b0d76da0377',
  commit: '3846955c325880077149f88edc0b52f6ff513b0a',
  digest: 'd65b31f112d82c4521605a0993136b3861326d24c102bce431ca64ae5fff9c16',
  fileCount: 186,
});
export const ownRegistrationDestination = `https://sin-yolanda.com/${publicPath}/?utm_source=qr&utm_medium=offline&utm_campaign=loyalty_el_paso&utm_content=registro_v2`;
export const registrationHeaderAddition = '\n/el-paso/registro/*\n' +
  '  Cache-Control: no-store\n  X-Robots-Tag: noindex, nofollow\n' +
  "  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'none'; base-uri 'none'; object-src 'none'\n";
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function enumerate(root, prefix = '') {
  assertNoLinkAncestors(root);
  assert.ok(statIfPresent(root)?.isDirectory(), 'Artifact must be a regular directory');
  return readdirSync(root).flatMap(name => {
    assert.ok(name && !name.includes('/') && !name.includes('\\'), 'Unsafe artifact entry');
    const path = resolve(root, name), key = prefix + name, info = statIfPresent(path);
    assert.ok(info && !info.isSymbolicLink(), 'Artifact links rejected');
    return info.isDirectory() ? enumerate(path, key + '/') : (assert.ok(info.isFile() && info.nlink === 1, 'Only unlinked regular files'), [key]);
  }).sort();
}

export function proposeOwnRegistrationRedirects(source) {
  const rules = parseQrRedirects(source);
  assert.equal(rules.length, 4, 'Need the current menu and temporary registration QR aliases');
  assert.equal(source.split(qrRegistrationDestination).length - 1, 2, 'Only the two known registration aliases may change');
  const next = source.replaceAll(qrRegistrationDestination, ownRegistrationDestination);
  // Preserve comments, ordering and menu rules byte for byte; forbid extra redirects.
  const rows = next.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#')).map(line => line.trim().split(/\s+/));
  assert.deepEqual(rows.slice(0, 2), rules.slice(0, 2).map(rule => [rule.source, rule.destination, '302']));
  assert.deepEqual(rows.slice(2), rules.slice(2).map(rule => [rule.source, ownRegistrationDestination, '302']));
  return next;
}

export function prepareOwnRegistrationRelease({ root = projectRoot, baseline, destination, siteKey } = {}) {
  assert.ok(baseline && destination, 'Provide the complete published baseline and fresh candidate directory');
  root = resolve(root); baseline = resolve(baseline); const out = resolve(destination);
  for (const path of [root, baseline, out]) assertNoLinkAncestors(path);
  assert.ok(out.startsWith(resolve(root, '.artifacts') + sep) && !statIfPresent(out), 'Use a fresh ignored output directory');
  assert.ok(out !== baseline && !out.startsWith(baseline + sep) && !baseline.startsWith(out + sep), 'Never mutate or encompass the baseline');
  const before = JSON.parse(readSource(baseline, 'release.json'));
  assert.equal(before.version, 1); assert.equal(before.dirty, false); assert.equal(before.audience, 'limited-production');
  assert.equal(before.commit, ownRegistrationBaseline.commit, 'Wrong live baseline commit');
  assert.equal(before.publicDigest, ownRegistrationBaseline.digest, 'Wrong live baseline digest');
  assert.equal(before.fileCount, ownRegistrationBaseline.fileCount);
  const { files } = inspectPublic(root);
  assert.deepEqual(Object.keys(before.hashes || {}).sort(), files, 'Need the entire existing public site');
  assert.deepEqual(enumerate(resolve(baseline, 'public')), files, 'Missing/unlisted baseline files');
  const baselineFiles = new Map(files.map(name => [name, readSource(resolve(baseline, 'public'), name)]));
  const baselineHashes = Object.fromEntries([...baselineFiles].map(([name, bytes]) => [name, sha256(bytes)]));
  assert.deepEqual(baselineHashes, before.hashes, 'Baseline bytes changed');
  assert.equal(publicSourceDigest(baselineHashes), ownRegistrationBaseline.digest);
  // A different main/hero/menu edit cannot enter the release by coincidence.
  for (const name of files) assert.equal(sha256(readSource(root, name)), baselineHashes[name], 'Unrelated public source changed: ' + name);
  const redirects = proposeOwnRegistrationRedirects(baselineFiles.get('_redirects').toString('utf8'));
  const headers = baselineFiles.get('_headers').toString('utf8');
  assert.ok(!headers.includes('/el-paso/registro/'), 'Registration headers already exist; reconcile baseline explicitly');
  const overlay = packageIntakePublic({ root, destination: resolve(out, 'overlay'), siteKey });
  const combined = new Map(baselineFiles), functions = new Map();
  for (const [path, hash] of Object.entries(overlay.hashes)) {
    const bytes = readSource(resolve(out, 'overlay'), path); assert.equal(sha256(bytes), hash);
    if (path.startsWith('functions/')) { functions.set(path, bytes); continue; }
    assert.ok(path.startsWith('public/')); const name = path.slice(7);
    if (combined.has(name)) assert.equal(sha256(combined.get(name)), hash, 'Overlay must not replace existing site assets: ' + name);
    else combined.set(name, bytes);
  }
  assert.deepEqual([...functions.keys()], ['functions/api/loyalty/el-paso/registrations.js']);
  combined.set('_redirects', Buffer.from(redirects));
  combined.set('_headers', Buffer.from(headers + registrationHeaderAddition));
  const additions = [...combined.keys()].filter(name => !baselineFiles.has(name)).sort();
  assert.deepEqual(additions, ['_routes.json', ...['index.html', 'intake-config.json', 'intake.js', 'styles.css', 'media/singer-600.webp', 'media/singer-1200.webp'].map(name => `${publicPath}/${name}`)].sort());
  const changed = files.filter(name => sha256(combined.get(name)) !== baselineHashes[name]);
  assert.deepEqual(changed, ['_headers', '_redirects']);
  const publicHashes = Object.fromEntries([...combined].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([name, body]) => [name, sha256(body)]));
  const functionHashes = Object.fromEntries([...functions].map(([name, body]) => [name, sha256(body)]));
  let commit = null, dirty = true;
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    dirty = Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
  } catch {}
  const report = { version: 1, kind: 'complete-own-registration-candidate', deployable: false, releaseApproved: false,
    deployed: false, targetOrigin: 'https://sin-yolanda.com', commit, dirty, baseline: ownRegistrationBaseline,
    fileCount: combined.size, preservedFileCount: files.length - changed.length, changedFiles: changed,
    addedFiles: additions, publicHashes, publicDigest: publicSourceDigest(publicHashes), functionHashes,
    bundleApprovalRequired: true, qrCutoverProposedOnly: true, remoteBaselineRevalidationRequired: true,
    productionIngressVerified: false, realCaptureVerified: false, ghlEnabled: false };
  for (const [name, bytes] of [...combined].map(([name, bytes]) => [`public/${name}`, bytes]).concat([...functions])) {
    const path = resolve(out, name); mkdirSync(dirname(path), { recursive: true }); assertNoLinkAncestors(dirname(path));
    writeFileSync(path, bytes, { flag: 'wx', mode: 0o644 });
  }
  assert.deepEqual(enumerate(resolve(out, 'public')), Object.keys(publicHashes).sort());
  for (const [name, hash] of Object.entries(publicHashes)) assert.equal(sha256(readSource(resolve(out, 'public'), name)), hash);
  writeFileSync(resolve(out, 'candidate.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o644 });
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4, 'Use prepare-own-registration-release.mjs BASELINE_RELEASE FRESH_CANDIDATE');
  const result = prepareOwnRegistrationRelease({ baseline: process.argv[2], destination: process.argv[3], siteKey: process.env.SY_INTAKE_TURNSTILE_SITE_KEY });
  console.log(JSON.stringify({ kind: result.kind, deployable: false, changedFiles: result.changedFiles, addedFiles: result.addedFiles, preservedFileCount: result.preservedFileCount, publicDigest: result.publicDigest }));
}
