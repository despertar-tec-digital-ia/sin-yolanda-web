import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { analyticsAsset } from '../../scripts/sync-site-analytics.mjs';
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const defaultSource = read(analyticsAsset);

export function measurementHarness({ source = defaultSource, beforeRun = () => {}, url = 'https://sin-yolanda.com/', dnt, gpc, disabled = '', body = {}, branchHandler = false, delayed = false, hook, scriptHook, referrer = '', storage = new Map(), now } = {}) {
  const listeners = new Map(), scripts = [], calls = [];
  let disabledValue = disabled;
  let clock = now;
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
    referrer,
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
    sessionStorage: { getItem:key=>storage.get(key)||null, setItem:(key,value)=>storage.set(key,value), removeItem:key=>storage.delete(key) },
  };
  if (scriptHook) window[scriptHook] = hook;
  if (!delayed) window.umami = tracker;
  class ClockDate extends Date { static now() { return clock ?? Date.now(); } }
  const context = vm.createContext({ window, document, navigator: { doNotTrack: dnt, globalPrivacyControl:gpc }, Element: FakeElement, URL, URLSearchParams, Date:ClockDate, Promise, CustomEvent: class {} , localStorage: window.localStorage });
  vm.runInContext(read('assets/js/public-data.js'), context);
  beforeRun({window, document, context});
  vm.runInContext(source, context);
  return {
    scripts, calls, window, document, context, Element: FakeElement,
    runAgain: () => vm.runInContext(source, context),
    disabled: value => { disabledValue = value; },
    setTime: value => { clock = value; },
    click: (target, extras = {}) => {
      for (const handler of listeners.get('click') || []) handler({ target, isTrusted: true, preventDefault() { throw Error('Never intercept navigation.'); }, ...extras });
    },
    other: (name, target) => { for (const handler of listeners.get(name) || []) handler({ target }); },
    auxclick: target => { for (const handler of listeners.get('auxclick') || []) handler({ target, button:1,isTrusted:true }); },
    ready: () => { window.umami = tracker; scripts[0].handlers.load(); },
  };
}

