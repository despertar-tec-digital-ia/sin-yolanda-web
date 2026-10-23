import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {focusGuadalajara,originalMenuPage,featuredUntil} from '../scripts/build-gdl-focus-review.mjs';
import {projectGdlAgenda} from '../scripts/editorial/gdl-approved.mjs';
import {projectRoot as root} from '../scripts/package-public.mjs';
import {contestPath,contestRecord,registrationWhatsapp,registrationPhone} from '../scripts/review/gdl-contest-config.mjs';
import {projectContestMeasurement,projectContestGa4Bundle} from '../scripts/review/gdl-contest-measurement.mjs';
import {renderContestPage} from '../scripts/review/gdl-contest-page.mjs';
import {measurementHarness} from './helpers/measurement-harness.mjs';
import {createGa4EventAdapter} from '../scripts/analytics/ga4-event-adapter.mjs';

test('GDL local focus uses the current contest first, leaves other branches and approvals alone',()=>{
  const input=projectGdlAgenda(root,{now:'2026-10-19T20:00:00Z',commit:'a'.repeat(40)}).files.get('guadalajara.html');
  const html=focusGuadalajara(input,{now:'2026-10-19T20:00:00Z'});
  const positions=['id="agenda-san-ignacio-canta"','id="agenda-san-ignacio-solteras"','class="sy-agenda-dates"','id="mesa"'].map(id=>html.indexOf(id));
  assert.ok(positions.every(value=>value>0));assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
  assert.ok(html.includes('href="'+contestPath+'" data-record="'+contestRecord+'"'));
  assert.match(html,/gdl-action-icon[\s\S]*?Ver concurso/);
  assert.match(html,/Tu cantina en Guadalajara/);
  assert.match(html,/id="visita-san-ignacio"[^>]*--local-secondary:#bd4a15/);
  assert.match(html,/id="pie-san-ignacio"[^>]*--local-secondary:#005251/);
  assert.ok(!html.includes('sinyolandagdl.com/canta'));
  assert.ok(!html.includes('Bases e inscripción'));
  assert.equal((html.match(/<article[^>]*data-record="san-ignacio-canta-5-2026"/g)||[]).length,1);
});

test('Featured contest retires from fresh HTML and from an already open tab',()=>{
  const after=projectGdlAgenda(root,{now:featuredUntil,commit:'a'.repeat(40)}).files.get('guadalajara.html');
  const html=focusGuadalajara(after,{now:featuredUntil});
  assert.match(html,/data-gdl-event-feature="active" hidden/);
  assert.match(html,/<p class="hh-invitation gdl-local-invitation">A cantar,<br>bailar y<br>brindar\./);
  const nodes=['active','fallback','active'].map(mode=>({dataset:{gdlEventFeature:mode},hidden:false}));
  const nav={dataset:{contestActiveHref:contestPath,contestFallbackHref:'#programacion-san-ignacio',contestRecord},setAttribute(key,value){this[key]=value;}};
  let instant=Date.parse(featuredUntil)-1,interval;
  vm.runInNewContext(readFileSync(new URL('../scripts/review/gdl-focus.js',import.meta.url),'utf8'),{
    Date:{parse:Date.parse,now:()=>instant},document:{querySelectorAll:selector=>selector==='[data-gdl-contest-link]'?[nav]:nodes,addEventListener(){}},window:{setInterval(fn){interval=fn;}}
  });
  assert.deepEqual(nodes.map(node=>node.hidden),[false,true,false]);
  assert.equal(nav.href,contestPath);assert.equal(nav.dataset.record,contestRecord);
  instant++;interval();assert.deepEqual(nodes.map(node=>node.hidden),[true,false,true]);
  assert.equal(nav.href,'#programacion-san-ignacio');assert.equal(nav.dataset.record,undefined);
});

test('Registration and reservations use different destinations and the same click owner identifies intent',()=>{
  const source=projectContestMeasurement(readFileSync(new URL('../assets/js/site-measurement.js',import.meta.url),'utf8'));
  const state=measurementHarness({source,url:'https://sin-yolanda.com'+contestPath,body:{branch:'san-ignacio'}});
  for(const href of [registrationWhatsapp,registrationPhone,contestPath])state.click(new state.Element({href,dataset:{record:contestRecord}}));
  state.click(new state.Element({href:'https://wa.me/5213310186159'}));
  assert.deepEqual(state.calls.map(([name,data])=>[name,data.destination,data.event_id]),[
    ['programming_action_click','whatsapp',contestRecord],['programming_action_click','phone',contestRecord],['programming_action_click','agenda_section',contestRecord],['reservation_click','whatsapp',undefined]
  ]);
  assert.ok(state.calls.every(([,data])=>!JSON.stringify(data).includes('3319422709')&&!JSON.stringify(data).includes('disponibilidad')));
  const count=state.calls.length;
  state.click(new state.Element({href:'https://wa.me/520000000000',dataset:{record:contestRecord}}));
  assert.equal(state.calls.length,count,'Unregistered registration destination must not become a reservation');
});

test('Dedicated page keeps the 2026 identity, registration contact and original poster distinct',()=>{
  const html=renderContestPage(),expired=renderContestPage({active:false});
  assert.match(html,/noindex,nofollow/);assert.ok(html.includes('https://sin-yolanda.com'+contestPath));
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.equal((html.match(/<li><h3>/g)||[]).length,8);
  assert.ok(html.includes('canta-2026-poster.webp'));
  const main=html.match(/<main\b[\s\S]*?<\/main>/)?.[0];
  assert.ok(main.includes(registrationPhone));assert.ok(!main.includes('3310186159'),'Contest signup stays separate from branch reservations in the footer');
  assert.match(html,/<footer\b[\s\S]*href="https:\/\/wa.me\/5213310186159"/);
  assert.ok(!html.includes('6 de octubre'));
  assert.ok(!html.includes('pase directo a la final'));
  assert.match(expired,/data-gdl-event-feature="fallback"><p>Esta edición ha terminado/);
  assert.match(expired,/data-gdl-event-feature="active" hidden/);
});

test('Dedicated route and registration actions reach GA4 only after consent, with the same scoped contract',()=>{
  const bundle=projectContestGa4Bundle(readFileSync(new URL('../assets/js/ga4-consent.js',import.meta.url),'utf8'));
  const contract=JSON.parse(bundle.match(/window\.SY_GA4_CONTRACT = ([^\n]+);\n/)[1]);
  const config=JSON.parse(readFileSync(new URL('../scripts/analytics/ga4-event-config.json',import.meta.url),'utf8'));
  const source=projectContestMeasurement(readFileSync(new URL('../assets/js/site-measurement.js',import.meta.url),'utf8'));
  let granted=false,adapter;const calls=[];
  const state=measurementHarness({source,url:'https://sin-yolanda.com'+contestPath,body:{branch:'san-ignacio'},beforeRun({window,document}){
    adapter=createGa4EventAdapter({config,contract,hasConsent:()=>granted,readContext:()=>({href:window.location.href,referrer:document.referrer}),sendEvent:(name,data)=>calls.push([name,data])});
    window.syGa4MeasurementObserver=(name,data)=>adapter.event(name,data);
  }});
  const link=new state.Element({href:registrationWhatsapp,dataset:{record:contestRecord}});
  assert.equal(adapter.pageView(),false);state.click(link);assert.equal(calls.length,0);
  granted=true;assert.ok(adapter.configuration());assert.equal(adapter.pageView(),true);assert.equal(adapter.pageView(),false);
  state.click(link);assert.deepEqual(calls.map(([name])=>name),['page_view','programming_action_click']);
  assert.equal(calls[1][1].event_id,contestRecord);assert.equal(calls[1][1].destination,'whatsapp');
  assert.ok(calls.every(([,data])=>!JSON.stringify(data).includes('3319422709')&&!JSON.stringify(data).includes('disponibilidad')));
  granted=false;state.click(link);assert.equal(calls.length,2);
});

test('Original menu replaces stale products, keeps all fifteen pages, source PDF and safe zoom links',()=>{
  const menu={pages:Array.from({length:15},(_,i)=>({page:i+1,label:'Page '+(i+1),width:1800,height:2308,files:[{width:900,file:`p${i+1}-900.webp`},{width:1800,file:`p${i+1}-1800.webp`}]}))};
  const source=readFileSync(new URL('../san-ignacio/menu/index.html',import.meta.url),'utf8');
  const html=originalMenuPage(source,menu);
  assert.equal((html.match(/class="gm-page digital-menu-group"/g)||[]).length,15);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.match(html,/href="\/guadalajara">Volver/);
  assert.match(html,/href="\/assets\/menus\/gdl-v82\/original.pdf" download=/);
  assert.match(html,/rel="canonical" href="https:\/\/sin-yolanda.com\/san-ignacio\/menu\/"/);
  assert.ok(!html.includes('data-menu-item'));assert.ok(!html.includes('type="search"'));
  assert.ok(!html.includes('Caja de coquitas'));
});
