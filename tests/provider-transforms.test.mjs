import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cloudflareRumPolicy, inspectCloudflareRum } from '../scripts/provider-transforms.mjs';
import { verifyRelease } from '../scripts/verify-release.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const origin = 'https://sin-yolanda.com';
const page = '<!doctype html><html><body><h1>Release</h1></body></html>';
// Synthetic, offline policy. Production CLI cannot take this override from metadata.
const integrity = 'sha512-' + createHash('sha512').update('offline performance script').digest('base64');
const scriptSrc = 'https://static.cloudflareinsights.com/beacon.min.js/v123abc';
const block = `<script type="module" src="${scriptSrc}" integrity="${integrity}" data-cf-beacon='{"token":"public-fixture","version":"fixture"}' crossorigin="anonymous"></script>\n`;
const policy = { version: 1, id: 'cloudflare-rum-fixture', blockCharacters: block.length,
  blockSha256: digest(block), scriptSrc, integrity };
const inject = (html, addition = block) => html.replace('</body>', addition + '</body>');

function fixture({ mutate = html => html, sources = {}, metadataExtra = {} } = {}) {
  const files = { 'index.html': page, '404.html': page.replace('Release', 'Not found'),
    '_headers': '/*\n  X-Test: yes\n', ...sources };
  const metadata = { version: 1, commit: 'a'.repeat(40), dirty: false, audience: 'limited-production',
    fileCount: Object.keys(files).length, hashes: Object.fromEntries(Object.entries(files)
      .map(([file, source]) => [file, digest(source)])), ...metadataExtra };
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: new URL(url), options });
    let file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (!Object.hasOwn(files, file) && Object.hasOwn(files, file.replace(/\/?$/, '.html')))
      file = file.replace(/\/?$/, '.html');
    if (!Object.hasOwn(files, file)) return new Response('Not found', { status: 404 });
    const visitor = Boolean(options.headers['User-Agent']);
    return new Response(mutate(files[file], { file, visitor }), { headers: {
      'Content-Type': file.endsWith('.html') ? 'text/html' : 'application/javascript' } });
  };
  return { metadata, fetchImpl, calls };
}

test('reviewed provider policy pins a complete block and a specific script with integrity', () => {
  assert.equal(cloudflareRumPolicy.blockCharacters, 367);
  assert.match(cloudflareRumPolicy.blockSha256, /^[a-f0-9]{64}$/);
  assert.match(cloudflareRumPolicy.scriptSrc, /^https:\/\/static\.cloudflareinsights\.com\//);
  assert.ok(Object.isFrozen(cloudflareRumPolicy));
  const inspected = inspectCloudflareRum(inject(page), 'index.html', 'sin-yolanda.com', policy);
  assert.equal(inspected.recognized, true);
  assert.equal(inspected.restored, page);
});

test('visitor HTTP reply is required and its recognized addition is recorded separately from source bytes', async () => {
  const f = fixture({ mutate: (html, { visitor }) => visitor ? inject(html) : html });
  const result = await verifyRelease({ origin, ...f, providerPolicy: policy });
  assert.equal(result.passed, true);
  assert.equal(result.summary.exactFiles, 2);
  assert.equal(result.summary.visitorHtmlChecks, 2);
  assert.equal(result.summary.providerTransformedResponses, 2);
  assert.equal(result.summary.hashMismatches, 0);
  assert.deepEqual(result.requestProfiles, ['baseline', 'visitor-html']);
  const visitor = result.observations.find(o => o.profile === 'visitor-html' && o.file === 'index.html');
  assert.equal(visitor.exactHash, false);
  assert.equal(visitor.verifiedProviderTransformation, true);
  assert.equal(visitor.restoredProviderHash, f.metadata.hashes['index.html']);
  assert.equal(visitor.providerTransformations[0].blockSha256, policy.blockSha256);
  assert.notEqual(visitor.observedHash, visitor.expectedHash);
  assert.equal(result.providerPolicy.digest, digest(JSON.stringify(policy)));
  assert.ok(f.calls.every(({ options }) => options.method === 'GET' && !options.body));
  const text = JSON.stringify(result);
  assert.ok(!text.includes('public-fixture') && !text.includes('<h1>'));
});

test('a changed visitor document fails even when the baseline profile is byte exact', async () => {
  const f = fixture({ mutate: (html, { visitor }) => visitor ? inject(html.replace('Release', 'Wrong release')) : html });
  const result = await verifyRelease({ origin, ...f, providerPolicy: policy });
  assert.equal(result.passed, false);
  assert.equal(result.summary.exactFiles, 2);
  assert.ok(result.observations.some(o => o.profile === 'visitor-html'
    && o.problems.includes('hash-mismatch') && o.cloudflareRum.recognized));
});

for (const [name, changed] of [
  ['site configuration', block.replace('public-fixture', 'different-site')],
  ['script version', block.replace('/v123abc', '/v456def')],
  ['script host', block.replace('static.cloudflareinsights.com', 'static.cloudflareinsights.com.evil.example')],
  ['SRI', block.replace(integrity, integrity.replace('sha512-', 'sha384-'))],
  ['inline code', block.replace('></script>', '>alert(1)</script>')],
  ['extra handler', block.replace('crossorigin=', 'onload="alert(1)" crossorigin=')],
  ['extra attribute', block.replace('crossorigin=', 'data-new="x" crossorigin=')],
  ['duplicate attribute', block.replace('crossorigin=', 'src="https://evil.example/a.js" crossorigin=')],
  ['line ending', block.replace(/\n$/, '\r\n')],
  ['duplicate block', block + block],
]) test('unapproved provider addition fails closed: ' + name, async () => {
  const f = fixture({ mutate: (html, { visitor }) => visitor ? inject(html, changed) : html });
  const result = await verifyRelease({ origin, ...f, providerPolicy: policy });
  assert.equal(result.passed, false);
  const observations = result.observations.filter(o => o.profile === 'visitor-html');
  assert.ok(observations.every(o => o.problems.includes('hash-mismatch')));
  assert.ok(observations.every(o => o.problems.some(p => /provider-addition/.test(p))));
});

test('a known block is not an exemption for additional scripts or document whitespace changes', async () => {
  for (const extra of ['<script src="https://evil.example/x.js"></script>', '\n']) {
    const f = fixture({ mutate: (html, { visitor }) => visitor ? extra + inject(html) : html });
    const result = await verifyRelease({ origin, ...f, providerPolicy: policy });
    assert.equal(result.passed, false);
    assert.ok(result.observations.some(o => o.profile === 'visitor-html' && o.problems.includes('hash-mismatch')));
  }
});

test('the same provider block in a different position, preview origin or non-HTML asset is not stripped', async () => {
  const misplaced = fixture({ mutate: (html, { visitor }) => visitor ? block + html : html });
  assert.equal((await verifyRelease({ origin, ...misplaced, providerPolicy: policy })).passed, false);
  const preview = fixture({ mutate: html => inject(html) });
  const report = await verifyRelease({ origin: 'https://fixture.sin-yolanda-web.pages.dev', ...preview, providerPolicy: policy });
  assert.equal(report.passed, false);
  assert.ok(report.observations.some(o => o.problems.includes('provider-addition-outside-official-domain')));
  const asset = fixture({ sources: { 'asset.js': page }, mutate: (html, { file }) => file === 'asset.js' ? inject(html) : html });
  assert.equal((await verifyRelease({ origin, ...asset, providerPolicy: policy })).passed, false);
});

test('metadata cannot supply a relaxed provider policy; invalid injected policies fail before GET', async () => {
  const f = fixture({ mutate: html => inject(html), metadataExtra: { providerPolicy: policy } });
  const result = await verifyRelease({ origin, ...f });
  assert.equal(result.passed, false);
  assert.equal(result.providerPolicy.id, cloudflareRumPolicy.id);
  const invalid = fixture();
  await assert.rejects(verifyRelease({ origin, ...invalid, providerPolicy: { ...policy, blockCharacters: 99999 } }), /block size/);
  assert.equal(invalid.calls.length, 0);
});

test('privacy email and RUM transformations compose but the complete original hash is still required', async () => {
  const original = '<html><body><strong>privacy@example.org</strong></body></html>';
  const bytes = Buffer.from('privacy@example.org'), key = 7;
  const hex = Buffer.from([key, ...bytes.map(byte => byte ^ key)]).toString('hex');
  const encoded = original.replace('privacy@example.org', `<a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="${hex}">[email&#160;protected]</a>`);
  const decoder = '<script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script>';
  for (const addition of [decoder + block, block + decoder]) {
    const f = fixture({ sources: { 'aviso-de-privacidad.html': original },
      mutate: (html, { file }) => file === 'aviso-de-privacidad.html' ? inject(encoded, addition) : html });
    const result = await verifyRelease({ origin, ...f, providerPolicy: policy });
    assert.equal(result.passed, true);
    const row = result.observations.find(o => o.file === 'aviso-de-privacidad.html');
    assert.equal(row.providerTransformations.length, 2);
    assert.equal(row.restoredProviderHash, digest(original));
    const changed = fixture({ sources: { 'aviso-de-privacidad.html': original },
      mutate: (html, { file }) => file === 'aviso-de-privacidad.html' ? 'changed' + inject(encoded, addition) : html });
    assert.equal((await verifyRelease({ origin, ...changed, providerPolicy: policy })).passed, false);
  }
});
