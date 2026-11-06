import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createMotionController} from '../assets/js/branch-social-motion.js';
import {loadApprovedSocialMotion,projectApprovedSocialMotion} from '../scripts/editorial/social-motion-approved.mjs';
import {projectApprovedSocialFeed} from '../scripts/editorial/social-feed-approved.mjs';
import {socialMotionSource,restoreSocialMotionSource} from '../scripts/social-motion-source-contract.mjs';
import {restoreUiSource} from '../scripts/ui-source-contract.mjs';

const root=resolve(import.meta.dirname,'..'),hash=value=>createHash('sha256').update(value).digest('hex');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function harness(kind='reel',overrides={}) {
  let id=0;const jobs=new Map(),calls={play:0,pause:0,loads:[],shown:[]};
  const controller=createMotionController({kind,count:4,
    play:async()=>{calls.play++;},pause:()=>calls.pause++,
    loadSlide:async index=>{calls.loads.push(index);},showSlide:index=>calls.shown.push(index),
    schedule:fn=>{jobs.set(++id,fn);return id;},cancel:id=>jobs.delete(id),...overrides});
  return {controller,calls,jobs,async tick(){const next=jobs.entries().next().value;assert.ok(next);jobs.delete(next[0]);await next[1]();}};
}

test('reels only play while visible, stop when hidden, and remember a deliberate pause',async()=>{
  const {controller:c,calls}=harness();
  c.update({visible:false});await settle();assert.equal(calls.play,0);
  c.update({visible:true});await settle();assert.equal(calls.play,1);
  c.update({hidden:true});assert.equal(calls.pause,1);
  c.update({hidden:false});await settle();assert.equal(calls.play,2);
  c.toggle();assert.equal(c.snapshot().paused,true);
  c.update({visible:false});c.update({visible:true});await settle();assert.equal(calls.play,2);
  c.toggle();await settle();assert.equal(calls.play,3);
});

test('reduced motion and data saving start static; explicit play opts in',async()=>{
  for(const preference of ['reduced','saveData']){
    const {controller:c,calls}=harness();c.update({visible:true,[preference]:true});await settle();
    assert.equal(calls.play,0);c.toggle();await settle();assert.equal(calls.play,1);
    c.update({optedIn:false});assert.equal(c.snapshot().running,false);
  }
});

test('blocked autoplay remains still and offers a manual retry without an unhandled rejection',async()=>{
  let attempts=0;
  const {controller:c}=harness('reel',{play:async()=>{if(++attempts===1)throw Error('NotAllowedError');}});
  c.update({visible:true});await settle();assert.equal(c.snapshot().blocked,true);assert.equal(c.snapshot().enabled,false);
  c.update({visible:false});c.update({visible:true});await settle();assert.equal(attempts,1);
  c.toggle();await settle();assert.equal(attempts,2);assert.equal(c.snapshot().running,true);
});

test('a video hidden before its play task or during a pending play does not continue playing',async()=>{
  const first=harness();first.controller.update({visible:true});first.controller.update({visible:false});await settle();assert.equal(first.calls.play,0);
  let complete;const pending=harness('reel',{play:()=>new Promise(resolve=>{complete=resolve;})});
  pending.controller.update({visible:true});await settle();pending.controller.update({hidden:true});
  complete();await settle();assert.ok(pending.calls.pause>=2);assert.equal(pending.controller.snapshot().running,false);
});

test('carousel rotates all four photos, pauses on hover/focus, and manual navigation stops the timer',async()=>{
  const h=harness('carousel'),c=h.controller;c.update({visible:true});
  for(let i=0;i<4;i++)await h.tick();assert.deepEqual(h.calls.shown,[1,2,3,0]);
  c.update({hovering:true});assert.equal(h.jobs.size,0);c.update({hovering:false});assert.equal(h.jobs.size,1);
  c.update({focused:true});assert.equal(h.jobs.size,0);c.update({focused:false});
  await c.step(-1);assert.equal(c.snapshot().index,3);assert.equal(h.jobs.size,0);
  c.toggle();assert.equal(h.jobs.size,1);c.update({hidden:true});assert.equal(h.jobs.size,0);
  c.destroy();assert.equal(h.jobs.size,0);
});

test('failed or stale image loads keep the last complete slide',async()=>{
  const failed=harness('carousel',{loadSlide:async()=>{throw Error('offline');}});
  failed.controller.update({visible:true});await failed.tick();assert.equal(failed.controller.snapshot().index,0);assert.deepEqual(failed.calls.shown,[]);
  let finish;const h=harness('carousel',{loadSlide:()=>new Promise(resolve=>{finish=resolve;})});h.controller.update({visible:true});
  const pending=h.tick();h.controller.update({visible:false});finish();await pending;
  assert.equal(h.controller.snapshot().index,0);assert.deepEqual(h.calls.shown,[]);assert.equal(h.jobs.size,0);
});

test('explicit carousel playback can resume while the media link retains keyboard focus',()=>{
  const h=harness('carousel'),c=h.controller;c.update({visible:true,focused:true});
  assert.equal(h.jobs.size,0);
  c.toggle();assert.equal(c.snapshot().paused,true);
  c.toggle();assert.equal(c.snapshot().optedIn,true);assert.equal(h.jobs.size,1);
});

test('motion allowlist peels exactly its approved change, preserving all earlier source guards',()=>{
  const file=socialMotionSource.file,source=readFileSync(resolve(root,file),'utf8');
  assert.equal(hash(restoreUiSource(file,source)),socialMotionSource.afterSha256);
  assert.equal(hash(restoreSocialMotionSource(file,source)),socialMotionSource.beforeSha256);
  assert.notEqual(hash(restoreSocialMotionSource(file,source+'unknown edit')),socialMotionSource.beforeSha256);
  assert.throws(()=>restoreSocialMotionSource(file,source+socialMotionSource.patches[0].after),/Social motion manifest patch/);
});

test('Houston media stays minimal: native videos and photos, original links and keyboard access without visible chrome',()=>{
  const config=loadApprovedSocialMotion(root),before=projectApprovedSocialFeed(root,new Map());
  const after=projectApprovedSocialMotion(root,before.files);assert.equal(after.metadata.reels,2);
  for(const[file,html]of after.files){
    assert.equal((html.match(/<video class="sy-social-video" muted loop playsinline preload="none"/g)||[]).length,2);
    assert.equal((html.match(/data-motion-kind="carousel"/g)||[]).length,1);
    assert.equal((html.match(/<img data-src=/g)||[]).length,3);
    assert.ok(!html.includes('<video class="sy-social-video" src='),'No video download before visibility');
    const section=html.match(/<section class="sy-social-feed"[\s\S]*?<\/section>/)[0];
    for(const a of section.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g))assert.ok(!a[0].includes('<button'),'Buttons cannot be nested in links');
    assert.ok(!section.includes('fbcdn')&&!section.includes('storage.googleapis')&&!section.includes('accountId'));
    for(const removed of ['sy-motion-control','sy-social-format','sy-social-open','sy-social-copy','data-motion-count','<button','<time','<h3'])assert.ok(!section.includes(removed),'Removed card chrome must not be published: '+removed);
    assert.equal((section.match(/aria-keyshortcuts="Space/g)||[]).length,3);
    assert.equal((section.match(/class="sy-motion-keyboard-hint"/g)||[]).length,3);
    assert.ok(html.includes(config.script+'?v='+config.assetVersion),file);
  }
});

test('motion approval rejects modified media instead of publishing an unchecked substitute',t=>{
  const config=loadApprovedSocialMotion(root),fixture=mkdtempSync(resolve(tmpdir(),'sy-motion-'));
  t.after(()=>rmSync(fixture,{recursive:true,force:true}));
  const files=['scripts/editorial/approved-social-motion.json','scripts/editorial/houston-social-selection.json','scripts/public-manifest.json',...Object.keys(config.files)];
  for(const f of files){mkdirSync(dirname(resolve(fixture,f)),{recursive:true});copyFileSync(resolve(root,f),resolve(fixture,f));}
  const file=Object.keys(config.files)[0],bytes=readFileSync(resolve(fixture,file));bytes[0]^=1;writeFileSync(resolve(fixture,file),bytes);
  assert.throws(()=>loadApprovedSocialMotion(fixture),/Motion asset changed/);
});
