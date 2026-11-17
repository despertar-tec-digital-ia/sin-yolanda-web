// Local, noindex candidate. The approved manifest and live source stay intact.
import assert from 'node:assert/strict';
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {packagePublic} from './package-public.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, process.argv[2] || '.artifacts/reservas-selector-review/public');
const outputParts = relative(resolve(root, '.artifacts'), output).split(sep);
assert.ok(outputParts.length === 2 && /^reservas-selector-review(?:-[a-z0-9]+)?$/.test(outputParts[0]) && outputParts[1] === 'public', 'Review output must be .artifacts/reservas-selector-review*/public');
const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/public-manifest.json')));
assert.ok(!manifest.pages.includes('reservar.html') && !manifest.assets.includes('assets/js/reservar.js'), 'Review cannot enter the production manifest');
const page = readFileSync(resolve(root, 'reservar.html'), 'utf8');
assert.match(page, /<meta name="robots" content="noindex,nofollow">/);
const config = JSON.parse(readFileSync(resolve(root, 'scripts/editorial/opentable-review.json')));
for (const branch of config.branches) {
  const card = page.match(new RegExp(`<article[^>]+data-booking-choice="${branch.slug}"[^>]+>`))?.[0];
  assert.ok(card, 'Missing booking card for ' + branch.slug);
  assert.ok(card.includes(`data-rid="${branch.rid}"`), 'Wrong RID for ' + branch.slug);
  const fallback = card.match(/data-provider-url="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
  assert.ok(fallback, 'Missing direct booking fallback for ' + branch.slug);
  const url = new URL(fallback);
  assert.equal(url.origin, 'https://www.opentable.com');
  assert.equal(url.searchParams.get('restref'), String(branch.rid));
  assert.equal(url.pathname, new URL(branch.fallback).pathname);
  const directLink = page.match(new RegExp(`data-booking-choice="${branch.slug}"[\\s\\S]*?<a href="([^"]+)" data-venue`))?.[1]?.replaceAll('&amp;', '&');
  assert.equal(directLink, fallback, 'No-JS card must link directly to ' + branch.slug);
}
assert.equal([...page.matchAll(/<article[^>]+data-booking-choice="([^"]+)"/g)].length, 5, 'Only five active locations may book');
assert.match(page, /data-booking-choice="guadalajara"[^>]+data-provider-url="https:\/\/wa\.me\/5213310186159"/);
assert.match(page, /data-booking-choice="guadalajara"[\s\S]*?<a href="https:\/\/wa\.me\/5213310186159" data-venue/);

const report = packagePublic({root, destination: output, audience: 'review', metadata: resolve(dirname(output), 'release.json')});
const files = new Set(Object.keys(report.hashes));
for (const file of ['reservar.html', 'assets/css/reservar.css', 'assets/js/reservar.js', 'assets/media/reservas-group.webp']) {
  mkdirSync(dirname(resolve(output, file)), {recursive: true});
  copyFileSync(resolve(root, file), resolve(output, file));
  files.add(file);
}
function addReviewMeasurementRoute(file, startMarker, endMarker) {
  const path = resolve(output, file);
  const source = readFileSync(path, 'utf8');
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start && source.indexOf(startMarker, start + 1) < 0, `Unexpected measurement contract in ${file}`);
  const current = source.slice(start + startMarker.length, end);
  const contract = JSON.parse(current.trim());
  assert.equal(contract.routes['/reservar'], undefined, `Review route already exists in ${file}`);
  contract.routes['/reservar'] = 'group';
  writeFileSync(path, source.slice(0, start + startMarker.length) + JSON.stringify(contract) + source.slice(end));
}
addReviewMeasurementRoute('assets/js/site-measurement.js', '/* BEGIN GENERATED MEASUREMENT CONTRACT */\n', '\n/* END GENERATED MEASUREMENT CONTRACT */');
addReviewMeasurementRoute('assets/js/ga4-consent.js', 'window.SY_GA4_CONTRACT = ', ';\n');
function replaceOnce(file, before, after) {
  const path = resolve(output, file);
  const source = readFileSync(path, 'utf8');
  assert.equal(source.split(before).length, 2, `Expected one ${before} in ${file}`);
  writeFileSync(path, source.replace(before, after));
}
const oldNav = '<a class="nav-cta" href="#ubicaciones" data-select-location>Reservar mesa</a>';
const newNav = '<a class="nav-cta" href="/reservar">Reservar mesa</a>';
for (const file of ['index.html', 'locations.html']) replaceOnce(file, oldNav, newNav);
replaceOnce('index.html', '<li><a href="#ubicaciones" data-select-location data-i18n-es="Reservar mesa" data-i18n-en="Book a table">Reservar mesa</a></li>',
  '<li><a href="/reservar" data-i18n-es="Reservar mesa" data-i18n-en="Book a table">Reservar mesa</a></li>');
replaceOnce('assets/js/site.js', '<a class="nav-cta" href="${locationsHref}" data-select-location>Reservar mesa</a>',
  '<a class="nav-cta" href="/reservar">Reservar mesa</a>');
replaceOnce('assets/js/site.js', '<li><a href="#ubicaciones" data-select-location data-i18n-es="Reservar mesa" data-i18n-en="Book a table">Reservar mesa</a></li>',
  '<li><a href="/reservar" data-i18n-es="Reservar mesa" data-i18n-en="Book a table">Reservar mesa</a></li>');
const hashes = Object.fromEntries([...files].sort().map(file => [file, createHash('sha256').update(readFileSync(resolve(output, file))).digest('hex')]));
writeFileSync(resolve(dirname(output), 'release.json'), JSON.stringify({...report, audience: 'review-reservas-selector', fileCount: files.size, hashes, publicationEnabled: false, reviewRoute: '/reservar'}, null, 2) + '\n');
console.log(JSON.stringify({output, fileCount: files.size, publicationEnabled: false, branches: config.branches.map(branch => branch.slug)}));
