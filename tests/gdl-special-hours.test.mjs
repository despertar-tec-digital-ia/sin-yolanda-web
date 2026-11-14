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

test('the opening is one Sunday evening through Monday 04:00 in Guadalajara, with exact visibility boundaries', () => {
  assert.equal(gdlSpecialHours.timeZone, 'America/Mexico_City');
  assert.deepEqual(gdlSpecialHoursSpecification(), {
    '@type': 'OpeningHoursSpecification', validFrom: '2026-11-15', validThrough: '2026-11-15',
    dayOfWeek: 'https://schema.org/Sunday', opens: '19:00', closes: '04:00',
  });
  const before = projectGdlSpecialHours(root, input(), new Date(Date.parse(gdlSpecialHours.publishFrom) - 1).toISOString());
  assert.equal(before.metadata.active, false);
  assert.equal(before.metadata.nextTransitionAt, gdlSpecialHours.publishFrom);
  assert.deepEqual(before.files, input());
  for (const now of [gdlSpecialHours.publishFrom, '2026-11-16T09:59:59.999Z']) {
    const active = projectGdlSpecialHours(root, input(), now);
    assert.equal(active.metadata.active, true);
    assert.equal(active.metadata.nextTransitionAt, gdlSpecialHours.expiresAt);
    for (const file of ['guadalajara.html', 'guadalajara/posadas/index.html']) {
      assert.match(active.files.get(file), /Apertura especial · Domingo 15 de noviembre/);
      assert.match(active.files.get(file), />Horario habitual<\/h3>/);
      assert.match(active.files.get(file), /2026-11-15T19:00:00-06:00/);
      assert.match(active.files.get(file), /4:00 a\. m\. del lunes 16/);
      assert.doesNotMatch(active.files.get(file), /d[ií]a festivo/i);
    }
  }
  for (const now of [gdlSpecialHours.expiresAt, '2026-11-22T01:00:00Z']) {
    const ended = projectGdlSpecialHours(root, input(), now);
    assert.equal(ended.metadata.active, false);
    assert.equal(ended.metadata.nextTransitionAt, null);
    assert.deepEqual(ended.files, input());
  }
});

test('only Guadalajara receives the dated schema and notice; normal hours, hero and other locations stay unchanged', () => {
  const before = input(), {files} = projectGdlSpecialHours(root, before, gdlSpecialHours.publishFrom);
  const restaurant = schemas(files.get('guadalajara.html')).find(item => item['@type'] === 'Restaurant');
  assert.deepEqual(restaurant.specialOpeningHoursSpecification, [gdlSpecialHoursSpecification()]);
  assert.deepEqual(restaurant.openingHoursSpecification, gdlHoursSpecification());
  assert.equal(elementRange(files.get('guadalajara.html'), 'section', 'san-ignacio').html, elementRange(before.get('guadalajara.html'), 'section', 'san-ignacio').html);
  for (const file of ['houston.html', 'san-antonio.html']) assert.equal(files.get(file), before.get(file));
  const discoveryBefore = JSON.parse(before.get('discovery.json')), discoveryAfter = JSON.parse(files.get('discovery.json'));
  for (const location of discoveryBefore.locations) {
    const current = discoveryAfter.locations.find(item => item.id === location.id);
    if (location.id !== gdlSpecialHours.branchId) assert.deepEqual(current, location);
    else {
      assert.deepEqual(current.specialOpeningHoursSpecification, [gdlSpecialHoursSpecification()]);
      delete current.specialOpeningHoursSpecification;
      assert.deepEqual(current, location);
    }
  }
  assert.deepEqual(discoveryAfter, discoveryBefore);
});

test('the shared build and scheduler digest include the exception until its exact expiry', () => {
  const active = projectPublicSite(root, {now: '2026-11-16T09:59:59.999Z', commit});
  assert.equal(active.specialHours.active, true);
  assert.equal(active.metadata.nextTransitionAt, gdlSpecialHours.expiresAt);
  const ended = projectPublicSite(root, {now: gdlSpecialHours.expiresAt, commit});
  assert.equal(ended.specialHours.active, false);
  assert.notEqual(active.metadata.renderDigest, ended.metadata.renderDigest);
  assert.doesNotMatch(ended.files.get('guadalajara.html'), /data-gdl-special-hours/);
  assert.doesNotMatch(ended.files.get('guadalajara/posadas/index.html'), /data-gdl-special-hours/);
  const endedDiscovery = JSON.parse(ended.files.get('discovery.json') ?? read('discovery.json'));
  const endedLocation = endedDiscovery.locations.find(location => location.id === gdlSpecialHours.branchId);
  assert.equal(endedLocation.specialOpeningHoursSpecification, undefined);
  assert.deepEqual(endedLocation.openingHoursSpecification, gdlHoursSpecification());
});

test('an already-open or cached page removes the notice and only its dated schema at expiry', () => {
  let now = Date.parse(gdlSpecialHours.expiresAt) - 1;
  let callback, timerDelay;
  const removed = [], events = {};
  const notice = {remove: () => removed.push('notice')};
  const heading = {dataset: {gdlHoursOriginal: 'Horario'}, textContent: 'Horario habitual', removeAttribute() {}};
  const detailHeading = {dataset: {gdlHoursOriginal: ''}, remove: () => removed.push('detailHeading')};
  const other = {'@type': 'OpeningHoursSpecification', validFrom: '2026-12-25', validThrough: '2026-12-25', opens: '19:00', closes: '04:00'};
  const schema = {textContent: JSON.stringify({'@context': 'https://schema.org', '@graph': [
    {'@type': 'Restaurant', '@id': 'https://sin-yolanda.com/guadalajara#restaurant', openingHoursSpecification: gdlHoursSpecification(), specialOpeningHoursSpecification: [gdlSpecialHoursSpecification(), other]},
    {'@type': 'Restaurant', '@id': 'https://sin-yolanda.com/houston#restaurant', specialOpeningHoursSpecification: [gdlSpecialHoursSpecification()]},
  ]})};
  const doc = {
    hidden: false,
    querySelectorAll: selector => selector === '[data-gdl-special-hours]' ? [notice] : selector === '[data-gdl-hours-heading]' ? [heading, detailHeading] : [schema],
    addEventListener: (name, action) => {events[name] = action;},
  };
  const win = {clearTimeout() {}, setTimeout: (action, delay) => {callback = action; timerDelay = delay;}, addEventListener: (name, action) => {events[name] = action;}};
  class Clock extends Date {static now() {return now;}}
  vm.runInNewContext(gdlSpecialHoursClientScript(), {document: doc, window: win, Date: Clock});
  assert.deepEqual(removed, []);
  assert.equal(timerDelay, 1);
  now += 1;
  callback();
  assert.deepEqual(removed, ['notice', 'detailHeading']);
  assert.equal(heading.textContent, 'Horario');
  const graph = JSON.parse(schema.textContent)['@graph'];
  assert.deepEqual(graph[0].specialOpeningHoursSpecification, [other]);
  assert.deepEqual(graph[0].openingHoursSpecification, gdlHoursSpecification());
  assert.deepEqual(graph[1].specialOpeningHoursSpecification, [gdlSpecialHoursSpecification()]);
  assert.equal(typeof events.pageshow, 'function');
  assert.equal(typeof events.visibilitychange, 'function');
  assert.equal(typeof events.focus, 'function');
});
