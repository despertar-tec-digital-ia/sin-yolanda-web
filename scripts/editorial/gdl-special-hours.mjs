// One authorized opening exception. Recurring hours and earlier approvals stay intact.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {gdlHoursHtml} from '../gdl-operating-hours.mjs';

export const gdlSpecialHours = Object.freeze({
  branchId: 'san-ignacio',
  timeZone: 'America/Mexico_City',
  publishFrom: '2026-11-14T21:32:29.000Z',
  date: '2026-11-15',
  opens: '19:00',
  closes: '04:00',
  expiresAt: '2026-11-16T10:00:00.000Z',
});

export const gdlSpecialHoursSpecification = () => ({
  '@type': 'OpeningHoursSpecification',
  validFrom: gdlSpecialHours.date,
  validThrough: gdlSpecialHours.date,
  dayOfWeek: 'https://schema.org/Sunday',
  opens: gdlSpecialHours.opens,
  closes: gdlSpecialHours.closes,
});

export function gdlSpecialHoursNotice() {
  return `<aside data-gdl-special-hours data-expires-at="${gdlSpecialHours.expiresAt}" aria-label="Apertura especial" style="margin:0 0 1rem;padding:1rem;border-left:4px solid currentColor;background:var(--local-surface,#fff4de);color:var(--local-ink,#30201c)"><strong>Apertura especial · Domingo 15 de noviembre</strong><p style="margin:.5rem 0 0"><time datetime="2026-11-15T19:00:00-06:00">7:00 p. m.</time> a <time datetime="2026-11-16T04:00:00-06:00">4:00 a. m. del lunes 16</time>.</p></aside>`;
}

// This small, generated controller also expires an already-open or cached page.
// It uses no storage, analytics, network requests or shared editorial controllers.
function keepSpecialHoursCurrent(doc, win, expiresAt, date) {
  let timer;
  const expiry = Date.parse(expiresAt);
  const sameException = value => value.validFrom === date && value.validThrough === date && value.opens === '19:00' && value.closes === '04:00';
  function cleanSchema(value) {
    if (!value || typeof value !== 'object') return;
    if (value['@type'] === 'Restaurant' && value['@id'] === 'https://sin-yolanda.com/guadalajara#restaurant' && value.specialOpeningHoursSpecification) {
      const records = [].concat(value.specialOpeningHoursSpecification).filter(record => !sameException(record));
      if (records.length) value.specialOpeningHoursSpecification = records;
      else delete value.specialOpeningHoursSpecification;
    }
    if (Array.isArray(value['@graph'])) value['@graph'].forEach(cleanSchema);
  }
  function refresh() {
    win.clearTimeout(timer);
    if (Date.now() < expiry) {
      timer = win.setTimeout(refresh, Math.min(2147483647, Math.max(1, expiry - Date.now())));
      return;
    }
    doc.querySelectorAll('[data-gdl-special-hours]').forEach(node => node.remove());
    doc.querySelectorAll('[data-gdl-hours-heading]').forEach(node => {
      if (node.dataset.gdlHoursOriginal) {
        node.textContent = node.dataset.gdlHoursOriginal;
        node.removeAttribute('data-gdl-hours-heading');
        node.removeAttribute('data-gdl-hours-original');
      } else node.remove();
    });
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(node => {
      const value = JSON.parse(node.textContent), before = JSON.stringify(value);
      cleanSchema(value);
      if (JSON.stringify(value) !== before) node.textContent = JSON.stringify(value);
    });
  }
  doc.addEventListener('visibilitychange', () => {if (!doc.hidden) refresh();});
  win.addEventListener('pageshow', refresh);
  win.addEventListener('focus', refresh);
  refresh();
}

export const gdlSpecialHoursClientScript = () => `(${keepSpecialHoursCurrent.toString()})(document,window,${JSON.stringify(gdlSpecialHours.expiresAt)},${JSON.stringify(gdlSpecialHours.date)});`;

function addRestaurantException(html) {
  return html.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g, (tag, content) => {
    const value = JSON.parse(content);
    let changed = false;
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (node['@type'] === 'Restaurant' && node['@id'] === 'https://sin-yolanda.com/guadalajara#restaurant') {
        const previous = [].concat(node.specialOpeningHoursSpecification || []);
        assert.ok(!previous.some(record => record.validFrom === gdlSpecialHours.date), 'Opening exception already projected');
        node.specialOpeningHoursSpecification = [...previous, gdlSpecialHoursSpecification()];
        changed = true;
      }
      if (Array.isArray(node['@graph'])) node['@graph'].forEach(visit);
    }
    visit(value);
    return changed ? tag.replace(content, JSON.stringify(value)) : tag;
  });
}

export function projectGdlSpecialHours(root, inputFiles, now = new Date().toISOString()) {
  const instant = Date.parse(now), start = Date.parse(gdlSpecialHours.publishFrom), end = Date.parse(gdlSpecialHours.expiresAt);
  assert.ok(Number.isFinite(instant), 'Invalid special-hours projection instant');
  const active = instant >= start && instant < end;
  const files = new Map(inputFiles);
  const nextTransitionAt = instant < start ? gdlSpecialHours.publishFrom : active ? gdlSpecialHours.expiresAt : null;
  if (!active) return {files, metadata: {active, nextTransitionAt, expiresAt: gdlSpecialHours.expiresAt}};

  const original = gdlHoursHtml();
  for (const file of ['guadalajara.html', 'guadalajara/posadas/index.html']) {
    let html = files.get(file) ?? readFileSync(resolve(root, file), 'utf8');
    const detail = file !== 'guadalajara.html';
    const block = detail ? original.replace('<h3>Horario</h3>', '') : original;
    assert.equal(html.split(block).length - 1, 1, 'Expected one confirmed GDL hours block: ' + file);
    const heading = `<h3 data-gdl-hours-heading data-gdl-hours-original="${detail ? '' : 'Horario'}">Horario habitual</h3>`;
    const specialBlock = original.replace('<h3>Horario</h3>', gdlSpecialHoursNotice() + heading);
    html = addRestaurantException(html.replace(block, specialBlock));
    html = html.replace('</body>', `<script data-gdl-special-hours-clock>${gdlSpecialHoursClientScript()}</script></body>`);
    files.set(file, html);
  }
  const discoveryFile = 'discovery.json';
  const discovery = JSON.parse(files.get(discoveryFile) ?? readFileSync(resolve(root, discoveryFile), 'utf8'));
  const location = discovery.locations.find(item => item.id === gdlSpecialHours.branchId);
  assert.ok(location, 'Missing Guadalajara discovery location');
  const previous = [].concat(location.specialOpeningHoursSpecification || []);
  assert.ok(!previous.some(record => record.validFrom === gdlSpecialHours.date), 'Discovery exception already projected');
  location.specialOpeningHoursSpecification = [...previous, gdlSpecialHoursSpecification()];
  files.set(discoveryFile, JSON.stringify(discovery, null, 2) + '\n');
  return {files, metadata: {active, nextTransitionAt, expiresAt: gdlSpecialHours.expiresAt}};
}
