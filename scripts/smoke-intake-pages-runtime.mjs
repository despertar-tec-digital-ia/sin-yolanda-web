// Execute the Wrangler-compiled Pages Function in local workerd. No credentials or network.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { assertNoLinkAncestors, projectRoot, readSource, statIfPresent } from './package-intake-preview.mjs';
import { endpoint, publicOrigin, upstreamUrl } from '../services/loyalty-intake/pages/functions/api/loyalty/el-paso/registrations.js';

assert.ok(process.env.SY_QA_RUNTIME_ROOT, 'Provide the installed Wrangler runtime package directory');
assert.equal(process.argv.length, 5, 'Use smoke-intake-pages-runtime.mjs COMPILED_WORKER NEW_REPORT ROUTES_JSON');
const compiled = resolve(process.argv[2]), evidence = resolve(process.argv[3]), routesPath = resolve(process.argv[4]);
for (const path of [compiled, evidence, routesPath]) {
  assertNoLinkAncestors(path);
  assert.ok(path.startsWith(resolve(projectRoot, '.artifacts') + '/'), 'Use only isolated ignored artifacts');
}
assert.ok(statIfPresent(compiled)?.isFile() && !statIfPresent(evidence), 'Provide compiled Function and fresh report');
assert.ok(statIfPresent(dirname(evidence))?.isDirectory(), 'Report parent must exist');
const require = createRequire(resolve(process.env.SY_QA_RUNTIME_ROOT, '../package.json'));
const { Miniflare, Log, LogLevel, convertV4MiniflareOptions, Response: RuntimeResponse } = require('miniflare');
const key = '37acd8fe-918f-4bd3-a8b9-f1dd0480fd87';
const received = { status: 'received', receipt_id: key, sync_status: 'pending' };
const syntheticAuth = 'Basic c3ludGhldGljOnRlc3Qtb25seS1jcmVkZW50aWFs';
let mode = 'success', upstreamCalls = 0, staticCalls = 0;
const fixtureFailures = [];
const report = { version: 1, passed: false, runtime: 'local workerd via Miniflare', scope: 'Compiled Pages Function with isolated synthetic upstream/assets. No remote request, real token, customer, GHL or deployment.', cases: [], compiledSha256: createHash('sha256').update(readSource(dirname(compiled), basename(compiled))).digest('hex') };
const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true, scriptPath: compiled, compatibilityDate: '2026-10-10',
  log: new Log(LogLevel.NONE), logRequests: false, cf: false, telemetry: { enabled: false },
  unsafeRegisterWorker: false, bindings: { SY_INTAKE_PROXY_AUTH: syntheticAuth },
  serviceBindings: { ASSETS: async () => { staticCalls++; return new RuntimeResponse('STATIC_ONLY', { status: 200 }); } },
  outboundService: async request => {
    upstreamCalls++;
    try {
    assert.equal(request.url, upstreamUrl); assert.equal(request.method, 'POST');
    assert.equal(request.headers.get('Authorization'), syntheticAuth);
    assert.equal(request.headers.get('Origin'), publicOrigin);
    for (const name of ['Cookie', 'Forwarded', 'X-Forwarded-For', 'X-Forwarded-Host', 'X-Forwarded-Proto']) assert.equal(request.headers.get(name), null);
    assert.deepEqual(JSON.parse(await request.text()), { branch: 'el-paso', full_name: 'TECHNICAL TEST', email: 'runtime@example.invalid' });
    } catch (error) { fixtureFailures.push(error.message); throw error; }
    if (mode === 'failure') return RuntimeResponse.json({ code: 'rate_limited', private: 'must-not-be-reflected' }, { status: 429, headers: { 'Set-Cookie': 'private=never' } });
    if (mode === 'oversized') return RuntimeResponse.json({ ...received, private: 'x'.repeat(3000) });
    if (mode === 'redirect') return new RuntimeResponse(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{')); } }), {
      status: 302, headers: { 'Content-Type': 'application/json', Location: 'https://example.invalid/' },
    });
    if (mode === 'slow-response') return new RuntimeResponse(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{')); } }), { headers: { 'Content-Type': 'application/json' } });
    return RuntimeResponse.json({ ...received, private: 'must-not-be-reflected' }, { status: 201 });
  },
}));
function input(options = {}) {
  return {
    method: options.method || 'POST', headers: { Origin: publicOrigin, 'Content-Type': 'application/json', 'Idempotency-Key': key, Cookie: 'visitor=private', Authorization: 'Bearer visitor-private', 'X-Forwarded-For': '203.0.113.1', ...options.headers },
    ...((options.method === 'GET' || options.method === 'HEAD') ? {} : { body: options.body || JSON.stringify({ branch: 'el-paso', full_name: 'TECHNICAL TEST', email: 'runtime@example.invalid' }) }),
  };
}
async function check(name, url, options, status, expected) {
  const start = Date.now();
  const response = await mf.dispatchFetch(url, { ...options, signal: AbortSignal.timeout(20000) });
  assert.deepEqual(fixtureFailures, [], 'Synthetic upstream contract');
  if (response.status !== status) assert.fail(`${name}: expected ${status}, got ${response.status}; mock calls ${upstreamCalls}; synthetic diagnostic ${await response.text()}`);
  if (expected !== undefined) assert.deepEqual(await response.json(), expected, name);
  else assert.equal(await response.text(), 'STATIC_ONLY', name);
  assert.equal(response.headers.get('Set-Cookie'), null);
  report.cases.push({ name, passed: true, status, elapsedMs: Date.now() - start });
}
try {
  await mf.ready;
  const routes = JSON.parse(readSource(dirname(routesPath), '_routes.json'));
  assert.deepEqual(routes, { version: 1, include: [endpoint], exclude: [] });
  for (const path of ['/', '/houston/menu/', '/el-paso/registro/', '/api/loyalty/el-paso/registrations/extra']) await check(`static ${path}`, publicOrigin + path, { method: 'GET' }, 200);
  assert.equal(upstreamCalls, 0);
  await check('exact GET', publicOrigin + endpoint, input({ method: 'GET' }), 405, { code: 'method_not_allowed' });
  await check('foreign origin', publicOrigin + endpoint, input({ headers: { Origin: 'https://example.invalid' } }), 403, { code: 'origin_denied' });
  await check('query denied', publicOrigin + endpoint + '?target=other', input(), 404, { code: 'not_found' });
  await check('non JSON', publicOrigin + endpoint, input({ headers: { 'Content-Type': 'text/plain' } }), 415, { code: 'invalid_fields' });
  await check('oversized request', publicOrigin + endpoint, input({ body: ' '.repeat(8193) }), 413, { code: 'invalid_fields' });
  assert.equal(upstreamCalls, 0);
  await check('validated saved receipt', publicOrigin + endpoint, input(), 201, received);
  mode = 'failure'; await check('sanitized failure', publicOrigin + endpoint, input(), 429, { code: 'rate_limited' });
  mode = 'oversized'; await check('bounded response', publicOrigin + endpoint, input(), 503, { code: 'unavailable' });
  mode = 'redirect'; await check('redirect refused', publicOrigin + endpoint, input(), 503, { code: 'unavailable' });
  assert.ok(report.cases.at(-1).elapsedMs < 5000, 'Redirects must be rejected before waiting for their response body');
  mode = 'slow-response'; await check('absolute outgoing body deadline', publicOrigin + endpoint, input(), 503, { code: 'unavailable' });
  const outgoing = report.cases.at(-1).elapsedMs;
  assert.ok(outgoing >= 11000 && outgoing < 18000, 'Outgoing timeout must bound a stalled response');
  const calls = upstreamCalls;
  const stalledBody = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{')); } });
  await check('absolute incoming body deadline', publicOrigin + endpoint, { ...input({ body: stalledBody }), duplex: 'half' }, 408, { code: 'invalid_fields' });
  assert.ok(report.cases.at(-1).elapsedMs >= 7000 && report.cases.at(-1).elapsedMs < 14000);
  assert.equal(upstreamCalls, calls, 'Stalled incoming bodies cannot reach the upstream');
  report.passed = true; report.upstreamMockCalls = upstreamCalls; report.staticMockCalls = staticCalls;
} finally {
  await mf.dispose();
  writeFileSync(evidence, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, evidence, scope: report.scope }));
