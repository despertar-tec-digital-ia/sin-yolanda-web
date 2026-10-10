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
const productionConfig = { captureEnabled: true, qaOnly: false, mode: 'production', consentVersion, turnstileSiteKey: '0x4AAAAAAASyntheticPublicKey' };
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
    this.clientWidth = context.width;
  }
  get validity() { return { typeMismatch: this.attributes.type === 'email' && Boolean(this.value) && !/^[^\s@]+@[^\s@]+$/.test(this.value) }; }
  addEventListener(type, callback) { this.listeners.set(type, [...(this.listeners.get(type) || []), callback]); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  remove() { this.context.removedScripts.push(this); }
  focus() { this.context.focused = this.id; }
  reset() { this.context.elements.filter(element => element.tagName === 'INPUT').forEach(element => { element.value = ''; element.checked = false; }); }
  async emit(type) {
    const event = { prevented: false, preventDefault() { this.prevented = true; } };
    await Promise.all((this.listeners.get(type) || []).map(callback => callback(event)));
    return event;
  }
}

async function ui({ enabled = false, configError = false, config, replies = [], width = 350, scriptError = false, scriptManual = false } = {}) {
  const state = { elements: [], calls: [], focused: undefined, uuid: 0, width, scripts: [], removedScripts: [], widgets: [], removedWidgets: [], resets: [], timers: new Map(), timerId: 0 };
  for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
    const attributes = {};
    for (const attribute of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attributes[attribute[1]] = attribute[2] || '';
    state.elements.push(new Element(match[1], attributes, state));
  }
  const byId = id => state.elements.find(element => element.id === id);
  const document = {
    documentElement: { lang: 'es' }, title: '', getElementById: byId,
    createElement: tag => new Element(tag, {}, state),
    head: { appendChild(script) {
      state.scripts.push(script);
      if (!scriptManual) queueMicrotask(() => {
        if (!scriptError) window.turnstile = turnstile;
        void script.emit(scriptError ? 'error' : 'load');
      });
    } },
    querySelectorAll(selector) {
      const [, attribute, value] = /^\[([\w-]+)(?:="([^"]+)")?\]$/.exec(selector);
      return state.elements.filter(element => attribute in element.attributes && (value === undefined || element.attributes[attribute] === value));
    },
  };
  const window = new Element('window', {}, state);
  const turnstile = {
    render(container, options) { const id = `widget-${state.widgets.length}`; state.widgets.push({ id, container, options }); return id; },
    reset(id) { state.resets.push(id); },
    remove(id) { state.removedWidgets.push(id); },
  };
  const fetchMock = async (url, options) => {
    state.calls.push({ url, options });
    if (url === './intake-config.json') {
      if (configError) throw new Error('Offline');
      return response(200, config || { captureEnabled: enabled, qaOnly: true, mode: enabled ? 'local-qa' : 'disabled', consentVersion });
    }
    const reply = replies.shift();
    if (typeof reply === 'function') return reply(url, options);
    if (reply instanceof Error) throw reply;
    return reply || response(201, received);
  };
  vm.runInNewContext(script, {
    document, window, fetch: fetchMock, AbortSignal,
    setTimeout(callback, delay) { const id = ++state.timerId; state.timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { state.timers.delete(id); },
    crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++state.uuid).padStart(12, '0')}` },
  });
  await tick();
  return {
    ...state, document, byId, window,
    widget: () => state.widgets.at(-1),
    runTimer(delay) { for (const [id, timer] of state.timers) if (timer.delay === delay) { state.timers.delete(id); timer.callback(); } },
    async scriptLoaded() { window.turnstile = turnstile; await state.scripts.at(-1).emit('load'); await tick(); },
    posts: () => state.calls.filter(call => call.url === '/api/registrations'),
    fill() { byId('full-name').value = 'Registro QA'; byId('email').value = 'qa@example.invalid'; byId('consent').checked = true; },
  };
}

test('default preview and unavailable config cannot capture; only Turnstile script/frame are externally permitted', async () => {
  assert.match(html, /connect-src 'self'; form-action 'none'/);
  assert.match(html, /script-src 'self' https:\/\/challenges\.cloudflare\.com; frame-src https:\/\/challenges\.cloudflare\.com;/);
  for (const options of [{}, { configError: true }, { config: { captureEnabled: true, qaOnly: false, consentVersion } }, { config: { captureEnabled: true, qaOnly: true, consentVersion: 'unknown' } }]) {
    const view = await ui(options);
    view.fill();
    assert.equal(view.byId('register-button').disabled, true);
    assert.equal((await view.byId('intake-form').emit('submit')).prevented, true);
    assert.equal(view.posts().length, 0);
    assert.equal(view.byId('registration-success').hidden, true);
    assert.equal(view.scripts.length, 0);
    assert.equal(view.byId('verification').hidden, true);
    if (options.configError) assert.match(view.byId('capture-note').textContent, /no disponible/);
  }
});

test('explicit QA mode sends the exact contract, confirms the receipt, clears PII and resets opt-ins', async () => {
  const view = await ui({ enabled: true });
  assert.equal(view.byId('email-marketing').checked, false);
  assert.match(view.byId('capture-note').textContent, /datos ficticios/);
  assert.equal(view.scripts.length, 0);
  assert.equal(view.byId('verification').hidden, true);
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

test('production requires an explicit consistent mode and a public non-test sitekey before loading anything', async () => {
  const invalidConfigs = [
    { ...productionConfig, mode: 'local-qa' },
    { ...productionConfig, qaOnly: true },
    { ...productionConfig, turnstileSiteKey: undefined },
    { ...productionConfig, turnstileSiteKey: 'https://example.invalid/script' },
    { ...productionConfig, turnstileSiteKey: '1x00000000000000000000AA' },
    { ...productionConfig, turnstileSiteKey: '0x-short' },
    { ...productionConfig, turnstileSiteKey: '0x4AAAAAAASyntheticPublicKey\n' },
    { ...productionConfig, consentVersion: 'unknown' },
    { ...productionConfig, captureEnabled: false },
    { captureEnabled: true, qaOnly: true, mode: 'disabled', consentVersion },
    { captureEnabled: true, qaOnly: true, mode: 'local-qa', consentVersion, turnstileSiteKey: productionConfig.turnstileSiteKey },
    null, [],
  ];
  for (const config of invalidConfigs) {
    const view = await ui({ config: config ?? { mode: 'production' } });
    view.fill();
    await view.byId('intake-form').emit('submit');
    assert.equal(view.byId('register-button').disabled, true);
    assert.equal(view.scripts.length, 0);
    assert.equal(view.posts().length, 0);
    assert.equal(view.byId('verification').hidden, true);
  }
});

test('production explicitly loads only the official script, renders the exact action and waits for a token', async () => {
  const view = await ui({ config: productionConfig });
  assert.equal(view.scripts.length, 1);
  assert.equal(view.scripts[0].src, 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
  assert.equal(view.scripts[0].async, true);
  assert.equal(view.byId('capture-note').hidden, true);
  assert.equal(view.byId('verification').hidden, false);
  assert.equal(view.byId('register-button').textContent, 'Registrarme');
  assert.equal(view.byId('register-button').disabled, true);
  const options = view.widget().options;
  assert.equal(options.sitekey, productionConfig.turnstileSiteKey);
  assert.equal(options.action, 'loyalty_register');
  assert.equal(options.language, 'es');
  assert.equal(options.size, 'flexible');
  assert.equal(options.theme, 'light');
  assert.equal(options['response-field'], false);
  assert.equal(options.cData, undefined);
  view.fill();
  await view.byId('intake-form').emit('submit');
  assert.equal(view.posts().length, 0);
  options.callback('synthetic-token-1');
  assert.equal(view.byId('register-button').disabled, false);
  assert.match(view.byId('verification-status').textContent, /completada/);
  await view.byId('intake-form').emit('submit');
  assert.equal(JSON.parse(view.posts()[0].options.body).turnstile_token, 'synthetic-token-1');
  assert.equal(view.byId('success-title').textContent, 'Tu registro quedó guardado');
  assert.equal(view.byId('full-name').value, '');
  assert.equal(view.byId('consent').checked, false);
  assert.equal(view.byId('email-marketing').checked, false);
  assert.deepEqual(view.removedWidgets, ['widget-0']);
  assert.equal(view.timers.size, 0);
  assert.equal(view.byId('verification').hidden, true);
  options.callback('stale-after-success');
  assert.equal(view.byId('register-button').disabled, true);
  await view.byId('language-toggle').emit('click');
  assert.equal(view.byId('success-title').textContent, 'Your registration was saved');
  await view.byId('new-registration').emit('click');
  await tick();
  assert.equal(view.widget().options.language, 'en');
  assert.equal(view.scripts.length, 1);
  view.fill();
  view.widget().options.callback('synthetic-token-2');
  await view.byId('intake-form').emit('submit');
  assert.notEqual(view.posts()[1].options.headers['Idempotency-Key'], view.posts()[0].options.headers['Idempotency-Key']);
});

test('expired, timed-out, unsupported or failed verification closes capture without losing data; ES/EN covers every state', async () => {
  for (const callback of ['expired-callback', 'timeout-callback', 'error-callback', 'unsupported-callback']) {
    const view = await ui({ config: productionConfig });
    view.fill();
    view.widget().options.callback('synthetic-token');
    const handled = view.widget().options[callback]('private-provider-error');
    if (callback === 'error-callback') assert.equal(handled, true);
    assert.equal(view.byId('register-button').disabled, true);
    assert.equal(view.byId('verification-retry').hidden, false);
    assert.equal(view.byId('email').value, 'qa@example.invalid');
    const spanish = view.byId('verification-status').textContent;
    assert.ok(spanish);
    assert.doesNotMatch(spanish, /private-provider-error/);
    await view.byId('intake-form').emit('submit');
    assert.equal(view.posts().length, 0);
    await view.byId('verification-retry').emit('click');
    assert.deepEqual(view.resets, ['widget-0']);
    assert.equal(view.byId('register-button').disabled, true);
    await view.byId('language-toggle').emit('click');
    await tick();
    assert.equal(view.widget().options.language, 'en');
    assert.notEqual(view.byId('verification-status').textContent, spanish);
    assert.equal(view.byId('email').value, 'qa@example.invalid');
  }
  const view = await ui({ config: productionConfig });
  view.fill();
  view.widget().options.callback('synthetic-token');
  view.runTimer(295000);
  assert.equal(view.byId('register-button').disabled, true);
  assert.match(view.byId('verification-status').textContent, /caducó/);
  assert.equal(view.byId('full-name').value, 'Registro QA');
});

test('retry obtains a fresh single-use token but keeps the same attempt key; changing registration details rotates it', async () => {
  const view = await ui({ config: productionConfig, replies: [response(422, { code: 'verification_failed' }), new Error('Offline'), response(503, { code: 'unavailable' }), response(201, received)] });
  view.fill();
  for (let index = 1; index <= 3; index++) {
    view.widget().options.callback(`synthetic-token-${index}`);
    await view.byId('intake-form').emit('submit');
    assert.equal(view.byId('registration-success').hidden, true);
    assert.equal(view.byId('register-button').disabled, true);
    assert.equal(view.byId('email').value, 'qa@example.invalid');
    assert.equal(view.resets.length, index);
    view.widget().options.callback(`synthetic-token-${index}`);
    assert.equal(view.byId('register-button').disabled, true);
    await view.byId('intake-form').emit('submit');
    assert.equal(view.posts().length, index);
  }
  const keys = view.posts().map(post => post.options.headers['Idempotency-Key']);
  assert.equal(new Set(keys).size, 1);
  assert.deepEqual(view.posts().map(post => JSON.parse(post.options.body).turnstile_token), ['synthetic-token-1', 'synthetic-token-2', 'synthetic-token-3']);
  view.byId('full-name').value = 'Registro QA actualizado';
  view.widget().options.callback('synthetic-token-4');
  await view.byId('intake-form').emit('submit');
  assert.notEqual(view.posts()[3].options.headers['Idempotency-Key'], keys[0]);
  assert.equal(view.byId('registration-success').hidden, false);
});

test('language and responsive re-renders invalidate stale widget callbacks and never erase field values', async () => {
  const view = await ui({ config: productionConfig, width: 288 });
  assert.equal(view.widget().options.size, 'compact');
  view.fill();
  const oldWidget = view.widget();
  oldWidget.options.callback('synthetic-es-token');
  await view.byId('language-toggle').emit('click');
  await tick();
  assert.equal(view.byId('register-button').disabled, true);
  assert.equal(view.widget().options.language, 'en');
  assert.equal(view.byId('email').value, 'qa@example.invalid');
  assert.equal(view.byId('consent').checked, true);
  oldWidget.options.callback('stale-token');
  assert.equal(view.byId('register-button').disabled, true);
  const secondWidget = view.widget();
  secondWidget.options.callback('synthetic-en-token');
  view.byId('turnstile-widget').clientWidth = 450;
  await view.window.emit('resize');
  await tick();
  assert.equal(view.widget().options.size, 'flexible');
  assert.equal(view.byId('register-button').disabled, true);
  secondWidget.options.callback('stale-after-resize');
  assert.equal(view.byId('register-button').disabled, true);
  assert.equal(view.byId('full-name').value, 'Registro QA');
});

test('production pending state prevents double submission and defers a translated widget until the result', async () => {
  let finish;
  const view = await ui({ config: productionConfig, replies: [() => new Promise(resolve => { finish = resolve; })] });
  view.fill();
  view.widget().options.callback('synthetic-token');
  const first = view.byId('intake-form').emit('submit');
  assert.equal(view.byId('register-button').disabled, true);
  assert.equal(view.byId('email').disabled, true);
  await view.byId('intake-form').emit('submit');
  assert.equal(view.posts().length, 1);
  await view.byId('language-toggle').emit('click');
  assert.equal(view.byId('register-button').textContent, 'Saving registration…');
  assert.equal(view.widgets.length, 1);
  finish(response(429, { code: 'rate_limited' }));
  await first;
  await tick();
  assert.equal(view.widgets.length, 2);
  assert.equal(view.widget().options.language, 'en');
  assert.equal(view.byId('email').value, 'qa@example.invalid');
  assert.equal(view.byId('email').disabled, false);
  assert.equal(view.byId('register-button').disabled, true);
  assert.match(view.byId('server-error').textContent, /Too many attempts/);
});

test('script loading errors and timeouts fail closed, are retryable and do not send customer details', async () => {
  const failed = await ui({ config: productionConfig, scriptError: true });
  failed.fill();
  assert.equal(failed.byId('register-button').disabled, true);
  assert.equal(failed.byId('verification-retry').hidden, false);
  assert.match(failed.byId('verification-status').textContent, /no está disponible/);
  await failed.byId('verification-retry').emit('click');
  await tick();
  assert.equal(failed.scripts.length, 2);
  assert.equal(failed.byId('email').value, 'qa@example.invalid');
  assert.equal(failed.posts().length, 0);
  const slow = await ui({ config: productionConfig, scriptManual: true });
  slow.fill();
  assert.match(slow.byId('verification-status').textContent, /Cargando/);
  await slow.byId('language-toggle').emit('click');
  assert.match(slow.byId('verification-status').textContent, /Loading/);
  assert.equal(slow.scripts.length, 1);
  slow.runTimer(10000);
  await tick();
  assert.equal(slow.byId('register-button').disabled, true);
  assert.match(slow.byId('verification-status').textContent, /unavailable/);
  await slow.byId('verification-retry').emit('click');
  await tick();
  assert.equal(slow.scripts.length, 2);
  await slow.scriptLoaded();
  assert.equal(slow.widgets.length, 1);
  assert.equal(slow.widget().options.language, 'en');
  assert.equal(slow.byId('email').value, 'qa@example.invalid');
  assert.equal(slow.byId('register-button').disabled, true);
});

test('invalid verification tokens and browser-history restore cannot reuse or retain a registration', async () => {
  const view = await ui({ config: productionConfig });
  view.fill();
  for (const token of [undefined, '', 'space token', 'x'.repeat(2049)]) {
    view.widget().options.callback(token);
    await view.byId('intake-form').emit('submit');
    assert.equal(view.byId('register-button').disabled, true);
    assert.equal(view.posts().length, 0);
  }
  const oldWidget = view.widget();
  oldWidget.options.callback('synthetic-token');
  await view.window.emit('pageshow');
  await tick();
  assert.equal(view.byId('email').value, '');
  assert.equal(view.byId('consent').checked, false);
  assert.equal(view.byId('email-marketing').checked, false);
  assert.equal(view.byId('register-button').disabled, true);
  oldWidget.options.callback('stale-history-token');
  assert.equal(view.byId('register-button').disabled, true);
  assert.doesNotMatch(script, /localStorage|sessionStorage|document\.cookie|console\.(?:log|error|warn)|cData\s*:/);
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
  assert.deepEqual(await (await fetch(origin + '/intake-config.json')).json(), { captureEnabled: false, qaOnly: true, mode: 'disabled', consentVersion });
  assert.equal((await post()).status, 404);
  assert.equal(calls, 0);
});

test('QA proxy has one fixed target, forwards the actual origin and strips cookies/auth/PII', async t => {
  const calls = [];
  const { origin, post } = await localServer(t, { captureEnabled: true, proxyFetch: async (url, options) => {
    calls.push({ url, options }); return response(201, { ...received, email: 'private-value' });
  } });
  assert.deepEqual(await (await fetch(origin + '/intake-config.json')).json(), { captureEnabled: true, qaOnly: true, mode: 'local-qa', consentVersion });
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
