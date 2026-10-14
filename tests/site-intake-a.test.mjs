import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { schemas, restoreSeoBaseline } from '../scripts/seo.mjs';
import { restoreSiteIntake } from '../scripts/site-intake-a-contract.mjs';
import { hoursHtml } from '../scripts/usa-hours.mjs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const zones = { houston: 'America/Chicago', 'san-antonio': 'America/Chicago', 'the-woodlands': 'America/Chicago', 'el-paso': 'America/Denver' };
const weekly = [
  [['Monday', 'Tuesday'], '00:00', '00:00'], [['Wednesday'], '16:00', '23:00'],
  [['Thursday', 'Friday'], '16:00', '02:00'], [['Saturday'], '10:00', '02:00'], [['Sunday'], '10:00', '23:00'],
];
test('confirmed USA hours agree across visible ES/EN, JSON-LD, registry and discovery; overnight closing stays on its opening day', () => {
  const context = { window: {} }; vm.runInNewContext(read('assets/js/public-data.js'), context);
  const discovery = JSON.parse(read('discovery.json'));
  for (const [id, zone] of Object.entries(zones)) {
    for (const [file, language] of [[id + '.html', 'es'], ['en/' + id + '/index.html', 'en']]) {
      const html = read(file), restaurant = schemas(html).find(node => node['@type'] === 'Restaurant');
      assert.deepEqual(restaurant.openingHoursSpecification.map(period => [period.dayOfWeek.map(day => day.replace('https://schema.org/', '')), period.opens, period.closes]), weekly);
      assert.ok(html.includes(hoursHtml(language, zone)), file);
      assert.equal(html.split('class="ve-hours"').length - 1, 1);
    }
    const record = discovery.locations.find(record => record.id === id);
    assert.equal(record.timeZone, zone);
    assert.deepEqual(record.openingHoursSpecification, schemas(read(id + '.html'))[0].openingHoursSpecification);
    assert.equal(context.window.SY_DATA.branches.find(branch => branch.id === id).hoursTimezone, zone);
  }
  for (const id of ['san-diego', 'moreno-valley']) assert.equal(context.window.SY_DATA.branches.find(branch => branch.id === id).hoursTimezone, undefined);
});
test('El Paso removes the extra reservation section and retains its own native channels; every menu link announces a secure new tab', () => {
  for (const file of ['el-paso.html', 'en/el-paso/index.html']) {
    const html = read(file);
    assert.doesNotMatch(html, /ep-reservations|widget\/reservation\/loader|bl-table--no-photo/);
    assert.ok(html.includes('https://www.opentable.com/restaurant/profile/1559290'));
    assert.ok(html.includes('tel:+19153636330'));
    assert.match(html, /<section class="hh-table"[\s\S]*?<figure><img src="\/images\/intake-a\/el-paso-table-/);
    const links = html.match(/<a\b[^>]*href="\/el-paso\/menu\/"[^>]*>/g);
    assert.equal(links.length, 4);
    for (const link of links) {
      assert.match(link, /target="_blank"/); assert.match(link, /rel="noopener noreferrer"/);
      assert.match(link, /aria-label="[^"]*(?:otra pestaña|new tab)/);
    }
  }
});
test('the provisional menu retains exact original artwork/PDF, branch navigation and an accessible failure escape without an introduction', () => {
  const html = read('el-paso/menu/index.html');
  assert.doesNotMatch(html, /ep-menu-intro|English menu · Prices|Download menu|Open full-size/);
  assert.match(html, /data-menu-viewport[^>]*tabindex="0"/);
  assert.match(html, /data-menu-fallback hidden/);
  assert.equal(html.match(/<header[\s\S]*?<\/header>/)[0], read('en/el-paso/index.html').match(/<header[\s\S]*?<\/header>/)[0]);
  assert.match(html, /<base href="\/en\/el-paso\/">/);
  assert.match(html, /src="\/_astro\/houston-scroll-header\.DrYaFs3s\.js"/);
  assert.match(html, /data-branch-footer="el-paso"/);
  assert.match(html, /href="\/en\/el-paso\/"/);
  assert.match(html, /href="\/el-paso\/?"/);
  const pdf = readFileSync(new URL('../menus/el-paso-menu-en-v6.pdf', import.meta.url));
  assert.equal(createHash('sha256').update(pdf).digest('hex'), 'a63cc8d8b31743d377de6e4bb9fa1dc9c19203fcf4d9c5439c085ac96854aa29');
});
test('historical full hashes remain enforced outside the exact reviewed intake chunks', () => {
  const file = 'el-paso.html', baseline = restoreSeoBaseline(file, read(file));
  assert.match(restoreSiteIntake(file, baseline), /class="ep-reservations"/);
  const contract = JSON.parse(read('scripts/site-intake-a-patches.json'));
  const changed = restoreSiteIntake(file, baseline.replace('340 Vin Rambla Dr', 'unapproved address'));
  assert.notEqual(createHash('sha256').update(changed).digest('hex'), contract.files[file].baselineSha256);
  assert.throws(() => restoreSiteIntake(file, baseline.replace('class="ve-hours"', 'class="unapproved-hours"')), /Intake patch/);
});
