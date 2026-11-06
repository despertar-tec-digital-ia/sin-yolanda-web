import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {buildOpenTableReview,validateWidget} from '../scripts/opentable-review.mjs';
import {measurementHarness} from './helpers/measurement-harness.mjs';
const root=resolve(import.meta.dirname,'..');
test('widget pilot uses four distinct verified RIDs and rejects another host or crossed fallback',()=>{
  const c=JSON.parse(readFileSync(resolve(root,'scripts/editorial/opentable-review.json')));validateWidget(c);
  assert.deepEqual(Object.fromEntries(c.branches.map(b=>[b.slug,b.rid])),{'houston':1524058,'the-woodlands':1503490,'el-paso':1559290,'san-antonio':1484191});
  const wrong=structuredClone(c);wrong.branches[0].fallback=c.branches[1].fallback;
  assert.throws(()=>validateWidget(wrong));
  const host=structuredClone(c);host.branches[0].loader=host.branches[0].loader.replace('www.opentable.com','other.example');
  assert.throws(()=>validateWidget(host));
});
test('pilot changes only eight branch pages and adds no captures, guest data or production assets',t=>{
  const out=resolve(root,'.artifacts/ot-test-'+process.pid);t.after(()=>rmSync(out,{recursive:true,force:true}));
  const report=buildOpenTableReview({root,out,now:'2026-11-05T12:00:00Z'});
  const base=JSON.parse(readFileSync(resolve(out,'baseline-release.json')));
  const sha=b=>createHash('sha256').update(b).digest('hex');
  assert.equal(report.productionIntegrated,false);assert.equal(report.bookingPilot.changedPages.length,8);
  for(const[file,expected]of Object.entries(base.hashes)){
    const data=readFileSync(resolve(out,'public',file));
    if(!report.bookingPilot.changedPages.includes(file)){assert.equal(sha(data),expected,file);continue;}
    const html=data.toString(),slug=file.startsWith('en/')?file.split('/')[1]:file.replace('.html','');
    assert.equal((html.match(/data-opentable-pilot=/g)||[]).length,1);
    assert.equal((html.match(/data-booking-open/g)||[]).length,3,'Hero, local action and footer all retain real links');
    const destinations=[...html.matchAll(/<a[^>]+(?:data-booking-open|data-booking-direct)[^>]+href="([^"]+)"/g)].map(m=>new URL(m[1].replaceAll('&amp;','&')));
    assert.equal(destinations.length,3);
    for(const url of destinations){assert.equal(url.origin,'https://www.opentable.com');assert.equal(url.searchParams.get('restref'),String(report.bookingPilot.rids[report.bookingPilot.changedPages.indexOf(file)>>1]));}
    assert.ok(!/<script[^>]+src="https:\/\/www.opentable.com/.test(html),'Provider does not load until visitor intent');
    assert.ok(html.includes('data-booking-host hidden'),'No empty widget box before activation');
    assert.ok(!html.includes('data-booking-direct'),'No competing second reservation path');
    assert.ok(!html.includes('Abrir directamente en OpenTable'));
    const measurement=measurementHarness({url:'https://sin-yolanda.com/'+(file.startsWith('en/')?'en/'+slug:slug),body:{branch:slug},beforeRun:({document})=>document.documentElement.lang=file.startsWith('en/')?'en':'es'});
    measurement.click(new measurement.Element({href:destinations[0].href,classes:['hh-reserve']}));
    assert.equal(measurement.calls.length,1,'A reservation entry remains one measured intention');
    assert.equal(measurement.calls[0][0],'reservation_click');
    assert.equal(measurement.calls[0][1].branch,slug);
    assert.ok(!measurement.calls.some(([name])=>/confirm/.test(name)));
    assert.ok(!html.includes('<input'),'No duplicate form or contact capture');
    assert.ok(html.includes('ot_source=Restaurant+website'));
    assert.ok(html.includes(file.startsWith('en/')?'lang=en-US':'lang=es-MX'));
  }
  const manifest=JSON.parse(readFileSync(resolve(root,'scripts/public-manifest.json')));
  assert.ok(!manifest.assets.includes('assets/css/opentable-review.css'));
  assert.ok(!manifest.assets.includes('assets/js/opentable-review.js'));
  for (const file of report.bookingPilot.changedPages) assert.ok(readFileSync(resolve(out,'public',file),'utf8').includes('src="/assets/js/opentable-review.js?v=20261106-composition"'));
});

// Reproduce the provider's close behavior: its iframe disappears and focus falls to body.
test('closing the provider modal restores the live widget without scrolling or stealing another focus',async()=>{
  const {watchBookingModal}=await import('../assets/js/opentable-review.js');
  let currentModal=null,notify;
  const calls=[];
  const widget={isConnected:true,focus:opts=>calls.push(opts)};
  const section={querySelector:()=>widget};
  const body={isConnected:true};
  const doc={body,activeElement:body,documentElement:{lang:'en'},createElement:()=>({setAttribute(){},addEventListener(){}}),querySelector:selector=>selector==='[data-opentable-pilot]'?section:currentModal?{closest:()=>currentModal}:null};
  class Observer{constructor(fn){notify=fn;}observe(){}}
  watchBookingModal(doc,Observer);
  notify(); assert.equal(calls.length,0,'No modal means no focus change');
  currentModal={querySelector:()=>null,setAttribute(){},append(){}};notify();currentModal=null;notify();
  assert.deepEqual(calls,[{preventScroll:true}]);
  currentModal={querySelector:()=>null,setAttribute(){},append(){}};notify();doc.activeElement={isConnected:true};currentModal=null;notify();
  assert.equal(calls.length,1,'Preserve focus explicitly moved by the visitor');
  currentModal={querySelector:()=>null,setAttribute(){},append(){}};notify();doc.activeElement=body;widget.isConnected=false;currentModal=null;notify();
  assert.equal(calls.length,1,'Never focus a stale widget after navigation');
});

function manualTimers(){
  const pending=new Map();let sequence=0;
  return {pending,setTimeout(fn){pending.set(++sequence,fn);return sequence;},clearTimeout(id){pending.delete(id);},fire(){const fns=[...pending.values()];pending.clear();for(const fn of fns)fn();}};
}

test('booking activation loads once, keeps native alternatives on timeout and ignores late arrivals',async()=>{
  const {createBookingLoad}=await import('../assets/js/opentable-review.js');
  const timers=manualTimers(),states=[];let callbacks,requests=0;
  const load=createBookingLoad({timers,render:s=>states.push(s),load:c=>{callbacks=c;requests++;}});
  assert.equal(requests,0,'No third-party request before intent');
  assert.equal(load.start(),true);assert.equal(load.start(),true);assert.equal(requests,1);
  assert.deepEqual(states,['loading']);timers.fire();assert.equal(load.state,'external');
  callbacks.widgetLoaded();assert.equal(load.state,'external','Late iframe cannot hide the fallback');
  assert.equal(load.start(),false,'Fallback clicks must retain native navigation');
  assert.deepEqual(states,['loading','external']);
});

test('widget loading is only a display state; error and disposal never emit a reservation confirmation',async()=>{
  const {createBookingLoad}=await import('../assets/js/opentable-review.js');
  const timers=manualTimers(),states=[];let callbacks;
  const load=createBookingLoad({timers,render:s=>states.push(s),load:c=>callbacks=c});
  load.start();callbacks.widgetLoaded();timers.fire();assert.equal(load.state,'embedded');
  assert.deepEqual(states,['loading','embedded']);
  load.dispose();callbacks.failed();assert.equal(load.state,'embedded');assert.equal(load.start(),false);
  const failed=createBookingLoad({timers,render:s=>states.push(s),load:()=>{throw new Error('provider failed');}});
  assert.doesNotThrow(()=>failed.start());assert.equal(failed.state,'external');
  assert.ok(!states.some(s=>/confirm|reserved|success/.test(s)));
});

test('booking enhancement respects open-in-new-tab modifiers, middle click and prior cancellation',async()=>{
  const {shouldEnhanceBooking}=await import('../assets/js/opentable-review.js');
  assert.equal(shouldEnhanceBooking({button:0}),true);
  for(const change of [{button:1},{metaKey:true},{ctrlKey:true},{shiftKey:true},{altKey:true},{defaultPrevented:true}])assert.equal(shouldEnhanceBooking({button:0,...change}),false);
});

test('page adapter stays usable after a cached back navigation and fails open on invalid configuration',async()=>{
  const {initializeBooking}=await import('../assets/js/opentable-review.js');
  class Node extends EventTarget {
    attributes=new Map(); hidden=false; textContent=''; isConnected=true;
    getAttribute(key){return this.attributes.get(key)??null;}
    setAttribute(key,value){this.attributes.set(key,String(value));}
    hasAttribute(key){return this.attributes.has(key);}
    removeAttribute(key){this.attributes.delete(key);}
    querySelectorAll(){return [];}
    focus(){this.focused=true;}
    scrollIntoView(){this.scrolled=true;}
  }
  const fixture=()=>{
    const section=new Node(),host=new Node(),status=new Node(),start=new Node(),placeholder=new Node(),title=new Node();
    const timers=manualTimers(),win=new EventTarget(),observers=[],scripts=[];
    Object.assign(win,timers,{location:{hash:''},MutationObserver:class {
      constructor(notify){this.notify=notify;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}
    }});
    section.id='reservar-houston';host.id=section.id+'-form';host.hidden=true;
    section.setAttribute('data-opentable-pilot','1524058');
    section.setAttribute('data-booking-loader','https://www.opentable.com/widget/reservation/loader?rid=1524058');
    const nodes={'[data-booking-host]':host,'[data-booking-status]':status,'[data-booking-start]':start,'[data-booking-placeholder]':placeholder,h2:title};
    section.querySelector=selector=>nodes[selector]??null;
    host.append=script=>scripts.push(script);host.querySelector=()=>null;
    const doc={defaultView:win,body:new Node(),documentElement:{lang:'en'},querySelector:selector=>selector==='[data-opentable-pilot]'?section:null,querySelectorAll:()=>[start],createElement:()=>new Node()};
    return {doc,section,host,status,start,placeholder,title,win,observers,scripts,timers};
  };
  const f=fixture(),controller=initializeBooking(f.doc);
  assert.equal(f.scripts.length,0);
  const cachedExit=new Event('pagehide');Object.defineProperty(cachedExit,'persisted',{value:true});
  f.win.dispatchEvent(cachedExit);
  const click=new Event('click',{cancelable:true});f.start.dispatchEvent(click);
  assert.equal(click.defaultPrevented,true);assert.equal(controller.state,'loading');
  assert.equal(f.scripts.length,1);assert.ok(f.title.focused&&f.section.scrolled);
  f.start.dispatchEvent(new Event('click',{cancelable:true}));assert.equal(f.scripts.length,1);
  const submit=new Node(),form=new Node(),inline=new Node();form.querySelector=()=>submit;inline.querySelector=selector=>selector==='form'?form:null;f.host.querySelector=()=>inline;f.observers[1].notify();
  assert.equal(controller.state,'embedded');assert.equal(f.start.hidden,true);assert.equal(f.host.hidden,false);
  f.win.dispatchEvent(new Event('pagehide'));assert.equal(controller.start(),false);
  assert.ok(f.observers.every(o=>o.disconnected));assert.equal(f.timers.pending.size,0);
  const invalid=fixture();invalid.section.setAttribute('data-booking-loader','https://other.example/widget/reservation/loader?rid=1524058');
  assert.equal(initializeBooking(invalid.doc),null);
  const native=new Event('click',{cancelable:true});invalid.start.dispatchEvent(native);
  assert.equal(native.defaultPrevented,false);assert.equal(invalid.scripts.length,0);
  const near=fixture();let visibility,disconnected=false;
  near.win.IntersectionObserver=class{constructor(notify){visibility=notify;}observe(target){assert.equal(target,near.section);}disconnect(){disconnected=true;}};
  const lazy=initializeBooking(near.doc);visibility([{isIntersecting:false}]);assert.equal(lazy.state,'idle');
  visibility([{isIntersecting:true}]);visibility([{isIntersecting:true}]);
  assert.equal(lazy.state,'loading');assert.equal(near.scripts.length,1);assert.equal(disconnected,true);
  assert.equal(near.start.hidden,true,'No second booking action while loading');assert.equal(near.placeholder.hidden,false);
  near.timers.fire();assert.equal(near.host.hidden,true);assert.equal(near.start.hidden,false);
  const fallback=new Event('click',{cancelable:true});near.start.dispatchEvent(fallback);
  assert.equal(fallback.defaultPrevented,false,'The single recovery action opens the real provider URL');
});

test('native search reports only sanitized intention through existing adapters and never interrupts booking',async()=>{
  const {reportBookingIntent}=await import('../assets/js/opentable-review.js');
  const h=measurementHarness({url:'https://sin-yolanda.com/houston',body:{branch:'houston'}}),observed=[];
  h.window.syGa4MeasurementObserver=(...args)=>observed.push(args);
  await reportBookingIntent(h.window,'houston','es');
  assert.equal(h.calls.length,1);assert.equal(observed.length,1);
  assert.equal(h.calls[0][0],'reservation_click');assert.equal(h.calls[0][1].branch,'houston');
  for(const key of ['name','email','phone','date','time','partySize','reservation_id'])assert.equal(h.calls[0][1][key],undefined);
  h.disabled('1');await reportBookingIntent(h.window,'houston','es');assert.equal(h.calls.length,1);assert.equal(observed.length,1);
  await reportBookingIntent(h.window,'unknown-branch','es');assert.equal(h.calls.length,1);
  await assert.doesNotReject(()=>reportBookingIntent({},'houston','es'));
  await assert.doesNotReject(()=>reportBookingIntent({sySiteAnalyticsSanitize:()=>{throw Error('blocked');}},'houston','es'));
});
