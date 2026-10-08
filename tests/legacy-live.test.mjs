import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { buildCases, createVerifier, loadConfiguration, parseArguments, projectRoot, run } from '../scripts/legacy-redirects/verify-live.mjs';

const config = loadConfiguration();
const canonicalHtml = path => `<link rel="canonical" href="https://sin-yolanda.com${path}"><section id="cocktails"></section>`;
const mapped = { label: 'fixture', site: 'gdl', host: 'sinyolandagdl.com', method: 'GET', kind: 'mapped',
  url: 'https://sinyolandagdl.com/menu/', destination: 'https://sin-yolanda.com/san-ignacio/menu/' };
function fixtureFetcher(handler) {
  return async (url, options) => {
    assert.ok(['GET', 'HEAD'].includes(options.method)); assert.equal(options.redirect, 'manual'); assert.equal(options.credentials, 'omit');
    assert.equal(options.headers.Cookie, undefined); assert.equal(options.headers.Authorization, undefined); assert.equal(options.body, undefined);
    const target = new URL(url);
    if (target.origin === config.targetOrigin) return new Response(options.method === 'HEAD' ? null : canonicalHtml(target.pathname));
    return handler(target, options);
  };
}

test('bounded contract covers all 16 exact routes without a Cartesian product', () => {
  const cases = ['gdl', 'tx', 'usa'].flatMap(site => buildCases(site, config));
  assert.equal(cases.filter(item => item.label === 'exact-route').length, 32);
  assert.ok(cases.length < 70);
  assert.deepEqual(new Set(cases.map(item => item.method)), new Set(['GET', 'HEAD']));
  assert.ok(cases.some(item => item.label === 'http-www-upgrade'));
  assert.ok(cases.some(item => item.label === 'registered-utm' && item.destination.includes('?utm_source=instagram&utm_medium=social#cocktails')));
});

test('exact 301 is attributed to the plugin and central GET/HEAD metadata is checked', async () => {
  const verifier = createVerifier(config, fixtureFetcher(() => new Response(null, { status: 301,
    headers: { location: mapped.destination, 'x-redirect-by': 'Sin Yolanda Legacy Redirects' } })));
  const result = await verifier.verifyCase(mapped);
  assert.equal(result.passed, true); assert.equal(result.hops[0].stage, 'plugin-301');
  assert.equal(verifier.getRequests(), 3); assert.equal(verifier.targetResults().length, 2);
});

test('provider HTTP upgrade is distinguished from the subsequent exact plugin 301', async () => {
  const verifier = createVerifier(config, fixtureFetcher(url => url.protocol === 'http:'
    ? new Response(null, { status: 308, headers: { location: 'https://sinyolandagdl.com/menu/' } })
    : new Response(null, { status: 301, headers: { location: mapped.destination, 'x-redirect-by': 'Sin Yolanda Legacy Redirects' } })));
  const result = await verifier.verifyCase({ ...mapped, url: 'http://sinyolandagdl.com/menu/' });
  assert.equal(result.passed, true);
  assert.deepEqual(result.hops.map(hop => hop.stage), ['provider-or-legacy-canonical-before-plugin', 'plugin-301']);
  assert.equal(result.hops[0].upgradeToHttps, true);
});

test('redirect loops terminate locally before repeating a URL', async () => {
  const verifier = createVerifier(config, fixtureFetcher(url => new Response(null, { status: 301,
    headers: { location: url.hostname.startsWith('www.') ? mapped.url : 'https://www.sinyolandagdl.com/menu/' } })));
  const result = await verifier.verifyCase(mapped);
  assert.equal(result.passed, false); assert.match(result.failure, /loop/); assert.equal(verifier.getRequests(), 2);
});

test('wrong origin is never followed and arbitrary redirect query is not saved', async () => {
  const verifier = createVerifier(config, fixtureFetcher(() => new Response(null, { status: 301,
    headers: { location: 'https://evil.invalid/private-contact?email=private%40example.invalid' } })));
  const result = await verifier.verifyCase(mapped);
  assert.equal(result.passed, false); assert.equal(verifier.getRequests(), 1);
  assert.doesNotMatch(JSON.stringify(result), /evil\.invalid|private-contact|email=|private%40/);
});

test('a 302, missing plugin attribution or wrong canonical target cannot pass as plugin release', async () => {
  for (const variant of ['302', 'no-header', 'wrong-path']) {
    const verifier = createVerifier(config, fixtureFetcher(() => new Response(null, { status: variant === '302' ? 302 : 301,
      headers: { location: variant === 'wrong-path' ? config.targetOrigin + '/' : mapped.destination,
        ...(variant === 'no-header' ? {} : { 'x-redirect-by': 'Sin Yolanda Legacy Redirects' }) } })));
    assert.equal((await verifier.verifyCase(mapped)).passed, false);
    assert.equal(verifier.getRequests(), 1);
  }
});

test('excluded pages remain at the legacy host and never follow an out-of-scope target', async () => {
  const verifier = createVerifier(config, fixtureFetcher(() => new Response('<form><input name="private"></form>')));
  const result = await verifier.verifyCase({ ...mapped, kind: 'preserved', destination: null, url: 'https://sinyolandagdl.com/wp-json/' });
  assert.equal(result.passed, true); assert.match(result.bodySha256, /^[a-f0-9]{64}$/); assert.doesNotMatch(JSON.stringify(result), /<form|<input/);
  const wrong = createVerifier(config, fixtureFetcher(() => new Response(null, { status: 301,
    headers: { location: mapped.destination, 'x-redirect-by': 'Sin Yolanda Legacy Redirects' } })));
  assert.equal((await wrong.verifyCase({ ...mapped, kind: 'preserved', destination: null })).passed, false);
});

test('target noindex, wrong canonical and missing requested fragment all fail', async () => {
  for (const failure of ['noindex', 'canonical', 'anchor']) {
    const verifier = createVerifier(config, async (url, options) => {
      if (new URL(url).origin !== config.targetOrigin) return new Response(null, { status: 301,
        headers: { location: mapped.destination + '#cocktails', 'x-redirect-by': 'Sin Yolanda Legacy Redirects' } });
      const html = failure === 'canonical' ? '<link rel="canonical" href="https://sin-yolanda.com/">' : canonicalHtml('/san-ignacio/menu/');
      return new Response(options.method === 'HEAD' ? null : failure === 'anchor' ? html.replace('id="cocktails"', '') : html,
        { headers: failure === 'noindex' ? { 'x-robots-tag': 'noindex' } : {} });
    });
    assert.equal((await verifier.verifyCase({ ...mapped, destination: mapped.destination + '#cocktails' })).passed, false);
  }
});

test('unknown request query is never persisted and an excluded form request is never submitted', async () => {
  const verifier = createVerifier(config, fixtureFetcher(() => new Response('public page')));
  const result = await verifier.verifyCase({ ...mapped, kind: 'native-query', destination: null, url: mapped.url + '?name=not-stored-fixture' });
  assert.equal(result.passed, true); assert.doesNotMatch(JSON.stringify(result), /name=|not-stored/);
});

test('CLI exposes only selected site and fresh output, never credentials or mutation flags', () => {
  assert.deepEqual(parseArguments(['--site', 'all', '--output', '.artifacts/verification']), { site: 'all', output: '.artifacts/verification' });
  for (const args of [[], ['--site', 'other', '--output', '.artifacts/x'], ['--site', 'gdl', '--install'], ['--site', 'gdl', '--cookie', 'value']]) {
    assert.throws(() => parseArguments(args));
  }
});

test('known public upload is discovered anonymously and cross-origin media is never requested', async () => {
  const url = 'https://sinyolandagdl.com/wp-content/uploads/2026/10/public-thumb.jpg';
  const calls = [];
  const verifier = createVerifier(config, fixtureFetcher((target, options) => {
    calls.push(target.href);
    if (target.pathname.startsWith('/wp-json/wp/v2/media')) return new Response(JSON.stringify([{ media_details: { sizes: { thumbnail: { source_url: url } } } }]));
    assert.equal(options.method, 'GET'); return new Response('fixture-public-image');
  }));
  const result = await verifier.uploadCase('gdl');
  assert.equal(result.passed, true); assert.equal(calls.length, 2);
  assert.equal(result.source, url); assert.doesNotMatch(JSON.stringify(result), /fixture-public-image|source_url/);
  const wrong = createVerifier(config, fixtureFetcher(() => new Response(JSON.stringify([{ source_url: 'https://evil.invalid/private.jpg?token=secret' }]))));
  const failed = await wrong.uploadCase('gdl');
  assert.equal(failed.passed, false); assert.equal(wrong.getRequests(), 1);
  assert.doesNotMatch(JSON.stringify(failed), /evil\.invalid|private\.jpg|token=|secret/);
});

test('all-site fixture completes the bounded contract and report excludes bodies and arbitrary queries', async t => {
  mkdirSync(join(projectRoot, '.artifacts'), { recursive: true });
  const temporary = mkdtempSync(join(projectRoot, '.artifacts/legacy-live-fixture-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const calls = [];
  const fetcher = fixtureFetcher((url, options) => {
    calls.push({ method: options.method, pathname: url.pathname });
    const host = url.hostname.replace(/^www\./, '');
    if (url.protocol === 'http:') { const target = new URL(url); target.protocol = 'https:'; return new Response(null, { status: 308, headers: { location: target.href } }); }
    if (url.hostname.startsWith('www.')) { const target = new URL(url); target.hostname = host; return new Response(null, { status: 301, headers: { location: target.href } }); }
    if (url.pathname === '/wp-json/wp/v2/media') return new Response(JSON.stringify([{ source_url: `https://${host}/wp-content/uploads/2026/10/public-thumb.jpg` }]));
    if (url.pathname.startsWith('/wp-content/uploads/') || url.pathname === '/wp-json/' || url.searchParams.has('name')) return new Response('public-original-content-not-saved');
    const source = url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '') + '/';
    const destination = config.sites[host]?.[source];
    if (!destination) return new Response('public-original-content-not-saved');
    const [path, fragment] = destination.split('#');
    const query = new URLSearchParams();
    for (const [key, values] of Object.entries(config.utmValues)) {
      const incoming = url.searchParams.getAll(key);
      if (incoming.length === 1 && values.includes(incoming[0])) query.set(key, incoming[0]);
    }
    const target = config.targetOrigin + path + (query.size ? '?' + query.toString() : '') + (fragment ? '#' + fragment : '');
    return new Response(null, { status: 301, headers: { location: target, 'x-redirect-by': 'Sin Yolanda Legacy Redirects' } });
  });
  const result = await run({ site: 'all', output: join(temporary, 'report') }, fetcher);
  assert.equal(result.passed, true); assert.equal(result.cases, 69); assert.equal(result.requests, 108);
  const stored = readFileSync(result.report, 'utf8');
  assert.doesNotMatch(stored, /public-original-content-not-saved|not-stored-fixture|person%40|example\.invalid|fbclid=|name=|<link/);
  assert.ok(calls.every(call => ['GET', 'HEAD'].includes(call.method)));
});

test('native query 404 preserves WordPress response without certifying a functional form', async () => {
  const verifier = createVerifier(config, fixtureFetcher(() => new Response('native WP 404 body not stored', { status: 404 })));
  const result = await verifier.verifyCase({ ...mapped, label: 'form-query-preserved', kind: 'native-query', destination: null,
    url: mapped.url + '?name=not-stored-fixture' });
  assert.equal(result.passed, true); assert.equal(result.nativeStatus, 404);
  assert.match(result.preservationNote, /does not certify a functional form/);
  assert.doesNotMatch(JSON.stringify(result), /native WP 404 body|name=|not-stored-fixture/);
});

test('native query redirected to central fails and an actual REST exclusion still requires 200', async () => {
  const redirected = createVerifier(config, fixtureFetcher(() => new Response(null, { status: 301,
    headers: { location: mapped.destination, 'x-redirect-by': 'Sin Yolanda Legacy Redirects' } })));
  const query = await redirected.verifyCase({ ...mapped, kind: 'native-query', destination: null, url: mapped.url + '?name=not-stored-fixture' });
  assert.equal(query.passed, false); assert.match(query.failure, /redirected out/);
  const missing = createVerifier(config, fixtureFetcher(() => new Response('REST missing', { status: 404 })));
  const rest = await missing.verifyCase({ ...mapped, label: 'public-rest-preserved', kind: 'preserved', destination: null,
    url: 'https://sinyolandagdl.com/wp-json/' });
  assert.equal(rest.passed, false); assert.match(rest.failure, /did not remain available/);
});
