// Configuration-time clock and IANA wall-time resolution reused from the existing
// Sin Yolanda programming model (sinyolanda-universal/scripts/programming-clock.mjs
// and src/data/branch-programming.ts). No recurrence or event hours are invented here.
export function resolveProgrammingClock(value = new Date().toISOString()) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))
    || new Date(`${match[1]}T00:00:00Z`).toISOString().slice(0, 10) !== match[1]
    || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59) {
    throw new Error('Programming clock requires a valid calendar timestamp with an explicit UTC offset.');
  }
  return new Date(value).toISOString();
}
const formatters = new Map();
function localWallTimestamp(instant, timeZone) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en', { timeZone, calendar: 'iso8601', numberingSystem: 'latn', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    formatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
  const date = new Date(0); date.setUTCFullYear(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  date.setUTCHours(Number(parts.hour), Number(parts.minute), Number(parts.second), 0); return date.getTime();
}
export function localInstant(date, clock, timeZone) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date + 'T00:00:00Z').toISOString().slice(0,10) !== date || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clock)) throw new Error('Invalid local date or clock');
  const [hour, minute] = clock.split(':').map(Number), day = Date.parse(date + 'T00:00:00Z');
  const wall = day + hour * 3_600_000 + minute * 60_000;
  const offsets = new Set([-36,-24,-12,0,12,24,36].map(hours => { const sample = wall + hours * 3_600_000; return localWallTimestamp(sample,timeZone)-sample; }));
  const candidates = [...offsets].map(offset=>wall-offset).filter(instant=>localWallTimestamp(instant,timeZone)===wall);
  if (candidates.length !== 1) throw new Error('Ambiguous or nonexistent local time; no offset guessed');
  return new Date(candidates[0]).toISOString();
}
export const nextLocalDay = date => new Date(Date.parse(date + 'T00:00:00Z') + 86_400_000).toISOString().slice(0,10);
