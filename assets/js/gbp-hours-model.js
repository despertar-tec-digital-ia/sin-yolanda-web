// Shared by the local candidate projector and its browser controller. No I/O.
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const NAMES = {es: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'], en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']};
const SHORT = {es: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']};
const ZONES = {'san-ignacio': 'America/Mexico_City', houston: 'America/Chicago', 'the-woodlands': 'America/Chicago', 'san-antonio': 'America/Chicago', 'el-paso': 'America/Denver'};
export const REVIEWED_USA_BRANCHES = Object.freeze(['houston', 'the-woodlands', 'san-antonio', 'el-paso']);
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const assert = (condition, message) => {if (!condition) throw new Error(message);};
const deepFreeze = value => {if (value && typeof value === 'object') {Object.values(value).forEach(deepFreeze); Object.freeze(value);} return value;};
const nextDay = date => new Date(Date.parse(date + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
function date(value) {
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value, 'Invalid reviewed calendar date');
  return value;
}
function minute(value) {
  assert(typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value), 'Reviewed normalized clocks require HH:mm, with 24:00 already resolved');
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}

// Same strict IANA wall-time resolution as the existing programming clock; this
// implementation is shared by build/browser, including 23/25-hour local dates.
const formatters = new Map();
function wallTimestamp(instant, zone) {
  if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat('en', {timeZone: zone, calendar: 'iso8601', numberingSystem: 'latn', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'}));
  const parts = Object.fromEntries(formatters.get(zone).formatToParts(new Date(instant)).map(part => [part.type, part.value]));
  const value = new Date(0); value.setUTCFullYear(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  value.setUTCHours(Number(parts.hour), Number(parts.minute), Number(parts.second), 0); return value.getTime();
}
export function reviewedLocalInstant(day, clock, zone) {
  date(day); minute(clock);
  const wall = Date.parse(day + 'T00:00:00Z') + minute(clock) * 60000;
  const offsets = new Set([-36, -24, -12, 0, 12, 24, 36].map(hours => {const sample = wall + hours * 3600000; return wallTimestamp(sample, zone) - sample;}));
  const candidates = [...offsets].map(offset => wall - offset).filter(instant => wallTimestamp(instant, zone) === wall);
  assert(candidates.length === 1, 'Ambiguous or nonexistent reviewed local time; no offset guessed');
  return new Date(candidates[0]).toISOString();
}
function wallDateTime(day, clock, zone) {
  const instant = reviewedLocalInstant(day, clock, zone);
  const offset = (Date.parse(day + 'T' + clock + ':00Z') - Date.parse(instant)) / 60000;
  const magnitude = Math.abs(offset);
  return `${day}T${clock}:00${offset < 0 ? '-' : '+'}${String(Math.floor(magnitude / 60)).padStart(2, '0')}:${String(magnitude % 60).padStart(2, '0')}`;
}
const expiry = (record, zone) => record.closed ? reviewedLocalInstant(nextDay(record.date), '00:00', zone) : reviewedLocalInstant(record.closeDate, record.closes, zone);
const schemaDay = index => 'https://schema.org/' + NAMES.en[index];
const hasType = (node, type) => [].concat(node?.['@type'] ?? []).includes(type);

function validateData(data) {
  assert(data?.version === 1 && data.source?.method === 'locations.getGoogleUpdated', 'Use a reviewed consumer-facing GBP dataset');
  assert(typeof data.revision === 'string' && data.revision && Number.isFinite(Date.parse(data.observedAt)), 'Reviewed data needs a revision and observation time');
  assert(Array.isArray(data.locations) && JSON.stringify(data.locations.map(location => location.branchId).sort()) === JSON.stringify(Object.keys(ZONES).sort()), 'Reviewed hours require exactly five operating branches');
  for (const location of data.locations) {
    assert(location.timeZone === ZONES[location.branchId], 'Reviewed branch zone differs from its configured zone');
    assert(Array.isArray(location.regularPeriods) && location.regularPeriods.length && Array.isArray(location.closedOpeningDays), 'Reviewed regular schedule is incomplete');
    const spans = [], openingDays = new Set();
    for (const period of location.regularPeriods) {
      const index = DAYS.indexOf(period.openDay), closeIndex = DAYS.indexOf(period.closeDay);
      assert(index >= 0 && closeIndex >= 0 && [0, 1].includes(period.closeDayOffset) && closeIndex === (index + period.closeDayOffset) % 7, 'Invalid reviewed midnight/day relationship');
      const start = index * 1440 + minute(period.openTime), end = (index + period.closeDayOffset) * 1440 + minute(period.closeTime);
      assert(end > start && end - start <= 1440, 'Invalid reviewed regular duration');
      openingDays.add(period.openDay);
      if (end > 10080) spans.push([start, 10080], [0, end - 10080]); else spans.push([start, end]);
    }
    const ordered = spans.sort((a, b) => a[0] - b[0]);
    for (let index = 1; index < ordered.length; index++) assert(ordered[index][0] >= ordered[index - 1][1], 'Reviewed regular periods overlap');
    assert(JSON.stringify([...location.closedOpeningDays].sort()) === JSON.stringify(DAYS.filter(day => !openingDays.has(day)).sort()), 'Reviewed schedule must account for all seven opening days');
    assert(Array.isArray(location.specialDates), 'Reviewed special dates must be explicit');
    const dates = new Map();
    for (const record of location.specialDates) {
      date(record.date); assert(typeof record.closed === 'boolean', 'Reviewed special closed flag must be boolean');
      if (!record.closed) {
        date(record.closeDate);
        const duration = (Date.parse(record.closeDate) - Date.parse(record.date)) / 60000 + minute(record.closes) - minute(record.opens);
        assert(duration > 0 && duration < 1440, 'Invalid reviewed special duration');
      }
      const previous = dates.get(record.date) ?? [];
      for (const other of previous) {
        assert(!other.closed && !record.closed, 'A reviewed special date cannot be both closed/open or repeated');
        const start = Date.parse(record.date + 'T' + record.opens + 'Z'), end = Date.parse(record.closeDate + 'T' + record.closes + 'Z');
        assert(end <= Date.parse(other.date + 'T' + other.opens + 'Z') || start >= Date.parse(other.closeDate + 'T' + other.closes + 'Z'), 'Reviewed special periods overlap');
      }
      dates.set(record.date, [...previous, record]);
    }
  }
}

export function createGbpHoursModel(input) {
  const data = JSON.parse(JSON.stringify(input)); validateData(data); deepFreeze(data);
  const locations = new Map(data.locations.map(location => [location.branchId, location]));
  const location = id => {assert(locations.has(id), 'No reviewed hours for this branch'); return locations.get(id);};
  const groups = id => {
    const source = location(id), rows = [];
    for (const [index, day] of DAYS.entries()) {
      const periods = source.regularPeriods.filter(period => period.openDay === day).map(period => ({opens: period.openTime, closes: period.closeTime}));
      const previous = rows.at(-1);
      if (previous && JSON.stringify(previous.periods) === JSON.stringify(periods)) previous.days.push(index);
      else rows.push({days: [index], periods});
    }
    return rows;
  };
  const language = value => value === 'en' ? 'en' : 'es';
  const dayLabel = (indices, lang, short = false) => {const names = (short ? SHORT : NAMES)[language(lang)]; return names[indices[0]] + (indices.length > 1 ? (short ? '–' : language(lang) === 'en' ? ' to ' : ' a ') + names[indices.at(-1)] : '');};
  const clockLabel = (value, lang, short = false) => {const [hour, minutes] = value.split(':').map(Number); return `${hour % 12 || 12}${short && minutes === 0 ? '' : ':' + String(minutes).padStart(2, '0')} ${language(lang) === 'en' || short ? (hour < 12 ? 'am' : 'pm') : (hour < 12 ? 'a. m.' : 'p. m.')}`;};
  function summaryFor(id, lang = 'es') {
    return groups(id).map(row => `${dayLabel(row.days, lang, true)} ${row.periods.length ? row.periods.map(period => clockLabel(period.opens, lang, true) + '–' + clockLabel(period.closes, lang, true)).join(', ') : language(lang) === 'en' ? 'closed' : 'cerrado'}`).join(' · ');
  }
  function specification(id) {
    return groups(id).map(row => row.periods.length ? row.periods.map(period => ({'@type': 'OpeningHoursSpecification', dayOfWeek: row.days.map(schemaDay), opens: period.opens, closes: period.closes})) : [{'@type': 'OpeningHoursSpecification', dayOfWeek: row.days.map(schemaDay), opens: '00:00', closes: '00:00'}]).flat();
  }
  function specialDates(id, now = new Date().toISOString()) {
    assert(Number.isFinite(Date.parse(now)), 'Invalid reviewed render time');
    return location(id).specialDates.filter(record => Date.parse(now) < Date.parse(expiry(record, location(id).timeZone)));
  }
  function specialSpecification(id, now) {
    return specialDates(id, now).map(record => ({'@type': 'OpeningHoursSpecification', validFrom: record.date, validThrough: record.date,
      dayOfWeek: schemaDay((new Date(record.date + 'T12:00:00Z').getUTCDay() + 6) % 7), opens: record.closed ? '00:00' : record.opens, closes: record.closed ? '00:00' : record.closes}));
  }
  function renderKey(id, lang, now) {return data.revision + ':' + language(lang) + ':' + specialDates(id, now).map(record => record.date).join(',');}
  function html(id, lang = 'es', now) {
    lang = language(lang); const source = location(id), records = specialDates(id, now), en = lang === 'en';
    const regular = groups(id).map(row => `<div><dt>${escape(dayLabel(row.days, lang))}</dt><dd>${row.periods.length ? row.periods.map(period => `<time datetime="${period.opens}">${clockLabel(period.opens, lang)}</time><span aria-hidden="true"> – </span><span class="ve-sr">${en ? 'to' : 'a'}</span><time datetime="${period.closes}">${clockLabel(period.closes, lang)}</time>`).join('; ') : en ? 'Closed' : 'Cerrado'}</dd></div>`).join('');
    const dateLabel = value => new Intl.DateTimeFormat(en ? 'en-US' : 'es-MX', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(value + 'T12:00:00Z'));
    const special = records.length ? `<section data-gbp-special-hours aria-label="${en ? 'Special hours' : 'Horarios especiales'}" style="margin:0 0 1.25rem;padding:1rem;border-left:4px solid currentColor"><h3>${en ? 'Special hours' : 'Horarios especiales'}</h3><dl>${records.map(record => `<div data-gbp-special-hours-date="${record.date}" data-expires-at="${expiry(record, source.timeZone)}" style="display:block;padding:.65rem 0"><dt><time datetime="${record.date}">${escape(dateLabel(record.date))}</time></dt><dd style="margin:.35rem 0 0;text-align:left">${record.closed ? (en ? 'Closed' : 'Cerrado') : `<time datetime="${wallDateTime(record.date, record.opens, source.timeZone)}">${clockLabel(record.opens, lang)}</time> – <time datetime="${wallDateTime(record.closeDate, record.closes, source.timeZone)}">${clockLabel(record.closes, lang)}</time>${record.closeDate !== record.date ? (en ? ' the following day' : ' del día siguiente') : ''}`}</dd></div>`).join('')}</dl></section>` : '';
    return `<div class="ve-hours" data-hours-zone="${source.timeZone}" data-gbp-hours-key="${escape(renderKey(id, lang, now))}">${special}<h3>${records.length ? (en ? 'Regular hours' : 'Horario habitual') : (en ? 'Hours' : 'Horario')}</h3><dl>${regular}</dl><p class="ve-sr">${en ? 'Local time. Closings after midnight are on the following day.' : 'Hora local. Los cierres de madrugada corresponden al día siguiente.'}</p></div>`;
  }
  function applyToData(target) {
    for (const branch of target?.branches ?? []) if (REVIEWED_USA_BRANCHES.includes(branch.id)) branch.hours = summaryFor(branch.id, 'es');
    return target;
  }
  function hoursForDate(id, value) {
    date(value); const source = location(id), special = source.specialDates.filter(record => record.date === value);
    const weekday = DAYS[(new Date(value + 'T12:00:00Z').getUTCDay() + 6) % 7];
    const periods = special.length ? special.filter(record => !record.closed).map(record => ({opens: record.opens, closes: record.closes, closeDate: record.closeDate}))
      : source.regularPeriods.filter(period => period.openDay === weekday).map(period => ({opens: period.openTime, closes: period.closeTime, closeDate: period.closeDayOffset ? nextDay(value) : value}));
    return {date: value, timeZone: source.timeZone, source: special.length ? 'special' : 'regular', closed: periods.length === 0,
      periods: periods.map(period => ({...period, closesAt: reviewedLocalInstant(period.closeDate, period.closes, source.timeZone)}))};
  }
  function updateRestaurant(node, id, now) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {node.forEach(value => updateRestaurant(value, id, now)); return;}
    if (hasType(node, 'Restaurant') && node['@id'] === 'https://sin-yolanda.com/' + id + '#restaurant' && REVIEWED_USA_BRANCHES.includes(id)) {
      node.openingHoursSpecification = specification(id);
      const specials = specialSpecification(id, now);
      if (specials.length) node.specialOpeningHoursSpecification = specials;
      else delete node.specialOpeningHoursSpecification;
    }
    if (node['@graph']) updateRestaurant(node['@graph'], id, now);
  }
  function nextTransitionAt(now = new Date().toISOString()) {
    return REVIEWED_USA_BRANCHES.flatMap(id => specialDates(id, now).map(record => expiry(record, location(id).timeZone))).sort()[0] ?? null;
  }
  return Object.freeze({data, location, summaryFor, specification, specialSpecification, specialDates, renderKey, html, applyToData, hoursForDate, updateRestaurant, nextTransitionAt});
}
