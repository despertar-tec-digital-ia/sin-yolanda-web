// A reviewed, byte-pinned platform addition. This is not an HTML cleanup policy.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const officialHosts = new Set(['sin-yolanda.com', 'www.sin-yolanda.com']);

// Observed in the official response and confirmed in that domain's RUM settings.
// The block fingerprint includes the public site configuration and trailing LF;
// no authentication credential is stored here. A provider rotation needs review.
export const cloudflareRumPolicy = Object.freeze({
  version: 1,
  id: 'cloudflare-rum-20261124',
  blockCharacters: 367,
  blockSha256: 'b7a51c4951de3c32feedca40071afcb99f57c51cca4f1c4aa4139124fa2726d2',
  scriptSrc: 'https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092',
  integrity: 'sha512-UKNk8GbxkABxKcXYuLkO16EleLGUkcvJWtpSNmExE0Too3ZaFAxTscNWEc1OdAv5/BikHawapSCaiD2XCmp+Bw==',
});

export function validateRumPolicy(policy) {
  assert.equal(policy?.version, 1, 'Unsupported provider policy');
  assert.match(policy.id ?? '', /^[a-z0-9-]{1,80}$/, 'Invalid provider policy identifier');
  assert.ok(Number.isInteger(policy.blockCharacters) && policy.blockCharacters > 0
    && policy.blockCharacters <= 2048, 'Invalid provider block size');
  assert.match(policy.blockSha256 ?? '', /^[a-f0-9]{64}$/, 'Invalid provider block fingerprint');
  assert.match(policy.scriptSrc ?? '', /^https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js\/v[a-f0-9]+$/, 'Invalid provider script URL');
  assert.match(policy.integrity ?? '', /^sha512-[A-Za-z0-9+/]{86}==$/, 'Invalid provider script integrity');
}

export function inspectCloudflareRum(source, file, hostname, policy = cloudflareRumPolicy) {
  const tags = source.match(/<script\b[^>]*\bsrc\s*=\s*["'][^"']*cloudflareinsights\.com[^"']*["'][^>]*>/gi) ?? [];
  const result = { detected: tags.length > 0, recognized: false, restored: null, problems: [] };
  if (!result.detected) return result;
  if (!file.endsWith('.html') || !officialHosts.has(hostname)) {
    result.problems.push('provider-addition-outside-official-domain');
    return result;
  }
  if (tags.length !== 1) {
    result.problems.push('duplicate-provider-addition');
    return result;
  }
  const closing = /<\/body>\s*<\/html>\s*$/i.exec(source);
  if (!closing || closing.index < policy.blockCharacters) {
    result.problems.push('unapproved-provider-addition');
    return result;
  }
  const start = closing.index - policy.blockCharacters;
  const block = source.slice(start, closing.index);
  result.blockSha256 = sha256(block);
  if (result.blockSha256 !== policy.blockSha256
    || !block.startsWith('<script type="module" ')
    || !block.includes(`src="${policy.scriptSrc}"`)
    || !block.includes(`integrity="${policy.integrity}"`)) {
    result.problems.push('unapproved-provider-addition');
    return result;
  }
  result.recognized = true;
  result.restored = source.slice(0, start) + source.slice(closing.index);
  result.policy = policy.id;
  result.scriptSrc = policy.scriptSrc;
  result.integrity = policy.integrity;
  return result;
}
