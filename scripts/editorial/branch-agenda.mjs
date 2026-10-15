// Review projection only. It neither approves records nor writes production HTML.
import assert from 'node:assert/strict';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wording = {
  es: { heading: 'La agenda de tu cantina.', dates: 'Próximas fechas', weekly: 'Las noches de la semana', offers: 'Para comer y brindar', outside: 'Fuera de la cantina', tickets: 'Ver boletos', post: 'Ver publicación', tab: 'abre otra pestaña', invitation: 'Solo por invitación', weekdays: ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'] },
  en: { heading: 'At your cantina.', dates: 'Upcoming dates', weekly: 'Weeknight plans', offers: 'Food & drinks', outside: 'Beyond the cantina', tickets: 'View tickets', post: 'View post', tab: 'opens in a new tab', invitation: 'By invitation only', weekdays: ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'] },
};
// Adaptations describe observed facts. Unknown hours, admission and offer horizons stay absent.
const copy = {
  'houston-pinta-canta-20261014': { en: 'Despechados Ladies Night. Check-in from 6:30 pm.' },
  'houston-pinta-20261028': { en: 'Peluca Halloween edition. Check-in from 6:30 pm.' },
  'houston-jorge-mariana-20261113': { en: 'With special guest Mariana Ochoa.' },
  'houston-ladies-weekly': { en: '2-for-1 cocktails. Open mic.' },
  'houston-dontcry-weekly': { en: 'Hits in English and Spanish. Live DJ.' },
  'the-woodlands-mes-hispano-20261015': { en: 'Food and drinks from Venezuela, Ecuador, Colombia and Mexico.' },
  'the-woodlands-ladies-weekly': { en: '2-for-1 cocktails.' },
  'the-woodlands-thursday-offer': { es: 'Pepito + una bebida: USD 27 anunciados.', en: 'Advertised offer: Pepito + one drink for US$27.', conditionsEn: 'Choose tequila, whisky, rum or brandy.' },
  'the-woodlands-jets-cars-20261114': { en: 'Sin Yolanda participates as a sponsor.' },
  'san-antonio-pelucas-20261017': { es: '', en: '' },
  'san-antonio-ladies-weekly': { en: '2-for-1 cocktails.' },
  'san-antonio-jorge-20261114': { es: 'Con Mariana Ochoa.', en: 'With Mariana Ochoa.' },
  'el-paso-jorge-20261016': { en: 'A special palomazo at Sin Yolanda El Paso.' },
  'el-paso-recovery-brunch': { es: '', en: '' },
};
const locale = language => language === 'en' ? 'en-US' : 'es-MX';
function dateLabel(date, language) {
  return new Intl.DateTimeFormat(locale(language), { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
}
function timeLabel(time, language) {
  const [hours, minutes] = time.split(':').map(Number);
  return new Intl.DateTimeFormat(locale(language), { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 1, hours, minutes)));
}
function timing(unit, language) {
  if (!unit.start) return '';
  const start = timeLabel(unit.start, language);
  return unit.end ? start + '–' + timeLabel(unit.end, language) : (language === 'en' ? 'From ' : 'Desde las ') + start;
}
export function projectBranch(branch, asOf) {
  const visible = [], held = [], withheldArt = [];
  for (const unit of branch.units) {
    assert.equal(unit.publicationEnabled, false);
    if (unit.sourceConflict || unit.validityUnknown || unit.temporalKind === 'weekday-slot' || (unit.date && unit.date < asOf)) {
      held.push({ id: unit.id, reason: unit.sourceConflict ? 'source-conflict' : unit.date && unit.date < asOf ? 'past-date' : 'unconfirmed-horizon' });
      continue;
    }
    assert.ok(copy[unit.id], 'A reviewed language adaptation is required: ' + unit.id);
    // A pre-sale poster has a shorter life than the event. Keep it in editorial review.
    if (unit.artworkSafeBefore) withheldArt.push({ id: unit.id, reason: 'short-lived-presale-art' });
    visible.push({ ...unit, artwork: unit.artworkSafeBefore ? null : unit.artwork });
  }
  return { visible, held, withheldArt };
}
export function renderBranchAgenda({ id, branch, registry, language = 'es', asOf, assetPrefix = '/assets/review-agenda', audience = 'review' }) {
  const text = wording[language]; assert.ok(text);
  const sources = new Map([...registry.posts, ...registry.tickets].map(source => [source.id, source.url]));
  const projection = projectBranch(branch, asOf), heldActions = [];
  const units = projection.visible.map(unit => {
    if (!unit.action) return unit;
    const ticket = registry.tickets.find(ticket => ticket.id === unit.action); assert.ok(ticket);
    if (ticket.linkVerification?.exactDestinationConfirmed === true) return unit;
    const post = unit.sourceRefs.find(id => registry.posts.some(post => post.id === id)); assert.ok(post);
    heldActions.push({ id: unit.id, action: unit.action, reason: 'exact-ticket-destination-unconfirmed' });
    return { ...unit, action: null, imageSource: post };
  });
  const detail = unit => copy[unit.id][language] ?? (language === 'es' ? unit.detail : assert.fail('Missing translation: ' + unit.id));
  const link = (source, label, cls = '', accessibleLabel = '') => {
    const url = sources.get(source); assert.ok(url && /^https:\/\/(www\.)?(instagram|eventbrite)\.com\//.test(url), 'Verified destination required: ' + source);
    return `<a class="${cls}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"${accessibleLabel ? ' aria-label="' + escapeHtml(accessibleLabel) + '"' : ''}>${label}<span class="sy-agenda-sr"> · ${text.tab}</span></a>`;
  };
  const art = (unit, linked = false) => {
    if (!unit.artwork) return '';
    const image = `<img src="${escapeHtml(assetPrefix)}/${escapeHtml(unit.artwork.file)}" width="${unit.artwork.width}" height="${unit.artwork.height}" alt="${escapeHtml(unit.title)}" loading="lazy" decoding="async">`;
    return `<figure class="sy-agenda-art">${linked ? link(unit.imageSource, image, '', text.post + ': ' + unit.title + ' · ' + text.tab) : image}</figure>`;
  };
  const date = unit => `<time datetime="${unit.date}">${dateLabel(unit.date, language)}</time>`;
  const ticketLabel = unit => text.tickets + `<span class="sy-agenda-sr"> · ${escapeHtml(unit.title)} · ${dateLabel(unit.date, language)}</span>`;
  const hours = unit => unit.start ? `<p class="sy-agenda-time">${timing(unit, language)}</p>` : '';
  const description = unit => detail(unit) ? `<p>${escapeHtml(detail(unit))}</p>` : '';
  function event(unit, external = false) {
    const hasAction = Boolean(unit.action), linkedArt = Boolean(unit.artwork && !hasAction);
    const title = !unit.artwork && !hasAction ? link(unit.sourceRefs[0], escapeHtml(unit.title), 'sy-agenda-title-link') : escapeHtml(unit.title);
    const venue = external ? `<p class="sy-agenda-venue">${escapeHtml(unit.venue.name === 'Instalación privada de aviación' && language === 'en' ? 'Private aviation facility' : unit.venue.name)}<br>${escapeHtml(unit.venue.city)}${unit.venue.address ? ' · ' + escapeHtml(unit.venue.address) : ''}</p>` : '';
    return `<article class="sy-agenda-event ${unit.artwork ? '' : 'sy-agenda-text-event'}" data-record="${unit.id}">${art(unit, linkedArt)}<div class="sy-agenda-copy">${date(unit)}<h4>${title}</h4>${hours(unit)}${description(unit)}${venue}${unit.admission === 'invitation-only' ? `<p class="sy-agenda-admission">${text.invitation}</p>` : ''}${hasAction ? link(unit.action, ticketLabel(unit), 'sy-agenda-action') : ''}</div></article>`;
  }
  const dated = units.filter(unit => unit.temporalKind === 'dated' && !unit.venue).sort((a, b) => a.date.localeCompare(b.date));
  // One generic workshop artwork; two independently dated functions and ticket links.
  const pinta = dated.filter(unit => unit.semanticKind === 'workshop' && unit.title === 'Pinta y Canta');
  let datedHtml = '';
  if (pinta.length) {
    assert.equal(new Set(pinta.map(unit => unit.artwork?.sha256)).size, 1, 'Grouping needs the same generic artwork');
    datedHtml += `<article class="sy-agenda-event sy-agenda-series">${art(pinta[0], true)}<div class="sy-agenda-copy"><h4>Pinta y Canta</h4><div class="sy-agenda-functions">${pinta.map(unit => `<div data-record="${unit.id}">${date(unit)}${hours(unit)}${description(unit)}${unit.action ? link(unit.action, ticketLabel(unit), 'sy-agenda-action') : ''}</div>`).join('')}</div></div></article>`;
  }
  datedHtml += dated.filter(unit => !pinta.includes(unit)).map(unit => event(unit)).join('');
  const weekly = units.filter(unit => unit.temporalKind === 'weekly' && unit.semanticKind === 'recurring-night').sort((a, b) => a.weekday - b.weekday);
  const offers = units.filter(unit => ['offer', 'brunch'].includes(unit.semanticKind));
  const external = units.filter(unit => unit.venue?.kind === 'external').sort((a, b) => a.date.localeCompare(b.date));
  const heading = (key, label) => `<h3 id="agenda-${id}-${key}">${label}</h3>`;
  if (!units.length) return { html: '', ...projection, heldActions };
  const html = `<section class="sy-agenda" id="programacion-${id}" aria-labelledby="programacion-${id}-title" tabindex="-1"${audience === 'review' ? ' data-agenda-review="' + asOf + '"' : ''}><div class="sy-agenda-inner"><h2 id="programacion-${id}-title">${text.heading}</h2>
    ${datedHtml ? `<section class="sy-agenda-dates" aria-labelledby="agenda-${id}-dates">${heading('dates', text.dates)}<div class="sy-agenda-grid">${datedHtml}</div></section>` : ''}
    ${weekly.length ? `<section class="sy-agenda-weekly" aria-labelledby="agenda-${id}-weekly">${heading('weekly', text.weekly)}<div class="sy-agenda-weekly-grid">${weekly.map(unit => `<article class="sy-agenda-night" data-record="${unit.id}"><div class="sy-agenda-night-copy"><p class="sy-agenda-weekday">${text.weekdays[unit.weekday]}</p><h4>${unit.artwork ? escapeHtml(unit.title) : link(unit.sourceRefs[0], escapeHtml(unit.title), 'sy-agenda-title-link')}</h4>${description(unit)}</div>${art(unit, true)}</article>`).join('')}</div></section>` : ''}
    ${offers.length ? `<section class="sy-agenda-offers" aria-labelledby="agenda-${id}-offers">${heading('offers', text.offers)}${offers.map(unit => `<article class="sy-agenda-offer" data-record="${unit.id}">${art(unit, true)}<div><p class="sy-agenda-weekday">${text.weekdays[unit.weekday]}${unit.start ? ' · ' + timing(unit, language) : ''}</p><h4>${escapeHtml(unit.title)}</h4>${description(unit)}${unit.conditions ? `<p>${escapeHtml(language === 'en' ? copy[unit.id].conditionsEn : unit.conditions)}</p>` : ''}</div></article>`).join('')}</section>` : ''}
    ${external.length ? `<section class="sy-agenda-outside" aria-labelledby="agenda-${id}-outside">${heading('outside', text.outside)}${external.map(unit => event(unit, true)).join('')}</section>` : ''}
    </div></section>`;
  return { html, ...projection, heldActions };
}
export function integrateAgenda(html, id, rendered, language) {
  let cleaned = html;
  const old = new RegExp('<section class="pb"[^>]*id="programacion-' + id + '"[^>]*>[\\s\\S]*?</section>', 'g');
  const matches = [...html.matchAll(old)];
  assert.equal(matches.length, id === 'houston' ? 1 : 0, 'Unexpected previous agenda count');
  if (matches.length) {
    const start = cleaned.indexOf('<div class="bpd"'); assert.ok(start >= 0, 'Expected the old Houston agenda wrapper');
    const tags = /<\/?div\b[^>]*>/g; tags.lastIndex = start;
    let depth = 0, end = -1;
    for (let token; (token = tags.exec(cleaned));) {
      depth += token[0].startsWith('</') ? -1 : 1;
      if (depth === 0) { end = tags.lastIndex; break; }
    }
    assert.ok(end > start && cleaned.slice(start, end).includes(matches[0][0]), 'Complete legacy agenda wrapper required');
    // Replace its obsolete snapshot, promotions link and inline event emitter together.
    cleaned = cleaned.slice(0, start) + rendered + cleaned.slice(end);
  }
  else {
    const point = '<section class="visit-editorial';
    assert.equal(cleaned.split(point).length, 2, 'Expected one location section');
    cleaned = cleaned.replace(point, rendered + point);
  }
  assert.equal((cleaned.match(/class="sy-agenda"/g) || []).length, 1);
  // Discovery uses the same branch section; no second reservation or menu action.
  const anchor = '<a class="hh-nav-visit"';
  assert.equal(cleaned.split(anchor).length, 2);
  cleaned = cleaned.replace(anchor, `<a class="hh-nav-agenda" href="#programacion-${id}">${language === 'en' ? 'Events' : 'Agenda'}</a>` + anchor);
  return cleaned.replace('</head>', '<link rel="stylesheet" href="/assets/review-agenda/branch-agenda.css"></head>');
}
