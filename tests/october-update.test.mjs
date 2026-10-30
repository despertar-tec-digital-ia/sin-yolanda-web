import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { projectAllAgendas } from '../scripts/editorial/all-agendas.mjs';
import { approval, octoberHours, eventArtwork } from '../scripts/editorial/october-2026-update.mjs';
import { restoreOctober } from '../scripts/october-source-contract.mjs';
import { schemas, renderShell } from '../scripts/seo.mjs';
import { applyOctoberSiteHtml, photoExports } from '../scripts/october-site.mjs';
import { restoreHomeSelection } from '../scripts/home-selection-source-contract.mjs';
const root = resolve(import.meta.dirname, '..');
const read = file => restoreHomeSelection(file, readFileSync(resolve(root, file), 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const project = now => projectAllAgendas(root, { now, commit: 'a'.repeat(40) });
const plain = value => JSON.parse(JSON.stringify(value));

test('October authorization restores exact preceding bytes and rejects unrelated or ambiguous edits', () => {
  const contract = JSON.parse(read('scripts/october-source-patches.json'));
  for (const [file, item] of Object.entries(contract.files)) {
    const source = read(file), prior = restoreOctober(file, source);
    assert.equal(hash(source), item.afterSha256, file);
    assert.equal(hash(prior), item.beforeSha256, file);
    assert.notEqual(hash(restoreOctober(file, source + 'unknown edit')), item.beforeSha256);
    assert.throws(() => restoreOctober(file, source + item.patches[0].after), /October update patch/);
    assert.throws(() => restoreOctober(file, source.replace(item.patches[0].after, 'unknown edit')), /October update patch/);
  }
  const manifest = JSON.parse(read('scripts/public-manifest.json'));
  const prior = JSON.parse(restoreOctober('scripts/public-manifest.json', read('scripts/public-manifest.json')));
  assert.deepEqual(manifest.pages, prior.pages);
  assert.deepEqual(manifest.assets.filter(f => !prior.assets.includes(f)).sort(),
    [...photoExports.flatMap(p => p.files.map(f => f.file)), ...Object.values(eventArtwork.assets).map(a => a.file), 'assets/js/october-hours.js', 'assets/css/october-update.css'].sort());
  for (const photo of photoExports) for (const file of photo.files) {
    assert.ok(manifest.assets.includes(file.file));
    assert.equal(hash(readFileSync(resolve(root,file.file))), file.sha256);
    assert.ok(file.bytes < 650000);
  }
});

test('home hero, menus, QR and Woodlands/Moreno Valley photography retain their exact preceding bytes', () => {
  const home = read('index.html'), prior = restoreOctober('index.html',home);
  const hero = html => html.match(/<section class="[^\"]*home-hero-cinema[\s\S]*?<\/section>/)?.[0];
  assert.ok(hero(home)); assert.equal(hero(home), hero(prior));
  const protectedFiles = JSON.parse(read('scripts/central-seo-source-patches.json')).protected;
  for (const [file, expected] of Object.entries(protectedFiles).filter(([f]) => /\/menu\/|\/menus\/|\.pdf$|_redirects|images\/branch-review\/the-woodlands|future-crowd/.test(f))) {
    assert.equal(hash(readFileSync(resolve(root,file))), expected, file);
  }
  const context = { window: {} }; vm.runInNewContext(read('assets/js/public-data.js'),context);
  assert.deepEqual(Array.from(context.window.SY_DATA.branches.slice(-2), b => b.id), ['san-diego','moreno-valley']);
  assert.equal(context.window.SY_DATA.branches.find(b => b.id === 'san-diego').status,'coming-soon');
});

test('new hours take effect on October 29 in each branch time zone, preserving Guadalajara and all closes', () => {
  const before = project('2026-10-29T04:59:59Z').files;
  const central = project('2026-10-29T05:00:00Z').files;
  const mountain = project('2026-10-29T06:00:00Z').files;
  for (const id of Object.keys(octoberHours.zones)) for (const [file, lang] of [[id+'.html','es'],['en/'+id+'/index.html','en']]) {
    assert.match(before.get(file), /data-october-hours-notice/);
    const html = mountain.get(file);
    assert.doesNotMatch(html, /data-october-hours-notice/);
    assert.ok(html.includes(octoberHours.html(lang,octoberHours.zones[id])));
    const restaurant = schemas(html).find(n => n['@type'] === 'Restaurant');
    assert.deepEqual(restaurant.openingHoursSpecification,plain(octoberHours.specification()));
    assert.deepEqual(JSON.parse(mountain.get('discovery.json')).locations.find(b => b.id === id).openingHoursSpecification,restaurant.openingHoursSpecification);
  }
  assert.doesNotMatch(central.get('houston.html'),/data-october-hours-notice/);
  assert.match(central.get('el-paso.html'),/data-october-hours-notice/);
  assert.deepEqual(schemas(before.get('guadalajara.html')).find(n=>n['@type']==='Restaurant').openingHoursSpecification,
    schemas(mountain.get('guadalajara.html')).find(n=>n['@type']==='Restaurant').openingHoursSpecification);
  assert.deepEqual(plain(octoberHours.periods.map(p => [p.opens || '00:00',p.closes || '00:00'])),[['00:00','00:00'],['16:00','00:00'],['16:00','02:00'],['11:00','02:00']]);
  assert.equal(project('2026-10-29T04:00:00Z').metadata.nextTransitionAt,'2026-10-29T05:00:00.000Z');
});

test('October 26 correction retires Pinta/Happy Hour and mismatched artwork, retaining independent bookings and GDL contest', () => {
  const files = project('2026-10-26T18:00:00Z').files;
  for (const id of Object.keys(octoberHours.zones)) for (const file of [id+'.html','en/'+id+'/index.html']) {
    const html = files.get(file);
    assert.ok(html.includes('data-october-approval='));
    assert.doesNotMatch(html,/Pinta y Canta|Thursday Happy Hour|hu-ladies-|hu-dontcry-|ep-brunch-|tw-happy-/);
    assert.match(html,/Concurso de canto|Singing contest/);
    assert.match(html,/Don’t Cry/); assert.match(html,/Recovery Brunch \+ NFL/);
    assert.match(html,/4–8 PM/); assert.match(html,/11 AM/);
    assert.match(html,new RegExp('datetime="'+approval.catrinas[id]+'"'));
    assert.match(html,/USD \$1,000|US\$1,000/);
    assert.match(html,/href="https:\/\/www.opentable.com\//);
  }
  assert.match(files.get('houston.html'),/houston-jorge-mariana-20261113/);
  assert.match(files.get('the-woodlands.html'),/the-woodlands-jets-cars-20261114/);
  assert.match(files.get('guadalajara.html'),/miércoles/);
});

test('Catrinas and Halloween expire on the next local midnight including the November DST weekend', () => {
  assert.match(project('2026-10-31T04:59:59Z').files.get('houston.html'),/data-record="houston-catrinas-october-update"/);
  assert.doesNotMatch(project('2026-10-31T05:00:00Z').files.get('houston.html'),/data-record="houston-catrinas-october-update"/);
  assert.match(project('2026-10-31T05:00:00Z').files.get('el-paso.html'),/data-record="el-paso-catrinas-october-update"/);
  assert.doesNotMatch(project('2026-11-01T06:00:00Z').files.get('el-paso.html'),/data-record="el-paso-halloween-october-update"/);
  assert.match(project('2026-11-02T05:59:59Z').files.get('san-antonio.html'),/data-record="san-antonio-catrinas-october-update"/);
  assert.doesNotMatch(project('2026-11-02T06:00:00Z').files.get('san-antonio.html'),/data-record="san-antonio-catrinas-october-update"/);
});

test('photo adoption is repeatable, page-specific and coherent with social sharing images', () => {
  for (const id of ['san-antonio','houston','el-paso']) for (const file of [id+'.html','en/'+id+'/index.html']) {
    const html = read(file);
    assert.equal(applyOctoberSiteHtml(file,html),html,file);
    assert.match(html,/images\/approved-20261026\//);
    if (id === 'el-paso') assert.doesNotMatch(html,/Coming Soon|images\/branch-review\/el-paso-hero/);
  }
  assert.match(read('houston.html'),/Te llevamos la experiencia Sin Yolanda hasta tu lugar/);
  assert.match(renderShell(read('index.html'),new Date('2026-10-26T18:00:00Z')),/Te llevamos la experiencia Sin Yolanda hasta tu lugar/);
});
