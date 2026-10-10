// Validate fixed QR aliases. No wildcard rules or user-selected destinations.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const qrMenuDestination = 'https://sinyolandagdl.com/menu/?utm_source=qr&utm_medium=offline&utm_campaign=menu_guadalajara';
export const qrRegistrationFormId = 'nN59k3I7TT6TOxDl4XET';
// Copied from GHL Share and rendered by the operator; attribution is fixed and contains no PII.
export const qrRegistrationDestination = 'https://api.leadconnectorhq.com/widget/form/nN59k3I7TT6TOxDl4XET?utm_source=qr&utm_medium=offline&utm_campaign=loyalty_el_paso&utm_content=registro_v1';
const menuSources = ['/q/gdl-menu', '/q/gdl-menu/'];
const registrationSources = ['/q/el-paso-registro', '/q/el-paso-registro/'];

function validateRegistrationDestination(destination) {
  assert.ok(typeof destination === 'string' && destination, 'Registration destination has not been confirmed');
  const url = new URL(destination);
  assert.equal(url.protocol, 'https:', 'Registration destination must use HTTPS');
  assert.ok(!url.username && !url.password && !url.hash, 'Registration destination cannot contain credentials or a fragment');
  assert.equal(url.href, destination, 'Registration destination must be an exact canonical URL');
  assert.ok(url.pathname.endsWith('/' + qrRegistrationFormId), 'Registration destination must identify the confirmed native form');
  return destination;
}

export function parseQrRedirects(source, { registrationDestination = qrRegistrationDestination } = {}) {
  assert.equal(typeof source, 'string', 'QR redirect source must be text');
  const approvedSources = new Map(menuSources.map(path => [path, qrMenuDestination]));
  if (registrationDestination !== null) {
    validateRegistrationDestination(registrationDestination);
    for (const path of registrationSources) approvedSources.set(path, registrationDestination);
  }
  const records = [], seen = new Set();
  for (const line of source.split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith('#')) continue;
    const fields = text.split(/\s+/);
    assert.equal(fields.length, 3, 'QR rule needs source, destination and explicit status');
    const [path, destination, code] = fields;
    assert.ok(approvedSources.has(path), 'QR rule is outside the approved alias');
    assert.ok(!seen.has(path), 'Duplicate QR redirect source');
    assert.equal(destination, approvedSources.get(path), 'QR destination differs from the approved fixed destination');
    assert.equal(code, '302', 'QR destinations must remain temporary');
    seen.add(path);
    records.push({ source: path, destination, status: 302 });
  }
  assert.ok(menuSources.every(path => seen.has(path)), 'Menu QR must cover both exact slash variants');
  if (registrationSources.some(path => seen.has(path))) {
    assert.ok(registrationSources.every(path => seen.has(path)), 'Registration QR must cover both exact slash variants');
  }
  return records;
}

// Compare hash manifests generated from the actual baseline and candidate bytes.
// Pages uploads replace the complete deployment; a one-file upload is not a patch.
export function assertRegistrationRedirectPatch({ baselineHashes, candidateHashes,
  baselineRedirects, candidateRedirects, registrationDestination = qrRegistrationDestination }) {
  validateRegistrationDestination(registrationDestination);
  for (const hashes of [baselineHashes, candidateHashes]) {
    assert.ok(hashes && typeof hashes === 'object' && !Array.isArray(hashes), 'Artifact hash manifest is required');
    assert.ok(Object.hasOwn(hashes, '_redirects'), 'Artifact must include the redirect control file');
    for (const hash of Object.values(hashes)) assert.match(hash, /^[a-f0-9]{64}$/, 'Artifact hashes must be SHA-256');
  }
  const paths = Object.keys(baselineHashes).sort();
  assert.deepEqual(Object.keys(candidateHashes).sort(), paths, 'QR patch cannot add or remove public files');
  const hash = value => createHash('sha256').update(value).digest('hex');
  assert.equal(hash(baselineRedirects), baselineHashes._redirects, 'Baseline redirect bytes differ from its hash manifest');
  assert.equal(hash(candidateRedirects), candidateHashes._redirects, 'Candidate redirect bytes differ from its hash manifest');
  assert.ok(candidateRedirects.startsWith(baselineRedirects), 'QR patch must preserve all baseline redirect bytes');
  const before = parseQrRedirects(baselineRedirects, { registrationDestination });
  const after = parseQrRedirects(candidateRedirects, { registrationDestination });
  assert.equal(before.length, 2, 'Initial registration patch requires a menu-only QR baseline');
  assert.equal(after.length, 4, 'QR patch must add both registration aliases');
  for (const path of paths.filter(path => path !== '_redirects')) {
    assert.equal(candidateHashes[path], baselineHashes[path], 'QR patch changed a baseline file: ' + path);
  }
  return { changedFiles: ['_redirects'], preservedFileCount: paths.length - 1, rules: after };
}
