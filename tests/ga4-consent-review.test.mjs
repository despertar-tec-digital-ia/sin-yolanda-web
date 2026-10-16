import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ga4ReviewBundle } from '../scripts/analytics/ga4-review-bundle.mjs';
import { projectGa4EventBridge } from '../scripts/analytics/project-ga4-event-bridge.mjs';
import { compileMeasurementContract } from '../scripts/measurement-contract.mjs';

const root = new URL('../', import.meta.url).pathname;
const bundle = overrides => ga4ReviewBundle(root, overrides);
const actionData = data => ({ schema_version: 2, page_branch: 'houston', page_language: 'es', ...data });

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const measurementId = 'G-PZQE63983T';
const storageKey = 'sy-ga4-consent-v1';
const now = Date.parse('2026-10-08T23:00:00Z');
const day = 86400000;
const record = (choice, changes = {}) => JSON.stringify({ version: 1, scope: 'ga4-only', choice, updatedAt: now - 1000, expiresAt: now + 180 * day - 1000, ...changes });
const copy = value => JSON.parse(JSON.stringify(value));

function harness({ url = 'https://sin-yolanda.com/houston', enabled = true, stored, consentScope = 'ga4-only', dnt, msDnt, windowDnt, gpc = false, umamiDisabled = false, readError = false, writeError = false, removeError = false, readbackMismatch = false, cookieWriteError = false, cookieReadError = false, cookieThrowOnWrite = false, cookies = {}, language = 'es', referrer = '', body = {} } = {}) {
  const values = new Map(stored === undefined ? [] : [[storageKey, stored]]);
  if (umamiDisabled) values.set('umami.disabled', '1');
  const cookieValues = new Map([['_ga', 'fixture'], ['_ga_PZQE63983T', 'fixture'], ['sy-lang', 'en'], ['functional', 'fixture'], ...Object.entries(cookies)]);
  const scripts = [], storageWrites = [], storageRemovals = [], cookieWrites = [], umamiCalls = [], observers = [];
  const timers = new Map();
  let document, clock = now, nextTimer = 0;
  function fakeSetTimeout(callback, delay = 0, ...args) {
    const id = ++nextTimer;
    timers.set(id, { callback, args, delay: Number(delay), deadline: clock + Number(delay) });
    return id;
  }
  const fakeClearTimeout = id => timers.delete(id);
  function notifyMutation(target, type, attributeName) {
    for (const observer of observers) {
      for (const { node, options } of observer.targets) {
        if (node !== target && (!options.subtree || !node.contains(target))) continue;
        if (type === 'attributes' && (!options.attributes || options.attributeFilter && !options.attributeFilter.includes(attributeName))) continue;
        if (type === 'childList' && !options.childList) continue;
        observer.records.push({ type, target, attributeName });
        break;
      }
    }
  }
  class MutationObserver {
    constructor(callback) { this.callback = callback; this.targets = []; this.records = []; observers.push(this); }
    observe(node, options) { this.targets.push({ node, options }); }
    disconnect() { this.targets = []; this.records = []; }
    takeRecords() { return this.records.splice(0); }
  }
  const camel = name => name.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  class Event {
    constructor(type, options = {}) { Object.assign(this, { type, bubbles: false, isTrusted: false, defaultPrevented: false }, options); }
    preventDefault() { this.defaultPrevented = true; }
    stopPropagation() { this.stopped = true; }
  }
  class EventTarget {
    constructor() { this.handlers = new Map(); }
    addEventListener(type, listener, options) { this.handlers.set(type, [...this.handlers.get(type) || [], { listener, once: Boolean(options?.once) }]); }
    removeEventListener(type, listener) { this.handlers.set(type, (this.handlers.get(type) || []).filter(entry => entry.listener !== listener)); }
    dispatchEvent(event) {
      if (!event.target) event.target = this;
      event.currentTarget = this;
      for (const entry of [...this.handlers.get(event.type) || []]) {
        if (entry.once) this.removeEventListener(event.type, entry.listener);
        entry.listener.call(this, event);
      }
      this['on' + event.type]?.call(this, event);
      if (event.bubbles && !event.stopped) (this.parentElement || this.ownerDocument)?.dispatchEvent(event);
      return !event.defaultPrevented;
    }
  }
  class Element extends EventTarget {
    constructor(tag = 'div') {
      super(); Object.assign(this, { tagName: tag.toUpperCase(), children: [], dataset: {}, attributes: {}, hidden: false, _text: '', ownerDocument: document });
      this.style = { setProperty(name, value) { this[name] = String(value); }, removeProperty(name) { delete this[name]; }, getPropertyValue(name) { return this[name] || ''; } };
      this.classList = { add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/), ...names])].filter(Boolean).join(' '); }, remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); }, contains: name => this.className.split(/\s+/).includes(name), toggle: (name, force) => { const selected = force ?? !this.classList.contains(name); this.classList[selected ? 'add' : 'remove'](name); return selected; } };
    }
    get className() { return this.attributes.class || ''; }
    set className(value) { this.attributes.class = value; }
    get id() { return this.attributes.id || ''; }
    set id(value) { this.attributes.id = value; }
    get lang() { return this.attributes.lang || ''; }
    set lang(value) { this.setAttribute('lang', value); }
    get href() { return new URL(this.attributes.href || '', url).href; }
    set href(value) { this.attributes.href = value; }
    get src() { return this.attributes.src || ''; }
    set src(value) { this.attributes.src = value; }
    get textContent() { return this._text + this.children.map(child => child.textContent || '').join(''); }
    set textContent(value) { this._text = String(value); this._textNode = null; this.children = []; notifyMutation(this, 'childList'); }
    get childNodes() {
      const node = this;
      if (this._text && !this._textNode) this._textNode = { nodeType: 3, get textContent() { return node._text; }, set textContent(value) { node._text = String(value); } };
      return [...(this._text ? [this._textNode] : []), ...this.children];
    }
    get isConnected() { return Boolean(document?.documentElement.contains(this)); }
    get parentNode() { return this.parentElement || null; }
    get firstChild() { return this.children[0] || null; }
    getBoundingClientRect() { return { top: 0, right: 390, bottom: 0, left: 0, width: 390, height: 0, x: 0, y: 0 }; }
    getAttribute(name) {
      if (name.startsWith('data-')) return this.dataset[camel(name.slice(5))] ?? null;
      if (name === 'hidden') return this.hidden ? '' : null;
      return this.attributes[name] ?? null;
    }
    hasAttribute(name) { return this.getAttribute(name) !== null; }
    setAttribute(name, value) { this.attributes[name] = String(value); if (name.startsWith('data-')) this.dataset[camel(name.slice(5))] = String(value); if (name === 'hidden') this.hidden = true; notifyMutation(this, 'attributes', name); }
    removeAttribute(name) { delete this.attributes[name]; if (name.startsWith('data-')) delete this.dataset[camel(name.slice(5))]; if (name === 'hidden') this.hidden = false; notifyMutation(this, 'attributes', name); }
    appendChild(child) {
      child.remove(); child.parentElement = this; child.ownerDocument = document; this.children.push(child); notifyMutation(this, 'childList');
      if (child.tagName === 'SCRIPT' && /^https:\/\/www\.googletagmanager\.com\//.test(child.src)) scripts.push(child);
      return child;
    }
    append(...children) { children.forEach(child => this.appendChild(typeof child === 'string' ? Object.assign(new Element('span'), { textContent: child }) : child)); }
    prepend(child) { this.appendChild(child); this.children.unshift(this.children.pop()); }
    insertBefore(child, reference) {
      if (reference === null) return this.appendChild(child);
      assert.ok(this.children.includes(reference), 'Reference node must belong to its parent.');
      child.remove(); child.parentElement = this; child.ownerDocument = document;
      this.children.splice(this.children.indexOf(reference), 0, child); notifyMutation(this, 'childList');
      return child;
    }
    remove() { if (this.parentElement) { const parent = this.parentElement; parent.children = parent.children.filter(child => child !== this); notifyMutation(parent, 'childList'); } this.parentElement = null; }
    focus() { document.activeElement = this; }
    contains(child) { return child === this || this.children.some(candidate => candidate.contains(child)); }
    matches(selector) {
      return selector.split(',').some(part => {
        if (/:not\(\[[\w-]+\]\)/.test(part)) {
          const negative = part.match(/:not\(\[([\w-]+)\]\)/)[1];
          if (this.hasAttribute(negative)) return false;
          part = part.replace(/:not\(\[[\w-]+\]\)/, '');
        }
        const tokens = part.trim().split(/\s+/);
        const own = tokens.pop();
        const structural = own.replace(/\[[^\]]*\]/g, '');
        const tag = structural.match(/^[a-z]+/i)?.[0];
        if (tag && this.tagName.toLowerCase() !== tag.toLowerCase()) return false;
        for (const [, name] of structural.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(name)) return false;
        const id = structural.match(/#([\w-]+)/)?.[1]; if (id && this.id !== id) return false;
        for (const [, name, operator, expected] of own.matchAll(/\[([\w-]+)(?:(\*?=)["']?([^"'\]]*)["']?)?\]/g)) {
          const actual = this.getAttribute(name);
          if (actual === null || (operator === '=' && actual !== expected) || (operator === '*=' && !actual.includes(expected))) return false;
        }
        return !tokens.length || Boolean(this.parentElement?.closest(tokens.join(' ')));
      });
    }
    closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
    querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    click() { this.dispatchEvent(new Event('click', { bubbles: true, isTrusted: true, button: 0 })); }
  }
  class Document extends EventTarget {
    constructor() {
      super(); Object.assign(this, { readyState: 'complete', referrer, title: 'Sin Yolanda · person@example.test' });
      this.documentElement = new Element('html'); this.documentElement.lang = language;
      this.head = new Element('head'); this.body = new Element('body'); this.body.dataset = { ...body };
      this.documentElement.children = [this.head, this.body]; this.head.parentElement = this.documentElement; this.body.parentElement = this.documentElement;
      this.currentScript = new Element('script');
    }
    createElement(tag) { return new Element(tag); }
    createTextNode(text) { return Object.assign(new Element('span'), { textContent: text }); }
    querySelectorAll(selector) { return [...(this.documentElement.matches(selector) ? [this.documentElement] : []), ...this.documentElement.querySelectorAll(selector)]; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    getElementById(id) { return this.querySelector('#' + id); }
    get cookie() { if (cookieReadError) throw Error('Cookie access unavailable'); return [...cookieValues].map(([name, value]) => name + '=' + value).join('; '); }
    set cookie(value) {
      cookieWrites.push(value);
      if (cookieThrowOnWrite) throw Error('Cookie writes unavailable');
      if (cookieWriteError) return; // Browsers commonly ignore cookie writes instead of throwing.
      const [pair, ...options] = value.split(';'), at = pair.indexOf('=');
      const name = pair.slice(0, at).trim(), content = pair.slice(at + 1);
      const expired = options.some(option => /^\s*max-age\s*=\s*0\s*$/i.test(option) || (/^\s*expires=/i.test(option) && Date.parse(option.split('=').slice(1).join('=')) <= clock));
      if (expired) cookieValues.delete(name); else cookieValues.set(name, content);
    }
  }
  document = new Document();
  for (const node of [document.documentElement, document.body, document.head]) node.ownerDocument = document;
  document.body.appendChild(document.createElement('header'));
  document.body.appendChild(document.createElement('main'));
  document.body.appendChild(document.createElement('footer'));
  // HTML class/style parsing is deliberately unnecessary: the consent UI uses native DOM creation.
  const window = Object.assign(new EventTarget(), {
    document, location: new URL(url),
    setTimeout: fakeSetTimeout, clearTimeout: fakeClearTimeout,
    getComputedStyle: element => ({ position: element.style.position || 'static', getPropertyValue: name => element.style.getPropertyValue(name) }),
    doNotTrack: windowDnt,
    localStorage: {
      getItem(key) { if (readError) throw Error('Storage unavailable'); return values.get(key) ?? null; },
      setItem(key, value) { if (writeError) throw Error('Storage unavailable'); storageWrites.push([key, String(value)]); if (!readbackMismatch) values.set(key, String(value)); },
      removeItem(key) { if (removeError) throw Error('Storage unavailable'); storageRemovals.push(key); values.delete(key); },
    },
    navigator: { doNotTrack: dnt, msDoNotTrack: msDnt, globalPrivacyControl: gpc },
    umami: { track: (name, data) => { umamiCalls.push([name, copy(data)]); return Promise.resolve(); } },
  });
  const context = vm.createContext({ window, document, location: window.location, navigator: window.navigator, Element, HTMLElement: Element, Event, CustomEvent: Event, MutationObserver, URL, URLSearchParams, Promise, localStorage: window.localStorage, Date: class extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }, setTimeout: fakeSetTimeout, clearTimeout: fakeClearTimeout, getComputedStyle: window.getComputedStyle, console });
  vm.runInContext(bundle({ enabled, consentScope }), context);
  const commands = () => (window.dataLayer || []).map(command => Array.from(command));
  const events = name => commands().filter(command => command[0] === 'event' && (!name || command[1] === name));
  return {
    window, document, context, scripts, values, cookieValues, cookieWrites, storageWrites, storageRemovals, umamiCalls, timers,
    api: () => window.SY_GA4_CONSENT,
    commands, events,
    advance: milliseconds => { clock += milliseconds; },
    fireTimer: (id = [...timers].sort((a, b) => a[1].deadline - b[1].deadline)[0]?.[0]) => {
      assert.ok(timers.has(id), 'Expected a captured timer.');
      const timer = timers.get(id); timers.delete(id); clock = Math.max(clock, timer.deadline); timer.callback(...timer.args);
    },
    flushMutations: () => { for (const observer of observers) { const records = observer.takeRecords(); if (records.length) observer.callback(records, observer); } },
    rerun: () => vm.runInContext(bundle({ enabled, consentScope }), context),
    observe: (name, data) => window.syGa4MeasurementObserver?.(name, actionData(data)),
    fire: type => document.dispatchEvent(new Event(type)),
    windowFire: (type, options) => window.dispatchEvent(new Event(type, options)),
    load: (script = scripts.at(-1)) => { assert.ok(script, 'Expected a Google loader.'); script.dispatchEvent(new Event('load')); },
    element: (tag, attrs = {}, parent = document.body) => { const node = document.createElement(tag); for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value); parent.appendChild(node); return node; },
  };
}

test('checked-in GA4 config is real but disabled and does not activate production by being packaged', () => {
  const context = { window: {} }; context.window.SY_GA4_CONFIG = JSON.parse(read('scripts/analytics/ga4-event-config.json'));
  assert.equal(context.window.SY_GA4_CONFIG.enabled, false);
  assert.equal(context.window.SY_GA4_CONFIG.measurementId, measurementId);
  assert.equal(context.window.SY_GA4_CONFIG.consentVersion, 1);
  assert.equal(context.window.SY_GA4_CONFIG.consentMaxAgeDays, 180);
  assert.equal(context.window.SY_GA4_CONFIG.consentScope, 'ga4-only');
  const state = harness({ enabled: false, stored: record('granted') });
  assert.equal(state.scripts.length, 0);
  assert.equal(typeof state.window.gtag, 'undefined');
  assert.equal(state.document.querySelector('[data-sy-consent]'), null, 'Disabled production candidate must not show a misleading live consent flow.');
});

test('an absent or different consent scope cannot activate the controller or reuse a stored grant', () => {
  for (const consentScope of [null, '', 'all-optional', 'unknown']) {
    const state = harness({ consentScope, stored: record('granted') });
    assert.equal(state.api(), undefined);
    assert.equal(state.scripts.length, 0);
    assert.equal(state.window.syGa4MeasurementObserver, undefined);
  }
  for (const scope of [undefined, 'all-optional', 'unknown']) {
    const state = harness({ stored: record('granted', { scope }) });
    assert.equal(state.api().getChoice(), null);
    assert.equal(state.scripts.length, 0);
    assert.equal(state.api().choose('granted'), true);
    assert.equal(JSON.parse(state.values.get(storageKey)).scope, 'ga4-only');
  }
});

test('ES/EN explain the GA4-only decision without changing the separate Umami preference', () => {
  for (const language of ['es', 'en']) {
    const state = harness({ language });
    const description = state.document.querySelector('.sy-consent__description').textContent;
    assert.match(description, /GA4/); assert.match(description, /Umami/);
    assert.match(description, /cookies/); assert.match(description, /Global Privacy Control/);
    state.api().choose('denied'); state.api().open();
    assert.match(state.document.querySelector('[data-sy-consent-status]').textContent, /Umami/);
    assert.equal(state.values.has('umami.disabled'), false);
    assert.ok(state.storageWrites.every(([key]) => key === storageKey));
    assert.ok(state.storageRemovals.every(key => key === storageKey));
  }
});

test('the consent owner consumes every current route and alias, including GDL and the El Paso menu', () => {
  for (const [path, branch] of Object.entries(compileMeasurementContract(root).routes)) {
    for (const alias of path === '/' ? ['/', '/index.html'] : [path, path + '/', path + '.html', path + '/index.html']) {
      const state = harness({url: 'https://sin-yolanda.com' + alias, stored: record('granted')});
      assert.equal(state.scripts.length, 1, alias); state.load();
      assert.equal(state.events('page_view').length, 1, alias);
      assert.equal(state.events('page_view')[0][2].page_branch, branch, alias);
      assert.equal(state.events('page_view')[0][2].page_location, 'https://sin-yolanda.com' + path, alias);
    }
  }
});

test('unknown choice opens native consent UI with no Google global, pageview or pre-consent action queue', () => {
  const state = harness();
  const panel = state.document.querySelector('[data-sy-consent]');
  assert.ok(panel);
  const main = state.document.querySelector('main');
  assert.equal(panel.parentNode, main.parentNode);
  assert.ok(main.parentNode.children.indexOf(panel) < main.parentNode.children.indexOf(main), 'Initial consent must precede content in the document, not replace the hero.');
  assert.equal(panel.getAttribute('data-sy-consent-mode'), 'initial');
  assert.ok(state.document.querySelector('[data-sy-consent-choice="granted"]'));
  assert.ok(state.document.querySelector('[data-sy-consent-choice="denied"]'));
  assert.equal(state.scripts.length, 0);
  assert.equal(typeof state.window.gtag, 'undefined');
  assert.equal(state.events().length, 0);
  state.observe('branch_click', { action: 'branch_click', branch: 'houston', language: 'es' });
  assert.equal(state.api().choose('granted'), true);
  state.load();
  assert.equal(state.events('branch_click').length, 0, 'A later grant does not replay browsing that occurred before consent.');
  assert.equal(state.events('page_view').length, 1);
});

test('acceptance persists versioned bounded consent and validates storage before creating Google', () => {
  const state = harness();
  assert.equal(state.api().choose('granted'), true);
  const consent = JSON.parse(state.values.get(storageKey));
  assert.equal(consent.version, 1); assert.equal(consent.choice, 'granted');
  assert.equal(consent.updatedAt, now); assert.equal(consent.expiresAt, now + 180 * day);
  assert.equal(state.api().getChoice(), 'granted');
  assert.equal(state.scripts.length, 1);
  assert.equal(new URL(state.scripts[0].src).origin, 'https://www.googletagmanager.com');
  assert.equal(new URL(state.scripts[0].src).searchParams.get('id'), measurementId);
  assert.equal(state.events().length, 0, 'No pageview may be sent before the loader is ready.');
  for (const options of [{ readError: true }, { writeError: true }, { readbackMismatch: true }]) {
    const blocked = harness(options);
    assert.equal(blocked.api().choose('granted'), false);
    assert.equal(blocked.scripts.length, 0);
    assert.equal(typeof blocked.window.gtag, 'undefined');
  }
});

test('consent commands deny four signals by default and grant only analytics after a validated load', () => {
  const state = harness(); state.api().choose('granted');
  const defaults = state.commands().find(command => command[0] === 'consent' && command[1] === 'default');
  assert.ok(defaults);
  for (const signal of ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization']) assert.equal(defaults[2][signal], 'denied');
  assert.equal(state.commands().filter(command => command[0] === 'config').length, 0);
  state.load();
  const update = state.commands().find(command => command[0] === 'consent' && command[1] === 'update');
  assert.equal(update[2].analytics_storage, 'granted');
  for (const signal of ['ad_storage', 'ad_user_data', 'ad_personalization']) assert.equal(update[2][signal], 'denied');
  const config = state.commands().find(command => command[0] === 'config');
  assert.equal(config[1], measurementId); assert.equal(config[2].send_page_view, false);
  assert.equal(state.events('page_view').length, 1);
});

test('saved granted and denied choices are respected, while corrupt, expired or unbounded records fail closed', () => {
  const granted = harness({ stored: record('granted') }); assert.equal(granted.scripts.length, 1); granted.load(); assert.equal(granted.events('page_view').length, 1);
  const denied = harness({ stored: record('denied') }); assert.equal(denied.scripts.length, 0); assert.equal(denied.api().getChoice(), 'denied');
  for (const stored of [
    'not-json', 'null', '[]', '{}', record('unknown'), record('granted', { version: 2 }),
    record('granted', { expiresAt: now - 1 }), record('granted', { updatedAt: now + 301000 }),
    record('granted', { expiresAt: now + 181 * day }), record('granted', { updatedAt: 'yesterday' }),
    record('granted', { expiresAt: now - 2000 }),
  ]) {
    const state = harness({ stored });
    assert.equal(state.scripts.length, 0, 'Invalid saved choice may never preload Google: ' + stored);
    assert.equal(typeof state.window.gtag, 'undefined');
    assert.notEqual(state.api().getChoice(), 'granted');
  }
});

test('preview keeps UI available but hosts, 404 and privacy signals never send to Google', () => {
  for (const url of ['http://localhost:8080/houston', 'http://127.0.0.1:8080/houston']) {
    const state = harness({ url, enabled: false });
    assert.ok(state.document.querySelector('[data-sy-consent]'), 'Local/Pages preview should exercise the UI without analytics.');
    state.api().choose('granted');
    assert.equal(state.scripts.length, 0); assert.equal(typeof state.window.gtag, 'undefined');
  }
  for (const url of ['http://sin-yolanda.com/houston', 'https://example.org/houston', 'https://sin-yolanda-web.pages.dev/houston', 'https://sin-yolanda.com.example.org/houston', 'https://sin-yolanda.com/404', 'https://sin-yolanda.com/unknown/private', 'https://sin-yolanda.com/dashboard', 'https://sin-yolanda.com:8443/houston']) {
    const state = harness({ url, stored: record('granted') });
    assert.equal(state.scripts.length, 0, url); assert.equal(typeof state.window.gtag, 'undefined', url);
  }
  for (const options of [{ dnt: '1' }, { dnt: 'yes' }, { msDnt: '1' }, { windowDnt: '1' }, { gpc: true }, { umamiDisabled: true }]) {
    const state = harness({ ...options, stored: record('granted') });
    state.api()?.choose('granted');
    assert.equal(state.scripts.length, 0); assert.equal(typeof state.window.gtag, 'undefined');
  }
});

test('pageview and custom event payloads strip query, fragment, text, user identity and unexpected parameters', () => {
  const state = harness({ url: 'https://sin-yolanda.com/houston?email=person@example.test#private', referrer: 'https://example.org/person@example.test?secret=private' });
  state.api().choose('granted'); state.load();
  state.observe('reservation_click', { action: 'reservation_click', branch: 'houston', language: 'es', email: 'person@example.test', url: 'tel:+19999999999', text: 'private' });
  const pageview = state.events('page_view')[0][2];
  assert.equal(pageview.page_location, 'https://sin-yolanda.com/houston');
  assert.equal(pageview.page_referrer, '', 'Unknown origins are not copied into Google telemetry.');
  assert.equal(pageview.page_title, 'Sin Yolanda');
  const event = state.events('reservation_click')[0][2];
  assert.equal(event.branch, 'houston'); assert.equal(event.language, 'es'); assert.equal(event.action, 'reservation_click');
  assert.doesNotMatch(JSON.stringify(state.commands()), /person@example|secret|private|19999999999|email|user_id|utm_campaign|[#?]/);
  const before = state.events().length;
  for (const detail of [
    { name: 'free_text', data: { action: 'branch_click', branch: 'houston', language: 'es' } },
    { name: 'branch_click', data: { action: 'branch_click', branch: 'person@example.test', language: 'es' } },
    { name: 'branch_click', data: { action: 'free_text', branch: 'houston', language: 'es' } },
    { name: 'branch_click', data: { action: 'branch_click', branch: 'houston', language: 'invalid' } },
  ]) state.observe(detail.name, detail.data);
  assert.equal(state.events().length, before);
});

test('denial and preference controls are usable, and withdrawal disables Google and removes only owned cookies', () => {
  const state = harness();
  state.document.querySelector('[data-sy-consent-choice="denied"]').click();
  assert.equal(state.api().getChoice(), 'denied'); assert.equal(state.scripts.length, 0);
  const preference = state.document.querySelector('[data-sy-consent-open]'); assert.ok(preference); preference.click();
  assert.equal(state.document.querySelector('[data-sy-consent]').hidden, false);
  assert.equal(state.document.querySelector('[data-sy-consent]').getAttribute('data-sy-consent-mode'), 'preferences');
  state.document.querySelector('[data-sy-consent-choice="granted"]').click(); state.load();
  const before = state.events().length;
  state.api().choose('denied');
  assert.equal(state.window['ga-disable-' + measurementId], true);
  assert.equal(state.cookieValues.has('_ga'), false); assert.equal(state.cookieValues.has('_ga_PZQE63983T'), false);
  assert.equal(state.cookieValues.get('sy-lang'), 'en'); assert.equal(state.cookieValues.get('functional'), 'fixture');
  assert.equal(JSON.parse(state.values.get(storageKey)).choice, 'denied');
  state.observe('phone_click', { action: 'phone_click', branch: 'houston', language: 'es' });
  assert.equal(state.events().length, before);
});

test('script re-execution and repeated load callbacks cannot duplicate a document pageview or event listeners', () => {
  const state = harness(); state.api().choose('granted'); state.load(); state.rerun(); state.load();
  assert.equal(state.scripts.length, 1); assert.equal(state.events('page_view').length, 1);
  state.observe('branch_click', { action: 'branch_click', branch: 'houston', language: 'es' });
  assert.equal(state.events('branch_click').length, 1);
});

test('revocation wins an outstanding loader race and old queued actions do not return after reacceptance', () => {
  const state = harness(); state.api().choose('granted');
  const original = state.scripts[0];
  state.observe('phone_click', { action: 'phone_click', branch: 'houston', language: 'es' });
  state.api().choose('denied'); state.load(original);
  assert.equal(state.events().length, 0);
  assert.equal(state.commands().filter(command => command[0] === 'config').length, 0);
  state.api().choose('granted'); state.load();
  assert.equal(state.events('page_view').length, 1); assert.equal(state.events('phone_click').length, 0);
  state.api().choose('denied'); state.api().choose('granted'); state.load();
  assert.equal(state.events('page_view').length, 1, 'Repeated consent in one document is not a second page visit.');
});

test('an obsolete loader cannot activate after reacceptance while the current loader is still pending', () => {
  const state = harness(); state.api().choose('granted');
  const original = state.scripts[0];
  state.api().choose('denied'); state.api().choose('granted');
  const current = state.scripts.at(-1);
  assert.notEqual(current, original);
  state.load(original);
  assert.equal(state.events().length, 0); assert.equal(state.commands().filter(command => command[0] === 'config').length, 0);
  state.observe('menu_click', { action: 'menu_click', branch: 'houston', language: 'es' });
  state.load(current);
  assert.equal(state.events('page_view').length, 1); assert.equal(state.events('menu_click').length, 1);
});

test('a failed loader drops its queue and a retry sends only actions recorded during the new granted attempt', () => {
  const state = harness(); state.api().choose('granted');
  state.observe('phone_click', { action: 'phone_click', branch: 'houston', language: 'es' });
  state.scripts[0].dispatchEvent({ type: 'error' });
  assert.equal(state.events().length, 0);
  state.api().choose('granted');
  state.observe('directions_click', { action: 'directions_click', branch: 'houston', language: 'es' });
  state.load();
  assert.equal(state.events('phone_click').length, 0); assert.equal(state.events('directions_click').length, 1);
  assert.equal(state.events('page_view').length, 1);
});

test('another tab can revoke consent and expiration stops future sends without renewing the old grant', () => {
  const state = harness(); state.api().choose('granted'); state.load();
  state.values.set(storageKey, record('denied'));
  state.windowFire('storage', { key: storageKey });
  assert.equal(state.window['ga-disable-' + measurementId], true);
  assert.equal(state.api().getChoice(), 'denied');
  state.observe('phone_click', { action: 'phone_click', branch: 'houston', language: 'es' });
  assert.equal(state.events('phone_click').length, 0);
  state.api().choose('granted');
  state.advance(181 * day);
  state.document.visibilityState = 'visible'; state.fire('visibilitychange');
  assert.equal(state.api().getChoice(), null); assert.equal(state.window['ga-disable-' + measurementId], true);
  assert.equal(state.document.querySelector('[data-sy-consent]').hidden, false);
  state.observe('menu_click', { action: 'menu_click', branch: 'houston', language: 'es' });
  assert.equal(state.events('menu_click').length, 0); assert.equal(state.events('page_view').length, 1);
});

test('the current click owner supplies one event to each provider and rejection leaves Umami active', () => {
  const state = harness({ body: { branch: 'houston', status: 'open', language: 'es' } });
  state.context.sessionStorage = state.window.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  vm.runInContext(read('assets/js/public-data.js'), state.context);
  vm.runInContext(projectGa4EventBridge(read('assets/js/site-measurement.js')), state.context);
  const link = state.element('a', { href: 'https://www.opentable.com/r/sin-yolanda-houston', class: 'hh-reserve' });
  link.click();
  assert.equal(state.umamiCalls.filter(([name]) => name === 'reservation_click').length, 1);
  assert.equal(state.events('reservation_click').length, 0);
  state.api().choose('granted'); state.load(); link.click();
  assert.equal(state.events('reservation_click').length, 1);
  assert.equal(state.umamiCalls.filter(([name]) => name === 'reservation_click').length, 2);
  state.api().choose('denied'); link.click();
  assert.equal(state.events('reservation_click').length, 1);
  assert.equal(state.umamiCalls.filter(([name]) => name === 'reservation_click').length, 3);
  assert.equal(state.values.has('umami.disabled'), false);
  state.document.dispatchEvent(new state.context.CustomEvent('sy:site-action', {detail: {name: 'reservation_click', data: actionData({action: 'reservation_click', branch: 'houston', language: 'es'})}}));
  assert.equal(state.umamiCalls.filter(([name]) => name === 'reservation_click').length, 3, 'Historical emitters have no new listeners.');
});

test('failed withdrawal removes the old grant or persists a functional denial guard before another document can resume Google', () => {
  const cleared = harness({ stored: record('granted'), writeError: true }); cleared.load();
  cleared.values.set('sy-lang', 'en');
  cleared.api().choose('denied');
  assert.equal(cleared.window['ga-disable-' + measurementId], true);
  assert.equal(cleared.values.has(storageKey), false, 'A failed denial write must not leave the previous granted record readable.');
  assert.ok(cleared.storageRemovals.length > 0);
  assert.ok(cleared.storageRemovals.every(key => key === storageKey), 'Only the owned consent record may be removed.');
  assert.equal(cleared.values.get('sy-lang'), 'en');
  const next = harness({ stored: cleared.values.get(storageKey), cookies: Object.fromEntries(cleared.cookieValues) });
  assert.equal(next.scripts.length, 0);
  assert.equal(typeof next.window.gtag, 'undefined');

  const guarded = harness({ stored: record('granted'), writeError: true, removeError: true }); guarded.load();
  guarded.api().choose('denied');
  assert.equal(guarded.window['ga-disable-' + measurementId], true);
  assert.equal(JSON.parse(guarded.values.get(storageKey)).choice, 'granted');
  assert.equal(guarded.cookieValues.get('sy_ga4_denied'), '1', 'When removing the old grant fails, a verified denial cookie must override it.');
  assert.equal(guarded.cookieValues.get('functional'), 'fixture');
  const fallback = guarded.cookieWrites.find(value => value.startsWith('sy_ga4_denied=1;'));
  assert.match(fallback, /; Path=\/; SameSite=Lax; Secure/);
  assert.ok(Number(fallback.match(/Max-Age=(\d+)/)[1]) <= 180 * day / 1000, 'The fallback preference cookie must not outlive the configured consent period.');
  const protectedNext = harness({ stored: guarded.values.get(storageKey), cookies: Object.fromEntries(guarded.cookieValues) });
  assert.equal(protectedNext.scripts.length, 0, 'A guard must also work after storage becomes available again on another page.');
  assert.equal(typeof protectedNext.window.gtag, 'undefined');
  protectedNext.observe('phone_click', { action: 'phone_click', branch: 'houston', language: 'es' });
  assert.equal(protectedNext.events().length, 0);
  assert.equal(protectedNext.api().choose('granted'), true, 'A new explicitly accepted, verified choice may replace the fallback denial.');
  assert.equal(protectedNext.cookieValues.has('sy_ga4_denied'), false);
  assert.equal(protectedNext.scripts.length, 1); protectedNext.load();
  assert.equal(protectedNext.events('page_view').length, 1);
  const failedAccept = harness({ stored: guarded.values.get(storageKey), cookies: Object.fromEntries(guarded.cookieValues), writeError: true });
  assert.equal(failedAccept.api().choose('granted'), false);
  assert.equal(failedAccept.cookieValues.get('sy_ga4_denied'), '1', 'Failed acceptance may not clear the previous fallback rejection.');
  assert.equal(failedAccept.scripts.length, 0);
  const immutable = harness({ stored: record('granted'), cookies: { sy_ga4_denied: '1' }, cookieWriteError: true });
  assert.equal(immutable.api().choose('granted'), false, 'Readback must confirm that an old rejection cookie was cleared before activating a new grant.');
  assert.equal(immutable.cookieValues.get('sy_ga4_denied'), '1');
  assert.equal(immutable.scripts.length, 0);
  assert.match(immutable.document.querySelector('[data-sy-consent-status]').textContent, /guardar|save/i);

  for (const options of [{ cookieReadError: true }, { cookieThrowOnWrite: true, cookies: { sy_ga4_denied: '1' } }]) {
    const unavailable = harness({ stored: record('granted'), ...options });
    assert.equal(unavailable.scripts.length, 0);
    assert.doesNotThrow(() => unavailable.api().choose('denied'));
    assert.equal(unavailable.window['ga-disable-' + measurementId], true);
  }

  const blocked = harness({ stored: record('granted'), writeError: true, removeError: true, cookieWriteError: true }); blocked.load();
  blocked.api().choose('denied');
  assert.equal(blocked.window['ga-disable-' + measurementId], true);
  const before = blocked.events().length;
  blocked.observe('phone_click', { action: 'phone_click', branch: 'houston', language: 'es' });
  assert.equal(blocked.events().length, before);
  const warning = blocked.document.querySelector('[data-sy-consent-status]').textContent;
  assert.match(warning, /esta (?:página|pestaña)|(?:this|current) (?:page|tab)/i, 'The warning must scope the reliable block to this document.');
  assert.match(warning, /guardar|conservar|persist|save|remember/i, 'The warning must disclose the persistence failure.');
  const normal = harness(); normal.api().choose('denied');
  assert.equal(normal.cookieValues.has('sy_ga4_denied'), false, 'The functional denial cookie is a failure fallback, not an extra tracking identifier.');
});

test('an active visible document expires consent by an owned bounded timer and a throttled timer cannot bypass the send gate', () => {
  const state = harness({ stored: record('granted', { expiresAt: now + 1000 }) }); state.load();
  assert.ok(state.timers.size > 0, 'An accepted choice must schedule a captured expiry timer, not rely on visibility events.');
  assert.ok([...state.timers.values()].every(timer => timer.delay > 0 && timer.delay <= day), 'No browser timeout may exceed 24 hours.');
  state.advance(1001); state.fireTimer();
  assert.equal(state.api().getChoice(), null);
  assert.equal(state.window['ga-disable-' + measurementId], true);
  assert.equal(state.commands().filter(command => command[0] === 'consent' && command[1] === 'update').at(-1)[2].analytics_storage, 'denied');
  assert.equal(state.timers.size, 0, 'Revocation must clear the owned expiry timer.');
  assert.equal(state.document.querySelector('[data-sy-consent]').hidden, false);
  assert.doesNotMatch(state.document.querySelector('[data-sy-consent-status]').textContent, /has aceptado|you have accepted/i);

  const throttled = harness({ stored: record('granted', { expiresAt: now + 1000 }) }); throttled.load();
  throttled.advance(1001); // Simulate a browser that has not run the scheduled timeout yet.
  throttled.observe('phone_click', { action: 'phone_click', branch: 'houston', language: 'es' });
  assert.equal(throttled.events('phone_click').length, 0);
  assert.equal(throttled.window['ga-disable-' + measurementId], true, 'The send gate must revoke the loaded tag, not just discard this event.');
  assert.equal(throttled.timers.size, 0);
  assert.equal(throttled.commands().filter(command => command[0] === 'consent' && command[1] === 'update').at(-1)[2].analytics_storage, 'denied');

  const long = harness(); long.api().choose('granted'); long.load();
  assert.ok([...long.timers.values()].every(timer => timer.delay > 0 && timer.delay <= day));
  long.fireTimer();
  assert.equal(long.api().getChoice(), 'granted', 'A capped timer must reschedule until the actual 180-day deadline.');
  assert.ok(long.timers.size > 0);
  const grantTimers = [...long.timers.keys()];
  long.api().choose('denied');
  assert.equal(long.window['ga-disable-' + measurementId], true);
  assert.equal(long.api().getChoice(), 'denied');
  assert.ok(grantTimers.every(id => !long.timers.has(id)), 'The grant timer must be canceled when the user withdraws it.');
  assert.equal(long.timers.size, 1, 'A saved rejection has its own finite expiry, not an active Google grant.');
  long.advance(181 * day); long.fireTimer();
  assert.equal(long.api().getChoice(), null);
  assert.equal(long.timers.size, 0);
  assert.equal(long.window['ga-disable-' + measurementId], true);
  assert.equal(long.events('page_view').length, 1, 'Expiry of the rejection may ask again but may not reactivate Google.');
});

test('late home i18n initialization and live ES/EN switches refresh consent copy, status and accessible labels', () => {
  const state = harness({ url: 'https://sin-yolanda.com/' });
  state.values.set('sy-lang', 'en');
  vm.runInContext(read('assets/js/i18n.js'), state.context);
  state.flushMutations();
  assert.equal(state.document.documentElement.lang, 'en');
  const panel = state.document.querySelector('[data-sy-consent]');
  assert.equal(state.document.querySelector('.sy-consent__title').textContent, 'Your privacy, your choice.');
  assert.equal(state.document.querySelector('[data-sy-consent-choice="granted"]').textContent, 'Accept');
  assert.equal(state.document.querySelector('[data-sy-consent-choice="denied"]').textContent, 'Reject');
  assert.equal(state.document.querySelector('[data-sy-consent-open]').textContent, 'Privacy preferences');
  assert.equal(panel.getAttribute('aria-label'), 'Privacy preferences');
  assert.equal(state.document.querySelector('.sy-consent__notice').textContent, 'Privacy notice');
  for (let cycle = 0; state.timers.size && cycle < 4; cycle++) { state.fireTimer(); state.flushMutations(); }
  assert.equal(state.timers.size, 0, 'Reapplying an unchanged EN language must settle, not feed a consent/i18n MutationObserver loop.');
  state.window.SY_I18N.apply('es'); state.flushMutations();
  assert.equal(state.document.querySelector('.sy-consent__title').textContent, 'Tu privacidad, tú decides.');
  assert.equal(state.document.querySelector('[data-sy-consent-choice="granted"]').textContent, 'Aceptar');
  assert.equal(panel.getAttribute('aria-label'), 'Preferencias de privacidad');
  state.api().choose('denied'); state.api().open();
  assert.equal(state.document.querySelector('[data-sy-consent-status]').textContent, 'Has rechazado GA4. Umami continúa sin cookies de seguimiento.');
  state.window.SY_I18N.apply('en'); state.flushMutations();
  assert.equal(state.document.querySelector('[data-sy-consent-status]').textContent, 'You have rejected GA4. Umami continues without tracking cookies.');
  assert.equal(state.api().getChoice(), 'denied');
  assert.equal(state.scripts.length, 0); assert.equal(state.events().length, 0);
});

test('a fallback rejection from another tab revokes a ready document on visibility, preference reads and subsequent actions', () => {
  for (const entry of ['visibility', 'getChoice', 'action']) {
    const state = harness(); state.api().choose('granted'); state.load();
    assert.equal(state.window['ga-disable-' + measurementId], false);
    assert.equal(state.api().getChoice(), 'granted');
    // Cookies are shared between same-origin tabs. If both storage writes in the
    // rejecting tab failed, no storage event can tell this document to re-read them.
    state.cookieValues.set('sy_ga4_denied', '1');
    if (entry === 'visibility') {
      state.document.visibilityState = 'visible'; state.fire('visibilitychange');
    } else if (entry === 'getChoice') {
      assert.notEqual(state.api().getChoice(), 'granted', 'A preference read must reflect an external rejection.');
    } else {
      state.observe('phone_click', { action: 'phone_click', branch: 'houston', language: 'es' });
    }
    assert.equal(state.window['ga-disable-' + measurementId], true, entry + ' must revoke the loaded property, not only skip a custom event.');
    assert.notEqual(state.api().getChoice(), 'granted', entry + ' must not report the old accepted choice.');
    assert.equal(state.commands().filter(command => command[0] === 'consent' && command[1] === 'update').at(-1)[2].analytics_storage, 'denied');
    assert.equal(state.timers.size, 0, 'An external rejection must cancel the old grant timer.');
    const before = state.events().length;
    state.observe('reservation_click', { action: 'reservation_click', branch: 'houston', language: 'es' });
    state.observe('menu_click', { action: 'menu_click', branch: 'houston', language: 'es' });
    assert.equal(state.events().length, before, 'The observer may not send an action after the external rejection.');
    assert.equal(state.events('phone_click').length, 0);
    assert.equal(state.events('page_view').length, 1);
  }
});


test('opening preferences with browser opt-out focuses the usable rejection control', () => {
  const state = harness({gpc: true});
  state.document.querySelector('[data-sy-consent-open]').click();
  assert.equal(state.document.activeElement.getAttribute('data-sy-consent-choice'), 'denied');
  assert.equal(state.document.querySelector('[data-sy-consent-choice="granted"]').disabled, true);
});
