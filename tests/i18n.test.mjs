import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('image descriptions switch ES/EN reversibly without exposing decorative alt text', () => {
  const element = attributes => ({
    attributes: { ...attributes },
    getAttribute(name) { return this.attributes[name] ?? null; },
    setAttribute(name, value) { this.attributes[name] = value; }
  });
  const image = element({ alt: 'Ruleta de shots y bebidas sobre una mesa de Sin Yolanda' });
  const decorative = element({ alt: '' });
  const label = element({ 'aria-label': 'Filtrar ubicaciones' });
  const document = { readyState: 'complete', body: {}, documentElement: { lang: 'es' },
    querySelector: () => null,
    querySelectorAll: selector => selector === '[aria-label], img[alt]' ? [image, decorative, label] : [] };
  const window = {};
  vm.runInNewContext(readFileSync(new URL('../assets/js/i18n.js', import.meta.url), 'utf8'), {
    document, window, localStorage: { getItem: () => null, setItem() {} },
    MutationObserver: class { observe() {} }, setTimeout() {},
  });
  for (let i = 0; i < 2; i++) {
    window.SY_I18N.apply('en');
    window.SY_I18N.apply('en');
    assert.equal(image.attributes.alt, 'A shot roulette and drinks on a Sin Yolanda table');
    assert.equal(label.attributes['aria-label'], 'Filter locations');
    assert.equal(decorative.attributes.alt, '');
    window.SY_I18N.apply('es');
    assert.equal(image.attributes.alt, 'Ruleta de shots y bebidas sobre una mesa de Sin Yolanda');
    assert.equal(label.attributes['aria-label'], 'Filtrar ubicaciones');
    assert.equal(decorative.attributes.alt, '');
  }
});
