import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('assets/js/site.js');
const context = { window: {} };
vm.runInNewContext(read('assets/js/public-data.js'), context);
const data = context.window.SY_DATA;
const renderer = name => source.slice(source.indexOf('  function ' + name + '()'), source.indexOf('\n  function ', source.indexOf('  function ' + name + '()') + 1));
const escapeStart = source.indexOf('  function escapeHtml(');
const escapeSource = source.slice(escapeStart, source.indexOf('\n  function ', escapeStart + 1));
const render = (name, facts = data) => vm.runInNewContext(escapeSource + renderer(name) + '\n' + name + '()', { data: facts });

test('selector has seven real records, native links and non-linked future announcements', () => {
  const html = render('venueShowcase');
  assert.equal((html.match(/data-venue-item /g) || []).length, 7);
  assert.equal((html.match(/<a class="venue-card/g) || []).length, 5);
  assert.equal((html.match(/<div class="venue-card/g) || []).length, 2);
  assert.match(html, /href="houston.html"/);
  assert.match(html, /href="el-paso.html"/);
  assert.doesNotMatch(html, /href="#"|role="listitem"|maricarmen|photos\.google/);
  assert.ok(data.branches.filter(b => b.status === 'coming-soon').every(b => b.region === 'us'));
});

test('directory and footer follow the same registry when a location is added or renamed', () => {
  const facts = structuredClone(data);
  facts.branches[0].shortName = 'Guadalajara de prueba';
  facts.branches.push({ id: 'fixture-location', page: 'fixture.html', shortName: 'Fixture',
    city: 'Test city', region: 'us', status: 'active', country: 'Estados Unidos' });
  const html = vm.runInNewContext(['publicHeader', 'publicFooter', 'venueShowcase', 'locationsPage']
    .map(renderer).join('\n') + '\nlocationsPage()', { data: facts, page: 'locations' });
  assert.equal((html.match(/data-venue-gallery/g) || []).length, 1);
  assert.equal((html.match(/data-venue-item /g) || []).length, facts.branches.length);
  assert.match(html, /data-branch-id="fixture-location"/);
  assert.match(html, /href="fixture.html">Fixture/);
  assert.match(html, /Guadalajara de prueba/);
  assert.doesNotMatch(html, /location-card|data-filter=|location-grid|data-caveat/);
  assert.equal((html.match(/href="#ubicaciones" data-select-location/g) || []).length, 3);
});

test('opening strip has a real date/destination between the hero and early location selector', () => {
  const future = structuredClone(data);
  // Retain the prior dated El Paso contract independently from the new undated San Diego notice.
  future.branches.find(b => b.id === 'san-diego').status = 'active';
  assert.equal(render('openingAnnouncement', future), '', 'Luis confirmed El Paso is already open');
  future.branches.find(b => b.id === 'el-paso').status = 'coming-soon';
  future.branches.find(b => b.id === 'el-paso').statusLabel = 'Nueva apertura';
  const html = render('openingAnnouncement', future);
  assert.match(html, /datetime="2026-10-09"/);
  assert.match(html, /Conoce la sucursal/);
  assert.match(html, /Nueva apertura/);
  const renamed = structuredClone(future);
  renamed.branches.find(b => b.id === 'el-paso').statusLabel = 'Editorial label';
  assert.match(render('openingAnnouncement', renamed), /Editorial label/);
  assert.match(render('venueShowcase', renamed), /Editorial label/);
  assert.equal((html.match(/href="el-paso.html"/g) || []).length, 2);
  assert.match(source, /<\/section>\s*\$\{openingAnnouncement\(\)\}\s*\$\{venueShowcase\(\)\}\s*\$\{homeCatering\(\)\}\s*<section class="section section-after-hero" id="plan"/);
  const withoutDate = structuredClone(future);
  withoutDate.branches.find(b => b.id === 'el-paso').openingDate = '';
  assert.equal(render('openingAnnouncement', withoutDate), '');
  const opened = structuredClone(future);
  opened.branches.find(b => b.id === 'el-paso').status = 'active';
  assert.equal(render('openingAnnouncement', opened), '');
});

test('San Diego opening notice uses only its confirmed address, without a date or reservations', () => {
  const html = render('openingAnnouncement');
  assert.match(html, /opening-announcement--san-diego/);
  assert.match(html, /San Diego<\/span>/);
  assert.match(html, /data-i18n-en="Coming soon"/);
  assert.match(html, /2470 San Diego Avenue, Ste 101–105, San Diego, CA 92110/);
  assert.match(html, /https:\/\/www.google.com\/maps\/search\//);
  assert.doesNotMatch(html, /<time|datetime=|noviembre|November|Reservar|OpenTable|wa\.me|el-paso\.html/i);
  const fallback = read('index.html');
  const strip = fallback.indexOf('<aside class="opening-announcement opening-announcement--san-diego"');
  assert.ok(strip > fallback.indexOf('class="home-hero home-hero-cinema"'));
  assert.ok(strip < fallback.indexOf('<section class="section venue-showcase"'));
});

test('San Diego notice is removed when the branch is open or the destination is unconfirmed', () => {
  for (const mutation of [branch => branch.status = 'active', branch => branch.address = '',
    branch => branch.mapsUrl = '']) {
    const facts = structuredClone(data);
    mutation(facts.branches.find(branch => branch.id === 'san-diego'));
    assert.equal(render('openingAnnouncement', facts), '');
  }
});

test('future photos are illustrative brand media, without invented dates or destinations', () => {
  for (const id of ['moreno-valley', 'san-diego']) {
    const branch = data.branches.find(b => b.id === id);
    assert.equal(branch.venuePhotoKind, 'brand-illustrative');
    assert.match(branch.venuePhoto, /^assets\/media\/.*\.webp$/);
    assert.ok(readFileSync(new URL('../' + branch.venuePhoto, import.meta.url)).length > 0);
    assert.equal(branch.page, '#');
    assert.ok(!branch.openingDate);
  }
  const html = render('venueShowcase');
  assert.equal((html.match(/<img /g) || []).length, 7);
  assert.equal((html.match(/venue-badge--opening/g) || []).length, 0);
  assert.doesNotMatch(html, /Nueva apertura/);
  assert.doesNotMatch(html, /Abre el 9 de octubre/);
  assert.equal(data.branches.find(b => b.id === 'el-paso').status, 'active');
  assert.equal(data.branches.find(b => b.id === 'el-paso').reserveChannel, 'opentable');
  const opened = structuredClone(data);
  opened.branches.find(b => b.id === 'el-paso').status = 'active';
  assert.doesNotMatch(render('venueShowcase', opened), /venue-badge--opening|venue-opening-date/);
});

test('hero refinement keeps one accessible rotulo H1 and replaces the still-image video with responsive source photos', () => {
  const hash = s => createHash('sha256').update(s).digest('hex');
  const hero = source.match(/<section class="home-hero home-hero-cinema"[\s\S]*?<\/section>/)[0];
  const title = hero.match(/<h1\b[^>]*class="[^"]*\bhero-rotulo\b[^"]*"[^>]*>[\s\S]*?<\/h1>/)?.[0];
  assert.ok(title, 'The artwork must be the home H1, not a second decorative heading');
  assert.match(title, /<span\b[^>]*class="[^"]*\brotulo-sr\b[^"]*"[^>]*>No hay tiempo para llorar<\/span>/);
  assert.match(title, /<svg\b[^>]*viewBox="0 0 600 540"[^>]*aria-hidden="true"/);
  for (const [id, path] of [['rotulo-arch', 'M85 109 Q300 42 515 109'],
    ['rotulo-time-arch', 'M20 255 Q300 177 580 255'], ['rotulo-last-arch', 'M25 427 Q300 507 575 427']]) {
    assert.ok(title.includes(`id="${id}" d="${path}"`), 'Preserve the approved artwork path: ' + id);
  }
  assert.doesNotMatch(hero, /Cantina contemporánea|El plan ya está armado/);
  assert.doesNotMatch(source, /<section\b[^>]*id="rotulo"|class="rotulo-photos"/);
  assert.doesNotMatch(hero, /<video|hero-fiesta-real/);
  assert.equal((hero.match(/data-hero-slide/g) || []).length, 3);
  assert.equal((hero.match(/ data-src=/g) || []).length, 2, 'Load later scenes only when needed');
  assert.match(hero, /fetchpriority="high"/);
  assert.doesNotMatch(hero, /data-hero-motion|Pausar fotos|Pause photos/, 'The requested hero has no playback control');
  for (const word of ['NO', 'TIME', 'TEARS', 'for']) assert.ok(hero.includes(`data-i18n-en="${word}"`));
  assert.match(hero, /México · Estados Unidos/);
  assert.equal((hero.match(/href="#ubicaciones"/g) || []).length, 1, 'One main location action');
  assert.match(hero, /href="#plan"/);
  const media = readFileSync(new URL('../assets/media/hero-fiesta-real.mp4', import.meta.url));
  assert.equal(hash(media), 'e03997b6c3842b466bfb04b45906aa7655c9770c16636f70133e251e39d3b0ce');
  const poster = readFileSync(new URL('../assets/media/hero-fiesta-real-poster.webp', import.meta.url));
  assert.equal(hash(poster), '75752e160287d825f6f2bc4dafd875d8ecb79f67558dc39a7e7951ee267d4688');
  const cinema = renderer('initHeroCinema');
  assert.doesNotMatch(cinema, /style\.opacity|copy\.style|querySelector\(["']\.hero-copy/,
    'Scroll may move the video, but must not hide or move the title and booking actions');
});

function harness() {
  class Element {
    constructor(dataset = {}) { this.dataset = dataset; this.hidden = false; this.events = {}; this.classes = new Set(); this.attributes = {}; }
    classList = { toggle: (name, state) => state ? this.classes.add(name) : this.classes.delete(name), add: name => this.classes.add(name) };
    addEventListener(name, fn) { (this.events[name] ||= []).push(fn); }
    setAttribute(name, value) { this.attributes[name] = value; }
    fire(name, event = {}) { for (const fn of this.events[name] || []) fn(event); }
  }
  const items = Array.from(data.branches, b => {
    const item = new Element({ region: b.region, status: b.status });
    item.card = new Element(); item.card.querySelector = () => null;
    item.querySelector = () => item.card; return item;
  });
  const filters = ['all', 'mx', 'us', 'soon'].map(venueFilter => new Element({ venueFilter }));
  const gallery = new Element(); gallery.style = { setProperty() {} };
  const status = {};
  const root = { querySelector: s => s === '[data-venue-gallery]' ? gallery : status,
    querySelectorAll: s => s === '[data-venue-item]' ? items : filters };
  const media = { matches: true, addEventListener() {} };
  vm.runInNewContext(read('assets/js/venue-selector.js'), {
    document: { querySelector: () => root, documentElement: { lang: 'es' } },
    window: { matchMedia: () => media }
  });
  return { items, filters, status, media };
}

test('hover/focus preview persists, touch does not hover and native clicks remain untouched', () => {
  const { items } = harness();
  const open = () => items.filter(item => item.classes.has('is-open'));
  items[3].fire('pointerenter', { pointerType: 'mouse' });
  assert.deepEqual(open(), [items[3]]);
  items[3].fire('pointerleave');
  assert.deepEqual(open(), [items[3]]);
  items[1].fire('pointerenter', { pointerType: 'touch' });
  assert.deepEqual(open(), [items[3]]);
  items[2].card.fire('focus');
  assert.deepEqual(open(), [items[2]]);
  assert.ok(items.every(item => !item.card.events.click && !item.events.click));
});

test('country/status filters include future US locations, keep the last visible preview, and recover after filtering', () => {
  const { items, filters, status } = harness();
  items[3].fire('pointerenter', { pointerType: 'mouse' });
  for (const [index, count] of [[2, 6], [3, 2], [1, 1], [0, 7]]) {
    filters[index].fire('click');
    assert.equal(items.filter(item => !item.hidden).length, count);
    assert.equal(items.filter(item => !item.hidden && item.classes.has('is-open')).length, 1);
    assert.equal(filters.filter(f => f.attributes['aria-pressed'] === 'true').length, 1);
    assert.match(status.textContent, new RegExp('^' + count + ' '));
  }
});
