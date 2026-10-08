import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const siteSource = read('assets/js/site.js');
const dataContext = { window: {} };
vm.runInNewContext(read('assets/js/public-data.js'), dataContext);
const data = dataContext.window.SY_DATA;

function siteFunction(name) {
  const start = siteSource.indexOf('  function ' + name + '(');
  assert.ok(start >= 0, 'Missing site function: ' + name);
  const end = siteSource.indexOf('\n  function ', start + 1);
  return siteSource.slice(start, end < 0 ? siteSource.length : end);
}

function renderHome() {
  const functions = ['escapeHtml', 'validCalendarDate', 'calendarDay', 'calendarLabel',
    'homeCampaigns', 'homeAgenda', 'homePage'];
  const now = new Date('2026-10-07T18:00:00Z');
  return vm.runInNewContext(functions.map(siteFunction).join('\n') + '\nhomePage()', {
    data, Intl,
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } },
    branchById: id => data.branches.find(branch => branch.id === id),
    publicHeader: () => '', publicFooter: () => '', openingAnnouncement: () => '',
    venueShowcase: () => '<section id="ubicaciones"></section>',
  });
}

const selectorEntries = html => [...html.matchAll(/<a\b[^>]*\bhref=["']#ubicaciones["'][^>]*>[\s\S]*?<\/a>/g)]
  .map(match => {
    const tag = match[0].slice(0, match[0].indexOf('>') + 1);
    // Consume quoted values as a whole: a marker inside a class name is not an attribute.
    const attributes = new Map([...tag.slice(2, -1).matchAll(/([^\s"'=<>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)]
      .map(attribute => [attribute[1], attribute[2] ?? attribute[3] ?? attribute[4] ?? '']));
    return { attributes, html: match[0] };
  });

test('every direct home booking entry uses the location-selection contract, including the final CTA', () => {
  const entries = selectorEntries(renderHome());
  assert.ok(entries.length >= 10, 'Keep hero, pretexts, birthday and final booking entrances');
  assert.ok(entries.some(entry => />Reservar mesa<\/a>/.test(entry.html)), 'Exercise the final booking CTA');
  for (const entry of entries) {
    assert.ok(entry.attributes.has('data-select-location'),
      'A direct selector entrance must restore open locations when coming-soon is selected: ' + entry.html);
  }
});

test('all marked booking entries reset only coming-soon and preserve native click semantics', () => {
  const links = selectorEntries(renderHome()).map(entry => ({
    marked: entry.attributes.has('data-select-location'),
    listeners: {},
    addEventListener(type, handler) { this.listeners[type] = handler; },
  }));
  let selected = 'soon';
  let resetCount = 0;
  const document = {
    querySelector(selector) {
      if (selector === '[data-venue-filter="soon"][aria-pressed="true"]') return selected === 'soon' ? {} : null;
      if (selector === '[data-venue-filter="all"]') return { click() { selected = 'all'; resetCount++; } };
      return null;
    },
    querySelectorAll: selector => selector === '[data-select-location]' ? links.filter(link => link.marked) : [],
  };
  vm.runInNewContext(siteFunction('bindCommon') + '\nbindCommon()', { document });
  for (const link of links) {
    assert.equal(typeof link.listeners.click, 'function', 'Every rendered selector link needs the filter guard');
    const nativeClick = {
      button: 0,
      preventDefault() { assert.fail('Do not intercept native selector navigation'); },
      stopPropagation() { assert.fail('Do not suppress native selector navigation'); },
    };
    selected = 'soon';
    const before = resetCount;
    link.listeners.click(nativeClick);
    assert.equal(selected, 'all');
    assert.equal(resetCount, before + 1);
    for (const country of ['mx', 'us', 'all']) {
      selected = country;
      link.listeners.click(nativeClick);
      assert.equal(selected, country, 'Preserve an existing country or all filter');
      assert.equal(resetCount, before + 1);
    }
    for (const modified of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { button: 2 }]) {
      selected = 'soon';
      link.listeners.click({ ...nativeClick, ...modified });
      assert.equal(selected, 'soon', 'Modified clicks must not change the originating page');
      assert.equal(resetCount, before + 1);
    }
  }
});

function languageHarness(savedLanguage) {
  class Element {
    constructor(attributes = {}) {
      this.attributes = { ...attributes };
      this.classes = new Set((attributes.class || '').split(/\s+/).filter(Boolean));
      this.children = [];
      this.childNodes = [];
      this.listeners = {};
      this.dataset = attributes['data-lang-btn'] ? { langBtn: attributes['data-lang-btn'] } : {};
    }
    classList = { toggle: (name, force) => force ? this.classes.add(name) : this.classes.delete(name) };
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name] ?? null; }
    addEventListener(type, handler) { this.listeners[type] = handler; }
    appendChild(child) { this.children.push(child); }
    closest(selector) { return selector === '[data-lang-btn]' && this.dataset.langBtn ? this : null; }
    set innerHTML(html) {
      this.children = [...html.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)].map(match => {
        const attributes = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(attribute => [attribute[1], attribute[2]]));
        const button = new Element(attributes);
        button.childNodes = [{ nodeType: 3, textContent: match[2] }];
        return button;
      });
    }
  }
  const nav = new Element();
  const wrap = () => nav.children[0];
  const buttons = () => wrap()?.children || [];
  const storage = new Map(savedLanguage ? [['sy-lang', savedLanguage]] : []);
  const timers = new Map();
  const observations = [];
  let timerId = 0;
  let notifyObserver;
  const document = {
    readyState: 'complete', body: {}, documentElement: { lang: 'es' },
    querySelector: selector => selector === '.public-nav' ? nav : selector === '.lang-toggle' ? wrap() || null : null,
    querySelectorAll: selector => selector === '[data-lang-btn]' ? buttons() : [],
    createElement: () => new Element(),
  };
  const window = {};
  vm.runInNewContext(read('assets/js/i18n.js'), {
    document, window,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    MutationObserver: class {
      constructor(callback) { notifyObserver = callback; }
      observe(target, options) { observations.push({ target, options }); }
    },
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
  });
  return { document, window, buttons, storage, nav, wrap, timers, observations,
    notifyMutation() { notifyObserver([{ type: 'childList', target: nav }]); },
    flushTimers() {
      let callbacks = 0;
      while (timers.size) {
        assert.ok(callbacks++ < 10, 'Do not leave an unbounded observer/timer loop');
        const [id, timer] = timers.entries().next().value;
        timers.delete(id);
        timer.callback();
      }
    },
  };
}

function assertLanguageState(harness, language) {
  const { document, window, buttons } = harness;
  assert.equal(document.documentElement.lang, language);
  assert.equal(window.SY_I18N.lang, language);
  assert.equal(buttons().length, 2);
  assert.equal(buttons().filter(button => button.classes.has('active')).length, 1);
  assert.equal(buttons().filter(button => button.getAttribute('aria-pressed') === 'true').length, 1);
  for (const button of buttons()) {
    const selected = button.dataset.langBtn === language;
    assert.equal(button.classes.has('active'), selected, 'The highlight must identify ' + language);
    assert.equal(button.getAttribute('aria-pressed'), String(selected));
  }
}

for (const savedLanguage of [undefined, 'es', 'en']) {
  test('language toggle has consistent visible/accessibility state on initialization: ' + (savedLanguage || 'default ES'), () => {
    const harness = languageHarness(savedLanguage);
    const { window, storage } = harness;
    const expected = savedLanguage === 'en' ? 'en' : 'es';
    assertLanguageState(harness, expected);
    for (const language of ['en', 'es', 'es', 'en', 'en', expected]) {
      window.SY_I18N.apply(language);
      assertLanguageState(harness, language);
      assert.equal(storage.get('sy-lang'), language);
    }
    assert.equal(harness.timers.size, 0);
  });
}

for (const savedLanguage of ['es', 'en']) {
  test('the mutation observer callback rebuilds a removed toggle in the current language: ' + savedLanguage, () => {
    const harness = languageHarness(savedLanguage);
    const { document, window, nav, wrap, buttons, timers, observations } = harness;
    assert.equal(observations.length, 1);
    assert.equal(observations[0].target, document.body);
    assert.equal(observations[0].options.childList, true);
    assert.equal(observations[0].options.subtree, true);
    for (const language of [savedLanguage, savedLanguage === 'en' ? 'es' : 'en', savedLanguage]) {
      window.SY_I18N.apply(language);
      const oldToggle = wrap();
      nav.children = [];
      assert.equal(buttons().length, 0, 'Simulate the navigation subtree being re-rendered');
      harness.notifyMutation();
      harness.notifyMutation();
      assert.equal(timers.size, 1, 'Coalesce repeated mutation notifications');
      assert.ok([...timers.values()][0].delay > 0, 'Rebuild through the scheduled debounce callback');
      harness.flushTimers();
      assert.notEqual(wrap(), oldToggle);
      assert.equal(nav.children.length, 1, 'Rebuild one toggle, not duplicate controls');
      assertLanguageState(harness, language);
      const other = buttons().find(button => button.dataset.langBtn !== language);
      wrap().listeners.click({ target: other });
      assertLanguageState(harness, other.dataset.langBtn);
      assert.equal(harness.storage.get('sy-lang'), other.dataset.langBtn);
      harness.notifyMutation();
      harness.flushTimers();
      assert.equal(nav.children.length, 1);
      assert.equal(timers.size, 0, 'Drain fake timers; never create real pending runtime handles');
    }
  });
}
