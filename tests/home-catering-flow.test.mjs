import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/js/site.js',import.meta.url),'utf8');
function block(name){const start=source.indexOf('  function '+name+'(');assert.ok(start>=0);return source.slice(start,source.indexOf('\n  function ',start+1));}
const invoke=(name,...args)=>vm.runInNewContext(block(name)+'\n'+name+'(...args)',{args,page:'home'});
test('Catering priority preserves location and birthday information and routes to its existing edition',()=>{
 const header=invoke('publicHeader');assert.match(header,/href="\/catering" data-i18n-href-es="\/catering" data-i18n-href-en="\/en\/catering\/"/);
 assert.ok(header.indexOf('>Catering<')<header.indexOf('>Eventos<'));assert.match(header,/data-select-location>Ubicaciones/);
 const teaser=invoke('homeCatering');assert.match(teaser,/celebración en Houston/);assert.doesNotMatch(teaser,/WhatsApp|wa\.me|tel:|México|todo Estados Unidos|cotizar/);
 assert.match(teaser,/href="\/catering"/);assert.match(source,/id="cumple"/);
});
test('dated programming and evergreen experience remain separate in data but one shared visual flow',()=>{
 const experience=invoke('homeExperience');assert.match(experience,/id="experiencia"/);assert.match(experience,/Trae a los cuatro\./);assert.match(experience,/assets\/media\/celebration\.webp/);assert.doesNotMatch(experience,/<video/);
 assert.match(source,/<div class="home-gathering">\s*\$\{homeAgenda\(\)\}\s*\$\{homeExperience\(\)\}/);
 assert.match(source,/\$\{venueShowcase\(\)\}\s*\$\{homeCatering\(\)\}/);
});
test('canonical links preserve query and fragment, and leave external, QR and menu URLs intact',()=>{
 for(const [input,expected] of [['index.html#cumple','/#cumple'],['locations.html?x=1#ubicaciones','/locations?x=1#ubicaciones'],
 ['/houston.html','/houston'],['/en/catering/index.html?x=1#menus','/en/catering/?x=1#menus'],
 ['/houston/menu/','/houston/menu/'],['/q/gdl-menu','/q/gdl-menu'],['/q/el-paso-registro','/q/el-paso-registro'],
 ['https://example.com/file.html','https://example.com/file.html'],['#ubicaciones','#ubicaciones']])assert.equal(invoke('canonicalPublicHref',input),expected);
});
