import test from 'node:test';
import assert from 'node:assert/strict';
import {GBP_HOURS_BRANCHES, compareGbpHours, normalizeGbpRegularHours, normalizeGbpSpecialHours, normalizeSchemaRegularHours} from '../scripts/site-quality/gbp-hours.mjs';

const now = '2026-11-19T20:00:00Z';
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const clone = value => structuredClone(value);
const rawPeriod = (openDay, opens, closeDay, closes) => ({openDay, openTime: opens, closeDay, closeTime: closes});
const schemaRegular = () => [
  {dayOfWeek: days.filter(day => day !== 'Wednesday'), opens: '00:00', closes: '00:00'},
  {dayOfWeek: 'Wednesday', opens: '16:00', closes: '02:00'},
];
function visibleRegular(zone) {
  return `<div class="ve-hours" data-hours-zone="${zone}"><h3>Hours</h3><dl>${days.map(day => `<div><dt>${day}</dt><dd>${day === 'Wednesday' ? '<time datetime="16:00">4 PM</time> to <time datetime="02:00">2 AM</time>' : 'Closed'}</dd></div>`).join('')}</dl></div>`;
}
function fixture() {
  const snapshot = {version: 1, observedAt: now, source: {method: 'locations.getGoogleUpdated'}, locations: []};
  const pages = new Map(), discovery = {locations: []};
  for (const branch of GBP_HOURS_BRANCHES) {
    snapshot.locations.push({branchId: branch.id, timeZone: branch.timeZone,
      regularHoursRaw: {periods: [rawPeriod('WEDNESDAY', {hours: 16}, 'THURSDAY', {hours: 2})]}, specialHoursRaw: {}});
    discovery.locations.push({id: branch.id, url: branch.url, openingHoursSpecification: schemaRegular()});
    for (const file of branch.pages) {
      const url = file.startsWith('en/') ? 'https://sin-yolanda.com/' + file.slice(0, -10) : branch.url;
      const restaurant = {'@type': 'Restaurant', '@id': branch.url + '#restaurant', url, openingHoursSpecification: schemaRegular()};
      pages.set(file, `<html><head><link href='${url}' rel='canonical'><script type='application/ld+json'>${JSON.stringify({'@graph': [restaurant]})}</script></head><body data-branch='${branch.id}'>${visibleRegular(branch.timeZone)}</body></html>`);
    }
  }
  return {snapshot, pages, discovery, now};
}
function editRestaurant(input, id, change) {
  for (const file of GBP_HOURS_BRANCHES.find(branch => branch.id === id).pages) input.pages.set(file, input.pages.get(file).replace(/(<script[^>]*>)([\s\S]*?)(<\/script>)/, (_, start, json, end) => {
    const data = JSON.parse(json); change(data['@graph'][0]); return start + JSON.stringify(data) + end;
  }));
}
function addSpecial(input, id, raw, schema, visible) {
  input.snapshot.locations.find(location => location.branchId === id).specialHoursRaw = {specialHourPeriods: raw};
  input.discovery.locations.find(location => location.id === id).specialOpeningHoursSpecification = schema;
  editRestaurant(input, id, restaurant => {restaurant.specialOpeningHoursSpecification = schema;});
  for (const file of GBP_HOURS_BRANCHES.find(branch => branch.id === id).pages) input.pages.set(file, input.pages.get(file).replace('</body>', visible + '</body>'));
}
const rawDate = (year, month, day) => ({year, month, day});

test('five anonymous operating branch fixtures compare all nine editions and discovery without input mutation', () => {
  const input = fixture(), before = JSON.stringify({...input, pages: [...input.pages]});
  const report = compareGbpHours(input);
  assert.equal(report.status, 'match'); assert.equal(report.ok, true); assert.equal(report.complete, true);
  assert.deepEqual(report.summary, {branches: 5, matchingBranches: 5, differences: 0, validationErrors: 0});
  assert.equal(JSON.stringify({...input, pages: [...input.pages]}), before);
  assert.equal(compareGbpHours({...input, pages: Object.fromEntries(input.pages), discovery: JSON.stringify(input.discovery)}).ok, true);
});

test('GBP zero-value clocks and 24:00 join midnight fragments, including Sunday to Monday', () => {
  assert.deepEqual(normalizeGbpRegularHours({periods: [rawPeriod('FRIDAY', {hours: 16}, 'FRIDAY', {hours: 24}), rawPeriod('SATURDAY', {}, 'SATURDAY', {hours: 2})]}), [
    {openDay: 'FRIDAY', openTime: '16:00', closeDay: 'SATURDAY', closeTime: '02:00', closeDayOffset: 1},
  ]);
  const sunday = normalizeGbpRegularHours({periods: [rawPeriod('SUNDAY', {hours: 22}, 'SUNDAY', {hours: 24}), rawPeriod('MONDAY', {}, 'MONDAY', {hours: 2})]});
  assert.deepEqual(sunday, [{openDay: 'SUNDAY', openTime: '22:00', closeDay: 'MONDAY', closeTime: '02:00', closeDayOffset: 1}]);
  assert.deepEqual(sunday, normalizeSchemaRegularHours([{dayOfWeek: 'https://schema.org/Sunday', opens: '22:00', closes: '02:00'}]));
  assert.deepEqual(normalizeGbpRegularHours({periods: [rawPeriod('THURSDAY', {hours: 16}, 'THURSDAY', {hours: 24})]}), normalizeSchemaRegularHours([{dayOfWeek: 'Thursday', opens: '16:00', closes: '00:00'}]));
});

test('regular periods reject overlap, duplicate weekdays, partial clocks and unknown empty hours', () => {
  assert.throws(() => normalizeGbpRegularHours({periods: []}), /unknown hours/);
  assert.throws(() => normalizeGbpRegularHours({periods: [rawPeriod('MONDAY', {hours: 16}, 'MONDAY', {hours: 16})]}), /positive duration/);
  assert.throws(() => normalizeGbpRegularHours({periods: [rawPeriod('MONDAY', {hours: 24, minutes: 1}, 'TUESDAY', {hours: 2})]}), /minute-precision/);
  assert.throws(() => normalizeGbpRegularHours({periods: [rawPeriod('MONDAY', {hours: 16}, 'TUESDAY', {hours: 2}), rawPeriod('TUESDAY', {}, 'TUESDAY', {hours: 3})]}), /overlap/);
  assert.throws(() => normalizeGbpRegularHours({periods: [rawPeriod('SUNDAY', {hours: 22}, 'MONDAY', {hours: 2}), rawPeriod('MONDAY', {hours: 1}, 'MONDAY', {hours: 3})]}), /overlap/);
  assert.throws(() => normalizeSchemaRegularHours([{dayOfWeek: 'Monday', opens: '00:00', closes: '00:00'}, {dayOfWeek: 'Monday', opens: '16:00', closes: '23:00'}]), /both closed and open/);
});

test('closed schema weekdays are distinct from 24-hour openings', () => {
  assert.deepEqual(normalizeSchemaRegularHours([{dayOfWeek: 'Monday', opens: '00:00', closes: '00:00'}]), []);
  assert.deepEqual(normalizeSchemaRegularHours([{dayOfWeek: 'Monday', opens: '00:00', closes: '24:00'}]), [{openDay: 'MONDAY', openTime: '00:00', closeDay: 'TUESDAY', closeTime: '00:00', closeDayOffset: 1}]);
});

test('differences identify the branch, edition and schema/visible/discovery surface', () => {
  const input = fixture();
  editRestaurant(input, 'houston', restaurant => {restaurant.openingHoursSpecification[1].closes = '00:00';});
  const en = 'en/houston/index.html';
  input.pages.set(en, input.pages.get(en).replace('datetime="02:00"', 'datetime="03:00"'));
  input.discovery.locations.find(location => location.id === 'el-paso').openingHoursSpecification[1].opens = '17:00';
  const report = compareGbpHours(input);
  assert.equal(report.status, 'different'); assert.equal(report.complete, true);
  const houston = report.branches.find(branch => branch.branchId === 'houston');
  assert.equal(houston.differences.filter(diff => diff.surface === 'schema').length, 2);
  assert.ok(houston.differences.some(diff => diff.surface === 'visible' && diff.file === en));
  assert.ok(report.branches.find(branch => branch.branchId === 'el-paso').differences.some(diff => diff.surface === 'discovery'));
  assert.equal(report.branches.find(branch => branch.branchId === 'san-ignacio').status, 'match');
});

test('an unspecified closing is reported without inventing a closing time', () => {
  const input = fixture();
  for (const file of GBP_HOURS_BRANCHES.find(branch => branch.id === 'houston').pages) input.pages.set(file, input.pages.get(file).replace('to <time datetime="02:00">2 AM</time>', 'to Closing'));
  editRestaurant(input, 'houston', restaurant => {restaurant.openingHoursSpecification.pop();});
  const report = compareGbpHours(input), differences = report.branches.find(branch => branch.branchId === 'houston').differences;
  assert.equal(report.status, 'different'); assert.equal(report.complete, true);
  assert.deepEqual(differences.find(diff => diff.kind === 'unspecified-closing').days, ['WEDNESDAY']);
  assert.ok(differences.some(diff => diff.surface === 'schema' && diff.actual.length === 0));
});

test('dated overnight and closed exceptions compare independently of recurring hours', () => {
  const input = fixture();
  addSpecial(input, 'san-ignacio', [
    {startDate: rawDate(2026, 11, 20), openTime: {hours: 19}, endDate: rawDate(2026, 11, 21), closeTime: {hours: 4}},
    {startDate: rawDate(2026, 12, 24), closed: true},
  ], [
    {validFrom: '2026-11-20', validThrough: '2026-11-20', dayOfWeek: 'Friday', opens: '19:00', closes: '04:00'},
    {validFrom: '2026-12-24', validThrough: '2026-12-24', opens: '00:00', closes: '00:00'},
  ], '<div data-gdl-special-hours-date="2026-11-20"><time datetime="2026-11-20">Friday</time><time datetime="2026-11-20T19:00:00-06:00">7 PM</time><time datetime="2026-11-21T04:00:00-06:00">4 AM</time></div><div data-gbp-special-hours-date="2026-12-24">Closed</div>');
  assert.equal(compareGbpHours(input).ok, true);
  delete input.discovery.locations.find(location => location.id === 'san-ignacio').specialOpeningHoursSpecification;
  const row = compareGbpHours(input).branches.find(branch => branch.branchId === 'san-ignacio');
  assert.deepEqual(row.differences.map(diff => [diff.kind, diff.surface]), [['special-hours', 'discovery']]);
  assert.equal(row.differences[0].expected[0].closeDate, '2026-11-21');
});

test('past source exceptions expire at the local close; stale visible exceptions are still flagged', () => {
  const input = fixture();
  input.snapshot.locations[0].specialHoursRaw = {specialHourPeriods: [{startDate: rawDate(2026, 11, 20), openTime: {hours: 19}, endDate: rawDate(2026, 11, 21), closeTime: {hours: 4}}]};
  input.snapshot.observedAt = '2026-11-21T09:59:59Z';
  assert.equal(compareGbpHours({...input, now: '2026-11-21T09:59:59Z'}).status, 'different');
  assert.equal(compareGbpHours({...input, now: '2026-11-21T10:00:00Z'}).status, 'match');
  input.pages.set('guadalajara.html', input.pages.get('guadalajara.html').replace('</body>', '<div data-special-hours-date="2026-11-18">Closed</div></body>'));
  assert.ok(compareGbpHours({...input, now: '2026-11-21T10:00:00Z'}).branches[0].differences.some(diff => diff.surface === 'visible' && diff.kind === 'special-hours'));
});

test('a closed local date lasts 25 hours across the Central DST fall-back', () => {
  const input = fixture(); input.snapshot.observedAt = '2026-11-02T05:59:59Z';
  input.snapshot.locations.find(location => location.branchId === 'houston').specialHoursRaw = {specialHourPeriods: [{startDate: rawDate(2026, 11, 1), closed: true}]};
  assert.equal(compareGbpHours({...input, now: '2026-11-02T05:59:59Z'}).status, 'different');
  assert.equal(compareGbpHours({...input, now: '2026-11-02T06:00:00Z'}).status, 'match');
});

test('special source data rejects impossible dates, missing next date, overlap and partial times', () => {
  assert.throws(() => normalizeGbpSpecialHours({specialHourPeriods: null}), /must be an array/);
  assert.throws(() => normalizeGbpSpecialHours({specialHourPeriods: [{startDate: rawDate(2026, 2, 30), closed: true}]}), /real YYYY/);
  assert.throws(() => normalizeGbpSpecialHours({specialHourPeriods: [{startDate: rawDate(2026, 11, 20), openTime: {hours: 19}, closeTime: {hours: 4}}]}), /explicit next closing date/);
  assert.throws(() => normalizeGbpSpecialHours({specialHourPeriods: [{startDate: rawDate(2026, 11, 20), openTime: {hours: 19}}]}), /object/);
  assert.throws(() => normalizeGbpSpecialHours({specialHourPeriods: [{startDate: rawDate(2026, 11, 20), closed: true}, {startDate: rawDate(2026, 11, 20), closed: true}]}), /repeated/);
  assert.deepEqual(normalizeGbpSpecialHours({specialHourPeriods: [{startDate: rawDate(2026, 11, 20), closed: true, endDate: 'ignored', openTime: 'ignored'}]}), [{date: '2026-11-20', closed: true}]);
});

test('source provenance, freshness, complete identities and configured zones are required', () => {
  for (const change of [
    input => {input.snapshot.source.method = 'locations.get';},
    input => {input.snapshot.observedAt = '2026-11-16T19:59:59Z';},
    input => {input.snapshot.observedAt = '2026-11-19T20:05:01Z';},
    input => {input.snapshot.locations.pop();},
    input => {input.snapshot.locations.push(clone(input.snapshot.locations[0]));},
    input => {input.snapshot.locations[0].branchId = 'maricarmen';},
    input => {input.snapshot.locations[0].branchId = 'ciudad-juarez';},
    input => {input.discovery.locations.push({id: 'san-diego'});},
    input => {input.snapshot.locations[0].timeZone = 'America/Chicago';},
  ]) {
    const input = fixture(); change(input); const report = compareGbpHours(input);
    assert.equal(report.status, 'invalid'); assert.equal(report.ok, false); assert.equal(report.complete, false); assert.ok(report.errors.length);
  }
});

test('a missing snapshot returns a complete error contract instead of a match or exception', () => {
  const report = compareGbpHours();
  assert.equal(report.status, 'invalid');
  assert.equal(report.summary.validationErrors, 1);
  assert.equal(report.summary.differences, 0);
  assert.deepEqual(report.branches, []);
});

test('missing or cross-branch page/schema identities and incomplete display cannot pass as matches', () => {
  for (const change of [
    input => {input.pages.delete('en/houston/index.html');},
    input => {input.pages.set('houston.html', input.pages.get('houston.html').replace('data-branch=\'houston\'', 'data-branch=\'el-paso\''));},
    input => {editRestaurant(input, 'houston', restaurant => {restaurant['@id'] = 'https://sin-yolanda.com/el-paso#restaurant';});},
    input => {input.pages.set('houston.html', input.pages.get('houston.html').replace('data-hours-zone="America/Chicago"', 'data-hours-zone="UTC"'));},
    input => {input.pages.set('houston.html', input.pages.get('houston.html').replace('<div><dt>Tuesday</dt><dd>Closed</dd></div>', ''));},
    input => {input.snapshot.locations[0].regularHoursRaw = {};},
    input => {delete input.snapshot.locations[0].specialHoursRaw;},
  ]) {
    const input = fixture(); change(input); assert.equal(compareGbpHours(input).status, 'invalid');
  }
});
