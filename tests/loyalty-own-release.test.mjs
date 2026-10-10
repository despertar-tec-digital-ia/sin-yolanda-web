import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { inspectPublic, publicSourceDigest } from '../scripts/package-public.mjs';
import { sourceAllowlist } from '../scripts/package-intake-public.mjs';
import { projectRoot } from '../scripts/package-intake-preview.mjs';
import { ownRegistrationBaseline, ownRegistrationDestination, prepareOwnRegistrationRelease, proposeOwnRegistrationRedirects, registrationHeaderAddition } from '../scripts/prepare-own-registration-release.mjs';

const siteKey = '0x4AAAAAAASyntheticReleaseOnlyKey';
const hash = body => createHash('sha256').update(body).digest('hex');
function fixture(t) {
  const artifacts = resolve(projectRoot, '.artifacts'); mkdirSync(artifacts, { recursive: true });
  const root = mkdtempSync(resolve(artifacts, 'own-release-test-'));
  // Only this precisely created fixture is removed. No baseline or user's artifact is deleted.
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const baseline = resolve(root, '.artifacts/baseline'), files = inspectPublic(projectRoot).files;
  for (const name of new Set([...files, ...sourceAllowlist.map(([name]) => name), 'scripts/public-manifest.json', 'services/loyalty-intake/public-media.json'])) {
    const path = resolve(root, name); mkdirSync(dirname(path), { recursive: true }); copyFileSync(resolve(projectRoot, name), path);
  }
  const hashes = Object.fromEntries(files.map(name => {
    const path = resolve(baseline, 'public', name); mkdirSync(dirname(path), { recursive: true }); copyFileSync(resolve(root, name), path);
    return [name, hash(readFileSync(path))];
  }));
  assert.equal(publicSourceDigest(hashes), ownRegistrationBaseline.digest);
  writeFileSync(resolve(baseline, 'release.json'), JSON.stringify({ version: 1, dirty: false, audience: 'limited-production', commit: ownRegistrationBaseline.commit, publicDigest: ownRegistrationBaseline.digest, fileCount: files.length, hashes }));
  return { root, baseline, destination: resolve(root, '.artifacts/candidate') };
}

test('explicit QR cutover candidate retains every existing page and menu; only fixed headers/QR controls change', t => {
  const options = fixture(t), result = prepareOwnRegistrationRelease({ ...options, siteKey, stage: 'qr-cutover' });
  assert.equal(result.deployable, false); assert.equal(result.releaseApproved, false); assert.equal(result.deployed, false);
  assert.equal(result.realCaptureVerified, false); assert.equal(result.productionIngressVerified, false); assert.equal(result.ghlEnabled, false);
  assert.equal(result.preservedFileCount, 184); assert.equal(result.fileCount, 193);
  assert.equal(result.stage, 'qr-cutover'); assert.equal(result.qrDestinationPreserved, false); assert.equal(result.qrCutoverProposedOnly, true);
  assert.deepEqual(result.changedFiles, ['_headers', '_redirects']);
  assert.deepEqual(Object.keys(result.functionHashes), ['functions/api/loyalty/el-paso/registrations.js']);
  assert.equal(readFileSync(resolve(options.destination, 'public/_headers'), 'utf8'), readFileSync(resolve(options.baseline, 'public/_headers'), 'utf8') + registrationHeaderAddition);
  const before = readFileSync(resolve(options.baseline, 'public/_redirects'), 'utf8');
  assert.equal(readFileSync(resolve(options.destination, 'public/_redirects'), 'utf8'), proposeOwnRegistrationRedirects(before));
  for (const [name, expected] of Object.entries(JSON.parse(readFileSync(resolve(options.baseline, 'release.json'))).hashes)) {
    if (!result.changedFiles.includes(name)) assert.equal(hash(readFileSync(resolve(options.destination, 'public', name))), expected);
  }
  assert.ok(!existsSync(resolve(options.destination, 'public/candidate.json')));
});

test('default form-only candidate preserves all QR and menu destinations byte for byte', t => {
  const options = fixture(t), result = prepareOwnRegistrationRelease({ ...options, siteKey });
  assert.equal(result.stage, 'form-only'); assert.equal(result.qrDestinationPreserved, true); assert.equal(result.qrCutoverProposedOnly, false);
  assert.equal(result.deployable, false); assert.equal(result.releaseApproved, false); assert.equal(result.deployed, false);
  assert.equal(result.realCaptureVerified, false); assert.equal(result.productionIngressVerified, false);
  assert.equal(result.fileCount, 193); assert.equal(result.preservedFileCount, 185);
  assert.deepEqual(result.changedFiles, ['_headers']);
  assert.deepEqual(readFileSync(resolve(options.destination, 'public/_redirects')), readFileSync(resolve(options.baseline, 'public/_redirects')));
  assert.ok(!readFileSync(resolve(options.destination, 'public/_redirects'), 'utf8').includes(ownRegistrationDestination));
  for (const [name, expected] of Object.entries(JSON.parse(readFileSync(resolve(options.baseline, 'release.json'))).hashes)) {
    if (!result.changedFiles.includes(name)) assert.equal(hash(readFileSync(resolve(options.destination, 'public', name))), expected);
  }
});

test('unknown activation stages are rejected before creating candidate files', t => {
  const options = fixture(t);
  for (const stage of ['production', 'form-only ', null, true, {}, '']) {
    assert.throws(() => prepareOwnRegistrationRelease({ ...options, siteKey, stage }));
    assert.equal(existsSync(options.destination), false);
  }
});

test('unknown baseline, altered bytes, extra files, unrelated source edits and invalid sitekeys stop before output', t => {
  const options = fixture(t), receiptPath = resolve(options.baseline, 'release.json');
  const receipt = JSON.parse(readFileSync(receiptPath));
  const attempt = () => { assert.throws(() => prepareOwnRegistrationRelease({ ...options, siteKey })); assert.equal(existsSync(options.destination), false); };
  writeFileSync(receiptPath, JSON.stringify({ ...receipt, commit: '0'.repeat(40) })); attempt();
  writeFileSync(receiptPath, JSON.stringify(receipt));
  const baselineHeader = resolve(options.baseline, 'public/_headers'), bytes = readFileSync(baselineHeader);
  writeFileSync(baselineHeader, 'altered'); attempt(); writeFileSync(baselineHeader, bytes);
  const extra = resolve(options.baseline, 'public/private-file.txt'); writeFileSync(extra, 'fixture-only'); attempt(); rmSync(extra);
  const source = resolve(options.root, 'index.html'), original = readFileSync(source);
  writeFileSync(source, Buffer.concat([original, Buffer.from('\n<!-- unrelated change -->\n')])); attempt(); writeFileSync(source, original);
  assert.throws(() => prepareOwnRegistrationRelease({ ...options, siteKey: 'not-a-key' })); assert.equal(existsSync(options.destination), false);
});

test('own-form QR proposal changes only the two aliases and never accepts an arbitrary destination or extra rule', () => {
  const redirects = readFileSync(resolve(projectRoot, '_redirects'), 'utf8');
  const next = proposeOwnRegistrationRedirects(redirects);
  assert.equal(next.split(ownRegistrationDestination).length - 1, 2);
  assert.equal(next.split('\n').slice(0, 3).join('\n'), redirects.split('\n').slice(0, 3).join('\n'));
  assert.throws(() => proposeOwnRegistrationRedirects(redirects + '/anything https://example.invalid 302\n'));
  assert.throws(() => proposeOwnRegistrationRedirects(next));
});
