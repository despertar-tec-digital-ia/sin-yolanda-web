import test from 'node:test';
import assert from 'node:assert/strict';
import {projectQualityNavigation} from '../scripts/site-quality/navigation.mjs';

const page = (url, content) => `<html><head><link rel="canonical" href="https://sin-yolanda.com${url}"></head><body>${content}</body></html>`;
test('canonical link normalization preserves anchors, query bytes and approved external reservation channels', () => {
  const body = '<a href="/san-antonio/?utm_source=instagram&amp;utm_medium=social#mesa">Menu</a>' +
    '<a href="https://sin-yolanda.com/catering/?x=1#contacto">Catering</a>' +
    '<a href="https://www.opentable.com/r/sin-yolanda?restref=1484191&amp;lang=es-MX">Book</a>' +
    '<a href="https://wa.me/5213310186159?text=Hola">WhatsApp</a><a href="tel:+12102720133">Call</a>' +
    '<a href="#local">Local</a><a href="/unknown/">Unknown</a>';
  const pages = new Map([['index.html', page('/', body)], ['san-antonio.html', page('/san-antonio', '')], ['catering.html', page('/catering', '')]]);
  const report = projectQualityNavigation({pages});
  const html = report.files.get('index.html');
  assert.ok(html.includes('href="/san-antonio?utm_source=instagram&amp;utm_medium=social#mesa"'));
  assert.ok(html.includes('href="https://sin-yolanda.com/catering?x=1#contacto"'));
  assert.equal(report.metadata.linksNormalized, 2);
  assert.ok(html.includes(body.slice(body.indexOf('<a href="https://www.opentable.com'))));
  assert.equal(pages.get('index.html'), page('/', body));
});

test('language targets follow real canonical editions and scripts are never rewritten', () => {
  const script = '<script>const sample = \'<a href="/catering/">\';</script>';
  const pages = new Map([['index.html', page('/', '<a href="/catering/" data-i18n-href-es="/catering/" data-i18n-href-en="/en/catering/" data-provider-href="/catering/">Catering</a>' + script)],
    ['catering.html', page('/catering', '')], ['en/catering/index.html', page('/en/catering/', '')]]);
  const first = projectQualityNavigation({pages});
  const html = first.files.get('index.html');
  assert.ok(html.includes('href="/catering" data-i18n-href-es="/catering" data-i18n-href-en="/en/catering/"'));
  assert.ok(html.includes('data-provider-href="/catering/"'));
  assert.ok(html.includes(script));
  const updated = new Map(pages); for (const pair of first.files) updated.set(...pair);
  assert.equal(projectQualityNavigation({pages: updated}).files.size, 0);
});

test('normalization fails for ambiguous canonical identities rather than guessing a destination', () => {
  assert.throws(() => projectQualityNavigation({pages: new Map([['a.html', page('/same', '')], ['b.html', page('/same', '')]])}), /unambiguous/);
  assert.throws(() => projectQualityNavigation({pages: new Map([['a.html', page('/same', '')], ['b.html', page('/same/', '')]])}), /unambiguous/);
  assert.throws(() => projectQualityNavigation({pages: new Map([['a.html', page('/same?utm_source=x', '')]])}), /unambiguous/);
});
