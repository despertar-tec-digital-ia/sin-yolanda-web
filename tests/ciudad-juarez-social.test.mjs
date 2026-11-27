import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cjSocialSource, restoreCiudadJuarezSocial} from '../scripts/ciudad-juarez-social/source-contract.mjs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const instagram = 'https://www.instagram.com/sinyolanda.cdjuarez/';
const dm = 'https://ig.me/m/sinyolanda.cdjuarez';

test('the Ciudad Juárez social layer restores exact earlier bytes and keeps unknown edits visible', () => {
  for (const [file, entry] of Object.entries(cjSocialSource.files)) {
    const source = read(file);
    assert.equal(hash(source), entry.afterSha256, file);
    const restored = restoreCiudadJuarezSocial(file, source);
    assert.equal(hash(restored), entry.beforeSha256, file);
    assert.equal(restoreCiudadJuarezSocial(file, restored), restored, file + ': idempotent');
    assert.notEqual(hash(restoreCiudadJuarezSocial(file, source + 'unapproved edit')), entry.beforeSha256, file);
    assert.throws(() => restoreCiudadJuarezSocial(file, source + entry.patches.at(-1).after), /Ciudad Juárez social patch/);
  }
});

test('Ciudad Juárez reserves only through its Instagram DM and lists the account in its footer', () => {
  const html = read('ciudad-juarez.html');
  assert.equal(html.split(`href="${dm}"`).length - 1, 2, 'hero and inauguration DM buttons');
  assert.match(html, new RegExp(`<nav class="bf-social" aria-label="Redes de Ciudad Juárez">[\\s\\S]*href="${instagram}"`));
  assert.doesNotMatch(html, /hvrq=|(?:tel:|wa\.me|opentable|data-booking-open)/i);
});

test('the group notice, data and llms.txt carry the confirmed address without an unconfirmed date', () => {
  for (const file of ['eventos.html', 'la-cantina.html', 'tienda.html', 'assets/js/site.js']) {
    const source = read(file);
    assert.match(source, /Av\. Paseo Triunfo de la República 5617/, file);
    assert.doesNotMatch(source, /La fecha, ubicación y reservaciones se anunciarán/, file);
  }
  const llms = read('llms.txt');
  assert.match(llms, /Gran inauguración: Ciudad Juárez[^\n]*Av\. Paseo Triunfo de la República 5617[^\n]*sinyolanda\.cdjuarez/);
  for (const source of [llms, read('assets/js/site.js'), read('assets/js/public-data.js')]) {
    assert.doesNotMatch(source, /1[12] de diciembre[^\n]*Juárez|Juárez[^\n]*1[12] de diciembre/);
  }
});
