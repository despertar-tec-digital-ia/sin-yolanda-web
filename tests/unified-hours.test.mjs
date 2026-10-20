import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { schemas } from '../scripts/seo.mjs';
import { hours, hoursHtml, summary, summaryEn } from '../scripts/usa-hours.mjs';
import { restoreUnifiedHours } from '../scripts/unified-hours-source-contract.mjs';
import { projectAllAgendas } from '../scripts/editorial/all-agendas.mjs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const hash = value => createHash('sha256').update(value).digest('hex');

test('the October 19 schedule covers all five current branches and keeps midnight and overnight closes distinct', () => {
  assert.equal(hours.effectiveDate, '2026-10-19');
  assert.deepEqual(hours.periods.map(p => [p.days, p.opens ?? '00:00', p.closes ?? '00:00']), [
    [['Monday', 'Tuesday'], '00:00', '00:00'],
    [['Wednesday', 'Thursday'], '16:00', '00:00'],
    [['Friday'], '16:00', '02:00'],
    [['Saturday', 'Sunday'], '10:00', '02:00'],
  ]);
  const context = { window: {} }; vm.runInNewContext(read('assets/js/public-data.js'), context);
  const discovery = JSON.parse(read('discovery.json'));
  assert.equal(Object.keys(hours.zones).length, 5);
  for (const [id, zone] of Object.entries(hours.zones)) {
    const branch = context.window.SY_DATA.branches.find(b => b.id === id);
    assert.equal(branch.hours, summary); assert.equal(branch.hoursTimezone, zone);
    const files = id === 'san-ignacio' ? [['guadalajara.html', 'es']] : [[id + '.html', 'es'], ['en/' + id + '/index.html', 'en']];
    for (const [file, lang] of files) {
      const html = read(file), restaurant = schemas(html).find(s => s['@type'] === 'Restaurant');
      assert.ok(html.includes(hoursHtml(lang, zone)), file);
      assert.equal(restaurant.openingHoursSpecification.length, 4);
      assert.deepEqual(restaurant.openingHoursSpecification, discovery.locations.find(b => b.id === id).openingHoursSpecification);
    }
    assert.equal(discovery.locations.find(b => b.id === id).timeZone, zone);
  }
  assert.ok(read('assets/js/i18n.js').includes(JSON.stringify(summary) + ': ' + JSON.stringify(summaryEn)));
  assert.doesNotMatch(read('locations.html'), /Mié 4–11 pm|Dom 10 am–11 pm|Mié–Sáb · 7:00 pm/);
  const projected = projectAllAgendas(root, { now: '2026-10-31T18:00:00Z', commit: 'a'.repeat(40) }).files.get('guadalajara.html');
  assert.match(projected, /Horario de la sucursal: 10:00 a\. m\.–2:00 a\. m\. del día siguiente\./);
  assert.ok(projected.includes(hoursHtml('es', 'America/Mexico_City')));
});

test('only the exact authorized hours and cache deltas can pass the older complete-file guards', () => {
  const contract = JSON.parse(read('scripts/unified-hours-source-patches.json'));
  for (const [file, entry] of Object.entries(contract.files)) {
    const source = read(file);
    assert.equal(hash(source), entry.afterSha256, file);
    assert.equal(hash(restoreUnifiedHours(file, source)), entry.beforeSha256, file);
    assert.throws(() => restoreUnifiedHours(file, source.replace(entry.patches[0].after, 'unapproved edit')), /Unified hours patch/);
    assert.notEqual(hash(restoreUnifiedHours(file, source + 'unapproved edit')), entry.beforeSha256);
  }
});
