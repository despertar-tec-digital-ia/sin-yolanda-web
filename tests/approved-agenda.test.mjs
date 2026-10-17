import {test}from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{resolve}from'node:path';
import{localInstant,resolveProgrammingClock}from'../scripts/editorial/programming-clock.mjs';
import{loadApprovedAgenda,selectApprovedAgenda,projectPublicAgenda,elementRange}from'../scripts/editorial/public-agenda.mjs';
import{planAgendaRefresh}from'../scripts/plan-agenda-refresh.mjs';
import{projectAllAgendas}from'../scripts/editorial/all-agendas.mjs';
const root=resolve(import.meta.dirname,'..'),config=loadApprovedAgenda(root),commit='a'.repeat(40);
test('approval binds the exact sourced projection and cannot authorize unresolved calendar slots',()=>{
 assert.equal(config.approval.records.length,14);
 assert.equal(selectApprovedAgenda(config,'2026-10-14T01:54:27Z').visible.length,0);
 assert.equal(selectApprovedAgenda(config,config.approval.approvedAt).visible.length,14);
 assert.ok(config.approval.records.every(record=>!record.id.includes('cartelera-slot')));
 const id='the-woodlands-mes-hispano-20261015';
 assert.equal(config.approval.records.filter(record=>record.id===id).length,1);
 assert.equal(config.approval.records.find(record=>record.id===id).expiresAt,'2026-10-16T05:00:00.000Z');
 const pages=projectPublicAgenda(root,{now:'2026-10-15T12:00:00Z',commit}).files;
 for(const file of['the-woodlands.html','en/the-woodlands/index.html']){
  const html=pages.get(file);
  assert.equal((html.match(new RegExp('data-record="'+id+'"','g'))||[]).length,1);
  assert.match(html,/href="https:\/\/www.instagram.com\/p\/DefaT9GBok6\/"/);
  assert.match(html,/tw-mes-hispano-DefaT9GBok6.jpg/);
 }
 for(const html of projectPublicAgenda(root,{now:'2026-10-16T05:00:00Z',commit}).files.values())assert.ok(!html.includes('tw-mes-hispano-DefaT9GBok6.jpg'));
});
test('dated Pinta retires at the announced end, in both languages and HTML without JS',()=>{
 const id='houston-pinta-canta-20261014';
 assert.ok(selectApprovedAgenda(config,'2026-10-15T02:59:59Z').visible.some(record=>record.id===id));
 assert.ok(!selectApprovedAgenda(config,'2026-10-15T03:00:00Z').visible.some(record=>record.id===id));
 const pages=projectPublicAgenda(root,{now:'2026-10-15T03:00:00Z',commit}).files;
 for(const file of['houston.html','en/houston/index.html']){
  assert.ok(!pages.get(file).includes('data-record="'+id+'"'));
  assert.ok(pages.get(file).includes('houston-pinta-20261028'));
  assert.equal((pages.get(file).match(/hu-pinta-provider/g)||[]).length,1);
 }
});
test('unknown event hours remain absent while editorial expiry follows each local date',()=>{
 const ep=config.approval.records.find(record=>record.id==='el-paso-jorge-20261016');
 assert.equal(ep.expiryBasis,'editorial-next-local-midnight');assert.equal(ep.expiresAt,'2026-10-17T06:00:00.000Z');
 const pages=projectPublicAgenda(root,{now:'2026-10-17T06:00:00Z',commit}).files;
 for(const file of['el-paso.html','en/el-paso/index.html']){
  assert.ok(!pages.get(file).includes('data-record="el-paso-jorge-20261016"'));
  assert.ok(pages.get(file).includes('data-record="el-paso-recovery-brunch"'));
 }
 assert.equal(selectApprovedAgenda(config,'2026-11-15T06:00:00Z').visible.length,6);
});
test('IANA conversion follows DST and rejects overlap/gap rather than guessing',()=>{
 assert.equal(localInstant('2026-10-14','22:00','America/Chicago'),'2026-10-15T03:00:00.000Z');
 assert.equal(localInstant('2026-11-13','23:00','America/Chicago'),'2026-11-14T05:00:00.000Z');
 assert.throws(()=>localInstant('2026-11-01','01:30','America/Chicago'),/Ambiguous/);
 assert.throws(()=>localInstant('2026-03-08','02:30','America/Chicago'),/nonexistent/);
 assert.throws(()=>resolveProgrammingClock('2026-02-30T00:00:00Z'));
});
test('homepage source and JS share corrected dates and its static block retires too',()=>{
 const before=projectPublicAgenda(root,{now:'2026-11-02T05:59:59Z',commit}).files.get('index.html');
 const after=projectPublicAgenda(root,{now:'2026-11-02T06:00:00Z',commit}).files.get('index.html');
 assert.ok(elementRange(before,'section','cartelera'));
 assert.equal(elementRange(after,'section','cartelera'),null);
 assert.equal(after.match(/<h1[\s\S]*?<\/h1>/)[0],before.match(/<h1[\s\S]*?<\/h1>/)[0]);
});
test('freshness gate skips identical pages, refreshes a transition and refuses an unreleased main',async()=>{
 const at='2026-10-14T02:00:00Z',pages=projectAllAgendas(root,{now:at,commit}).files;
 const loader=async url=>{const file=new URL(url).pathname==='/houston'?'houston.html':new URL(url).pathname.slice(1);return new Response(pages.get(file));};
 assert.equal((await planAgendaRefresh({root,commit,now:at,fetchImpl:loader})).changed,false);
 assert.equal((await planAgendaRefresh({root,commit,now:'2026-10-15T03:00:00Z',fetchImpl:loader})).changed,true);
 const stopped=await planAgendaRefresh({root,commit:'b'.repeat(40),now:at,fetchImpl:loader});
 assert.equal(stopped.changed,false);assert.equal(stopped.reason,'main-revision-not-live');
});
test('scheduled lane retains read-only permissions and never creates artifacts when unchanged',()=>{
 const quality=readFileSync(resolve(root,'.github/workflows/quality.yml'),'utf8');
 const release=readFileSync(resolve(root,'.github/workflows/pages-release.yml'),'utf8');
 assert.match(quality,/contents: read/);assert.doesNotMatch(quality,/contents: write|SY_CLOUDFLARE/);
 assert.match(quality,/github\.event_name == 'schedule' && 'agenda-schedule'/);
 assert.match(quality,/needs\.agenda_plan\.outputs\.changed == 'true'/);
 assert.match(release,/needs\.prepare\.outputs\.has_artifact == 'true'/);
 assert.match(release,/workflow_run\.event == 'schedule'/);
});
