import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {projectReviewedHours, reviewedHoursData, reviewedHoursAssets} from '../scripts/site-quality/reviewed-hours.mjs';
import {createGbpHoursModel, reviewedLocalInstant, REVIEWED_USA_BRANCHES} from '../assets/js/gbp-hours-model.js';
import {installReviewedHours} from '../assets/js/gbp-hours-client.js';
import {compareGbpHours, normalizeSchemaRegularHours} from '../scripts/site-quality/gbp-hours.mjs';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';
import {octoberHours} from '../scripts/editorial/october-2026-update.mjs';
import {elementRange} from '../scripts/editorial/public-agenda.mjs';
import {localInstant} from '../scripts/editorial/programming-clock.mjs';

const root = resolve(import.meta.dirname, '..'), now = '2026-11-20T01:00:00.000Z';
const read = file => readFileSync(resolve(root, file), 'utf8');
const manifest = JSON.parse(read('scripts/public-manifest.json'));
const schemas = html => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
const restaurant = html => schemas(html).find(node => node['@type'] === 'Restaurant');
const omitHours = node => Object.fromEntries(Object.entries(node).filter(([key]) => !['openingHoursSpecification', 'specialOpeningHoursSpecification'].includes(key)));
function base(at = now) {
  const projected = projectPublicSite(root, {now: at, commit: 'a'.repeat(40)}).files;
  return {pages: new Map(manifest.pages.map(file => [file, projected.get(file) ?? read(file)])), read: file => projected.get(file) ?? read(file), now: at};
}
function candidate(at = now) {
  const input = base(at), result = projectReviewedHours(input);
  return {...result, input, pages: new Map([...input.pages, ...[...result.files].filter(([file]) => file.endsWith('.html'))]), read: file => result.files.get(file) ?? input.read(file)};
}
function snapshot() {
  const period = (openDay, open, closeDay, close) => ({openDay, openTime: open ? {hours: open} : {}, closeDay, closeTime: close ? {hours: close} : {}});
  const common = [period('SUNDAY', 0, 'SUNDAY', 2), period('SUNDAY', 11, 'SUNDAY', 21), period('WEDNESDAY', 16, 'WEDNESDAY', 24), period('THURSDAY', 16, 'THURSDAY', 24), period('FRIDAY', 16, 'FRIDAY', 24), period('SATURDAY', 0, 'SATURDAY', 2), period('SATURDAY', 11, 'SATURDAY', 24)];
  const gdl = [period('SUNDAY', 0, 'SUNDAY', 4), period('WEDNESDAY', 19, 'WEDNESDAY', 24), period('THURSDAY', 0, 'THURSDAY', 3), period('THURSDAY', 19, 'THURSDAY', 24), period('FRIDAY', 0, 'FRIDAY', 4), period('FRIDAY', 19, 'FRIDAY', 24), period('SATURDAY', 0, 'SATURDAY', 4), period('SATURDAY', 19, 'SATURDAY', 24)];
  const ep = [period('SUNDAY', 0, 'SUNDAY', 2), period('SUNDAY', 10, 'SUNDAY', 23), period('WEDNESDAY', 16, 'WEDNESDAY', 23), period('THURSDAY', 16, 'THURSDAY', 24), period('FRIDAY', 0, 'FRIDAY', 2), period('FRIDAY', 16, 'FRIDAY', 24), period('SATURDAY', 0, 'SATURDAY', 2), period('SATURDAY', 10, 'SATURDAY', 24)];
  const rawDate = value => {const [year, month, day] = value.split('-').map(Number); return {year, month, day};};
  const rawClock = value => {const [hours, minutes] = value.split(':').map(Number); return {hours, minutes};};
  return {version: 1, observedAt: reviewedHoursData.observedAt, source: {method: 'locations.getGoogleUpdated'}, locations: reviewedHoursData.locations.map(location => ({branchId: location.branchId, timeZone: location.timeZone,
    regularHoursRaw: {periods: location.branchId === 'san-ignacio' ? gdl : location.branchId === 'el-paso' ? ep : common},
    specialHoursRaw: {specialHourPeriods: location.specialDates.map(record => record.closed ? {startDate: rawDate(record.date), closed: true} : {startDate: rawDate(record.date), openTime: rawClock(record.opens), endDate: rawDate(record.closeDate), closeTime: rawClock(record.closes)})}}))};
}

test('the candidate matches all five public GBP branches across HTML, schema and discovery', () => {
  const result = candidate(), report = compareGbpHours({snapshot: snapshot(), pages: result.pages, discovery: result.read('discovery.json'), now});
  assert.equal(report.status, 'match', JSON.stringify(report));
  assert.deepEqual(report.summary, {branches: 5, matchingBranches: 5, differences: 0, validationErrors: 0});
  assert.deepEqual(result.metadata.assets, reviewedHoursAssets);
  assert.equal(result.metadata.eventProgrammingChanged, false);
  assert.equal(result.metadata.eventEditorialExpiryReconciled, false);
});

test('USA regular data has all seven opening days and branch-specific Friday/weekend hours', () => {
  const model = createGbpHoursModel(reviewedHoursData);
  for (const id of REVIEWED_USA_BRANCHES) {
    const specs = model.specification(id), weekdays = specs.flatMap(period => period.dayOfWeek);
    assert.equal(weekdays.length, 7); assert.equal(new Set(weekdays).size, 7);
    const friday = model.hoursForDate(id, '2026-11-20');
    assert.deepEqual(friday.periods.map(period => [period.opens, period.closes, period.closeDate]), [['16:00', '02:00', '2026-11-21']]);
  }
  assert.match(model.summaryFor('houston'), /Mié–Jue 4 pm–12 am/);
  assert.match(model.summaryFor('san-antonio'), /Sáb 11 am–2 am/);
  assert.match(model.summaryFor('el-paso'), /Mié 4 pm–11 pm/);
  assert.match(model.summaryFor('el-paso'), /Dom 10 am–11 pm/);
});

test('special Wednesday closes on Thursday at 02:00, and Thursday closure overrides its recurring opening', () => {
  const model = createGbpHoursModel(reviewedHoursData);
  for (const id of REVIEWED_USA_BRANCHES) {
    const wednesday = model.hoursForDate(id, '2026-11-25'), thursday = model.hoursForDate(id, '2026-11-26');
    assert.equal(wednesday.source, 'special'); assert.equal(wednesday.periods[0].closeDate, '2026-11-26');
    assert.equal(wednesday.periods[0].closesAt, id === 'el-paso' ? '2026-11-26T09:00:00.000Z' : '2026-11-26T08:00:00.000Z');
    assert.equal(thursday.closed, true); assert.equal(thursday.source, 'special'); assert.deepEqual(thursday.periods, []);
    const friday = model.hoursForDate(id, '2026-11-27'); assert.equal(friday.source, 'regular'); assert.equal(friday.periods[0].closes, '02:00');
  }
});

test('special notices and schema retire at their own Central/Mountain boundaries without JavaScript', () => {
  for (const at of ['2026-11-26T07:59:59.999Z', '2026-11-26T08:00:00.000Z', '2026-11-26T09:00:00.000Z', '2026-11-27T06:00:00.000Z', '2026-11-27T07:00:00.000Z']) {
    const result = candidate(at), model = createGbpHoursModel(reviewedHoursData), discovery = JSON.parse(result.read('discovery.json'));
    for (const id of REVIEWED_USA_BRANCHES) for (const file of [id + '.html', 'en/' + id + '/index.html']) {
      const html = result.pages.get(file), expected = model.specialDates(id, at).map(record => record.date);
      assert.deepEqual([...html.matchAll(/data-gbp-special-hours-date="([^"]+)"/g)].map(match => match[1]), expected);
      assert.deepEqual((restaurant(html).specialOpeningHoursSpecification ?? []).map(record => record.validFrom), expected);
      assert.deepEqual((discovery.locations.find(location => location.id === id).specialOpeningHoursSpecification ?? []).map(record => record.validFrom), expected);
      assert.deepEqual(normalizeSchemaRegularHours(restaurant(html).openingHoursSpecification), normalizeSchemaRegularHours(model.specification(id)));
    }
  }
});

test('reviewed weekly data persists after the snapshot freshness window and after every exception', () => {
  const result = candidate('2027-01-05T20:00:00.000Z');
  assert.equal(result.metadata.regularHoursPersist, true); assert.equal(result.metadata.nextTransitionAt, null);
  assert.match(result.pages.get('houston.html'), /datetime="11:00"/);
  assert.doesNotMatch(result.pages.get('houston.html'), /data-gbp-special-hours-date=/);
  assert.deepEqual(restaurant(result.pages.get('el-paso.html')).openingHoursSpecification, createGbpHoursModel(reviewedHoursData).specification('el-paso'));
});

test('GDL, Posadas, non-Restaurant schema, contact/routing and all event programming stay intact', () => {
  const result = candidate();
  assert.equal(result.files.has('guadalajara.html'), false); assert.equal(result.files.has('guadalajara/posadas/index.html'), false);
  for (const file of ['guadalajara.html', 'guadalajara/posadas/index.html']) assert.equal(result.pages.get(file), result.input.pages.get(file));
  for (const id of REVIEWED_USA_BRANCHES) for (const file of [id + '.html', 'en/' + id + '/index.html']) {
    const before = result.input.pages.get(file), after = result.pages.get(file);
    assert.deepEqual(omitHours(restaurant(after)), omitHours(restaurant(before)));
    assert.deepEqual(schemas(after).filter(node => node['@type'] !== 'Restaurant'), schemas(before).filter(node => node['@type'] !== 'Restaurant'));
    assert.equal(elementRange(after, 'section', 'programacion-' + id)?.html, elementRange(before, 'section', 'programacion-' + id)?.html);
    assert.deepEqual([...after.matchAll(/href="(tel:[^"]+)"/g)].map(match => match[1]), [...before.matchAll(/href="(tel:[^"]+)"/g)].map(match => match[1]));
    assert.equal((after.match(/\bid="sy-reviewed-hours-data"/g) ?? []).length, 1);
    const ids = [...after.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]); assert.equal(new Set(ids).size, ids.length, file);
  }
});

test('public registry and translation consumers use reviewed summaries; future/retired/GDL facts are preserved', () => {
  const result = candidate(), context = {window: {}};
  vm.runInNewContext(result.read('assets/js/public-data.js'), context);
  const model = createGbpHoursModel(reviewedHoursData), data = context.window.SY_DATA;
  for (const id of REVIEWED_USA_BRANCHES) assert.equal(data.branches.find(branch => branch.id === id).hours, model.summaryFor(id));
  const beforeContext = {window: {}}; vm.runInNewContext(result.input.read('assets/js/public-data.js'), beforeContext);
  for (const branch of data.branches) {
    const before = beforeContext.window.SY_DATA.branches.find(value => value.id === branch.id);
    assert.equal(JSON.stringify({...branch, hours: before.hours}), JSON.stringify(before));
  }
  for (const id of REVIEWED_USA_BRANCHES) assert.ok(result.read('assets/js/i18n.js').includes(JSON.stringify(model.summaryFor(id, 'es')) + ': ' + JSON.stringify(model.summaryFor(id, 'en'))));
  const facts = {branches: ['ciudad-juarez', 'san-diego', 'moreno-valley', 'maricarmen', 'san-ignacio'].map(id => ({id, hours: 'unchanged'}))};
  model.applyToData(facts); assert.ok(facts.branches.every(branch => branch.hours === 'unchanged'));
});

test('candidate removes legacy controller references and does not mutate its imported model', () => {
  const before = JSON.stringify(octoberHours), oldHtml = octoberHours.html, input = base(), inputBefore = [...input.pages];
  const result = projectReviewedHours(input);
  assert.equal(JSON.stringify(octoberHours), before); assert.equal(octoberHours.html, oldHtml);
  assert.deepEqual([...input.pages], inputBefore);
  for (const [file, html] of result.files) if (file.endsWith('.html') && input.pages.get(file).includes('assets/js/october-hours.js')) {
    assert.doesNotMatch(html, /src=["']\/?assets\/js\/october-hours\.js/);
    assert.equal((html.match(/src="\/assets\/js\/gbp-hours-client\.js\?/g) ?? []).length, 1);
  }
  const repeated = projectReviewedHours({pages: new Map([...input.pages, ...[...result.files].filter(([file]) => file.endsWith('.html'))]), read: file => result.files.get(file) ?? input.read(file), now});
  assert.equal(repeated.files.size, 0, 'The overlay should be idempotent');
});

function fakeBrowser(id, instant) {
  const model = createGbpHoursModel(reviewedHoursData), events = {}, timers = new Map(); let sequence = 0, html = model.html(id, 'es', instant), replacements = 0;
  const makeHours = value => ({getAttribute: name => name === 'data-gbp-hours-key' ? value.match(/data-gbp-hours-key="([^"]+)"/)[1] : null, replaceWith(next) {hours = next; html = next.html; replacements++;}, html: value});
  let hours = makeHours(html);
  const other = {'@type': 'WebPage', '@id': 'preserved', name: 'Preserved document'};
  const entity = {'@type': 'Restaurant', '@id': 'https://sin-yolanda.com/' + id + '#restaurant', openingHoursSpecification: model.specification(id), specialOpeningHoursSpecification: model.specialSpecification(id, instant)};
  const schema = {textContent: JSON.stringify({'@graph': [entity, other]})};
  const doc = {body: {dataset: {branch: id}}, documentElement: {lang: 'es'}, addEventListener: (name, callback) => {events[name] = callback;}, removeEventListener() {},
    querySelector: selector => selector === '.ve-hours' ? hours : null,
    querySelectorAll: selector => selector === 'script[type="application/ld+json"]' ? [schema] : [],
    createElement: () => ({set innerHTML(value) {this.firstElementChild = makeHours(value);}})};
  const win = {addEventListener: (name, callback) => {events[name] = callback;}, removeEventListener() {}, setTimeout(callback, delay) {timers.set(++sequence, {callback, delay}); return sequence;}, clearTimeout(value) {timers.delete(value);}, SY_DATA: {branches: [{id, hours: 'old'}]},
    MutationObserver: class {constructor(callback) {this.callback = callback;} observe() {} disconnect() {}}};
  const clock = {instant};
  const client = installReviewedHours({window: win, document: doc, data: reviewedHoursData, now: () => clock.instant});
  return {doc, win, clock, client, events, timers, schema, other, get html() {return html;}, get replacements() {return replacements;}};
}

test('open pages, pageshow and language changes expire only special hours and preserve unrelated schema', () => {
  const browser = fakeBrowser('houston', '2026-11-26T07:59:59.999Z');
  assert.match(browser.html, /2026-11-25/); assert.equal(browser.replacements, 0);
  browser.clock.instant = '2026-11-26T08:00:00.000Z'; browser.events.pageshow();
  assert.doesNotMatch(browser.html, /data-gbp-special-hours-date="2026-11-25"/); assert.match(browser.html, /data-gbp-special-hours-date="2026-11-26"/);
  browser.doc.documentElement.lang = 'en'; browser.client.refresh(); assert.match(browser.html, /Special hours/); assert.match(browser.html, /Regular hours/);
  browser.clock.instant = '2026-11-27T06:00:00.000Z'; browser.events.visibilitychange();
  assert.doesNotMatch(browser.html, /data-gbp-special-hours/); assert.match(browser.html, /<h3>Hours<\/h3>/);
  const graph = JSON.parse(browser.schema.textContent)['@graph']; assert.equal(graph[0].specialOpeningHoursSpecification, undefined); assert.deepEqual(graph[1], browser.other);
  assert.match(browser.win.SY_DATA.branches[0].hours, /Mié–Jue 4 pm–12 am/);
  assert.equal(browser.win.SY_OCTOBER_HOURS.active('san-ignacio'), false); assert.equal(browser.win.SY_OCTOBER_HOURS.active('ciudad-juarez'), false);
  const count = browser.replacements; browser.client.refresh(); assert.equal(browser.replacements, count);
  browser.client.disconnect();
});

test('IANA expiry uses the existing clock contract, including DST ambiguity and a 25-hour closed date', () => {
  for (const [day, clock, zone] of [['2026-11-26', '02:00', 'America/Chicago'], ['2026-11-26', '02:00', 'America/Denver'], ['2026-07-01', '02:00', 'America/Chicago'], ['2026-11-02', '00:00', 'America/Chicago']]) assert.equal(reviewedLocalInstant(day, clock, zone), localInstant(day, clock, zone));
  assert.equal(Date.parse(reviewedLocalInstant('2026-11-02', '00:00', 'America/Chicago')) - Date.parse(reviewedLocalInstant('2026-11-01', '00:00', 'America/Chicago')), 25 * 3600000);
  assert.throws(() => reviewedLocalInstant('2026-11-01', '01:30', 'America/Chicago'), /Ambiguous/);
  assert.throws(() => reviewedLocalInstant('2026-03-08', '02:30', 'America/Chicago'), /nonexistent/);
});

test('reviewed data rejects missing identities, invented future branches, overlaps and inconsistent midnight', () => {
  for (const change of [data => data.locations.pop(), data => {data.locations[0].branchId = 'san-diego';}, data => {data.locations[1].regularPeriods.push({...data.locations[1].regularPeriods[0]});}, data => {data.locations[1].regularPeriods[0].closeDayOffset = 0;}, data => {data.locations[1].timeZone = 'UTC';}]) {
    const data = structuredClone(reviewedHoursData); change(data); assert.throws(() => createGbpHoursModel(data));
  }
});
