// Reproducible, local adoption into the existing source owners. No deployment.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { applyOctoberSiteHtml, photoExports } from './october-site.mjs';
import { applyOctoberHtml, octoberHours, approval } from './editorial/october-2026-update.mjs';
import { renderShell } from './seo.mjs';
const root = resolve(import.meta.dirname, '..'), now = '2026-10-26T18:00:00Z';
const read = file => readFileSync(resolve(root, file), 'utf8'), write = (file, value) => writeFileSync(resolve(root, file), value);
const context = { window: {} }; vm.runInNewContext(read('assets/js/public-data.js'), context);
const data = context.window.SY_DATA;
data.updatedAt = '2026-10-26';
const photos = { 'san-antonio': 'san-antonio-people', houston: 'houston-neon', 'el-paso': 'el-paso-people' };
for (const branch of data.branches) {
  const name = photos[branch.id];
  if (!name) continue;
  const [w,h] = photoExports.find(p => p.name === name).sourceDimensions;
  branch.venuePhoto = `images/approved-20261026/${name}-1200.webp`;
  branch.venuePhotoSet = [480,800,1200,1600].map(w => `images/approved-20261026/${name}-${w}.webp ${w}w`).join(', ');
  branch.venuePhotoWidth = w; branch.venuePhotoHeight = h; branch.venuePosition = '50% 40%';
}
data.branches.sort((a,b) => (a.id === 'moreno-valley') - (b.id === 'moreno-valley'));
for (const event of data.events) {
  if (event.id === 'catrinas-2026') event.occurrences = Object.entries(approval.catrinas).map(([branchId,date]) => ({branchId,date,timeZone:octoberHours.zones[branchId]}));
  if (event.id === 'halloween-2026') {
    event.occurrences = Object.entries(octoberHours.zones).map(([branchId,timeZone]) => ({branchId,date:approval.halloween.date,timeZone}));
    event.description = 'Cover: USD $10. Concurso de disfraces: primer lugar, USD $1,000 en consumo; segundo lugar, una botella.';
  }
}
write('assets/js/public-data.js', 'window.SY_DATA = ' + JSON.stringify(data,null,2) + ';\nif (window.SY_OCTOBER_HOURS) window.SY_OCTOBER_HOURS.applyToData(window.SY_DATA);\n');
let site = read('assets/js/site.js');
site = site.replace('Llevamos la cantina a tu fiesta.', 'Te llevamos la experiencia Sin Yolanda hasta tu lugar');
write('assets/js/site.js', site);
let i18n = read('assets/js/i18n.js');
i18n = i18n.replace('"Llevamos la cantina a tu fiesta.": "', '"Te llevamos la experiencia Sin Yolanda hasta tu lugar": "');
i18n = i18n.replace('"Te llevamos la experiencia Sin Yolanda hasta tu lugar": "We bring the cantina to your party."', '"Te llevamos la experiencia Sin Yolanda hasta tu lugar": "We bring the Sin Yolanda experience to your place"');
if (!i18n.includes(JSON.stringify(octoberHours.summaries.es) + ':')) i18n = i18n.replace('const DICT = {', 'const DICT = {\n    ' + JSON.stringify(octoberHours.summaries.es) + ': ' + JSON.stringify(octoberHours.summaries.en) + ',');
write('assets/js/i18n.js', i18n);
const manifest = JSON.parse(read('scripts/public-manifest.json'));
for (const entry of photoExports) for (const asset of entry.files) if (!manifest.assets.includes(asset.file)) manifest.assets.push(asset.file);
for (const asset of ['assets/js/october-hours.js','assets/css/october-update.css']) { if (!manifest.assets.includes(asset)) manifest.assets.push(asset); manifest.assetVersions[asset] = '20261026-approved-update'; }
for (const asset of ['assets/js/site.js','assets/js/public-data.js','assets/js/i18n.js']) manifest.assetVersions[asset] = '20261026-approved-update';
for (const file of manifest.pages) {
  if (file.includes('/menu/') || file === 'catering.html' || file === 'en/catering/index.html' || file.includes('canta-por-tu-cuenta')) continue;
  let html = applyOctoberSiteHtml(file, read(file));
  if (html.includes('id="site-shell"')) {
    const shell = renderShell(html, new Date(now));
    html = html.replace(/<div id="site-shell" data-seo-prerendered="true">[\s\S]*?<\/div><!-- seo-shell-end -->/, '<div id="site-shell" data-seo-prerendered="true">' + shell + '</div><!-- seo-shell-end -->');
  }
  const id = file.startsWith('en/') ? file.split('/')[1] : file.replace('.html','');
  if (octoberHours.zones[id]) html = applyOctoberHtml(html,id,file.startsWith('en/')?'en':'es',now);
  html = html.replace(/(assets\/js\/(?:site|public-data|i18n)\.js\?v=)[a-z0-9-]+/g, '$120261026-approved-update');
  write(file,html);
}
write('scripts/public-manifest.json', JSON.stringify(manifest,null,2) + '\n');
console.log('Adopted approved photos, dates, catering copy and scheduled operating hours.');
