import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = file => fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const source=read('assets/js/site.js');
const block=name=>{const start=source.indexOf('  function '+name+'(');assert.ok(start>=0);return source.slice(start,source.indexOf('\n  function ',start+1));};
const dataContext={window:{}};vm.runInNewContext(read('assets/js/public-data.js'),dataContext);const data=dataContext.window.SY_DATA;

test('group footer gives each open location a real link and separates unlinked future locations',()=>{
 const html=vm.runInNewContext(block('groupFooter')+'\ngroupFooter()',{data,Date});
 assert.match(html,/class="footer-brand-link" href="\/"/);
 assert.match(html,/width="1164" height="312"/);
 assert.equal((html.match(/href="el-paso.html"/g)||[]).length,1);
 const next=html.slice(html.indexOf('class="group-footer-upcoming"'));
 assert.match(next,/Moreno Valley/);assert.match(next,/San Diego/);assert.doesNotMatch(next,/El Paso|href="#"/);
 for(const branch of data.branches.filter(b=>b.status==='active')) assert.ok(html.includes(`href="${branch.page}"`));
 assert.doesNotMatch(html,/OpenTable en Texas|maricarmen|instagram\.com|tel:/);
 assert.match(html,/aviso-de-privacidad.html/);
});

test('future locations have two independent responsive photographs, still illustrative and unlinked',()=>{
 const future=data.branches.filter(b=>['moreno-valley','san-diego'].includes(b.id));
 assert.notEqual(future[0].venuePhoto,future[1].venuePhoto);
 for(const branch of future){
  assert.match(branch.venuePhoto,/assets\/media\/venues\/future\//);
  assert.equal(branch.venuePhotoKind,'brand-illustrative');assert.equal(branch.status,'coming-soon');assert.equal(branch.page,'#');
  assert.ok(branch.venuePhotoWidth>0&&branch.venuePhotoHeight>0);
  for(const variant of branch.venuePhotoSet.split(', ')){const file=variant.split(' ')[0];assert.ok(fs.statSync(new URL('../'+file,import.meta.url)).size>0);}
 }
});

test('agenda keeps a same-photo lightweight background and a bounded advance-load trigger',()=>{
 const css=read('assets/css/visual-pilot.css');assert.match(css,/agenda-canto-preview\.webp/);assert.match(css,/\.home-agenda-media img \{[^}]*inset: 0/);
 assert.ok(fs.statSync(new URL('../assets/media/agenda-canto-preview.webp',import.meta.url)).size<2048);
 let observer,options,disconnected=false;const image={loading:'lazy',parentElement:{}};
 vm.runInNewContext(block('initAgendaImage')+'\ninitAgendaImage()',{
  document:{querySelector:()=>image},IntersectionObserver:class{
   constructor(callback,opts){observer=callback;options=opts;}observe(target){assert.equal(target,image.parentElement);}disconnect(){disconnected=true;}
  }
 });
 assert.equal(options.rootMargin,'1600px 0px');observer([{isIntersecting:false}]);assert.equal(image.loading,'lazy');
 observer([{isIntersecting:true}]);assert.equal(image.loading,'eager');assert.equal(disconnected,true);
});

test('header adapts only on home and stays stable while the mobile menu is open',()=>{
 const callbacks={},queue=[];let menuOpen=false;
 const header={dataset:{},offsetHeight:80,querySelector:()=>menuOpen,addEventListener:(name,fn)=>callbacks[name]=fn};
 const section={dataset:{headerTone:'light'},bounds:{top:1000,bottom:1800},getBoundingClientRect(){return this.bounds;}};
 vm.runInNewContext(block('initHeaderThemes')+'\ninitHeaderThemes()',{
  page:'home',document:{querySelector:()=>header,querySelectorAll:()=>[section]},
  window:{addEventListener:(name,fn)=>callbacks[name]=fn},requestAnimationFrame:fn=>queue.push(fn)
 });
 assert.equal(header.dataset.tone,'dark');
 section.bounds={top:0,bottom:500};callbacks.scroll();callbacks.scroll();assert.equal(queue.length,1);queue.shift()();assert.equal(header.dataset.tone,'light');
 menuOpen=true;section.bounds={top:1000,bottom:1800};callbacks.scroll();queue.shift()();assert.equal(header.dataset.tone,'light');
 menuOpen=false;callbacks.click();queue.shift()();assert.equal(header.dataset.tone,'dark');
 vm.runInNewContext(block('initHeaderThemes')+'\ninitHeaderThemes()',{
  page:'locations',document:{querySelector:()=>{assert.fail('Other pages retain their approved header');}}
 });
});
