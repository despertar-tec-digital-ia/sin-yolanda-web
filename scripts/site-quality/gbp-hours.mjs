// Compare an already captured public GBP snapshot with the existing site projection.
// Pure data/HTML inspection: no network, credentials, filesystem writes or publication.
import {localInstant, nextLocalDay} from '../editorial/programming-clock.mjs';

export const GBP_HOURS_MAX_AGE_HOURS = 48;
export const GBP_HOURS_BRANCHES = Object.freeze([
  ['san-ignacio', 'America/Mexico_City', 'guadalajara'],
  ['houston', 'America/Chicago', 'houston'],
  ['the-woodlands', 'America/Chicago', 'the-woodlands'],
  ['san-antonio', 'America/Chicago', 'san-antonio'],
  ['el-paso', 'America/Denver', 'el-paso'],
].map(([id, timeZone, route]) => Object.freeze({id, timeZone,
  url: 'https://sin-yolanda.com/' + route,
  pages: Object.freeze(id === 'san-ignacio' ? [route + '.html'] : [route + '.html', 'en/' + route + '/index.html']),
})));

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY = 1440, WEEK = DAY * 7;
const own = (value, key) => Object.hasOwn(value, key);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function requireValue(condition, code, message) {
  if (!condition) throw Object.assign(new Error(message), {code});
}
function object(value, label) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'invalid-object', label + ' must be an object');
  return value;
}
function clock(value, raw = false) {
  if (raw) {
    object(value, 'GBP time');
    for (const key of ['hours', 'minutes', 'seconds', 'nanos']) requireValue(!own(value, key) || Number.isInteger(value[key]), 'invalid-clock', 'GBP clock components must be integers');
    const {hours = 0, minutes = 0, seconds = 0, nanos = 0} = value;
    requireValue(hours >= 0 && hours <= 24 && minutes >= 0 && minutes < 60 && seconds === 0 && nanos === 0 && (hours < 24 || minutes === 0), 'invalid-clock', 'A minute-precision clock in 00:00–24:00 is required');
    return hours * 60 + minutes;
  }
  requireValue(typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(value), 'invalid-clock', 'Expected HH:mm, allowing only 24:00 at the day boundary');
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}
const formatClock = value => `${String(Math.floor(value % DAY / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
function day(value) {
  const normalized = typeof value === 'string' ? value.replace(/^https?:\/\/schema\.org\//, '').toUpperCase() : '';
  requireValue(DAYS.includes(normalized), 'invalid-weekday', 'Unknown weekday');
  return DAYS.indexOf(normalized);
}

// Work in one cyclic week, detecting overlaps before joining adjacent midnight fragments.
function normalizeIntervals(spans) {
  const pieces = [];
  for (let [start, end] of spans) {
    requireValue(Number.isInteger(start) && Number.isInteger(end) && end > start && end - start <= WEEK, 'invalid-period', 'A regular period must have a positive duration of at most one week');
    while (start >= WEEK) {start -= WEEK; end -= WEEK;}
    if (end > WEEK) pieces.push([start, WEEK], [0, end - WEEK]);
    else pieces.push([start, end]);
  }
  const merged = [];
  for (const [start, end] of pieces.sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
    const previous = merged.at(-1);
    requireValue(!previous || start >= previous[1], 'overlapping-periods', 'Regular hours overlap or repeat');
    if (previous && start === previous[1]) previous[1] = end;
    else merged.push([start, end]);
  }
  if (merged.length > 1 && merged[0][0] === 0 && merged.at(-1)[1] === WEEK) {
    const first = merged.shift();
    merged.at(-1)[1] = WEEK + first[1];
  }
  return merged.map(([start, end]) => ({openDay: DAYS[Math.floor(start / DAY) % 7], openTime: formatClock(start),
    closeDay: DAYS[Math.floor(end / DAY) % 7], closeTime: formatClock(end), closeDayOffset: Math.floor(end / DAY) - Math.floor(start / DAY)}));
}

export function normalizeGbpRegularHours(raw) {
  object(raw, 'regularHoursRaw');
  requireValue(Array.isArray(raw.periods) && raw.periods.length > 0, 'missing-regular-hours', 'Missing regular periods are unknown hours, not proof of closure');
  return normalizeIntervals(raw.periods.map(period => {
    object(period, 'GBP period');
    const start = day(period.openDay) * DAY + clock(period.openTime, true);
    let end = day(period.closeDay) * DAY + clock(period.closeTime, true);
    if (end < start) end += WEEK;
    return [start, end];
  }));
}

export function normalizeSchemaRegularHours(specifications) {
  requireValue(Array.isArray(specifications) && specifications.length > 0, 'missing-regular-hours', 'Missing openingHoursSpecification');
  const spans = [], closedDays = new Set(), openDays = new Set();
  for (const period of specifications) {
    object(period, 'OpeningHoursSpecification');
    const names = [].concat(period.dayOfWeek ?? []);
    requireValue(names.length > 0, 'invalid-weekday', 'A schema period needs weekdays');
    const opens = clock(period.opens), closes = clock(period.closes);
    for (const name of names) {
      const index = day(name);
      if (opens === 0 && closes === 0) {
        requireValue(!closedDays.has(index) && !openDays.has(index), 'overlapping-periods', 'Duplicate or contradictory closed weekday');
        closedDays.add(index);
      } else {
        requireValue(!closedDays.has(index), 'overlapping-periods', 'A weekday cannot be both closed and open');
        openDays.add(index);
        requireValue(opens !== closes, 'invalid-period', 'Equal non-midnight times do not describe an opening');
        spans.push([index * DAY + opens, index * DAY + closes + (closes < opens ? DAY : 0)]);
      }
    }
  }
  return normalizeIntervals(spans);
}

function calendarDate(value) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value, 'invalid-date', 'Expected a real YYYY-MM-DD calendar date');
  return value;
}
function rawDate(value) {
  object(value, 'GBP date');
  requireValue(['year', 'month', 'day'].every(key => Number.isInteger(value[key])), 'invalid-date', 'GBP dates require integer year, month and day');
  return calendarDate(`${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`);
}
function specialRecord(date, closed, opens, closeDate, closes) {
  date = calendarDate(date);
  if (closed) return {date, closed: true};
  let opening = clock(opens), closing = clock(closes);
  if (opening === DAY) {date = nextLocalDay(date); opening = 0;}
  closeDate = calendarDate(closeDate);
  if (closing === DAY) {closeDate = nextLocalDay(closeDate); closing = 0;}
  const duration = (Date.parse(closeDate) - Date.parse(date)) / 60000 + closing - opening;
  requireValue(duration > 0 && duration < DAY, 'invalid-special-period', 'A special opening must be positive and shorter than 24 hours, with an explicit next closing date');
  return {date, closed: false, opens: formatClock(opening), closeDate, closes: formatClock(closing)};
}
function validateSpecialRecords(records) {
  const sorted = records.sort((a, b) => a.date.localeCompare(b.date) || (a.opens ?? '').localeCompare(b.opens ?? ''));
  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1], current = sorted[index];
    if (previous.date !== current.date) continue;
    requireValue(!previous.closed && !current.closed, 'overlapping-special-hours', 'A special date cannot be both closed and open or repeated');
    requireValue(Date.parse(previous.closeDate + 'T' + previous.closes + 'Z') <= Date.parse(current.date + 'T' + current.opens + 'Z'), 'overlapping-special-hours', 'Special openings on the same date overlap');
  }
  return sorted;
}
export function normalizeGbpSpecialHours(raw) {
  object(raw, 'specialHoursRaw');
  const periods = own(raw, 'specialHourPeriods') ? raw.specialHourPeriods : [];
  requireValue(Array.isArray(periods), 'invalid-special-hours', 'specialHourPeriods must be an array');
  return validateSpecialRecords(periods.map(period => {
    object(period, 'GBP special period');
    requireValue(!own(period, 'closed') || typeof period.closed === 'boolean', 'invalid-special-hours', 'closed must be boolean');
    const date = rawDate(period.startDate);
    if (period.closed) return specialRecord(date, true);
    return specialRecord(date, false, formatRawClock(period.openTime), rawDate(period.endDate ?? period.startDate), formatRawClock(period.closeTime));
  }));
}
const formatRawClock = value => {const minutes = clock(value, true); return minutes === DAY ? '24:00' : formatClock(minutes);};
function normalizeSchemaSpecialHours(specifications = []) {
  requireValue(Array.isArray(specifications), 'invalid-special-hours', 'specialOpeningHoursSpecification must be an array');
  return validateSpecialRecords(specifications.map(period => {
    object(period, 'Special OpeningHoursSpecification');
    const date = calendarDate(period.validFrom);
    requireValue(period.validThrough === date, 'invalid-special-hours', 'Special schema must identify one dated exception, not an inferred date range');
    if (period.dayOfWeek) requireValue([].concat(period.dayOfWeek).every(value => day(value) === (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7), 'invalid-weekday', 'Special schema weekday does not match its date');
    const opening = clock(period.opens), closing = clock(period.closes);
    return specialRecord(date, opening === 0 && closing === 0, period.opens, closing < opening ? nextLocalDay(date) : date, period.closes);
  }));
}
function activeSpecialHours(records, zone, instant) {
  return records.filter(record => instant < Date.parse(record.closed ? localInstant(nextLocalDay(record.date), '00:00', zone) : localInstant(record.closeDate, record.closes, zone)));
}

function attributes(source) {
  const result = {};
  for (const match of source.matchAll(/([^\s=<>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  return result;
}
const plainText = value => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();
function elements(html, predicate) {
  const found = [];
  for (const opening of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
    const attrs = attributes(opening[2]);
    if (!predicate(attrs, opening[1].toLowerCase())) continue;
    const tags = new RegExp('<(\\/?)' + opening[1] + '\\b[^>]*>', 'gi');
    tags.lastIndex = opening.index + opening[0].length;
    let depth = 1, closing;
    while ((closing = tags.exec(html)) && (depth += closing[1] ? -1 : 1)) {}
    requireValue(depth === 0 && closing, 'invalid-html', 'Unclosed hours element');
    found.push({attrs, start: opening.index, end: tags.lastIndex, html: html.slice(opening.index, tags.lastIndex)});
  }
  return found;
}
const SPECIAL_ATTRIBUTES = ['data-gdl-special-hours-date', 'data-gbp-special-hours-date', 'data-special-hours-date'];
function visibleSpecialHours(html, zone) {
  return validateSpecialRecords(elements(html, attrs => SPECIAL_ATTRIBUTES.some(key => own(attrs, key))).map(element => {
    const date = SPECIAL_ATTRIBUTES.map(key => element.attrs[key]).find(Boolean);
    if (/\b(?:Cerrado|Closed)\b/i.test(plainText(element.html))) return specialRecord(date, true);
    const values = [...element.html.matchAll(/<time\b([^>]*)>/gi)].map(match => attributes(match[1]).datetime).filter(value => value?.includes('T'));
    requireValue(values.length === 2, 'partial-visible-hours', 'A special opening needs dated opening and closing times');
    const walls = values.map(value => {
      requireValue(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:Z|[+-]\d{2}:\d{2})$/.test(value), 'invalid-clock', 'Visible dated times need explicit offsets and minute precision');
      requireValue(Date.parse(localInstant(value.slice(0, 10), value.slice(11, 16), zone)) === Date.parse(value), 'invalid-time-zone', 'Visible special time offset differs from the configured branch zone');
      return {date: value.slice(0, 10), time: value.slice(11, 16)};
    });
    requireValue(walls[0].date === date, 'invalid-special-hours', 'Visible special date does not match its opening');
    return specialRecord(date, false, walls[0].time, walls[1].date, walls[1].time);
  }));
}
function visibleRegularHours(html, zone) {
  const blocks = elements(html, attrs => (attrs.class ?? '').split(/\s+/).includes('ve-hours'));
  requireValue(blocks.length === 1, 'partial-visible-hours', 'Expected one existing ve-hours block');
  requireValue(blocks[0].attrs['data-hours-zone'] === zone, 'invalid-time-zone', 'Visible hours need the configured branch time zone');
  let block = blocks[0].html;
  for (const item of elements(block, attrs => SPECIAL_ATTRIBUTES.some(key => own(attrs, key))).reverse()) block = block.slice(0, item.start) + block.slice(item.end);
  const words = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const periods = [], unknownClosingDays = [], seen = new Set();
  for (const match of block.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)) {
    const label = plainText(match[1]).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    let names = [...label.matchAll(new RegExp('\\b(' + words.join('|') + ')\\b', 'g'))].map(value => DAYS[words.indexOf(value[1]) % 7]);
    requireValue(names.length > 0, 'partial-visible-hours', 'Unknown weekday label in visible hours');
    if (names.length === 2 && /\s(?:a|to|through)\s|[–—-]/.test(label)) {
      const first = day(names[0]), last = day(names[1]);
      names = Array.from({length: (last - first + 7) % 7 + 1}, (_, index) => DAYS[(first + index) % 7]);
    }
    for (const name of names) {requireValue(!seen.has(name), 'overlapping-periods', 'Visible weekday repeats'); seen.add(name);}
    const content = plainText(match[2]), times = [...match[2].matchAll(/<time\b([^>]*)>/gi)].map(value => attributes(value[1]).datetime);
    if (/^(?:Cerrado|Closed)$/i.test(content)) periods.push({dayOfWeek: names, opens: '00:00', closes: '00:00'});
    else if (times.length === 1 && /(?:hasta el cierre|al cierre|closing|close)/i.test(content)) {clock(times[0]); unknownClosingDays.push(...names);}
    else {requireValue(times.length === 2, 'partial-visible-hours', 'Visible opening needs both machine-readable times'); periods.push({dayOfWeek: names, opens: times[0], closes: times[1]});}
  }
  requireValue(seen.size === 7, 'partial-visible-hours', 'Visible hours must account for all seven opening days');
  return {periods: normalizeSchemaRegularHours(periods), unknownClosingDays};
}
function pageData(html, branch, file) {
  requireValue(typeof html === 'string' && html.trim(), 'missing-page', 'Missing projected page: ' + file);
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  const canonical = [...html.matchAll(/<link\b([^>]*)>/gi)].map(match => attributes(match[1])).filter(attrs => (attrs.rel ?? '').split(/\s+/).includes('canonical'));
  const expectedUrl = file.startsWith('en/') ? 'https://sin-yolanda.com/' + file.slice(0, -10) : branch.url;
  requireValue(canonical.length === 1 && canonical[0].href === expectedUrl, 'wrong-page-identity', 'Page canonical does not identify the expected branch edition');
  const nodes = [];
  function visit(value) {if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') {nodes.push(value); if (value['@graph']) visit(value['@graph']);}}
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) if (attributes(script[1]).type?.toLowerCase() === 'application/ld+json') {
    try {visit(JSON.parse(script[2]));} catch {requireValue(false, 'invalid-json-ld', 'Invalid JSON-LD in projected page');}
  }
  const restaurants = nodes.filter(node => [].concat(node['@type'] ?? []).includes('Restaurant'));
  requireValue(restaurants.length === 1, 'wrong-page-identity', 'Expected one Restaurant for this branch');
  const restaurant = restaurants[0];
  requireValue(restaurant.url === expectedUrl && restaurant['@id'] === branch.url + '#restaurant', 'wrong-page-identity', 'Restaurant identity differs from its branch');
  const body = html.match(/<body\b([^>]*)>/i);
  if (body && own(attributes(body[1]), 'data-branch')) requireValue(attributes(body[1])['data-branch'] === branch.id, 'wrong-page-identity', 'Body branch identity differs');
  return {regular: normalizeSchemaRegularHours(restaurant.openingHoursSpecification), special: normalizeSchemaSpecialHours(restaurant.specialOpeningHoursSpecification),
    visible: visibleRegularHours(html, branch.timeZone), visibleSpecial: visibleSpecialHours(html, branch.timeZone)};
}

function timestamp(value, label) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)), 'invalid-timestamp', label + ' requires a timestamp with an explicit offset');
  calendarDate(value.slice(0, 10));
  return Date.parse(value);
}

/** pages is a Map/object keyed by projected repository HTML paths; discovery is its projected JSON/object.
 *  Real snapshots stay outside Git. maxAgeHours is a freshness policy, not a scheduler.
 *  Validation failures return status=invalid; business differences return status=different.
 */
export function compareGbpHours({snapshot, pages, discovery, now = new Date().toISOString(), maxAgeHours = GBP_HOURS_MAX_AGE_HOURS} = {}) {
  const report = {ok: false, status: 'invalid', complete: false, observedAt: snapshot?.observedAt ?? null, checkedAt: now, maxAgeHours, errors: [], branches: [],
    summary: {branches: 0, matchingBranches: 0, differences: 0, validationErrors: 0}};
  const error = (failure, context = {}) => {report.errors.push({...context, code: failure.code ?? 'invalid-input', message: failure.message}); report.summary.validationErrors++;};
  let instant;
  try {
    object(snapshot, 'snapshot');
    requireValue(snapshot.version === 1 && snapshot.source?.method === 'locations.getGoogleUpdated', 'invalid-source', 'Version 1 consumer-facing locations.getGoogleUpdated snapshot required');
    instant = timestamp(now, 'now');
    const observed = timestamp(snapshot.observedAt, 'observedAt');
    requireValue(Number.isFinite(maxAgeHours) && maxAgeHours > 0, 'invalid-freshness-policy', 'maxAgeHours must be positive');
    requireValue(observed <= instant + 300000 && instant - observed <= maxAgeHours * 3600000, 'stale-snapshot', 'Snapshot is stale or more than five minutes in the future');
    requireValue(Array.isArray(snapshot.locations), 'invalid-identities', 'snapshot.locations must be an array');
    const ids = snapshot.locations.map(value => value?.branchId).sort();
    requireValue(equal(ids, GBP_HOURS_BRANCHES.map(branch => branch.id).sort()), 'invalid-identities', 'Expected exactly the five operating branches; no retired, planned, duplicate or missing branches');
    requireValue(pages instanceof Map || pages && typeof pages === 'object' && !Array.isArray(pages), 'missing-pages', 'Projected pages Map/object required');
    if (typeof discovery === 'string') discovery = JSON.parse(discovery);
    object(discovery, 'discovery');
    requireValue(Array.isArray(discovery.locations) && equal(discovery.locations.map(value => value?.id).sort(), ids), 'invalid-identities', 'Discovery must contain exactly the five operating branches');
  } catch (failure) {error(failure); return report;}
  for (const branch of GBP_HOURS_BRANCHES) {
    const row = {branchId: branch.id, timeZone: branch.timeZone, status: 'invalid', differences: [], errors: []};
    report.branches.push(row);
    const branchError = (failure, context = {}) => {const item = {...context, branchId: branch.id, code: failure.code ?? 'invalid-input', message: failure.message}; row.errors.push(item); report.errors.push(item);};
    const difference = (kind, surface, expected, actual, context = {}) => {if (!equal(expected, actual)) row.differences.push({kind, surface, ...context, expected, actual});};
    let regular, special;
    try {
      const source = snapshot.locations.find(location => location.branchId === branch.id);
      requireValue(source.timeZone === branch.timeZone, 'invalid-time-zone', 'Snapshot time zone differs from the configured branch');
      regular = normalizeGbpRegularHours(source.regularHoursRaw);
      special = activeSpecialHours(normalizeGbpSpecialHours(source.specialHoursRaw), branch.timeZone, instant);
    } catch (failure) {branchError(failure, {surface: 'snapshot'}); continue;}
    for (const file of branch.pages) {
      try {
        const page = pageData(pages instanceof Map ? pages.get(file) : pages[file], branch, file);
        difference('regular-hours', 'schema', regular, page.regular, {file});
        difference('regular-hours', 'visible', regular, page.visible.periods, {file});
        if (page.visible.unknownClosingDays.length) row.differences.push({kind: 'unspecified-closing', surface: 'visible', file, days: page.visible.unknownClosingDays});
        difference('special-hours', 'schema', special, page.special, {file});
        difference('special-hours', 'visible', special, page.visibleSpecial, {file});
      } catch (failure) {branchError(failure, {surface: 'page', file});}
    }
    try {
      const location = discovery.locations.find(value => value.id === branch.id);
      requireValue(location.url === branch.url, 'wrong-page-identity', 'Discovery URL differs from its branch');
      if (own(location, 'timeZone')) requireValue(location.timeZone === branch.timeZone, 'invalid-time-zone', 'Discovery time zone differs from its branch');
      difference('regular-hours', 'discovery', regular, normalizeSchemaRegularHours(location.openingHoursSpecification));
      difference('special-hours', 'discovery', special, normalizeSchemaSpecialHours(location.specialOpeningHoursSpecification));
    } catch (failure) {branchError(failure, {surface: 'discovery'});}
    row.status = row.errors.length ? 'invalid' : row.differences.length ? 'different' : 'match';
  }
  report.complete = report.errors.length === 0;
  report.status = !report.complete ? 'invalid' : report.branches.some(branch => branch.differences.length) ? 'different' : 'match';
  report.ok = report.status === 'match';
  report.summary = {branches: report.branches.length, matchingBranches: report.branches.filter(branch => branch.status === 'match').length,
    differences: report.branches.reduce((count, branch) => count + branch.differences.length, 0), validationErrors: report.errors.length};
  return report;
}
