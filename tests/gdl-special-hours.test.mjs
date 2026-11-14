import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {gdlSpecialHours, gdlSpecialHoursSpecification, gdlSpecialHoursClientScript, projectGdlSpecialHours} from '../scripts/editorial/gdl-special-hours.mjs';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';
import {gdlHoursSpecification} from '../scripts/gdl-operating-hours.mjs';
import {elementRange} from '../scripts/editorial/public-agenda.mjs';

const root = resolve(import.meta.dirname, '..'), commit = 'a'.repeat(40);
const read = file => readFileSync(resolve(root, file), 'utf8');
const input = () => new Map(['guadalajara.html', 'guadalajara/posadas/index.html', 'discovery.json', 'houston.html', 'san-antonio.html'].map(file => [file, read(file)]));
const schemas = html => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
const datesIn = html => [...html.matchAll(/data-gdl-special-hours-date="([^"]+)"/g)].map(match => match[1]);
const expected = [
  ['2026-11-15', '19:00', '04:00', '2026-11-16T10:00:00.000Z'],
  ['2026-11-16', '19:00', '04:00', '2026-11-17T10:00:00.000Z'],
  ['2026-11-20', '19:00', '04:00', '2026-11-21T10:00:00.000Z'],
  ['2026-12-24', '00:00', '00:00', '2026-12-25T06:00:00.000Z'],
  ['2026-12-25', '00:00', '00:00', '2026-12-26T06:00:00.000Z'],
  ['2027-01-01', '00:00', '00:00', '2027-01-02T06:00:00.000Z'],
];
const remainingDates = now => expected.filter(record => Date.parse(record[3]) > Date.parse(now)).map(record => record[0]);

test('the calendar matches all five Google special dates and the separately confirmed Sunday opening', () => {
  assert.equal(gdlSpecialHours.branchId, 'san-ignacio');
  assert.equal(gdlSpecialHours.timeZone, 'America/Mexico_City');
  assert.deepEqual(gdlSpecialHours.records.map(record => [record.date, record.opens, record.closes, record.expiresAt]), expected);
  for (const record of gdlSpecialHours.records) {
    const specification = gdlSpecialHoursSpecification(record);
    assert.equal(specification['@type'], 'OpeningHoursSpecification');
    assert.equal(specification.validFrom, record.date);
    assert.equal(specification.validThrough, record.date);
    assert.equal(specification.opens, record.opens);
    assert.equal(specification.closes, record.closes);
  }
  const {files, metadata} = projectGdlSpecialHours(root, input(), gdlSpecialHours.publishFrom);
  assert.deepEqual(metadata.visibleDates, expected.map(record => record[0]));
  for (const file of ['guadalajara.html', 'guadalajara/posadas/index.html']) {
    const html = files.get(file);
    assert.match(html, /Horarios especiales/);
    assert.match(html, />Horario habitual<\/h3>/);
    assert.deepEqual(datesIn(html), expected.map(record => record[0]));
    for (const day of ['2026-11-15T19:00:00-06:00', '2026-11-16T19:00:00-06:00', '2026-11-20T19:00:00-06:00']) assert.ok(html.includes(day));
    for (const nextDay of ['2026-11-16T04:00:00-06:00', '2026-11-17T04:00:00-06:00', '2026-11-21T04:00:00-06:00']) assert.ok(html.includes(nextDay));
  }
});

test('each overnight opening and each full closed day retires only at its own local boundary', () => {
  const beforeStart = new Date(Date.parse(gdlSpecialHours.publishFrom) - 1).toISOString();
  const before = projectGdlSpecialHours(root, input(), beforeStart);
  assert.equal(before.metadata.active, false);
  assert.equal(before.metadata.nextTransitionAt, gdlSpecialHours.publishFrom);
  assert.deepEqual(before.files, input());
  for (const [, , , expiry] of expected) for (const offset of [-1, 0]) {
    const now = new Date(Date.parse(expiry) + offset).toISOString();
    const projected = projectGdlSpecialHours(root, input(), now);
    const dates = remainingDates(now);
    assert.deepEqual(projected.metadata.visibleDates, dates, now);
    assert.equal(projected.metadata.active, dates.length > 0, now);
    assert.equal(projected.metadata.nextTransitionAt, expected.find(record => Date.parse(record[3]) > Date.parse(now))?.[3] ?? null, now);
    assert.deepEqual(datesIn(projected.files.get('guadalajara.html')), dates, now);
    const discovery = JSON.parse(projected.files.get('discovery.json'));
    const location = discovery.locations.find(item => item.id === 'san-ignacio');
    assert.deepEqual((location.specialOpeningHoursSpecification ?? []).map(item => item.validFrom), dates, now);
  }
  for (const now of ['2026-12-24T06:00:00.000Z', '2026-12-25T05:59:59.999Z']) {
    assert.ok(projectGdlSpecialHours(root, input(), now).metadata.visibleDates.includes('2026-12-24'));
  }
  for (const now of ['2027-01-02T06:00:00.000Z', '2027-01-10T00:00:00.000Z']) {
    const ended = projectGdlSpecialHours(root, input(), now);
    assert.equal(ended.metadata.active, false);
    assert.deepEqual(ended.files, input());
  }
});

test('only Guadalajara receives dated exceptions while recurring hours, hero and other locations remain intact', () => {
  const before = input(), {files} = projectGdlSpecialHours(root, before, gdlSpecialHours.publishFrom);
  const restaurant = schemas(files.get('guadalajara.html')).find(item => item['@type'] === 'Restaurant');
  assert.deepEqual(restaurant.specialOpeningHoursSpecification, gdlSpecialHours.records.map(record => gdlSpecialHoursSpecification(record)));
  assert.deepEqual(restaurant.openingHoursSpecification, gdlHoursSpecification());
  assert.equal(elementRange(files.get('guadalajara.html'), 'section', 'san-ignacio').html, elementRange(before.get('guadalajara.html'), 'section', 'san-ignacio').html);
  for (const file of ['houston.html', 'san-antonio.html']) assert.equal(files.get(file), before.get(file));
  const discoveryBefore = JSON.parse(before.get('discovery.json')), discoveryAfter = JSON.parse(files.get('discovery.json'));
  for (const location of discoveryBefore.locations) {
    const current = discoveryAfter.locations.find(item => item.id === location.id);
    if (location.id !== 'san-ignacio') assert.deepEqual(current, location);
    else {
      assert.deepEqual(current.specialOpeningHoursSpecification, restaurant.specialOpeningHoursSpecification);
      delete current.specialOpeningHoursSpecification;
      assert.deepEqual(current, location);
    }
  }
  assert.deepEqual(discoveryAfter, discoveryBefore);
});

test('the shared scheduler keeps New Year closure after Posadas archives and finishes on January 2', () => {
  const before = projectPublicSite(root, {now: '2026-11-16T09:59:59.999Z', commit});
  const after = projectPublicSite(root, {now: '2026-11-16T10:00:00.000Z', commit});
  assert.notEqual(before.metadata.renderDigest, after.metadata.renderDigest);
  assert.deepEqual(after.specialHours.visibleDates, remainingDates('2026-11-16T10:00:00.000Z'));
  const newYear = projectPublicSite(root, {now: '2027-01-01T06:00:00.000Z', commit});
  assert.equal(newYear.specialHours.active, true);
  assert.deepEqual(datesIn(newYear.files.get('guadalajara.html')), ['2027-01-01']);
  assert.match(newYear.files.get('guadalajara/posadas/index.html'), /Esta temporada<br>ya terminó/);
  assert.doesNotMatch(newYear.files.get('guadalajara/posadas/index.html'), /data-gdl-special-hours/);
  assert.equal(newYear.specialHours.nextTransitionAt, '2027-01-02T06:00:00.000Z');
  const ended = projectPublicSite(root, {now: '2027-01-02T06:00:00.000Z', commit});
  assert.equal(ended.specialHours.active, false);
  assert.notEqual(newYear.metadata.renderDigest, ended.metadata.renderDigest);
  assert.doesNotMatch(ended.files.get('guadalajara.html'), /data-gdl-special-hours/);
  const discovery = JSON.parse(ended.files.get('discovery.json') ?? read('discovery.json'));
  const location = discovery.locations.find(item => item.id === 'san-ignacio');
  assert.equal(location.specialOpeningHoursSpecification, undefined);
  assert.deepEqual(location.openingHoursSpecification, gdlHoursSpecification());
});

test('an open or cached page retires rows individually and preserves unrelated schema until the final closure ends', () => {
  let now = Date.parse(expected[0][3]) - 1, callback, timerDelay, sectionRemoved = false;
  const events = {}, removed = [];
  const rows = gdlSpecialHours.records.map(record => ({
    dataset: {gdlSpecialHoursDate: record.date, expiresAt: record.expiresAt},
    gone: false,
    remove() {this.gone = true; removed.push(this.dataset.gdlSpecialHoursDate);},
    getAttribute(name) {return name === 'data-expires-at' ? this.dataset.expiresAt : name === 'data-gdl-special-hours-date' ? this.dataset.gdlSpecialHoursDate : null;},
  }));
  const liveRows = () => rows.filter(row => !row.gone);
  const section = {
    dataset: {},
    querySelectorAll: selector => selector.includes('data-gdl-special-hours-date') ? liveRows() : [],
    querySelector: selector => selector.includes('data-gdl-special-hours-date') ? liveRows()[0] ?? null : null,
    remove() {sectionRemoved = true;},
  };
  for (const row of rows) row.closest = () => section;
  const heading = {dataset: {gdlHoursOriginal: 'Horario'}, textContent: 'Horario habitual', removeAttribute() {}};
  const detailHeading = {dataset: {gdlHoursOriginal: ''}, gone: false, remove() {this.gone = true;}};
  const unrelated = {'@type': 'OpeningHoursSpecification', validFrom: '2026-12-31', validThrough: '2026-12-31', opens: '19:00', closes: '04:00'};
  const own = gdlSpecialHours.records.map(record => gdlSpecialHoursSpecification(record));
  const schema = {textContent: JSON.stringify({'@context': 'https://schema.org', '@graph': [
    {'@type': 'Restaurant', '@id': 'https://sin-yolanda.com/guadalajara#restaurant', openingHoursSpecification: gdlHoursSpecification(), specialOpeningHoursSpecification: [...own, unrelated]},
    {'@type': 'Restaurant', '@id': 'https://sin-yolanda.com/houston#restaurant', specialOpeningHoursSpecification: own},
  ]})};
  const select = selector => selector.includes('data-gdl-special-hours-date') ? liveRows()
    : selector === '[data-gdl-special-hours]' ? (sectionRemoved ? [] : [section])
    : selector === '[data-gdl-hours-heading]' ? [heading, detailHeading]
    : selector.includes('application/ld+json') ? [schema] : [];
  const doc = {hidden: false, querySelectorAll: select, querySelector: selector => select(selector)[0] ?? null, addEventListener: (name, action) => {events[name] = action;}};
  const win = {clearTimeout() {}, setTimeout: (action, delay) => {callback = action; timerDelay = delay;}, addEventListener: (name, action) => {events[name] = action;}};
  class Clock extends Date {static now() {return now;}}
  vm.runInNewContext(gdlSpecialHoursClientScript(), {document: doc, window: win, Date: Clock});
  assert.deepEqual(removed, []);
  assert.equal(timerDelay, 1);
  now += 1; callback();
  assert.deepEqual(removed, ['2026-11-15']);
  assert.equal(sectionRemoved, false);
  assert.equal(heading.textContent, 'Horario habitual');
  let graph = JSON.parse(schema.textContent)['@graph'];
  assert.deepEqual(graph[0].specialOpeningHoursSpecification, [...own.slice(1), unrelated]);
  assert.deepEqual(graph[1].specialOpeningHoursSpecification, own);
  now = Date.parse('2026-12-25T05:59:59.999Z'); callback();
  assert.ok(liveRows().some(row => row.dataset.gdlSpecialHoursDate === '2026-12-24'));
  now += 1; callback();
  assert.ok(!liveRows().some(row => row.dataset.gdlSpecialHoursDate === '2026-12-24'));
  assert.ok(liveRows().some(row => row.dataset.gdlSpecialHoursDate === '2026-12-25'));
  now = Date.parse('2027-01-02T06:00:00.000Z'); callback();
  assert.equal(sectionRemoved, true);
  assert.equal(heading.textContent, 'Horario');
  assert.equal(detailHeading.gone, true);
  graph = JSON.parse(schema.textContent)['@graph'];
  assert.deepEqual(graph[0].specialOpeningHoursSpecification, [unrelated]);
  assert.deepEqual(graph[0].openingHoursSpecification, gdlHoursSpecification());
  assert.deepEqual(graph[1].specialOpeningHoursSpecification, own);
  for (const event of ['pageshow', 'visibilitychange', 'focus']) assert.equal(typeof events[event], 'function');
});
