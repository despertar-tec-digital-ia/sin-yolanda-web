// A local review only. Never mutates production owners or enables publication.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { packagePublic, projectRoot, publicSourceDigest } from './package-public.mjs';

const output = resolve(process.argv[2] || '.artifacts/san-diego-opening-20261023/public');
assert.ok(output.startsWith(resolve(projectRoot, '.artifacts') + '/'));
const base = packagePublic({ destination: output, audience: 'review' });
const read = path => readFileSync(resolve(output, path), 'utf8');
const write = (path, text) => writeFileSync(resolve(output, path), text);
const address = '2470 San Diego Avenue, Ste 101–105, San Diego, CA 92110';
const maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
let registry = read('assets/js/public-data.js');
const before = '"address": "San Diego, CA · dirección por confirmar"';
assert.equal(registry.split(before).length, 2);
registry = registry.replace(before, '"address": ' + JSON.stringify(address));
registry = registry.replace('https://www.google.com/maps/search/?api=1&query=San+Diego,+California', maps);
write('assets/js/public-data.js', registry);
const announcement = `<aside class="opening-announcement opening-announcement--san-diego" aria-label="Próximamente en San Diego" data-i18n-aria-es="Próximamente en San Diego" data-i18n-aria-en="Coming soon to San Diego">
  <div class="opening-announcement-inner"><div class="opening-announcement-details">
    <span data-i18n-es="Próximamente" data-i18n-en="Coming soon">Próximamente</span><strong>San Diego</strong>
    <span class="opening-announcement-address">2470 San Diego Avenue, Ste 101–105<br>San Diego, CA 92110</span>
  </div><a class="opening-announcement-link" href="${maps.replaceAll('&','&amp;')}" target="_blank" rel="noopener noreferrer" ><span data-i18n-es="Ver ubicación" data-i18n-en="View location">Ver ubicación</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5"/></svg></a></div>
</aside>`;
let site = read('assets/js/site.js');
const start = site.indexOf('  function openingAnnouncement() {');
const end = site.indexOf('\n  function ', start + 1);
assert.ok(start >= 0 && end > start);
const original = site.slice(start, end);
const replacement = '  function openingAnnouncement() {\n    return ' + JSON.stringify(announcement) + ';\n  }\n';
site = site.slice(0,start) + replacement + site.slice(end);
write('assets/js/site.js', site);
let home = read('index.html');
const marker = '<section class="section venue-showcase"';
assert.equal(home.split(marker).length, 2);
home = home.replace(marker, announcement + '\n' + marker)
  .replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex,nofollow">');
write('index.html', home);
write('assets/css/venue-selector.css', read('assets/css/venue-selector.css') + '\n/* San Diego: exact address, without a date or operating claim. */\n.opening-announcement--san-diego .opening-announcement-address {font-size:14px;line-height:1.5;max-width:320px;}\n@media(max-width:700px){.opening-announcement--san-diego .opening-announcement-address {grid-column:1/-1;font-size:13px;}}\n');
write('assets/js/i18n.js', read('assets/js/i18n.js').replace('const DICT = {', 'const DICT = {\n    "Próximamente en San Diego": "Coming soon to San Diego",\n    "Ver ubicación": "View location",'));
const review = { version:1, date:'2026-10-23', publicationEnabled:false, branch:'san-diego', address,
  openingDate:null, photoChanges:false, source:'Address supplied by Luis in attached screenshot; upcoming status confirmed in chat.',
  changed:['index.html','assets/js/site.js','assets/js/public-data.js','assets/css/venue-selector.css','assets/js/i18n.js'], originalOpeningFunction:original };
const hashes = Object.fromEntries(Object.keys(base.hashes).map(file => [file, createHash('sha256').update(readFileSync(resolve(output,file))).digest('hex')]));
writeFileSync(resolve(output,'../release.json'), JSON.stringify({...base,audience:'local-san-diego-opening-review',publicationEnabled:false,sourcePublicDigest:base.publicDigest,hashes,publicDigest:publicSourceDigest(hashes)},null,2)+'\n');
writeFileSync(resolve(output,'../san-diego-review.json'),JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify({output,publicationEnabled:false,address,openingDate:null}));
