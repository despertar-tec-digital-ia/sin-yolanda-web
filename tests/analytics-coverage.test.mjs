import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import vm from 'node:vm';
import { analyticsAsset, analyticsExclusions, checkAnalyticsCoverage, syncSiteAnalyticsHtml } from '../scripts/sync-site-analytics.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read(analyticsAsset);
const manifest = JSON.parse(read('scripts/public-manifest.json'));

function harness({ url = 'https://sin-yolanda.com/', dnt, disabled = '', body = {}, branchHandler = false, delayed = false, hook, scriptHook } = {}) {
  const listeners = new Map(), scripts = [], calls = [];
  let disabledValue = disabled;
  class FakeElement {
    constructor({ tag = 'a', href = '#', dataset = {}, classes = [], lang = '', parent = null } = {}) {
      Object.assign(this, { tag, rawHref: href, dataset, classes, lang, parent });
      this.href = new URL(href, url).href;
    }
    getAttribute(name) { return name === 'href' ? this.rawHref : null; }
    matches(selector) {
      return selector.split(',').some(part => {
        part = part.trim();
        if (part === 'a[href]') return this.tag === 'a';
        if (part === 'button[data-venue-filter]') return this.tag === 'button' && 'venueFilter' in this.dataset;
        if (part === 'button[data-lang-btn]') return this.tag === 'button' && 'langBtn' in this.dataset;
        if (/^\[data-/.test(part)) return part.slice(6, -1).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) in this.dataset;
        if (part === '.bf-navigation a[hreflang]') return this.classes.includes('branch-menu');
        if (part === '.hh-table-copy>a') return this.classes.includes('table-menu');
        return part.startsWith('.') && this.classes.includes(part.slice(1));
      });
    }
    closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector) || null; }
    querySelectorAll() { return this.links || []; }
  }
  const pageBody = { dataset: body };
  const document = {
    body: pageBody,
    documentElement: { lang: 'es' },
    currentScript: { getAttribute: name => name === 'data-before-send' ? scriptHook || null : null },
    querySelector(selector) {
      if (selector === 'body[data-branch]') return body.branch ? pageBody : null;
      if (selector.includes('script[src*=')) return branchHandler ? {} : null;
      if (selector === '#sy-umami-tracker') return scripts.find(script => script.id === 'sy-umami-tracker') || null;
      return null;
    },
    createElement(tag) {
      assert.equal(tag, 'script', 'Measurement must not create visual DOM elements.');
      const script = { attributes: {}, handlers: {}, setAttribute(name, value) { this.attributes[name] = value; }, addEventListener(name, handler) { this.handlers[name] = handler; } };
      return script;
    },
    head: { appendChild: script => scripts.push(script) },
    addEventListener(name, handler) { listeners.set(name, [...listeners.get(name) || [], handler]); },
    dispatchEvent() {},
  };
  const tracker = { track: (name, data) => { calls.push([name, { ...data }]); return Promise.resolve(); } };
  const window = {
    location: new URL(url),
    localStorage: { getItem(key) { assert.equal(key, 'umami.disabled'); return disabledValue; }, setItem() {} },
    sySiteAnalyticsBeforeSend: hook,
  };
  if (scriptHook) window[scriptHook] = hook;
  if (!delayed) window.umami = tracker;
  const context = vm.createContext({ window, document, navigator: { doNotTrack: dnt }, Element: FakeElement, URL, Promise, CustomEvent: class {} , localStorage: window.localStorage });
  vm.runInContext(read('assets/js/public-data.js'), context);
  vm.runInContext(source, context);
  return {
    scripts, calls, window, document, context, Element: FakeElement,
    runAgain: () => vm.runInContext(source, context),
    disabled: value => { disabledValue = value; },
    click: (target, extras = {}) => {
      for (const handler of listeners.get('click') || []) handler({ target, isTrusted: true, preventDefault() { throw Error('Never intercept navigation.'); }, ...extras });
    },
    other: (name, target) => { for (const handler of listeners.get(name) || []) handler({ target }); },
    ready: () => { window.umami = tracker; scripts[0].handlers.load(); },
  };
}

test('all allowed public pages use exactly one versioned shared tracker; 404 is explicitly excluded', () => {
  assert.deepEqual(checkAnalyticsCoverage().exclusions, Object.keys(analyticsExclusions));
  assert.equal(checkAnalyticsCoverage().measuredPages, manifest.pages.length - 1);
});

test('the public module graph has a single direct branch click emitter per imported page', () => {
  for (const page of manifest.pages) {
    const html = read(page);
    if (!/data-branch="/.test(html)) continue;
    const visited = new Set();
    const visit = path => {
      if (visited.has(path)) return;
      visited.add(path);
      const code = read(path);
      for (const [, dependency] of code.matchAll(/\bimport\s*["'](\.\/[^"']+\.js)["']/g)) visit(posix.join(posix.dirname(path), dependency));
    };
    for (const [, path] of html.matchAll(/<script\b[^>]*src="\/([^"?]+\.js)(?:\?[^" ]*)?"[^>]*>/g)) {
      if (path.startsWith('_astro/')) visit(path);
    }
    const emitters = [...visited].filter(path => /umami(?:\?\.)?\.?track/.test(read(path)));
    assert.ok(emitters.length <= 1, page + ' has competing direct click emitters: ' + emitters.join(', '));
  }
});

test('the pure HTML migration removes the old tracker, keeps inline UI scripts and is idempotent', () => {
  const old = '<html><head><script defer src="https://analytics.despertartdigital.cloud/script.js" data-website-id="cbfa7fb3-230e-405c-a0b8-06c762d6216b"></script><script type="module">window.ui=true</script></head><body>Hero</body></html>';
  const next = syncSiteAnalyticsHtml(old, 'index.html', manifest.assetVersion);
  assert.ok(next.includes('<script type="module">window.ui=true</script>'));
  assert.ok(next.endsWith('<body>Hero</body></html>'));
  assert.equal(next, syncSiteAnalyticsHtml(next, 'index.html', manifest.assetVersion));
  assert.doesNotMatch(next, /analytics\.despertartdigital/);
  assert.match(syncSiteAnalyticsHtml(old, '404.html', manifest.assetVersion), /excluded:404/);
  assert.doesNotMatch(syncSiteAnalyticsHtml(old, '404.html', manifest.assetVersion), /site-analytics\.js/);
  const configured = syncSiteAnalyticsHtml(old.replace('data-website-id=', 'data-before-send="myExistingBeforeSend" data-website-id='), 'index.html', manifest.assetVersion);
  assert.match(configured, /data-before-send="myExistingBeforeSend"/);
  assert.equal(configured, syncSiteAnalyticsHtml(configured, 'index.html', manifest.assetVersion));
  assert.throws(() => syncSiteAnalyticsHtml(old.replace('cbfa7fb3-230e-405c-a0b8-06c762d6216b', 'different-site'), 'index.html', manifest.assetVersion), /different website tracker/);
});

test('the production path allowlist covers every public HTML alias and excludes unknown or demo paths', () => {
  for (const page of manifest.pages.filter(page => !Object.hasOwn(analyticsExclusions, page))) {
    const aliases = page === 'index.html' ? ['/', '/index', '/index.html'] : page.endsWith('/index.html')
      ? ['/' + page, '/' + page.replace(/index\.html$/, ''), '/' + page.replace(/\/index\.html$/, '')]
      : ['/' + page, '/' + page.replace(/\.html$/, ''), '/' + page.replace(/\.html$/, '/')];
    for (const path of aliases) assert.equal(harness({ url: 'https://sin-yolanda.com' + path }).scripts.length, 1, page + ': ' + path);
  }
  for (const path of ['/404', '/404.html', '/unknown-person@example.com', '/dashboard', '/maricarmen', '/api/private', '/houston/menu/private']) {
    assert.equal(harness({ url: 'https://sin-yolanda.com' + path }).scripts.length, 0, path);
  }
  for (const origin of ['http://sin-yolanda.com', 'https://sin-yolanda-web.pages.dev', 'http://localhost:8080', 'https://preview.sin-yolanda.com', 'https://sin-yolanda.com.example.org']) {
    assert.equal(harness({ url: origin + '/' }).scripts.length, 0, origin);
  }
  assert.equal(harness({ url: 'https://www.sin-yolanda.com/houston' }).scripts.length, 1);
});

test('loader respects DNT, Umami disable storage, and repeated execution without changing visual elements', () => {
  for (const dnt of ['1', 'yes']) assert.equal(harness({ dnt }).scripts.length, 0);
  assert.equal(harness({ disabled: '1' }).scripts.length, 0);
  const state = harness();
  state.runAgain();
  assert.equal(state.scripts.length, 1);
  const script = state.scripts[0];
  assert.equal(script.async, true);
  assert.equal(script.referrerPolicy, 'origin');
  assert.deepEqual(script.attributes, {
    'data-website-id': 'cbfa7fb3-230e-405c-a0b8-06c762d6216b',
    'data-domains': 'sin-yolanda.com,www.sin-yolanda.com',
    'data-do-not-track': 'true', 'data-exclude-search': 'true', 'data-exclude-hash': 'true',
    'data-before-send': 'sySiteAnalyticsSanitize',
  });
  assert.doesNotMatch(source, /googletagmanager|gtag|G-[A-Z0-9]+|innerHTML|classList|style\./);
});

test('beforeSend strips URL/referrer queries, hash, title and arbitrary event metadata', () => {
  const state = harness({ url: 'https://sin-yolanda.com/houston?email=person@example.com&utm_campaign=free#private' });
  const payload = state.window.sySiteAnalyticsSanitize('event', {
    url: '/houston?email=person@example.com#private', title: 'person@example.com',
    referrer: 'https://www.sin-yolanda.com/locations?secret=private#private',
    language: 'en-US', screen: '1440x900', name: 'reservation_click',
    data: { action: 'reservation_click', branch: 'houston', language: 'en', email: 'person@example.com', href: 'tel:1234', label: 'My name' },
    email: 'person@example.com',
  });
  assert.equal(payload.url, '/houston');
  assert.equal(payload.title, 'Sin Yolanda');
  assert.equal(payload.referrer, 'https://www.sin-yolanda.com/locations');
  assert.deepEqual(Object.keys(payload.data).sort(), ['action', 'branch', 'language']);
  assert.doesNotMatch(JSON.stringify(payload), /person|secret|private|email|utm|href|label|[#?]/);
  assert.equal(state.window.sySiteAnalyticsSanitize('event', { referrer: 'https://example.org/person@example.com?x=1' }).referrer, 'https://example.org');
  assert.equal(state.window.sySiteAnalyticsSanitize('event', { referrer: 'javascript:secret' }).referrer, '');
  assert.equal(state.window.sySiteAnalyticsSanitize('event', { name: 'free-text-event', data: {} }), false);
  assert.equal(state.window.sySiteAnalyticsSanitize('event', { name: 'reservation_click', data: { action: 'free text', branch: 'houston', language: 'en' } }), false);
  state.disabled('1');
  assert.equal(state.window.sySiteAnalyticsSanitize('event', {}), false, 'Changing the privacy preference also stops subsequent sends.');
});

test('a pre-existing beforeSend hook remains intact and can veto or adjust a send', () => {
  const veto = () => false;
  const state = harness({ hook: veto });
  assert.equal(state.window.sySiteAnalyticsBeforeSend, veto);
  assert.equal(state.window.sySiteAnalyticsSanitize('event', {}), false);
  const adjust = (_, data) => ({ ...data, referrer: 'https://example.org/secret?email=person@example.com' });
  const configured = harness({ hook: adjust, scriptHook: 'myExistingBeforeSend' });
  assert.equal(configured.window.myExistingBeforeSend, adjust);
  assert.equal(configured.window.sySiteAnalyticsSanitize('event', {}).referrer, 'https://example.org');
});

test('selector clicks send one allowlisted event, never hover/focus or a synthetic filter reset', () => {
  const state = harness();
  const card = new state.Element({ href: '/el-paso', dataset: { venue: '', branchId: 'el-paso' } });
  state.other('pointerenter', card);
  state.other('focus', card);
  assert.equal(state.calls.length, 0);
  const nested = new state.Element({ tag: 'span', parent: card });
  state.click(nested, { ctrlKey: true });
  assert.deepEqual(state.calls, [['location_select', { branch: 'el-paso', language: 'es', action: 'location_select' }]]);
  const filter = new state.Element({ tag: 'button', dataset: { venueFilter: 'soon' } });
  state.click(filter, { isTrusted: false });
  assert.equal(state.calls.length, 1);
  state.click(filter);
  assert.deepEqual(state.calls[1], ['location_filter_click', { branch: 'group', language: 'es', action: 'filter_soon' }]);
  state.click(new state.Element({ dataset: { selectLocation: '' }, href: '#ubicaciones' }));
  assert.equal(state.calls[2][0], 'location_selector_open');
});

test('global CTA coverage keeps destinations native and sends only branch, language and action', () => {
  const state = harness();
  for (const [href, name, branch] of [
    ['/houston?private=true', 'branch_click', 'houston'],
    ['/san-antonio/menu/', 'menu_click', 'san-antonio'],
    ['/catering/', 'catering_click', 'group'],
    ['https://www.opentable.com/restaurant/profile/1484191?ref=1068', 'reservation_click', 'san-antonio'],
    ['https://wa.me/523310186159?text=private', 'reservation_click', 'san-ignacio'],
    ['tel:+13468791675', 'phone_click', 'houston'],
    ['https://www.google.com/maps/dir/?api=1&destination=private', 'directions_click', 'group'],
  ]) {
    const before = state.calls.length;
    state.click(new state.Element({ href }));
    assert.equal(state.calls.length, before + 1);
    assert.equal(state.calls.at(-1)[0], name);
    assert.equal(state.calls.at(-1)[1].branch, branch);
    assert.deepEqual(Object.keys(state.calls.at(-1)[1]).sort(), ['action', 'branch', 'language']);
  }
  state.click(new state.Element({ tag: 'button', dataset: { langBtn: 'en' } }));
  assert.equal(state.calls.at(-1)[1].language, 'en');
  state.click(new state.Element({ href: 'https://example.org/private?email=person@example.com' }));
  assert.equal(state.calls.length, 8, 'Unrelated external links do not become arbitrary analytics labels.');
});

test('existing imported branch handlers still send one event and the shared loader adds none', () => {
  const state = harness({ url: 'https://sin-yolanda.com/houston', body: { branch: 'houston', status: 'open', language: 'es' }, branchHandler: true });
  vm.runInContext(read('_astro/branch-landing.DvYw-im_.js'), state.context);
  for (const [href, classes, event] of [
    ['https://www.opentable.com/r/sin-yolanda-houston', ['hh-reserve'], 'reservation_click'],
    ['/houston/menu/', ['hh-nav-menu'], 'menu_click'],
    ['tel:+13468791675', [], 'phone_click'],
    ['https://www.google.com/maps/dir/?api=1&destination=private', [], 'directions_click'],
  ]) {
    const before = state.calls.length;
    state.click(new state.Element({ href, classes }));
    assert.equal(state.calls.length, before + 1, event + ' must have a single owner.');
    assert.equal(state.calls.at(-1)[0], event);
  }
  const before = state.calls.length;
  state.click(new state.Element({ href: 'https://www.eventbrite.com/e/private', dataset: { programmingAction: 'tickets' } }));
  assert.equal(state.calls.length, before, 'Programming action has its own direct handler.');
  state.click(new state.Element({ href: '/catering/', classes: ['bct-action'] }));
  assert.equal(state.calls.at(-1)[0], 'catering_click', 'An uncovered CTA still gets measured on an imported page.');
});

test('delayed or unavailable tracker never blocks navigation and keeps only a bounded action queue', () => {
  const state = harness({ delayed: true });
  const link = new state.Element({ href: '/houston' });
  state.click(link);
  assert.equal(state.calls.length, 0);
  state.ready();
  assert.equal(state.calls.length, 1);
  const capped = harness({ delayed: true });
  for (let i = 0; i < 25; i++) capped.click(new capped.Element({ href: '/houston' }));
  capped.ready();
  assert.equal(capped.calls.length, 20);
  const failed = harness({ delayed: true });
  failed.click(new failed.Element({ href: '/houston' }));
  failed.scripts[0].handlers.error();
  failed.ready();
  assert.equal(failed.calls.length, 0);
});
