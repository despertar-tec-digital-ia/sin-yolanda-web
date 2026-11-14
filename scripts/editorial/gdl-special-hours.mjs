// Authorized dated hours. Recurring hours and earlier approvals stay intact.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {gdlHoursHtml} from '../gdl-operating-hours.mjs';

export const gdlSpecialHours = Object.freeze({
  branchId: 'san-ignacio',
  timeZone: 'America/Mexico_City',
  publishFrom: '2026-11-14T21:32:29.000Z',
  records: Object.freeze([
    {date:'2026-11-15',dayOfWeek:'Sunday',dateLabel:'Domingo 15 de noviembre de 2026',label:'Apertura especial',opens:'19:00',closes:'04:00',closeDate:'2026-11-16',closeLabel:'lunes 16',expiresAt:'2026-11-16T10:00:00.000Z'},
    {date:'2026-11-16',dayOfWeek:'Monday',dateLabel:'Lunes 16 de noviembre de 2026',label:'Revolución Mexicana (feriado)',opens:'19:00',closes:'04:00',closeDate:'2026-11-17',closeLabel:'martes 17',expiresAt:'2026-11-17T10:00:00.000Z'},
    {date:'2026-11-20',dayOfWeek:'Friday',dateLabel:'Viernes 20 de noviembre de 2026',label:'Revolución Mexicana',opens:'19:00',closes:'04:00',closeDate:'2026-11-21',closeLabel:'sábado 21',expiresAt:'2026-11-21T10:00:00.000Z'},
    {date:'2026-12-24',dayOfWeek:'Thursday',dateLabel:'Jueves 24 de diciembre de 2026',label:'Nochebuena',opens:'00:00',closes:'00:00',expiresAt:'2026-12-25T06:00:00.000Z'},
    {date:'2026-12-25',dayOfWeek:'Friday',dateLabel:'Viernes 25 de diciembre de 2026',label:'Navidad',opens:'00:00',closes:'00:00',expiresAt:'2026-12-26T06:00:00.000Z'},
    {date:'2027-01-01',dayOfWeek:'Friday',dateLabel:'Viernes 1 de enero de 2027',label:'Año Nuevo',opens:'00:00',closes:'00:00',expiresAt:'2027-01-02T06:00:00.000Z'},
  ].map(record=>Object.freeze(record))),
});

export const gdlSpecialHoursSpecification = (record=gdlSpecialHours.records[0]) => ({
  '@type': 'OpeningHoursSpecification',
  validFrom: record.date,
  validThrough: record.date,
  dayOfWeek: 'https://schema.org/'+record.dayOfWeek,
  opens: record.opens,
  closes: record.closes,
});

export function gdlSpecialHoursNotice(records=gdlSpecialHours.records) {
  const rows=records.map(record=>{
    const hours=record.opens===record.closes?'Cerrado':`<time datetime="${record.date}T19:00:00-06:00">7:00 p. m.</time> a <time datetime="${record.closeDate}T04:00:00-06:00">4:00 a. m. del ${record.closeLabel}</time>`;
    return `<div data-gdl-special-hours-date="${record.date}" data-expires-at="${record.expiresAt}" style="display:block;padding:.8rem 0;border-bottom:1px solid currentColor"><dt style="display:block;max-width:none"><time datetime="${record.date}">${record.dateLabel}</time><span style="display:block;font-weight:400;font-size:.9rem;margin-top:.2rem">${record.label}</span></dt><dd style="margin:.4rem 0 0;text-align:left;font-size:1rem;white-space:normal">${hours}</dd></div>`;
  }).join('');
  return `<section data-gdl-special-hours aria-label="Horarios especiales" style="margin:0 0 1.25rem;padding:1rem;border-left:4px solid currentColor;background:var(--local-surface,#fff4de);color:var(--local-ink,#30201c)"><h3 style="margin:0 0 .25rem;color:inherit">Horarios especiales</h3><dl style="margin:0">${rows}</dl></section>`;
}

// This small, generated controller also expires an already-open or cached page.
// It uses no storage, analytics, network requests or shared editorial controllers.
function keepSpecialHoursCurrent(doc, win, records) {
  let timer;
  const sameException = (value,record) => value.validFrom === record.date && value.validThrough === record.date && value.opens === record.opens && value.closes === record.closes;
  function cleanSchema(value,expired) {
    if (!value || typeof value !== 'object') return;
    if (value['@type'] === 'Restaurant' && value['@id'] === 'https://sin-yolanda.com/guadalajara#restaurant' && value.specialOpeningHoursSpecification) {
      const remaining = [].concat(value.specialOpeningHoursSpecification).filter(value => !expired.some(record=>sameException(value,record)));
      if (remaining.length) value.specialOpeningHoursSpecification = remaining;
      else delete value.specialOpeningHoursSpecification;
    }
    if (Array.isArray(value['@graph'])) value['@graph'].forEach(value=>cleanSchema(value,expired));
  }
  function refresh() {
    win.clearTimeout(timer);
    const now=Date.now(),expired=records.filter(record=>now>=Date.parse(record.expiresAt));
    const pending=records.map(record=>Date.parse(record.expiresAt)).filter(expiry=>expiry>now);
    doc.querySelectorAll('[data-gdl-special-hours-date]').forEach(node=>{
      if(now>=Date.parse(node.dataset.expiresAt))node.remove();
    });
    doc.querySelectorAll('[data-gdl-special-hours]').forEach(node=>{
      if(!node.querySelector('[data-gdl-special-hours-date]'))node.remove();
    });
    if(!doc.querySelector('[data-gdl-special-hours]'))doc.querySelectorAll('[data-gdl-hours-heading]').forEach(node => {
      if (node.dataset.gdlHoursOriginal) {
        node.textContent = node.dataset.gdlHoursOriginal;
        node.removeAttribute('data-gdl-hours-heading');
        node.removeAttribute('data-gdl-hours-original');
      } else node.remove();
    });
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(node => {
      const value = JSON.parse(node.textContent), before = JSON.stringify(value);
      cleanSchema(value,expired);
      if (JSON.stringify(value) !== before) node.textContent = JSON.stringify(value);
    });
    if(pending.length)timer=win.setTimeout(refresh,Math.min(2147483647,Math.max(1,Math.min(...pending)-now)));
  }
  doc.addEventListener('visibilitychange', () => {if (!doc.hidden) refresh();});
  win.addEventListener('pageshow', refresh);
  win.addEventListener('focus', refresh);
  refresh();
}

export const gdlSpecialHoursClientScript = () => `(${keepSpecialHoursCurrent.toString()})(document,window,${JSON.stringify(gdlSpecialHours.records)});`;

function addRestaurantException(html,records) {
  return html.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g, (tag, content) => {
    const value = JSON.parse(content);
    let changed = false;
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (node['@type'] === 'Restaurant' && node['@id'] === 'https://sin-yolanda.com/guadalajara#restaurant') {
        const previous = [].concat(node.specialOpeningHoursSpecification || []);
        assert.ok(!previous.some(value => records.some(record=>value.validFrom===record.date)), 'Opening exception already projected');
        node.specialOpeningHoursSpecification = [...previous, ...records.map(gdlSpecialHoursSpecification)];
        changed = true;
      }
      if (Array.isArray(node['@graph'])) node['@graph'].forEach(visit);
    }
    visit(value);
    return changed ? tag.replace(content, JSON.stringify(value)) : tag;
  });
}

export function projectGdlSpecialHours(root, inputFiles, now = new Date().toISOString()) {
  const instant = Date.parse(now), start = Date.parse(gdlSpecialHours.publishFrom);
  assert.ok(Number.isFinite(instant), 'Invalid special-hours projection instant');
  const records=instant<start?[]:gdlSpecialHours.records.filter(record=>instant<Date.parse(record.expiresAt));
  const active=records.length>0,expiresAt=gdlSpecialHours.records.at(-1).expiresAt;
  const files = new Map(inputFiles);
  const nextTransitionAt=instant<start?gdlSpecialHours.publishFrom:active?records.map(record=>record.expiresAt).sort()[0]:null;
  const metadata={active,nextTransitionAt,expiresAt,visibleDates:records.map(record=>record.date)};
  if (!active) return {files, metadata};

  const original = gdlHoursHtml();
  for (const file of ['guadalajara.html', 'guadalajara/posadas/index.html']) {
    let html = files.get(file) ?? readFileSync(resolve(root, file), 'utf8');
    const detail = file !== 'guadalajara.html';
    const block = detail ? original.replace('<h3>Horario</h3>', '') : original;
    // Posadas archives before the New Year's Day closure ends.
    if(detail&&!html.includes(block)&&html.includes('Esta temporada<br>ya terminó.'))continue;
    assert.equal(html.split(block).length - 1, 1, 'Expected one confirmed GDL hours block: ' + file);
    const heading = `<h3 data-gdl-hours-heading data-gdl-hours-original="${detail ? '' : 'Horario'}">Horario habitual</h3>`;
    const specialBlock = original.replace('<h3>Horario</h3>', gdlSpecialHoursNotice(records) + heading);
    html = addRestaurantException(html.replace(block, specialBlock),records);
    html = html.replace('</body>', `<script data-gdl-special-hours-clock>${gdlSpecialHoursClientScript()}</script></body>`);
    files.set(file, html);
  }
  const discoveryFile = 'discovery.json';
  const discovery = JSON.parse(files.get(discoveryFile) ?? readFileSync(resolve(root, discoveryFile), 'utf8'));
  const location = discovery.locations.find(item => item.id === gdlSpecialHours.branchId);
  assert.ok(location, 'Missing Guadalajara discovery location');
  const previous = [].concat(location.specialOpeningHoursSpecification || []);
  assert.ok(!previous.some(value => records.some(record=>value.validFrom===record.date)), 'Discovery exception already projected');
  location.specialOpeningHoursSpecification = [...previous, ...records.map(gdlSpecialHoursSpecification)];
  files.set(discoveryFile, JSON.stringify(discovery, null, 2) + '\n');
  return {files, metadata};
}
