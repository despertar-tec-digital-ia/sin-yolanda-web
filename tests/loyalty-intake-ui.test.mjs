import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import test from 'node:test';
import vm from 'node:vm';
import { consentVersion, createLocalServer } from '../prototypes/loyalty-intake/serve-local.mjs';

const html = readFileSync(new URL('../prototypes/loyalty-intake/index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../prototypes/loyalty-intake/intake.js', import.meta.url), 'utf8');
const receipt = '37acd8fe-918f-4bd3-a8b9-f1dd0480fd87';
const received = { status: 'received', receipt_id: receipt, sync_status: 'pending' };
const response = (status, value) => ({ status, json: async () => value });
const tick = () => new Promise(resolve => setImmediate(resolve));

class Element {
  constructor(tag, attributes, context) {
    this.tagName = tag.toUpperCase();
    this.attributes = { ...attributes };
    this.dataset = Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith('data-')).map(([key, value]) => [key.slice(5), value]));
    this.id = attributes.id;
    this.value = attributes.value || '';
    this.checked = 'checked' in attributes;
    this.disabled = 'disabled' in attributes;
    this.hidden = 'hidden' in attributes;
    this.textContent = '';
    this.listeners = new Map();
    this.context = context;
  }
  get validity() { return { typeMismatch: this.attributes.type === 'email' && Boolean(this.value) && !/^[^\s@]+@[^\s@]+$/.test(this.value) }; }
  addEventListener(type, callback) { this.listeners.set(type, [...(this.listeners.get(type) || []), callback]); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  focus() { this.context.focused = this.id; }
  reset() { this.context.elements.filter(element => element.tagName === 'INPUT').forEach(element => { element.value = ''; element.checked = false; }); }
  async emit(type) {
    const event = { prevented: false, preventDefault() { this.prevented = true; } };
    await Promise.all((this.listeners.get(type) || []).map(callback => callback(event)));
    return event;
  }
}

async function ui({ enabled = false, configError = false, config, replies = [] } = {}) {
  const state = { elements: [], calls: [], focused: undefined, uuid: 0 };
  for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
    const attributes = {};
    for (const attribute of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attributes[attribute[1]] = attribute[2] || '';
    state.elements.push(new Element(match[1], attributes, state));
  }
  const byId = id => state.elements.find(element => element.id === id);
  const document = {
    documentElement: { lang: 'es' }, title: '', getElementById: byId,
    querySelectorAll(selector) {
      const [, attribute, value] = /^\[([\w-]+)(?:="([^"]+)")?\]$/.exec(selector);
      return state.elements.filter(element => attribute in element.attributes && (value === undefined || element.attributes[attribute] === value));
    },
  };
  const window = new Element('window', {}, state);
  const fetchMock = async (url, options) => {
    state.calls.push({ url, options });
    if (url === './intake-config.json') {
      if (configError) throw new Error('Offline');
      return response(200, config || { captureEnabled: enabled, qaOnly: true, consentVersion });
    }
    const reply = replies.shift();
    if (typeof reply === 'function') return reply(url, options);
    if (reply instanceof Error) throw reply;
    return reply || response(201, received);
  };
  vm.runInNewContext(script, {
    document, window, fetch: fetchMock, AbortSignal,
    crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++state.uuid).padStart(12, '0')}` },
  });
  await tick();
  return {
    ...state, document, byId, window,
    posts: () => state.calls.filter(call => call.url === '/api/registrations'),
    fill() { byId('full-name').value = 'Registro QA'; byId('email').value = 'qa@example.invalid'; byId('consent').checked = true; },
  };
}

test('default preview and unavailable config cannot capture; CSP allows only same-origin connections', async () => {
  assert.match(html, /connect-src 'self'; form-action 'none'/);
  for (const options of [{}, { configError: true }, { config: { captureEnabled: true, qaOnly: false, consentVersion } }, { config: { captureEnabled: true, qaOnly: true, consentVersion: 'unknown' } }]) {
    const view = await ui(options);
    view.fill();
    assert.equal(view.byId('register-button').disabled, true);
    assert.equal((await view.byId('intake-form').emit('submit')).prevented, true);
    assert.equal(view.posts().length, 0);
    assert.equal(view.byId('registration-success').hidden, true);
    if (options.configError) assert.match(view.byId('capture-note').textContent, /no disponible/);
  }
});

test('explicit QA mode sends the exact contract, confirms the receipt, clears PII and resets opt-ins', async () => {
  const view = await ui({ enabled: true });
  assert.equal(view.byId('email-marketing').checked, false);
  assert.match(view.byId('capture-note').textContent, /datos ficticios/);
  assert.equal(view.byId('register-button').textContent, 'Guardar registro de prueba');
  view.fill();
  view.byId('phone').value = '+1 (915) 555-0123';
  view.byId('birthday').value = '29/02';
  await view.byId('intake-form').emit('submit');
  const post = view.posts()[0];
  assert.deepEqual(JSON.parse(post.options.body), {
    full_name: 'Registro QA', email: 'qa@example.invalid', phone: '+19155550123', birthday_day_month: '29/02',
    locale: 'es', branch: 'el-paso', registration_consent: true, email_marketing_consent: false,
    consent_version: consentVersion, turnstile_token: 'local-qa-only', website: '',
  });
  assert.equal(post.options.credentials, 'omit');
  assert.equal(post.options.redirect, 'error');
  assert.match(post.options.headers['Idempotency-Key'], /^[\da-f-]{36}$/);
  assert.equal(view.byId('registration-success').hidden, false);
  assert.equal(view.byId('intake-form').hidden, true);
  for (const id of ['full-name', 'email', 'phone', 'birthday']) assert.equal(view.byId(id).value, '');
  assert.equal(view.byId('consent').checked, false);
  assert.equal(view.byId('email-marketing').checked, false);
  await view.byId('language-toggle').emit('click');
  assert.equal(view.byId('success-title').textContent, 'Test registration saved');
  await view.byId('new-registration').emit('click');
  assert.equal(view.byId('registration-success').hidden, true);
  assert.equal(view.byId('intake-form').hidden, false);
  assert.equal(view.document.documentElement.lang, 'en');
  view.fill();
  await view.byId('intake-form').emit('submit');
  assert.notEqual(view.posts()[1].options.headers['Idempotency-Key'], post.options.headers['Idempotency-Key']);
  assert.equal(JSON.parse(view.posts()[1].options.body).phone, null);
  assert.equal(JSON.parse(view.posts()[1].options.body).birthday_day_month, null);
});

test('local validation prevents invalid capture, translates errors and retains values', async () => {
  const view = await ui({ enabled: true });
  view.fill();
  view.byId('email').value = 'invalid';
  view.byId('phone').value = '19155550123';
  view.byId('birthday').value = '31/04';
  view.byId('consent').checked = false;
  await view.byId('intake-form').emit('submit');
  assert.equal(view.posts().length, 0);
  for (const id of ['email-error', 'phone-error', 'birthday-error', 'consent-error']) assert.equal(view.byId(id).hidden, false);
  await view.byId('language-toggle').emit('click');
  assert.match(view.byId('birthday-error').textContent, /valid day and month/);
  assert.equal(view.byId('full-name').value, 'Registro QA');
  assert.equal(view.byId('email').value, 'invalid');
  view.byId('birthday').value = '9/10';
  await view.byId('birthday').emit('blur');
  assert.equal(view.byId('birthday').value, '09/10');
});

test('unconfirmed saves preserve the attempt key for retry and rotate it when content changes', async () => {
  const view = await ui({ enabled: true, replies: [response(503, { code: 'unavailable', message: 'Do not echo private data' }), new Error('Offline'), response(201, received)] });
  view.fill();
  await view.byId('intake-form').emit('submit');
  assert.equal(view.byId('registration-success').hidden, true);
  assert.equal(view.byId('email').value, 'qa@example.invalid');
  assert.doesNotMatch(view.byId('server-error').textContent, /private data|qa@example/);
  await view.byId('intake-form').emit('submit');
  assert.equal(view.posts()[0].options.headers['Idempotency-Key'], view.posts()[1].options.headers['Idempotency-Key']);
  view.byId('full-name').value = 'Registro QA actualizado';
  await view.byId('intake-form').emit('submit');
  assert.notEqual(view.posts()[1].options.headers['Idempotency-Key'], view.posts()[2].options.headers['Idempotency-Key']);
  assert.equal(view.byId('registration-success').hidden, false);
});

test('pending capture blocks duplicate submission and preserves values while toggling language', async () => {
  let finish;
  const view = await ui({ enabled: true, replies: [() => new Promise(resolve => { finish = resolve; })] });
  view.fill();
  const first = view.byId('intake-form').emit('submit');
  assert.equal(view.byId('register-button').disabled, true);
  assert.equal(view.byId('full-name').disabled, true);
  await view.byId('intake-form').emit('submit');
  assert.equal(view.posts().length, 1);
  await view.byId('language-toggle').emit('click');
  assert.equal(view.byId('register-button').textContent, 'Saving test…');
  assert.equal(view.byId('email').value, 'qa@example.invalid');
  finish(response(503, { code: 'unavailable' }));
  await first;
  assert.equal(view.byId('register-button').disabled, false);
  assert.match(view.byId('server-error').textContent, /could not confirm/);
});

test('success requires a received status, UUID receipt and pending synchronization; HTTP 200 alone is insufficient', async () => {
  const view = await ui({ enabled: true, replies: [response(200, { ok: true }), response(201, { ...received, receipt_id: 'invalid' }), response(200, received)] });
  view.fill();
  for (let index = 0; index < 2; index++) {
    await view.byId('intake-form').emit('submit');
    assert.equal(view.byId('registration-success').hidden, true);
    assert.equal(view.byId('email').value, 'qa@example.invalid');
  }
  await view.byId('intake-form').emit('submit');
  assert.equal(view.byId('registration-success').hidden, false);
});

test('known server failures remain actionable in ES/EN and never reflect backend content', async () => {
  for (const code of ['invalid_fields', 'consent_required', 'invalid_date', 'invalid_phone', 'idempotency_conflict', 'rate_limited', 'verification_failed', 'unavailable']) {
    const view = await ui({ enabled: true, replies: [response(code === 'rate_limited' ? 429 : 422, { code, detail: 'private-backend-value' })] });
    view.fill();
    await view.byId('intake-form').emit('submit');
    const spanish = view.byId('server-error').textContent;
    assert.ok(spanish);
    assert.doesNotMatch(spanish, /private-backend-value/);
    await view.byId('language-toggle').emit('click');
    assert.notEqual(view.byId('server-error').textContent, spanish);
    assert.equal(view.byId('email').value, 'qa@example.invalid');
  }
});

async function localServer(t, options) {
  const server = createLocalServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = (body = '{}', overrides = {}) => fetch(origin + '/api/registrations', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'Idempotency-Key': receipt, ...overrides }, body,
  });
  return { server, origin, post };
}

test('default local server advertises preview mode and never proxies a capture', async t => {
  let calls = 0;
  const { origin, post } = await localServer(t, { proxyFetch: async () => { calls++; return response(201, received); } });
  assert.deepEqual(await (await fetch(origin + '/intake-config.json')).json(), { captureEnabled: false, qaOnly: true, consentVersion });
  assert.equal((await post()).status, 404);
  assert.equal(calls, 0);
});

test('QA proxy has one fixed target, forwards the actual origin and strips cookies/auth/PII', async t => {
  const calls = [];
  const { origin, post } = await localServer(t, { captureEnabled: true, proxyFetch: async (url, options) => {
    calls.push({ url, options }); return response(201, { ...received, email: 'private-value' });
  } });
  assert.deepEqual(await (await fetch(origin + '/intake-config.json')).json(), { captureEnabled: true, qaOnly: true, consentVersion });
  const result = await post('{}', { Cookie: 'ignored=value', Authorization: 'ignored-value' });
  assert.equal(result.status, 201);
  assert.deepEqual(await result.json(), received);
  assert.equal(calls[0].url, 'http://127.0.0.1:8801/api/registrations');
  assert.deepEqual(calls[0].options.headers, { 'Content-Type': 'application/json', 'Idempotency-Key': receipt, Origin: origin });
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.redirect, 'error');
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  assert.equal(result.headers.get('set-cookie'), null);
  for (const path of ['/api/registrations?target=https://example.invalid', '/api/other', '/README.md']) {
    assert.ok([404, 405].includes((await fetch(origin + path, { method: 'POST', body: '{}' })).status));
  }
  assert.equal(calls.length, 1);
});

test('QA proxy rejects wrong origin, invalid key, malformed JSON and oversized fixed/chunked requests', async t => {
  let calls = 0;
  const { origin, post } = await localServer(t, { captureEnabled: true, proxyFetch: async () => { calls++; return response(201, received); } });
  assert.equal((await post('{}', { Origin: 'https://example.invalid' })).status, 403);
  assert.equal((await post('{}', { 'Idempotency-Key': 'invalid' })).status, 400);
  assert.equal((await post('invalid-json')).status, 400);
  assert.equal((await post('x'.repeat(8193))).status, 413);
  const chunkedStatus = await new Promise((resolve, reject) => {
    const request = httpRequest(origin + '/api/registrations', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'Idempotency-Key': receipt } }, result => { result.resume(); resolve(result.statusCode); });
    request.on('error', reject);
    request.write('x'.repeat(4096)); request.write('x'.repeat(4097)); request.end();
  });
  assert.equal(chunkedStatus, 413);
  assert.equal(calls, 0);
});

test('QA proxy exposes only known failure codes and treats unavailable or malformed upstream responses as unavailable', async t => {
  const replies = [response(429, { code: 'rate_limited', detail: 'private-value' }), response(200, { ok: true }), { status: 200, json: async () => { throw new SyntaxError('Invalid JSON'); } }, new Error('Connection refused')];
  const { post } = await localServer(t, { captureEnabled: true, proxyFetch: async () => { const reply = replies.shift(); if (reply instanceof Error) throw reply; return reply; } });
  const rate = await post();
  assert.equal(rate.status, 429);
  assert.deepEqual(await rate.json(), { code: 'rate_limited' });
  for (let index = 0; index < 3; index++) {
    const result = await post();
    assert.ok([502, 503].includes(result.status));
    assert.deepEqual(await result.json(), { code: 'unavailable' });
  }
});
