import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {focusGuadalajara,originalMenuPage,featuredUntil} from '../scripts/build-gdl-focus-review.mjs';
import {projectGdlAgenda} from '../scripts/editorial/gdl-approved.mjs';
import {projectRoot as root} from '../scripts/package-public.mjs';

test('GDL local focus uses the current contest first, leaves other branches and approvals alone',()=>{
  const input=projectGdlAgenda(root,{now:'2026-10-19T20:00:00Z',commit:'a'.repeat(40)}).files.get('guadalajara.html');
  const html=focusGuadalajara(input,{now:'2026-10-19T20:00:00Z'});
  const positions=['id="agenda-san-ignacio-canta"','id="agenda-san-ignacio-solteras"','class="sy-agenda-dates"','id="mesa"'].map(id=>html.indexOf(id));
  assert.ok(positions.every(value=>value>0));assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
  assert.match(html,/href="#programacion-san-ignacio">Ver concurso/);
  assert.match(html,/Tu cantina en Guadalajara/);
  assert.match(html,/id="visita-san-ignacio"[^>]*--local-secondary:#bd4a15/);
  assert.match(html,/id="pie-san-ignacio"[^>]*--local-secondary:#005251/);
  assert.ok(!html.includes('sinyolandagdl.com/canta'));
  assert.ok(!html.includes('Bases e inscripción'));
  assert.equal((html.match(/data-record="san-ignacio-canta-5-2026"/g)||[]).length,1);
});

test('Featured contest retires from fresh HTML and from an already open tab',()=>{
  const after=projectGdlAgenda(root,{now:featuredUntil,commit:'a'.repeat(40)}).files.get('guadalajara.html');
  const html=focusGuadalajara(after,{now:featuredUntil});
  assert.match(html,/data-gdl-event-feature="active" hidden/);
  assert.match(html,/data-gdl-event-feature="fallback">Pasa a la/);
  const nodes=['active','fallback','active'].map(mode=>({dataset:{gdlEventFeature:mode},hidden:false}));
  let instant=Date.parse(featuredUntil)-1,interval;
  vm.runInNewContext(readFileSync(new URL('../scripts/review/gdl-focus.js',import.meta.url),'utf8'),{
    Date:{parse:Date.parse,now:()=>instant},document:{querySelectorAll:()=>nodes,addEventListener(){}},window:{setInterval(fn){interval=fn;}}
  });
  assert.deepEqual(nodes.map(node=>node.hidden),[false,true,false]);
  instant++;interval();assert.deepEqual(nodes.map(node=>node.hidden),[true,false,true]);
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
