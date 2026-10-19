import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
export const hours = JSON.parse(readFileSync(resolve(root, 'scripts/usa-operating-hours.json')));
export const specification = () => hours.periods.map(period => ({
  '@type': 'OpeningHoursSpecification', dayOfWeek: period.days.map(day => 'https://schema.org/' + day),
  opens: period.closed ? '00:00' : period.opens, closes: period.closed ? '00:00' : period.closes,
}));
const label = (value, language) => {
  const [hour, minute] = value.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${language === 'en' ? (hour < 12 ? 'AM' : 'PM') : (hour < 12 ? 'a. m.' : 'p. m.')}`;
};
export const summary = 'Lun–Mar cerrado · Mié–Jue 4 pm–12 am · Vie 4 pm–2 am · Sáb–Dom 10 am–2 am';
export const summaryEn = 'Mon–Tue closed · Wed–Thu 4 pm–12 am · Fri 4 pm–2 am · Sat–Sun 10 am–2 am';
export function hoursHtml(language, zone) {
  assert.ok(['es', 'en'].includes(language) && Object.values(hours.zones).includes(zone));
  const en = language === 'en';
  const rows = hours.periods.map(period => `<div><dt>${period[language]}</dt><dd>${period.closed ? (en ? 'Closed' : 'Cerrado') :
    `<time datetime="${period.opens}">${label(period.opens, language)}</time><span aria-hidden="true"> – </span><span class="ve-sr"> ${en ? 'to' : 'a'} </span><time datetime="${period.closes}">${label(period.closes, language)}</time>`}</dd></div>`).join('');
  return `<div class="ve-hours" data-hours-zone="${zone}"><h3>${en ? 'Hours' : 'Horario'}</h3><dl>${rows}</dl><p class="ve-sr">${en ? 'Local time. A 2:00 AM closing is on the following day.' : 'Hora local. El cierre a las 2:00 a. m. corresponde al día siguiente.'}</p></div>`;
}

// Official post-import synchronization: no donor checkout or network access.
export function syncHours() {
  // Historical SEO baselines remain immutable; the bounded hours contract restores this release.
  for (const [id, zone] of Object.entries(hours.zones)) {
    for (const [file, language] of (id === 'san-ignacio' ? [['guadalajara.html', 'es']] : [[id + '.html', 'es'], ['en/' + id + '/index.html', 'en']])) {
      let source = readFileSync(resolve(root, file), 'utf8');
      const updateSchema = text => text.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/, (tag, content) => {
        const schema = JSON.parse(content);
        assert.equal(schema['@type'], 'Restaurant');
        schema.openingHoursSpecification = specification();
        return '<script type="application/ld+json">' + JSON.stringify(schema) + '</script>';
      });
      source = updateSchema(source);
      const block = hoursHtml(language, zone);
      if (source.includes('class="ve-hours"')) source = source.replace(/<div class="ve-hours"[^>]*>[\s\S]*?<\/dl>(?:<p[^>]*>[\s\S]*?<\/p>)?<\/div>/, block);
      else {
        const contact = source.match(/<a class="ve-phone"[^>]*>[\s\S]*?<\/a>/)?.[0];
        assert.ok(contact, 'Missing visit contact: ' + file);
        assert.ok(source.includes(contact + '</div>'), 'Missing visit actions boundary: ' + file);
        source = source.replace(contact + '</div>', contact + '</div>' + block);
      }
      writeFileSync(resolve(root, file), source);
    }
  }
  const dataPath = resolve(root, 'assets/js/public-data.js');
  const context = { window: {} }; vm.runInNewContext(readFileSync(dataPath, 'utf8'), context);
  for (const branch of context.window.SY_DATA.branches) if (hours.zones[branch.id]) {
    branch.hours = summary; branch.hoursTimezone = hours.zones[branch.id];
  }
  writeFileSync(dataPath, 'window.SY_DATA = ' + JSON.stringify(context.window.SY_DATA, null, 2) + ';\n');
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.dirname, 'usa-hours.mjs')) syncHours();
