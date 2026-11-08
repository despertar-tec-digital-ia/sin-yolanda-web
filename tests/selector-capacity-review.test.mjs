import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galleryPlan,initCapacityGallery} from '../assets/js/venue-selector-capacity-review.js';
import {buildSelectorReview} from '../scripts/selector-capacity-review.mjs';
import {readFileSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),hash=x=>createHash('sha256').update(x).digest('hex');
for(const count of [7,8])test(`${count} panels retain a readable one-row accordion at the desktop boundary`,()=>{
 for(const width of [960,972,1080,1280]){
  const p=galleryPlan(width,count);assert.equal(p.overflow,false);assert.ok(p.rail>=72);assert.ok(p.open>=340);assert.ok(p.open>p.rail);
  assert.ok(Math.abs(p.span-width)<.01);
 }
});
test('capacity uses available width, preserving a native horizontal rail only when panels no longer fit',()=>{
 assert.equal(galleryPlan(972,10).overflow,true);assert.equal(galleryPlan(1280,10).overflow,false);
 assert.equal(galleryPlan(600,1).open,600);
 for(const count of [2,3])assert.ok(galleryPlan(1280,count).open>galleryPlan(1280,count).rail);
 assert.equal(galleryPlan(0,8),null);assert.equal(galleryPlan(1000,0),null);
});
function harness(width=1000,records=8){
 class Element {
  constructor(dataset={}){this.dataset=dataset;this.hidden=false;this.events={};this.classes=new Set();this.attributes={};}
  classList={toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name),add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),contains:name=>this.classes.has(name)};
  addEventListener(name,fn){(this.events[name]||=[]).push(fn);}
  setAttribute(name,value){this.attributes[name]=value;}
  fire(name,event={}){for(const fn of this.events[name]||[])fn(event);}
 }
 const items=Array.from({length:records},(_,i)=>{
  const item=new Element({region:i===0||i===5?'mx':'us',status:i>=5?'coming-soon':'active'});
  item.card=new Element();item.card.querySelector=()=>null;item.querySelector=()=>item.card;return item;
 });
 items[0].classes.add('is-open');
 const filters=['all','mx','us','soon'].map(venueFilter=>new Element({venueFilter}));
 const gallery=new Element();gallery.clientWidth=width;gallery.getBoundingClientRect=()=>({width:gallery.clientWidth});gallery.scrollLeft=0;gallery.values={};gallery.style={setProperty:(k,v)=>gallery.values[k]=v};gallery.scrollTo=opts=>{gallery.scrollLeft=opts.left;};
 const status={},hover={matches:true,addEventListener:(_,fn)=>{hover.change=fn}},reduced={matches:false};let resized;
 const win={matchMedia:query=>query.includes('reduced-motion')?reduced:hover,document:{documentElement:{lang:'es'}},ResizeObserver:class{constructor(fn){resized=fn;}observe(){}}};
 const el={querySelector:selector=>selector==='[data-venue-gallery]'?gallery:status,querySelectorAll:selector=>selector==='[data-venue-item]'?items:filters};
 initCapacityGallery(el,win);return {items,filters,gallery,status,hover,reduced,resize:()=>resized()};
}
test('eight actual records expand on mouse/focus without consuming native navigation',()=>{
 const h=harness();assert.ok(h.gallery.classes.has('venue-gallery--capacity'));assert.ok(!h.gallery.classes.has('venue-gallery--many'));
 h.items[5].fire('pointerenter',{pointerType:'mouse'});assert.equal(h.items.filter(x=>x.classes.has('is-open'))[0],h.items[5]);
 h.items[2].fire('pointerenter',{pointerType:'touch'});assert.ok(h.items[5].classes.has('is-open'));
 h.items[1].card.fire('focus');assert.ok(h.items[1].classes.has('is-open'));
 assert.ok(h.items.every(x=>!x.events.click&&!x.card.events.click));
});
test('filters, resizing and touch-capability changes preserve one selected visible record',()=>{
 const h=harness();h.items[5].fire('pointerenter',{pointerType:'mouse'});
 h.filters[2].fire('click');assert.equal(h.items.filter(x=>!x.hidden).length,6);assert.equal(h.items.filter(x=>!x.hidden&&x.classes.has('is-open')).length,1);
 h.filters[0].fire('click');assert.equal(h.items.filter(x=>!x.hidden).length,8);assert.ok(h.gallery.classes.has('venue-gallery--capacity'));
 h.gallery.clientWidth=1200;h.resize();assert.ok(parseFloat(h.gallery.values['--venue-rail-width'])>=72);
 assert.ok(!h.gallery.classes.has('venue-gallery--sizing'));
 h.hover.matches=false;h.hover.change();assert.ok(!h.gallery.classes.has('venue-gallery--capacity'));
});
test('keyboard focus can reach overflowing future collections without changing focus or intercepting clicks',()=>{
 const h=harness(972,10);assert.ok(h.gallery.classes.has('venue-gallery--rail'));
 h.items[9].card.fire('focus');assert.ok(h.gallery.scrollLeft>0);assert.ok(h.items[9].classes.has('is-open'));
});
test('review artifact changes only the two selectors and adds two opt-in assets',t=>{
 const out=resolve(root,'.artifacts/selector-capacity-test-'+process.pid);t.after(()=>rmSync(out,{recursive:true,force:true}));
 const report=buildSelectorReview({root,out,now:'2026-11-07T19:00:00Z'});
 assert.equal(report.productionIntegrated,false);
 for(const[file,expected]of Object.entries(report.selectorReview.baselineHashes)){
  if(['index.html','locations.html'].includes(file))continue;
  assert.equal(hash(readFileSync(resolve(out,'public',file))),expected,file);
 }
 for(const file of report.selectorReview.changedPages){
  const html=readFileSync(resolve(out,'public',file),'utf8');assert.match(html,/type="module" src="\/assets\/js\/venue-selector-capacity-review\.js/);
  assert.doesNotMatch(html,/<script src="assets\/js\/venue-selector\.js/);assert.match(html,/noindex,nofollow/);
 }
});
