import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cjInaugurationSource, restoreCiudadJuarezInauguration} from '../scripts/ciudad-juarez-inauguration/source-contract.mjs';
import {restoreCiudadJuarezSocial} from '../scripts/ciudad-juarez-social/source-contract.mjs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const media = 'assets/media/ciudad-juarez-opening/';

test('the Ciudad Juárez inauguration layer restores exact earlier bytes and keeps unknown edits visible', () => {
  for (const [file, entry] of Object.entries(cjInaugurationSource.files)) {
    // The later social layer is peeled first; it has its own exact guard.
    const source = restoreCiudadJuarezSocial(file, read(file));
    assert.equal(hash(source), entry.afterSha256, file);
    const restored = restoreCiudadJuarezInauguration(file, source);
    assert.equal(hash(restored), entry.beforeSha256, file);
    assert.equal(restoreCiudadJuarezInauguration(file, restored), restored, file + ': idempotent');
    assert.notEqual(hash(restoreCiudadJuarezInauguration(file, source + 'unapproved edit')), entry.beforeSha256, file);
    assert.throws(() => restoreCiudadJuarezInauguration(file, source + entry.patches.at(-1).after), /Ciudad Juárez inauguration patch/);
  }
  assert.equal(restoreCiudadJuarezInauguration('unrelated.txt', 'preserved'), 'preserved');
});

test('the Ciudad Juárez page announces only the confirmed inauguration facts', () => {
  const html = read('ciudad-juarez.html');
  assert.match(html, /<time datetime="2026-12-11">11<\/time> y <time datetime="2026-12-12">12<\/time> de diciembre/);
  assert.match(html, /Jorge Guevara[\s\S]*Sábado 12 de diciembre/);
  assert.match(html, /Av\. Paseo Triunfo de la República 5617/);
  // The branch asked for the short form; the poster's extra locality and postal code are not repeated.
  assert.doesNotMatch(html, /Partido Díaz|32417|5617 Nte/);
  assert.doesNotMatch(html, /(?:tel:|wa\.me|opentable|data-booking-open|hasMenu|acceptsReservations|Canta por|concurso)/i);
  assert.doesNotMatch(html, /Muy pronto\. La fecha se anunciará/);
  const nodes = JSON.parse(html.match(/<script id="seo-page" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert.ok(!nodes.some(node => ['Restaurant', 'Menu', 'Service', 'LocalBusiness'].includes(node['@type'])));
  for (const id of ['inauguracion', 'visita-ciudad-juarez']) assert.match(html, new RegExp(`href="#${id}"`));
});

test('the invitation video uses the native player and autoplays only muted, inline and lazily', () => {
  const html = read('ciudad-juarez.html');
  const video = html.match(/<video\b[^>]*>/)[0];
  for (const attribute of [' controls', ' muted', ' loop', ' playsinline', 'preload="none"', 'src="/' + media + 'jorge-guevara-invitacion-720.mp4"', 'poster="/' + media]) {
    assert.ok(video.includes(attribute), attribute);
  }
  // Script-driven playback only while visible; preload none keeps the video off the initial load.
  assert.doesNotMatch(video, /\sautoplay/);
  assert.doesNotMatch(html, /data-video-(?:sound|toggle)/);
  const script = read('assets/js/ciudad-juarez-opening.js');
  assert.match(script, /prefers-reduced-motion/);
  assert.match(script, /saveData/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /userPaused/);
  assert.ok(statSync(new URL('../' + media + 'jorge-guevara-invitacion-720.mp4', import.meta.url)).size < 8 * 1024 * 1024);
});

test('every inauguration asset is explicitly allowlisted and versioned', () => {
  const manifest = JSON.parse(restoreCiudadJuarezSocial('scripts/public-manifest.json', read('scripts/public-manifest.json')));
  for (const asset of ['assets/js/ciudad-juarez-opening.js', media + 'gran-inauguracion-flyer.webp', media + 'jorge-guevara-invitacion-poster.webp', media + 'jorge-guevara-invitacion-720.mp4']) {
    assert.ok(manifest.assets.includes(asset), asset);
    assert.ok(statSync(new URL('../' + asset, import.meta.url)).size > 0, asset);
  }
  assert.equal(manifest.assetVersions['assets/js/ciudad-juarez-opening.js'], '20261126-ciudad-juarez-inauguration');
  assert.equal(manifest.assetVersions['assets/css/ciudad-juarez-opening.css'], '20261126-ciudad-juarez-inauguration');
});
