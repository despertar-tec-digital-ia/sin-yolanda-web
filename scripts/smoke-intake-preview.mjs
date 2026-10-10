// Isolated Docker/loopback smoke with fictional data only. No HTTPS/provider/publication claim.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageIntakePreview, previewHostname, previewOrigin, projectRoot } from './package-intake-preview.mjs';

const pythonBase = 'python:3.12-slim@sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1';
const defaultBackendImage = 'sinyolanda-intake-preview-qa:20261009';
const syntheticSiteKey = '0xNativeSmokeFixture123456789012';
const mockSource = String.raw`import base64, json, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def log_message(self, *args):
        pass
    def do_POST(self):
        # This fixture serves one POST per connection; it has no upstream pool.
        self.close_connection = True
        try:
            if self.headers.get('Transfer-Encoding', '').lower() == 'chunked':
                pieces = []
                while True:
                    size = int(self.rfile.readline().strip().split(b';')[0], 16)
                    if size == 0:
                        while self.rfile.readline().strip():
                            pass
                        break
                    pieces.append(self.rfile.read(size))
                    self.rfile.read(2)
                body = b''.join(pieces)
            else:
                body = self.rfile.read(int(self.headers.get('Content-Length', '0')))
            failure = body == b'{"smoke":"upstream-failure"}'
            result = {'code': 'unavailable'} if failure else {
                'headers': dict((name.lower(), value) for name, value in self.headers.items()),
                'bodyBase64': base64.b64encode(body).decode('ascii')}
            response = json.dumps(result).encode('utf-8')
            self.send_response(502 if failure else 200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(response)))
            self.send_header('Connection', 'close')
            self.end_headers()
            self.wfile.write(response)
        except (BrokenPipeError, ConnectionResetError, ValueError):
            self.close_connection = True

# An optional, bounded delay exercises startup readiness with fictional fixtures only.
time.sleep(int(sys.argv[1]) / 1000)
ThreadingHTTPServer(('0.0.0.0', 8000), Handler).serve_forever()
`;

function execute(program, args, { input, timeout = 120000, allowFailure = false } = {}) {
  return new Promise((done, fail) => {
    const child = spawn(program, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = [], stderr = [];
    let size = 0;
    const collect = target => chunk => { size += chunk.length; if (size < 1024 * 1024) target.push(chunk); };
    child.stdout.on('data', collect(stdout));
    child.stderr.on('data', collect(stderr));
    const timer = setTimeout(() => { child.kill('SIGTERM'); }, timeout);
    child.once('error', () => { clearTimeout(timer); fail(new Error('local_process_unavailable')); });
    child.once('close', code => {
      clearTimeout(timer);
      const result = { code, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') };
      if (code && !allowFailure) fail(new Error('local_process_failed'));
      else done(result);
    });
    child.stdin.end(input);
  });
}

const docker = (args, options) => execute('docker', args, options);
const sleep = ms => new Promise(done => setTimeout(done, ms));

function call(port, { path = '/', method = 'GET', headers = {}, body, chunks, chunkEvery = 0 } = {}) {
  return new Promise((done, fail) => {
    let timer;
    const started = performance.now();
    const req = request({ hostname: '127.0.0.1', port, path, method, headers: { Host: previewHostname, ...headers }, agent: false }, response => {
      const bytes = [];
      response.on('data', part => bytes.push(part));
      response.once('end', () => {
        clearTimeout(timer);
        req.end();
        done({ status: response.statusCode, headers: response.headers, body: Buffer.concat(bytes), elapsedMs: Math.round(performance.now() - started) });
      });
    });
    req.setTimeout(18000, () => req.destroy(new Error('loopback_request_timeout')));
    req.once('error', () => { clearTimeout(timer); fail(new Error('loopback_request_failed')); });
    if (!chunks) req.end(body);
    else {
      let index = 0;
      const send = () => {
        if (index >= chunks.length) { req.end(); return; }
        req.write(chunks[index++]);
        if (chunkEvery) timer = setTimeout(send, chunkEvery);
        else send();
      };
      send();
    }
  });
}

async function mappedPort(container) {
  const result = await docker(['inspect', '--format', '{{(index (index .NetworkSettings.Ports "8080/tcp") 0).HostPort}}', container]);
  const port = Number(result.stdout.trim());
  assert.ok(Number.isInteger(port) && port > 1023 && port < 65536);
  return port;
}

async function waitForGateway(port) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await call(port)).status === 401) return; } catch {}
    await sleep(150);
  }
  throw new Error('gateway_not_ready');
}

function securityHeaders(response) {
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.match(response.headers['x-robots-tag'] || '', /noindex, nofollow/);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['referrer-policy'], 'no-referrer');
  assert.match(response.headers['content-security-policy'] || '', /frame-ancestors 'none'/);
  assert.match(response.headers['content-security-policy'] || '', /form-action 'none'/);
  assert.doesNotMatch(response.headers['content-security-policy'] || '', /unsafe-inline|unsafe-eval/);
}

function safeResponseSummary(response) {
  return {
    status: response.status,
    responseBodyBytes: response.body.length,
    responseHeaderNames: Object.keys(response.headers).sort(),
    elapsedMs: response.elapsedMs,
    securityHeaders: {
      noStore: response.headers['cache-control'] === 'no-store',
      noIndex: /noindex, nofollow/.test(response.headers['x-robots-tag'] || ''),
      noSniff: response.headers['x-content-type-options'] === 'nosniff',
      noReferrer: response.headers['referrer-policy'] === 'no-referrer',
      frameAncestorsNone: /frame-ancestors 'none'/.test(response.headers['content-security-policy'] || ''),
      formActionNone: /form-action 'none'/.test(response.headers['content-security-policy'] || ''),
      noUnsafeScript: !/unsafe-inline|unsafe-eval/.test(response.headers['content-security-policy'] || ''),
    },
  };
}

function redactedLogSummary(logs) {
  const text = logs.stdout + logs.stderr;
  const classes = [];
  for (const [code, pattern] of [
    ['python_traceback', /Traceback \(most recent call last\)/],
    ['connection_reset', /ConnectionResetError/],
    ['broken_pipe', /BrokenPipeError/],
    ['fixed_server_event', /intake_server_event/],
    ['nginx_startup_error', /nginx:|\[(?:emerg|alert)\]/],
  ]) if (pattern.test(text)) classes.push(code);
  if (text.trim() && !classes.length) classes.push('other_nonempty');
  return { stdoutBytes: Buffer.byteLength(logs.stdout), stderrBytes: Buffer.byteLength(logs.stderr), classes };
}

export async function runPreviewSmoke({ keepRunning = false, backendImage = defaultBackendImage, mockStartupDelayMs = 0 } = {}) {
  assert.match(backendImage, /^sinyolanda-(?:loyalty-intake|intake-preview-qa|intake-ci):[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/, 'explicit_local_backend_image_required');
  assert.ok(Number.isInteger(mockStartupDelayMs) && mockStartupDelayMs >= 0 && mockStartupDelayMs <= 5000, 'bounded_mock_startup_delay');
  const suffix = randomBytes(6).toString('hex');
  const prefix = `sy-intake-smoke-${suffix}`;
  const artifactRoot = resolve(projectRoot, '.artifacts');
  mkdirSync(artifactRoot, { recursive: true });
  const directory = mkdtempSync(resolve(artifactRoot, `${prefix}-`));
  chmodSync(directory, 0o700);
  const candidate = resolve(directory, 'candidate'), runtime = resolve(directory, '.runtime');
  const manifest = packageIntakePreview({ destination: candidate, siteKey: syntheticSiteKey });
  mkdirSync(runtime, { mode: 0o700 });
  const authPath = resolve(runtime, 'preview_auth'), browserAuthPath = resolve(runtime, 'browser-auth.json');
  const username = 'local-review', password = randomBytes(24).toString('hex');
  const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  // Weak SHA1 here is a random, short-lived synthetic fixture only, never operational credentials.
  writeFileSync(authPath, `${username}:{SHA}${createHash('sha1').update(password).digest('base64')}\n`, { mode: 0o444, flag: 'wx' });
  writeFileSync(browserAuthPath, JSON.stringify({ username, password }) + '\n', { mode: 0o600, flag: 'wx' });
  writeFileSync(resolve(runtime, 'mock.py'), mockSource, { mode: 0o644, flag: 'wx' });
  const image = `sinyolanda-intake-preview:smoke-${suffix}`;
  const network = `${prefix}-network`, ingress = `${prefix}-loopback`, mock = `${prefix}-mock`, gateway = `${prefix}-gateway`;
  const ownNetworks = [], ownContainers = [];
  let ownImage = false, keep = false, activeCheck = 'setup';
  const checks = [];
  const evidence = { version: 1, kind: 'isolated-local-preview-smoke', transport: 'loopback-http', providerTested: false, tlsTested: false, origin: previewOrigin, candidateDigest: manifest.digest, checks, result: 'incomplete' };
  async function check(name, action) {
    activeCheck = name;
    await action();
    checks.push({ name, result: 'passed' });
  }
  async function startGateway(name, targetNetwork) {
    activeCheck = 'start_gateway';
    await docker(['create', '--name', name, '--network', ingress,
      '--user', '101:101', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
      '--pids-limit', '64', '--memory', '64m', '--cpus', '0.5',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=1048576,mode=1777',
      '--mount', `type=bind,source=${authPath},target=/run/secrets/preview_auth,readonly`,
      '--publish', '127.0.0.1::8080', image]);
    ownContainers.push(name);
    await docker(['network', 'connect', targetNetwork, name]);
    await docker(['start', name]);
    const port = await mappedPort(name);
    await waitForGateway(port);
    return port;
  }
  const apiHeaders = { Authorization: authorization, Origin: previewOrigin, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() };
  try {
    activeCheck = 'build_gateway_image';
    await docker(['build', '--quiet', '--tag', image, candidate]);
    ownImage = true;
    activeCheck = 'create_isolated_network';
    await docker(['network', 'create', '--internal', network]);
    ownNetworks.push(network);
    await docker(['network', 'create', ingress]);
    ownNetworks.push(ingress);
    activeCheck = 'start_mock_backend';
    await docker(['run', '--detach', '--name', mock, '--network', network, '--network-alias', 'intake',
      '--user', '101:101', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
      '--pids-limit', '64', '--memory', '64m', '--cpus', '0.5',
      '--mount', `type=bind,source=${resolve(runtime, 'mock.py')},target=/mock.py,readonly`,
      '--entrypoint', 'python', pythonBase, '/mock.py', String(mockStartupDelayMs)]);
    ownContainers.push(mock);
    const port = await startGateway(gateway, network);
    evidence.runtime = { port, network, ingress, mock, gateway, image, packagePath: candidate, authFilePath: authPath, browserAuthFilePath: browserAuthPath };
    process.stdout.write(JSON.stringify({ status: 'local-gateway-ready', port, gateway, image, packagePath: candidate, authFilePath: authPath, browserAuthFilePath: browserAuthPath }) + '\n');

    // Nginx's 401 proves only that the gateway is up, not that Python has bound its
    // upstream port. Retry only this dedicated {} readiness probe, never core tests.
    activeCheck = 'mock_upstream_readiness';
    const readiness = evidence.mockReadiness = { startupDelayMs: mockStartupDelayMs, attempts: [], result: 'incomplete' };
    const readinessStarted = performance.now();
    for (let attempt = 0; attempt < 60; attempt++) {
      const response = await call(port, { path: '/api/registrations', method: 'POST', headers: apiHeaders, body: '{}' });
      readiness.attempts.push({ status: response.status, responseBodyBytes: response.body.length, elapsedMs: response.elapsedMs });
      readiness.lastResponse = safeResponseSummary(response);
      securityHeaders(response);
      if (response.status === 200) {
        activeCheck = 'mock_upstream_readiness_exact_body';
        const result = JSON.parse(response.body);
        assert.deepEqual(Buffer.from(result.bodyBase64, 'base64'), Buffer.from('{}'), 'mock_readiness_body_exact');
        assert.equal(result.headers.origin, previewOrigin, 'mock_readiness_origin');
        assert.equal(result.headers['content-type'], 'application/json', 'mock_readiness_json');
        readiness.bodyExact = true;
        readiness.result = 'passed'; readiness.elapsedMs = Math.round(performance.now() - readinessStarted);
        break;
      }
      assert.equal(response.status, 503, 'mock_starting_response');
      assert.deepEqual(JSON.parse(response.body), { code: 'unavailable' }, 'mock_starting_response_redacted');
      assert.ok(performance.now() - readinessStarted < 10000 && attempt < 59, 'mock_upstream_readiness_timeout');
      await sleep(150);
    }

    const paths = ['/', '/index.html', '/styles.css', '/intake.js', '/intake-config.json', '/assets/media/brand-logo.png', '/fonts/bebas-neue-400.woff2', '/fonts/roboto-slab-400.woff2', '/fonts/roboto-slab-700.woff2', '/api/registrations', '/health', '/unknown', '/api/registrations?bypass=true'];
    await check('all_paths_methods_require_basic_auth', async () => {
      for (const Authorization of [undefined, 'Basic ZmFrZTpmYWtl']) {
        for (const path of paths) for (const method of ['GET', 'HEAD', 'OPTIONS', 'POST']) {
          const headers = { ...apiHeaders };
          if (Authorization) headers.Authorization = Authorization; else delete headers.Authorization;
          const response = await call(port, { path, method, headers, body: method === 'POST' ? Buffer.from('{}') : undefined });
          assert.equal(response.status, 401, 'unauthenticated_route'); securityHeaders(response);
        }
        const oversizedHeaders = { ...apiHeaders, 'Content-Length': '8193' };
        if (Authorization) oversizedHeaders.Authorization = Authorization; else delete oversizedHeaders.Authorization;
        const response = await call(port, { path: '/api/registrations', method: 'POST', headers: oversizedHeaders, body: Buffer.alloc(8193, 97) });
        assert.equal(response.status, 401, 'unauthenticated_large_body');
        const chunkedHeaders = { ...oversizedHeaders, 'Transfer-Encoding': 'chunked' };
        delete chunkedHeaders['Content-Length'];
        const chunked = await call(port, { path: '/api/registrations', method: 'POST', headers: chunkedHeaders, chunks: [Buffer.alloc(8193, 97)] });
        assert.equal(chunked.status, 401, 'unauthenticated_large_chunked_body'); securityHeaders(chunked);
      }
    });
    await check('authenticated_static_allowlist_and_security_headers', async () => {
      for (const path of paths.slice(0, 9)) {
        const response = await call(port, { path, headers: { Authorization: authorization } });
        assert.equal(response.status, 200, 'allowed_static_resource'); securityHeaders(response);
        const file = path === '/' ? 'index.html' : path.slice(1);
        assert.deepEqual(response.body, readFileSync(resolve(candidate, 'public', file)));
      }
    });
    await check('authenticated_method_unknown_and_private_file_denials', async () => {
      for (const path of ['/health', '/unknown', '/manifest.json', '/Dockerfile', '/compose.template.yml', '/.env', '/.runtime/preview_auth', '/media/singer-1200.webp']) {
        const response = await call(port, { path, headers: { Authorization: authorization } });
        assert.equal(response.status, 404, 'unknown_route'); securityHeaders(response);
      }
      for (const method of ['POST', 'OPTIONS']) {
        const response = await call(port, { method, headers: { Authorization: authorization } });
        assert.equal(response.status, 405, 'static_method'); assert.equal(response.headers.allow, 'GET, HEAD'); securityHeaders(response);
      }
      for (const method of ['GET', 'HEAD', 'OPTIONS']) {
        const response = await call(port, { path: '/api/registrations', method, headers: apiHeaders });
        assert.equal(response.status, 405, 'api_method'); assert.equal(response.headers.allow, 'POST'); securityHeaders(response);
      }
    });
    await check('exact_origin_json_uri_and_query_enforcement', async () => {
      for (const Origin of [undefined, 'http://' + previewHostname, previewOrigin + '/', 'https://sin-yolanda.com', previewOrigin + ':443', 'null']) {
        const headers = { ...apiHeaders }; if (Origin === undefined) delete headers.Origin; else headers.Origin = Origin;
        assert.equal((await call(port, { path: '/api/registrations', method: 'POST', headers, body: '{}' })).status, 403, 'strict_origin');
      }
      for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'application/jsonp', '']) {
        assert.equal((await call(port, { path: '/api/registrations', method: 'POST', headers: { ...apiHeaders, 'Content-Type': type }, body: '{}' })).status, 400, 'strict_json');
      }
      for (const path of ['/api/registrations?x=1', '/api/registrations?', '/api/%72egistrations', '/api/registrations/', '//api/registrations']) {
        assert.equal((await call(port, { path, method: 'POST', headers: apiHeaders, body: '{}' })).status, 404, 'strict_api_uri');
      }
    });
    await check('fixed_and_chunked_body_bytes_and_8192_boundary', async () => {
      const base = JSON.stringify({ smoke: '' });
      const exact = Buffer.from(JSON.stringify({ smoke: 'a'.repeat(8192 - Buffer.byteLength(base)) }));
      const extraHeaders = { ...apiHeaders, Cookie: 'fictional_cookie=fixture', Forwarded: 'for=203.0.113.9', 'X-Forwarded-For': '203.0.113.9', 'X-Forwarded-Host': 'invalid.example', 'X-Forwarded-Proto': 'https', 'X-Custom-Fixture': 'omit-fixture' };
      for (const chunked of [false, true]) {
        const mode = chunked ? 'chunked' : 'fixed';
        activeCheck = `${mode}_body_request_8192`;
        evidence.bodyLimits ??= [];
        const accepted = { subcase: `${mode}_8192`, chunked, bytes: exact.length, transport: 'pending' };
        evidence.bodyLimits.push(accepted);
        const response = await call(port, { path: '/api/registrations', method: 'POST', headers: { ...extraHeaders, ...(chunked ? { 'Transfer-Encoding': 'chunked' } : { 'Content-Length': String(exact.length) }) }, ...(chunked ? { chunks: [exact.subarray(0, 3000), exact.subarray(3000)] } : { body: exact }) });
        Object.assign(accepted, { transport: 'response', ...safeResponseSummary(response) });
        activeCheck = `${mode}_body_status_8192`;
        assert.equal(response.status, 200, 'exact_body_limit');
        activeCheck = `${mode}_body_security_headers_8192`; securityHeaders(response);
        activeCheck = `${mode}_body_json_8192`;
        const result = JSON.parse(response.body);
        activeCheck = `${mode}_body_integrity_8192`;
        accepted.upstreamBodyBytes = Buffer.from(result.bodyBase64, 'base64').length;
        accepted.bodyExact = Buffer.from(result.bodyBase64, 'base64').equals(exact);
        assert.deepEqual(Buffer.from(result.bodyBase64, 'base64'), exact);
        activeCheck = `${mode}_header_forwarding_8192`;
        accepted.upstreamHeaderNames = Object.keys(result.headers).sort();
        assert.equal(result.headers.origin, previewOrigin);
        assert.equal(result.headers['content-type'], 'application/json');
        assert.equal(result.headers['idempotency-key'], apiHeaders['Idempotency-Key']);
        // Nginx may dechunk a body already received in full; framing is transport metadata.
        const framing = ['content-length', 'transfer-encoding'].filter(name => result.headers[name] !== undefined);
        assert.equal(framing.length, 1, 'unambiguous_upstream_body_framing');
        if (framing[0] === 'content-length') assert.equal(result.headers['content-length'], String(exact.length));
        else assert.equal(result.headers['transfer-encoding'], 'chunked');
        assert.deepEqual(Object.keys(result.headers).sort(), [...['host', 'content-type', 'origin', 'idempotency-key'], ...framing].sort());
        for (const header of ['authorization', 'cookie', 'forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'x-custom-fixture']) assert.equal(result.headers[header], undefined, 'untrusted_header_omitted');
        const over = Buffer.concat([exact, Buffer.from(' ')]);
        activeCheck = `${mode}_body_request_8193`;
        const denied = { subcase: `${mode}_8193`, chunked, bytes: over.length, transport: 'pending' };
        evidence.bodyLimits.push(denied);
        const rejected = await call(port, { path: '/api/registrations', method: 'POST', headers: { ...apiHeaders, ...(chunked ? { 'Transfer-Encoding': 'chunked' } : { 'Content-Length': String(over.length) }) }, ...(chunked ? { chunks: [over.subarray(0, 3000), over.subarray(3000)] } : { body: over }) });
        Object.assign(denied, { transport: 'response', ...safeResponseSummary(rejected) });
        activeCheck = `${mode}_body_status_8193`;
        assert.equal(rejected.status, 413, 'oversized_body');
        activeCheck = `${mode}_body_security_headers_8193`; securityHeaders(rejected);
      }
    });
    await check('upstream_failure_is_redacted_503', async () => {
      const response = await call(port, { path: '/api/registrations', method: 'POST', headers: apiHeaders, body: '{"smoke":"upstream-failure"}' });
      assert.equal(response.status, 503); assert.deepEqual(JSON.parse(response.body), { code: 'unavailable' }); securityHeaders(response);
    });
    await check('gateway_non_root_read_only_capabilities_and_silent_logs', async () => {
      activeCheck = 'gateway_security_inspect';
      const inspect = JSON.parse((await docker(['inspect', gateway])).stdout)[0];
      const options = inspect.HostConfig.SecurityOpt || [];
      // Docker may normalize this true-valued option to its bare flag spelling.
      // Both representations must also be corroborated by NoNewPrivs in the running process.
      const hasBareFlag = options.includes('no-new-privileges');
      const hasTrueFlag = options.includes('no-new-privileges:true');
      activeCheck = 'gateway_security_process_status';
      const status = (await docker(['exec', gateway, 'cat', '/proc/1/status'])).stdout;
      const uid = status.match(/^Uid:\s+([0-9]+)\s+([0-9]+)\s+([0-9]+)\s+([0-9]+)\s*$/m);
      const gid = status.match(/^Gid:\s+([0-9]+)\s+([0-9]+)\s+([0-9]+)\s+([0-9]+)\s*$/m);
      const noNewPrivs = status.match(/^NoNewPrivs:\s+([01])\s*$/m);
      const capability = status.match(/^CapEff:\s+([0-9a-fA-F]+)\s*$/m);
      const security = evidence.runtimeSecurity = {
        configuredUser101: inspect.Config.User === '101:101',
        configuredReadOnlyRootfs: inspect.HostConfig.ReadonlyRootfs === true,
        configuredCapDropAll: Array.isArray(inspect.HostConfig.CapDrop) && inspect.HostConfig.CapDrop.length === 1 && inspect.HostConfig.CapDrop[0] === 'ALL',
        configuredNoNewPrivileges: hasBareFlag || hasTrueFlag,
        noNewPrivilegesRepresentation: hasBareFlag ? 'bare_flag' : hasTrueFlag ? 'explicit_true' : 'unrecognized',
        isolatedNetworks: JSON.stringify(Object.keys(inspect.NetworkSettings.Networks).sort()) === JSON.stringify([network, ingress].sort()),
        processUid101: Boolean(uid && uid.slice(1).every(value => value === '101')),
        processGid101: Boolean(gid && gid.slice(1).every(value => value === '101')),
        processNoNewPrivs: noNewPrivs ? Number(noNewPrivs[1]) : null,
        processCapEffZero: Boolean(capability && /^0+$/.test(capability[1])),
        logs: {},
      };
      for (const [label, field] of [
        ['gateway_configured_user', 'configuredUser101'],
        ['gateway_configured_read_only_rootfs', 'configuredReadOnlyRootfs'],
        ['gateway_configured_cap_drop_all', 'configuredCapDropAll'],
        ['gateway_configured_no_new_privileges', 'configuredNoNewPrivileges'],
        ['gateway_isolated_networks', 'isolatedNetworks'],
        ['gateway_effective_uid', 'processUid101'],
        ['gateway_effective_gid', 'processGid101'],
        ['gateway_effective_capabilities', 'processCapEffZero'],
      ]) { activeCheck = label; assert.equal(security[field], true, label); }
      activeCheck = 'gateway_effective_no_new_privileges';
      assert.equal(security.processNoNewPrivs, 1, 'gateway_effective_no_new_privileges');
      for (const [role, name] of [['gateway', gateway], ['mock', mock]]) {
        activeCheck = `${role}_silent_logs`;
        const logs = await docker(['logs', name]);
        security.logs[role] = redactedLogSummary(logs);
        assert.equal(logs.stdout.trim(), '', `${role}_stdout_silent`);
        assert.equal(logs.stderr.trim(), '', `${role}_stderr_silent`);
      }
    });

    activeCheck = 'backend_image_required';
    const realImage = await docker(['image', 'inspect', '--format', '{{.Id}}', backendImage], { allowFailure: true });
    if (realImage.code === 0) {
      await check('real_backend_absolute_body_deadline_during_continuous_streaming', async () => {
        const realNetwork = `${prefix}-deadline-network`, realBackend = `${prefix}-deadline-intake`, deadlineGateway = `${prefix}-deadline-gateway`;
        await docker(['network', 'create', '--internal', realNetwork]); ownNetworks.push(realNetwork);
        const envPath = resolve(runtime, 'deadline.env');
        writeFileSync(envPath, [
          'SY_INTAKE_MODE=production', 'SY_INTAKE_DATABASE=/data/registrations.sqlite',
          `SY_INTAKE_ENCRYPTION_KEY=${randomBytes(32).toString('base64url')}=`,
          `SY_INTAKE_TURNSTILE_SECRET=0x${randomBytes(32).toString('hex')}`,
          `SY_INTAKE_ORIGINS=${previewOrigin}`, `SY_INTAKE_TURNSTILE_HOSTNAME=${previewHostname}`, '',
        ].join('\n'), { mode: 0o600, flag: 'wx' });
        await docker(['run', '--detach', '--name', realBackend, '--network', realNetwork, '--network-alias', 'intake',
          '--user', '10001:10001', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
          '--pids-limit', '128', '--memory', '256m', '--env-file', envPath,
          '--tmpfs', '/data:rw,noexec,nosuid,size=16777216,mode=0700,uid=10001,gid=10001',
          '--tmpfs', '/tmp:rw,noexec,nosuid,size=16777216,mode=1777', realImage.stdout.trim()]);
        ownContainers.push(realBackend);
        for (let attempt = 0; attempt < 40; attempt++) {
          const result = await docker(['exec', realBackend, 'python', '-c', "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health',timeout=1).close()"], { allowFailure: true });
          if (result.code === 0) break;
          if (attempt === 39) throw new Error('synthetic_backend_not_ready');
          await sleep(150);
        }
        const deadlinePort = await startGateway(deadlineGateway, realNetwork);
        activeCheck = 'real_backend_absolute_body_deadline_during_continuous_streaming';
        const response = await call(deadlinePort, { path: '/api/registrations', method: 'POST', headers: { ...apiHeaders, 'Transfer-Encoding': 'chunked' }, chunks: Array.from({ length: 8 }, () => Buffer.from(' ')), chunkEvery: 1800 });
        assert.equal(response.status, 408, 'backend_absolute_body_deadline');
        securityHeaders(response);
        assert.ok(response.elapsedMs >= 9000 && response.elapsedMs < 12500, 'absolute_deadline_timing');
        evidence.bodyDeadline = { status: response.status, elapsedMs: response.elapsedMs, chunkIntervalMs: 1800, backendImageId: realImage.stdout.trim() };
        assert.deepEqual(JSON.parse(response.body), { code: 'unavailable' });
        for (const name of [deadlineGateway, realBackend]) {
          const logs = await docker(['logs', name]);
          assert.ok(!logs.stdout.includes(password) && !logs.stderr.includes(password));
          assert.doesNotMatch(logs.stdout + logs.stderr, /localhost.*api|\/api\/registrations|SY_INTAKE_|intake_server_event.*[a-z0-9]+@/);
        }
        await docker(['rm', '--force', deadlineGateway, realBackend]);
        ownContainers.splice(ownContainers.indexOf(deadlineGateway), 1);
        ownContainers.splice(ownContainers.indexOf(realBackend), 1);
        await docker(['network', 'rm', realNetwork]); ownNetworks.splice(ownNetworks.indexOf(realNetwork), 1);
        rmSync(envPath);
      });
    } else throw new Error('backend_image_required');
    evidence.result = 'passed';
    keep = keepRunning;
    evidence.runtime.keptRunning = keep;
    writeFileSync(resolve(directory, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  } catch {
    evidence.result = 'failed'; evidence.failedCheck = activeCheck;
    // Capture only lengths and fixed classes even when failure occurs before the
    // silent-log assertions. Never print Docker logs, payloads or header values.
    evidence.failureLogs = {};
    for (const [role, name] of [['gateway', gateway], ['mock', mock]]) if (ownContainers.includes(name)) {
      try {
        const logs = await docker(['logs', name], { allowFailure: true, timeout: 5000 });
        evidence.failureLogs[role] = { readable: logs.code === 0, ...redactedLogSummary(logs) };
      } catch { evidence.failureLogs[role] = { readable: false }; }
    }
    writeFileSync(resolve(directory, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    process.stdout.write(JSON.stringify({ status: 'local-smoke-failed', failedCheck: activeCheck, safeBodyChecks: evidence.bodyLimits, safeMockReadiness: evidence.mockReadiness, safeLogs: evidence.failureLogs, safeChecks: evidence.runtimeSecurity, evidencePath: resolve(directory, 'evidence.json') }) + '\n');
    throw new Error('isolated_preview_smoke_failed');
  } finally {
    if (!keep) {
      let complete = true;
      for (const name of ownContainers.reverse()) complete = (await docker(['rm', '--force', name], { allowFailure: true })).code === 0 && complete;
      for (const name of ownNetworks.reverse()) complete = (await docker(['network', 'rm', name], { allowFailure: true })).code === 0 && complete;
      if (ownImage) complete = (await docker(['image', 'rm', image], { allowFailure: true })).code === 0 && complete;
      rmSync(runtime, { recursive: true, force: true });
      evidence.cleanup = { result: complete ? 'complete' : 'failed', containersRemoved: ownContainers.length, networksRemoved: ownNetworks.length, imageRemoved: ownImage && complete, runtimeFixturesRemoved: true };
      if (!complete) { evidence.result = 'failed'; evidence.failedCheck = 'cleanup'; }
      writeFileSync(resolve(directory, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 });
      if (!complete) throw new Error('preview_cleanup_failed');
    } else {
      evidence.cleanup = { result: 'retained-for-authorized-local-visual-review' };
      writeFileSync(resolve(directory, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 });
    }
  }
  process.stdout.write(JSON.stringify({ status: 'local-smoke-passed', checks: checks.length, evidencePath: resolve(directory, 'evidence.json'), keptRunning: keep }) + '\n');
  return evidence;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.slice(2).every(value => value === '--keep-running') && process.argv.length <= 3, 'Use smoke-intake-preview.mjs [--keep-running]');
  try { await runPreviewSmoke({ keepRunning: process.argv.includes('--keep-running'), backendImage: process.env.SY_INTAKE_SMOKE_BACKEND_IMAGE || defaultBackendImage }); }
  catch { process.exitCode = 1; }
}
