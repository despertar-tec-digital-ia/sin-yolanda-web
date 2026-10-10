import assert from 'node:assert/strict';
import test from 'node:test';
import { endpoint, publicOrigin, relay, upstreamUrl } from '../services/loyalty-intake/pages/functions/api/loyalty/el-paso/registrations.js';

const key = 'c83c2ff2-9c48-4398-9c4c-ffbd670bcd36';
const env = { SY_INTAKE_PROXY_AUTH: 'Basic c3ludGhldGljOnRlc3Qtb25seS1jcmVkZW50aWFs' };
const received = { status: 'received', receipt_id: key, sync_status: 'pending' };
const payload = { full_name: 'TECHNICAL TEST', email: 'test@example.invalid', branch: 'el-paso' };
const request = (options = {}) => new Request(publicOrigin + endpoint + (options.query || ''), {
  method: options.method || 'POST', headers: {
    Origin: publicOrigin, 'Content-Type': 'application/json', 'Idempotency-Key': key,
    Cookie: 'private-cookie', 'X-Forwarded-For': '203.0.113.1', Authorization: 'Bearer visitor-secret',
    ...options.headers,
  }, ...(options.method === 'GET' ? {} : { body: options.body ?? JSON.stringify(payload) }),
});

test('only fixed same-origin POSTs reach the authenticated backend; no caller headers or target survive', async () => {
  let calls = 0;
  const response = await relay(request(), env, async (url, options) => {
    calls++;
    assert.equal(url, upstreamUrl);
    assert.equal(options.redirect, 'error');
    assert.deepEqual(Object.keys(options.headers).sort(), ['Authorization', 'Content-Type', 'Idempotency-Key', 'Origin']);
    assert.equal(options.headers.Authorization, env.SY_INTAKE_PROXY_AUTH);
    assert.equal(options.headers.Origin, publicOrigin);
    assert.deepEqual(JSON.parse(new TextDecoder().decode(options.body)), payload);
    return Response.json({ ...received, private_customer: 'never-reflected' }, { status: 201 });
  });
  assert.equal(calls, 1); assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), received);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Set-Cookie'), null);
});

test('invalid request, missing binding and oversized bodies fail without upstream access', async () => {
  const cases = [
    [request({ query: '?target=https://example.invalid' }), env, 404],
    [request({ method: 'GET' }), env, 405],
    [request({ headers: { Origin: 'https://example.invalid' } }), env, 403],
    [request({ headers: { 'Content-Type': 'text/plain' } }), env, 415],
    [request({ headers: { 'Idempotency-Key': 'invalid' } }), env, 400],
    [request(), {}, 503], [request(), { SY_INTAKE_PROXY_AUTH: 'wrong' }, 503],
    [request({ body: '[' }), env, 400], [request({ body: 'null' }), env, 400],
    [request({ body: '[]' }), env, 400], [request({ body: new Uint8Array([255]) }), env, 400],
    [request({ body: ' '.repeat(8193) }), env, 413],
    [request({ headers: { 'Content-Length': '8193' } }), env, 413],
    [request({ headers: { 'Content-Length': '-1' } }), env, 413],
  ];
  for (const [input, binding, status] of cases) {
    const response = await relay(input, binding, () => { throw new Error('Should not reach upstream'); });
    assert.equal(response.status, status);
    assert.doesNotMatch(await response.text(), /visitor-secret|private-cookie|TECHNICAL TEST/);
  }
});

test('upstream HTML, redirects, timeouts, oversize and false success are unavailable, never customer data', async () => {
  const responses = [
    () => new Response('provider-secret', { status: 302, headers: { Location: 'https://example.invalid' } }),
    () => new Response('provider-secret', { status: 401 }),
    () => Response.json({ ok: true }),
    () => Response.json({ ...received, receipt_id: 'invalid' }),
    () => Response.json({ ...received, sync_status: 'synced' }),
    () => Response.json({ ...received, private: 'x'.repeat(2049) }),
    () => Response.json({ code: 'unknown', detail: 'provider-secret' }, { status: 400 }),
    () => { throw new Error('provider-secret'); },
  ];
  for (const provider of responses) {
    const response = await relay(request(), env, provider);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { code: 'unavailable' });
  }
});

test('only allowlisted backend failures pass through, without details or provider headers', async () => {
  for (const [code, status] of Object.entries({ invalid_fields: 400, consent_required: 400, invalid_date: 400, invalid_phone: 400, verification_failed: 400, idempotency_conflict: 409, rate_limited: 429 })) {
    const response = await relay(request(), env, async () => Response.json({ code, detail: 'provider-secret' }, { status, headers: { 'Set-Cookie': 'never-copy' } }));
    assert.equal(response.status, status); assert.deepEqual(await response.json(), { code });
    assert.equal(response.headers.get('Set-Cookie'), null);
  }
});
