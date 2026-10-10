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

test('hero text, SVG lettering and playback labels switch completely and reversibly', () => {
  const text = value => ({ childNodes: [{ nodeType: 3, textContent: value }] });
  const headline = text('No hay tiempo para llorar');
  const subtitle = text('Comida que sí llena, tragos coquetos y canciones que se gritan completas.');
  const action = text('Elige tu sucursal');
  const geography = text('México · Estados Unidos');
  const localized = (es, en) => ({ textContent: es, attributes: { 'data-i18n-es': es, 'data-i18n-en': en },
    getAttribute(name) { return this.attributes[name]; } });
  const words = [['NO HAY', 'NO'], ['TIEMPO', 'TIME'], ['para', 'for'], ['LLORAR', 'TEARS']]
    .map(([es, en]) => localized(es, en));
  const playback = localized('Pausar fotos', 'Pause photos');
  const document = { readyState: 'complete', body: {}, documentElement: { lang: 'es' },
    querySelector: () => null,
    querySelectorAll: selector => selector === '[data-i18n-es][data-i18n-en]' ? [...words, playback]
      : selector === '[aria-label], img[alt]' || selector === '[data-lang-btn]' ? [] : [headline, subtitle, action, geography] };
  const window = {};
  vm.runInNewContext(readFileSync(new URL('../assets/js/i18n.js', import.meta.url), 'utf8'), {
    document, window, localStorage: { getItem: () => null, setItem() {} },
    MutationObserver: class { observe() {} }, setTimeout() {},
  });
  for (let i = 0; i < 2; i++) {
    window.SY_I18N.apply('en');
    window.SY_I18N.apply('en');
    assert.equal(headline.childNodes[0].textContent, 'No time for tears');
    assert.match(subtitle.childNodes[0].textContent, /^Food that fills you up,/);
    assert.equal(action.childNodes[0].textContent, 'Choose your location');
    assert.equal(geography.childNodes[0].textContent, 'Mexico · United States');
    assert.equal(words.map(word => word.textContent).join(' '), 'NO TIME for TEARS');
    assert.equal(playback.textContent, 'Pause photos');
    playback.attributes['data-i18n-es'] = 'Reproducir fotos';
    playback.attributes['data-i18n-en'] = 'Play photos';
    window.SY_I18N.apply('en');
    assert.equal(playback.textContent, 'Play photos');
    window.SY_I18N.apply('es');
    assert.equal(headline.childNodes[0].textContent, 'No hay tiempo para llorar');
    assert.equal(words.map(word => word.textContent).join(' '), 'NO HAY TIEMPO para LLORAR');
    assert.equal(playback.textContent, 'Reproducir fotos');
    playback.attributes['data-i18n-es'] = 'Pausar fotos';
    playback.attributes['data-i18n-en'] = 'Pause photos';
  }
});
