import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePosadasShareHtml,buildPosadasShare} from '../scripts/build-gdl-posadas-share.mjs';

test('the shared preview excludes analytics and sends unrelated navigation to the official site',()=>{
  const source='<html><head><title>Original</title><meta name="robots" content="index,follow"><script defer src="/assets/js/site-measurement.js?v=1"></script><script defer src="/assets/js/ga4-consent.js"></script><script defer src="/assets/js/webmcp.js"></script><script defer src="/assets/js/gdl-focus.js"></script><link rel="stylesheet" href="/assets/css/site.css"></head><body><a href="#posadas">Posadas</a><a href="/guadalajara#posadas">Local</a><a href="/san-ignacio/menu/">Menú</a><a href="/#ubicaciones">Sucursales</a></body></html>';
  const html=preparePosadasShareHtml(source);
  assert.doesNotMatch(html,/site-measurement|ga4-consent|webmcp|index,follow/);
  assert.match(html,/gdl-focus\.js/);
  assert.match(html,/href="\/assets\/css\/site\.css"/);
  assert.match(html,/href="#posadas"/);
  assert.match(html,/href="\/guadalajara#posadas"/);
  assert.match(html,/href="https:\/\/sin-yolanda\.com\/san-ignacio\/menu\/"/);
  assert.match(html,/href="https:\/\/sin-yolanda\.com\/#ubicaciones"/);
  assert.match(html,/noindex,nofollow,noarchive/);
});
test('a share artifact cannot escape its named, isolated output location',()=>{
  for(const name of [undefined,'../public','public','posadas-share-../public','/tmp/posadas-share-x'])assert.throws(()=>buildPosadasShare(name));
});
test('the expanded preview keeps both reviewed pages on the preview host and does not admit other local routes',()=>{
  const source='<html><head><title>Posadas</title></head><body><a href="/guadalajara/posadas/">Details</a><a href="/guadalajara/posadas/#cotizar">Quote</a><a href="/guadalajara#posadas">Back</a><a href="/guadalajara/canta-por-tu-cuenta-2026/">Contest</a><script defer src="/assets/review-gdl/gdl-posadas-ui.js"></script></body></html>';
  const html=preparePosadasShareHtml(source,'/guadalajara/posadas/');
  for(const href of ['/guadalajara/posadas/','/guadalajara/posadas/#cotizar','/guadalajara#posadas'])assert.ok(html.includes(`href="${href}"`));
  assert.match(html,/href="https:\/\/sin-yolanda\.com\/guadalajara\/canta-por-tu-cuenta-2026\/"/);
  assert.match(html,/og:url" content="https:\/\/posadas-sy\.187\.77\.220\.209\.sslip\.io\/guadalajara\/posadas\//);
  assert.match(html,/gdl-posadas-ui\.js/);
  assert.throws(()=>preparePosadasShareHtml(source,'/revision-posadas'));
});
