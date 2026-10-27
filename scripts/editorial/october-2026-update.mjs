// The October 26 authorization supersedes specific records without rewriting
// the independent October 14 approval, sources or its historical audit digest.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { localInstant, nextLocalDay } from './programming-clock.mjs';
import { elementRange } from './public-agenda.mjs';
import { escapeHtml } from './branch-agenda.mjs';

export const approval = JSON.parse(readFileSync(new URL('./october-2026-update.json', import.meta.url)));
export const eventArtwork = JSON.parse(readFileSync(new URL('./usa-event-artwork.json', import.meta.url)));
export const approvalDigest = createHash('sha256').update(JSON.stringify({ approval, eventArtwork })).digest('hex');
const context = { window: {}, Intl }; vm.runInNewContext(readFileSync(new URL('../../assets/js/october-hours.js', import.meta.url), 'utf8'), context);
export const octoberHours = context.window.SY_OCTOBER_HOURS;
const en = language => language === 'en';
const dateLabel = (date, language) => new Intl.DateTimeFormat(en(language) ? 'en-US' : 'es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
const expiration = (date, id) => localInstant(nextLocalDay(date), '00:00', octoberHours.zones[id]);

export function renderEventPoster(key, language) {
  const asset = eventArtwork.assets[key], label = en(language) ? 'Enlarge poster' : 'Ampliar cartel';
  return `<figure class="sy-agenda-art sy-event-poster"><a href="/${asset.file}" target="_blank" rel="noopener noreferrer" aria-label="${label}: ${escapeHtml(asset.alt[language])}"><img src="/${asset.file}" width="${asset.width}" height="${asset.height}" alt="${escapeHtml(asset.alt[language])}" loading="lazy" decoding="async"></a></figure>`;
}

export function renderOctoberProgramming(id, language, now) {
  const english = en(language), dates = [];
  const occurrences = [['catrinas', approval.catrinas[id]], ['halloween', approval.halloween.date]].sort((a, b) => a[1].localeCompare(b[1]));
  for (const [kind, date] of occurrences) {
    const expiresAt = expiration(date, id);
    if (Date.parse(now) >= Date.parse(expiresAt)) continue;
    const title = kind === 'catrinas' ? (english ? 'Catrinas Night' : 'Noche de Catrinas') : 'Halloween';
    const detail = kind === 'catrinas' ? (english ? 'Come dressed as a catrina.' : 'Ven de catrina.') :
      (english ? 'US$10 cover. Costume contest: first prize, US$1,000 in consumption credit; second prize, a bottle.' : 'Cover: USD $10. Concurso de disfraces: primer lugar, USD $1,000 en consumo; segundo lugar, una botella.');
    const poster = kind === 'catrinas' ? eventArtwork.catrinasByBranch[id] : 'halloween';
    dates.push(`<article class="sy-agenda-event" data-record="${id}-${kind}-october-update" data-expires-at="${expiresAt}">${renderEventPoster(poster, language)}<div class="sy-agenda-copy"><time datetime="${date}">${dateLabel(date, language)}</time><h4>${title}</h4><p>${detail}</p></div></article>`);
  }
  const weekly = [
    [english ? 'Thursdays' : 'Jueves', english ? 'Singing contest' : 'Concurso de canto', english ? 'From October 29.' : 'Desde el 29 de octubre.'],
    [english ? 'Thursdays' : 'Jueves', 'Don’t Cry · Karaoke open mic', english ? 'Songs in English and Spanish.' : 'Canciones en español e inglés.'],
    [english ? 'Thursdays · 4–8 PM' : 'Jueves · 4–8 PM', 'Ladies Night', english ? '2-for-1 cocktails for women.' : '2x1 en cócteles para mujeres.']
  ];
  const nflExpiresAt = expiration(eventArtwork.nflLastDate, id);
  const nflPoster = Date.parse(now) < Date.parse(nflExpiresAt) ? `<div class="sy-nfl-poster" data-record="${id}-nfl-poster-202611" data-expires-at="${nflExpiresAt}">${renderEventPoster('nfl', language)}</div>` : '';
  const sunday = `<article class="sy-agenda-night sy-sunday-programming" data-record="${id}-recovery-brunch-october-update">${nflPoster}<div class="sy-agenda-night-copy"><p class="sy-agenda-weekday">${english ? 'Sundays · from 11 AM' : 'Domingos · desde las 11 AM'}</p><h4>Recovery Brunch + NFL</h4><p>${english ? 'Your Sunday plan.' : 'El plan del domingo.'}</p></div></article>`;
  return `<section class="sy-october-programming" data-october-approval="${approvalDigest}">${dates.length ? `<section class="sy-october-dates"><h3>${english ? 'Halloween & Catrinas' : 'Halloween y Catrinas'}</h3><div class="sy-agenda-grid">${dates.join('')}</div></section>` : ''}<h3>${english ? 'Every week · from October 29' : 'Cada semana · desde el 29 de octubre'}</h3><div class="sy-agenda-weekly-grid">${weekly.map(([day, title, detail]) => `<article class="sy-agenda-night"><div><p class="sy-agenda-weekday">${day}</p><h4>${title}</h4><p>${detail}</p></div></article>`).join('')}${sunday}</div></section>`;
}

export function applyOctoberHtml(html, id, language, now) {
  const range = elementRange(html, 'section', 'programacion-' + id);
  if (range) {
    let agenda = range.html;
    // Remove the previous overlay before regenerating it at the shared clock.
    const marker = agenda.indexOf('<section class="sy-october-programming"');
    if (marker >= 0) agenda = agenda.slice(0, marker) + '</div></section>';
    agenda = agenda.replace(/<article\b[^>]*>[\s\S]*?<\/article>/g, article =>
      /data-record="(?:houston-pinta|[a-z-]+-ladies-weekly|houston-dontcry-weekly|the-woodlands-thursday-offer|el-paso-recovery-brunch)/.test(article) ? '' : article);
    const jorgeId = eventArtwork.jorgeByBranch[id];
    if (jorgeId) agenda = agenda.replace(/<article\b[^>]*>[\s\S]*?<\/article>/g, article => {
      if (!article.includes(`data-record="${jorgeId}"`)) return article;
      const poster = renderEventPoster('jorge', language);
      article = article.replace(' sy-agenda-text-event', '');
      return article.includes('<figure') ? article.replace(/<figure\b[\s\S]*?<\/figure>/, poster) : article.replace(/(<article\b[^>]*>)/, '$1' + poster);
    });
    agenda = agenda.replace(/<section class="sy-agenda-(?:weekly|offers)"[\s\S]*?<\/section>/g, section => section.includes('<article') ? section : '');
    agenda = agenda.replace(/<\/div>\s*<\/section>$/, renderOctoberProgramming(id, language, now) + '</div></section>');
    html = html.slice(0, range.start) + agenda + html.slice(range.end);
  }
  html = html.replace(/<p class="sy-hours-notice"[^>]*>[\s\S]*?<\/p>/g, '');
  const hoursPattern = /<div class="ve-hours"[^>]*>[\s\S]*?<\/dl>(?:<p[^>]*>[\s\S]*?<\/p>)?<\/div>/;
  const active = octoberHours.active(id, now);
  html = html.replace(hoursPattern, block => active ? octoberHours.html(language, octoberHours.zones[id]) : block + octoberHours.notice(language));
  if (active) html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (tag, content) => {
    const schema = JSON.parse(content);
    if (schema['@type'] !== 'Restaurant') return tag;
    schema.openingHoursSpecification = octoberHours.specification();
    return '<script type="application/ld+json">' + JSON.stringify(schema) + '</script>';
  });
  return html;
}

export function projectOctoberUpdate(root, files, now) {
  if (Date.parse(now) < Date.parse(approval.publishFrom)) return { nextTransitionAt: approval.publishFrom, approvalDigest };
  const transitions = [];
  for (const [id, zone] of Object.entries(octoberHours.zones)) {
    for (const language of ['es', 'en']) {
      const file = language === 'es' ? id + '.html' : 'en/' + id + '/index.html';
      files.set(file, applyOctoberHtml(files.get(file) ?? readFileSync(resolve(root, file), 'utf8'), id, language, now));
    }
    transitions.push(localInstant(approval.effectiveDate, '00:00', zone), expiration(approval.catrinas[id], id), expiration(approval.halloween.date, id), expiration(eventArtwork.nflLastDate, id));
  }
  const discovery = JSON.parse(readFileSync(resolve(root, 'discovery.json'), 'utf8'));
  for (const branch of discovery.locations) if (octoberHours.active(branch.id, now)) branch.openingHoursSpecification = octoberHours.specification();
  files.set('discovery.json', JSON.stringify(discovery, null, 2) + '\n');
  return { nextTransitionAt: transitions.filter(value => Date.parse(value) > Date.parse(now)).sort()[0] ?? null, approvalDigest };
}
