// A dated intake layered over the approved agenda. The draft is opt-in for local review.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {localInstant, nextLocalDay, resolveProgrammingClock} from './programming-clock.mjs';
import {elementRange} from './public-agenda.mjs';
import {escapeHtml} from './branch-agenda.mjs';

export const branchIds = ['houston', 'the-woodlands', 'san-antonio', 'el-paso'];
export const config = JSON.parse(readFileSync(new URL('./november-2026-review.json', import.meta.url), 'utf8'));
export const digest = createHash('sha256').update(JSON.stringify(config)).digest('hex');
export const contentDigest = data => createHash('sha256').update(JSON.stringify({records: data.records, withheld: data.withheld})).digest('hex');
const isEnglish = language => language === 'en';
const dateLabel = (date, language) => new Intl.DateTimeFormat(isEnglish(language) ? 'en-US' : 'es-MX', {weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'}).format(new Date(date + 'T12:00:00Z'));

export function visibilityWindow(record) {
  const endDate = record.validThrough || record.date;
  const weekday = new Date(endDate + 'T12:00:00Z').getUTCDay();
  // Editorial expiry uses known branch closing hours, not a claimed event end time.
  // Specials on normally closed days have no inferred closing hour: use date-end.
  const clock = record.kind === 'dated-promotion' ? '00:00' : [0,5,6].includes(weekday) ? '02:00' : '00:00';
  return {publishFrom: resolveProgrammingClock(record.publishFrom), expiresAt: localInstant(nextLocalDay(endDate), clock, record.timeZone), expiryBasis: record.kind === 'dated-promotion' || ![0,5,6].includes(weekday) ? 'editorial-date-end' : 'editorial-branch-closing'};
}
export function selectNovember(records, now) {
  const instant = Date.parse(resolveProgrammingClock(now));
  const visible = records.filter(record => {const window = visibilityWindow(record); return instant >= Date.parse(window.publishFrom) && instant < Date.parse(window.expiresAt);});
  const transitions = records.flatMap(record => Object.values(visibilityWindow(record)).filter(value => /^\d{4}-/.test(value) && Date.parse(value) > instant)).sort();
  return {visible, nextTransitionAt: transitions[0] || null};
}

export function validateNovember(data = config) {
  assert.equal(data.version, 1);
  assert.equal(new Set(data.records.map(r => r.id)).size, data.records.length, 'Duplicate event id');
  for (const record of data.records) {
    assert.ok(branchIds.includes(record.branchId));
    assert.equal(record.timeZone, record.branchId === 'el-paso' ? 'America/Denver' : 'America/Chicago');
    assert.match(record.date, /^2026-(?:11|12)-\d\d$/);
    assert.ok(record.title.es && record.title.en && record.description.es !== undefined && record.description.en !== undefined);
    assert.equal(record.sourceEndTime, null, 'Do not imply unannounced event times');
    const window = visibilityWindow(record); assert.ok(Date.parse(window.publishFrom) < Date.parse(window.expiresAt));
    if (record.artwork) {assert.match(record.artwork.file, /^assets\/agenda\/[A-Za-z0-9-]+\.jpg$/); assert.ok(record.artwork.width && record.artwork.height && record.artwork.alt.es && record.artwork.alt.en && record.postUrl);}
    if (record.postUrl) assert.match(record.postUrl, /^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]+\/$/);
  }
  return data;
}

function recordAttributes(record) {
  const window = visibilityWindow(record);
  return `data-record="${escapeHtml(record.id)}" data-publish-from="${window.publishFrom}" data-expires-at="${window.expiresAt}"`;
}
function poster(record, language) {
  if (!record.artwork) return '';
  const art = record.artwork;
  const image = `<img src="/${art.file}" width="${art.width}" height="${art.height}" alt="${escapeHtml(art.alt[language])}" loading="lazy" decoding="async">`;
  const label = (isEnglish(language) ? 'Open the original post: ' : 'Abrir la publicación original: ') + record.title[language];
  return `<figure class="sy-agenda-art sy-event-poster"><a href="${record.postUrl}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}">${image}</a></figure>`;
}
export function renderNovemberCard(record, language) {
  const promo = record.kind === 'dated-promotion';
  const date = promo ? `<p class="sy-agenda-weekday">${isEnglish(language) ? 'Throughout November' : 'Durante noviembre'}</p>` : `<time datetime="${record.date}">${dateLabel(record.date, language)}</time>`;
  return `<article class="sy-agenda-event sy-november-event${record.artwork ? '' : ' sy-agenda-text-event'}" ${recordAttributes(record)}>${poster(record, language)}<div class="sy-agenda-copy">${date}<h4>${escapeHtml(record.title[language])}</h4>${record.description[language] ? `<p>${escapeHtml(record.description[language])}</p>` : ''}</div></article>`;
}
function renderSeries(records, language) {
  return `<article class="sy-agenda-event sy-agenda-text-event sy-november-series" data-agenda-series><div class="sy-agenda-copy"><h4>${escapeHtml(records[0].title[language])}</h4><div class="sy-agenda-functions">${records.map(record => `<div ${recordAttributes(record)}><time datetime="${record.date}">${dateLabel(record.date, language)}</time>${record.description[language] ? `<p>${escapeHtml(record.description[language])}</p>` : ''}</div>`).join('')}</div></div></article>`;
}

export function classRange(html, tag, className) {
  const openings = new RegExp('<' + tag + '\\b[^>]*\\bclass="([^"]*)"[^>]*>', 'g');
  for (let match; (match = openings.exec(html));) {
    if (!match[1].split(/\s+/).includes(className)) continue;
    const tokens = new RegExp('<\\/?' + tag + '\\b[^>]*>', 'g'); tokens.lastIndex = match.index; let depth = 0;
    for (let token; (token = tokens.exec(html));) {
      depth += token[0].startsWith('</') ? -1 : 1;
      if (!depth) return {start: match.index, end: tokens.lastIndex, html: html.slice(match.index, tokens.lastIndex)};
    }
    assert.fail('Unclosed agenda section: ' + className);
  }
  return null;
}

export function applyNovemberHtml(html, branch, language, now, data = config) {
  validateNovember(data);
  const selection = selectNovember(data.records.filter(record => record.branchId === branch), now);
  const range = elementRange(html, 'section', 'programacion-' + branch);
  assert.ok(range, 'Branch agenda is required: ' + branch);
  let agenda = range.html;
  const previous = classRange(agenda, 'section', 'sy-november-offers');
  if (previous) agenda = agenda.slice(0, previous.start) + agenda.slice(previous.end);
  const dates = classRange(agenda, 'section', 'sy-agenda-dates');
  // Keep separately sourced existing performances. Never clone Jorge/Jets into the intake.
  const oldCards = (dates?.html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) || []).filter(card => !card.includes('sy-november-event') && !card.includes('sy-november-series'));
  const groups = new Map();
  const additions = [];
  for (const record of selection.visible.filter(record => record.kind === 'dated-event').sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    if (record.series) {if (!groups.has(record.series)) groups.set(record.series, []); groups.get(record.series).push(record);}
    else additions.push({date: record.date, html: renderNovemberCard(record, language)});
  }
  for (const group of groups.values()) additions.push({date: group[0].date, html: renderSeries(group, language)});
  const cards = [...oldCards.map(card => ({date: /<time datetime="([^"]+)"/.exec(card)?.[1] || '', html: card})), ...additions].sort((a,b) => a.date.localeCompare(b.date));
  const dated = cards.length ? `<section class="sy-agenda-dates" data-agenda-group aria-labelledby="agenda-${branch}-dates"><h3 id="agenda-${branch}-dates">${isEnglish(language) ? 'Upcoming dates' : 'Próximas fechas'}</h3><div class="sy-agenda-grid">${cards.map(card => card.html).join('')}</div></section>` : '';
  if (dates) agenda = agenda.slice(0, dates.start) + dated + agenda.slice(dates.end);
  else if (dated) agenda = agenda.replace(/(<h2\b[^>]*>[\s\S]*?<\/h2>)/, '$1' + dated);
  const promos = selection.visible.filter(record => record.kind === 'dated-promotion');
  if (promos.length) agenda = agenda.replace('<section class="sy-october-programming"', `<section class="sy-november-offers" data-agenda-group><h3>${isEnglish(language) ? 'This month' : 'Durante este mes'}</h3><div class="sy-agenda-grid">${promos.map(record => renderNovemberCard(record, language)).join('')}</div></section><section class="sy-october-programming"`);
  if (selection.visible.some(record => record.id.includes('concurso-canto'))) agenda = agenda.replace(/<article class="sy-agenda-night">[\s\S]*?<\/article>/g, card => /<h4>(?:Concurso de canto|Singing contest)<\/h4>/.test(card) ? '' : card);
  agenda = agenda.replace('Cada semana · desde el 29 de octubre', 'Cada semana').replace('Every week · from October 29', 'Every week').replaceAll('Desde el 29 de octubre.', 'Cada jueves.').replaceAll('From October 29.', 'Every Thursday.');
  const visibleSeries = selection.visible.filter(r => r.series);
  for (const series of new Set(visibleSeries.map(r => r.series))) assert.ok(agenda.includes('data-agenda-series'));
  html = html.slice(0, range.start) + agenda + html.slice(range.end);
  html = html.replace(/src="\/assets\/js\/agenda-clock\.js(?:\?[^"]*)?"/, 'src="/assets/js/agenda-visibility.js?v=20261110-november-agenda"');
  if (!html.includes('src="/assets/js/agenda-visibility.js')) html = html.replace('</body>', '<script src="/assets/js/agenda-visibility.js?v=20261110-november-agenda" defer></script></body>');
  if (!html.includes('href="/assets/css/november-agenda.css')) html = html.replace('</head>', '<link rel="stylesheet" href="/assets/css/november-agenda.css?v=20261110-november-agenda"></head>');
  return {html, ...selection};
}

export function projectNovemberProgramming(root, files, now, {review = false, data = config} = {}) {
  if (!data.publicationEnabled && !review) return {metadata: null};
  if (!review) {
    assert.equal(data.approvedBy, 'Luis', 'An explicit approval is required before activating this intake');
    assert.ok(data.authorization && data.approvedAt, 'Publication authorization is missing');
    resolveProgrammingClock(data.approvedAt);
    assert.equal(data.approvedContentDigest, contentDigest(data), 'November content changed after approval');
    // Historical builds must not apply a release before it was authorized.
    if (Date.parse(resolveProgrammingClock(now)) < Date.parse(data.approvedAt)) return {metadata: null};
  }
  const visibleIds = [], transitions = [];
  for (const id of branchIds) for (const language of ['es', 'en']) {
    const file = language === 'es' ? id + '.html' : 'en/' + id + '/index.html';
    const projection = applyNovemberHtml(files.get(file) || readFileSync(resolve(root, file), 'utf8'), id, language, now, data);
    files.set(file, projection.html);
    if (language === 'es') visibleIds.push(...projection.visible.map(record => record.id));
    if (projection.nextTransitionAt) transitions.push(projection.nextTransitionAt);
  }
  return {metadata: {digest, visibleIds, nextTransitionAt: transitions.sort()[0] || null}};
}
