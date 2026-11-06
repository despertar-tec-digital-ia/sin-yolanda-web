import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {buildOpenTableReview,validateWidget} from '../scripts/opentable-review.mjs';
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
    assert.equal((html.match(new RegExp('href="#reservar-'+slug+'"','g'))||[]).length,2);
    assert.ok(!html.includes('<input'),'No duplicate form or contact capture');
    assert.ok(html.includes('ot_source=Restaurant+website'));
    assert.ok(html.includes(file.startsWith('en/')?'lang=en-US':'lang=es-MX'));
  }
  const manifest=JSON.parse(readFileSync(resolve(root,'scripts/public-manifest.json')));
  assert.ok(!manifest.assets.includes('assets/css/opentable-review.css'));
  assert.ok(!manifest.assets.includes('assets/js/opentable-review.js'));
  for (const file of report.bookingPilot.changedPages) assert.ok(readFileSync(resolve(out,'public',file),'utf8').includes('src="/assets/js/opentable-review.js?v=20261106-focus"'));
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
