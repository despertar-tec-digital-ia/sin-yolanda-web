import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePlan, applyPlan, digest, txtContent, listDns } from '../scripts/cloudflare-dns.mjs';
import { credential, cloudflare, target } from '../scripts/cloudflare-ops.mjs';
const now=new Date('2026-10-12T03:00:00Z');
const content='apple-domain-verification=FixtureOnly';
const records=[{id:'1',name:target.domain,type:'MX',content:'mail.example',ttl:3600,priority:10}];
function fake(initial=records){let current=structuredClone(initial);const writes=[];return {writes,api:async(path,options={})=>{
  if(options.method==='POST'){const r={id:'2',...JSON.parse(options.body)};writes.push(r);current.push(r);return {result:r};}
  return {result:structuredClone(current),result_info:{total_pages:1}};
}};}
test('scoped DNS credential reads only one named Doppler secret',()=>{
  let args;assert.equal(credential('dns',{},(cmd,a)=>{args=a;return 'fixture';}),'fixture');
  assert.deepEqual(args.slice(0,4),['secrets','get','SY_CLOUDFLARE_DNS_TOKEN','--plain']);
  assert.throws(()=>credential('dns',{GITHUB_ACTIONS:'true'}),/protected/);
});
test('API rejects a different zone before transmitting credentials',async()=>{
  let fetched=false;const api=cloudflare('fixture',async()=>{fetched=true;});
  await assert.rejects(api('/zones/other/dns_records'),/another/);assert.equal(fetched,false);
});
test('additive TXT preserves existing MX and returns an exact rollback ID',async()=>{
  const f=fake(),plan=makePlan(records,content,now);const r=await applyPlan(f.api,plan,digest(plan),now);
  assert.equal(r.changed,true);assert.equal(r.recordId,'2');assert.equal(r.existingRecordsUnchanged,true);
  assert.equal(f.writes.length,1);assert.equal(r.after.length,2);
});
test('already present TXT is idempotent with no writes',async()=>{
  const initial=[...records,{id:'2',type:'TXT',name:target.domain,content,ttl:1}];
  const f=fake(initial),plan=makePlan(initial,content,now);
  assert.equal((await applyPlan(f.api,plan,digest(plan),now)).changed,false);assert.equal(f.writes.length,0);
});
test('Cloudflare quoted TXT representation is idempotent too',async()=>{
  const initial=[...records,{id:'2',type:'TXT',name:target.domain,content:JSON.stringify(content),ttl:1}];
  const f=fake(initial),plan=makePlan(initial,content,now);assert.equal(plan.action,'noop');
  assert.equal((await applyPlan(f.api,plan,digest(plan),now)).changed,false);assert.equal(f.writes.length,0);
});
for(const scenario of ['approval','zone','content','expired','drift','backup'])test('reject '+scenario+' before write',async()=>{
  const f=fake(),plan=makePlan(records,content,now);let approval=digest(plan),date=now;
  if(scenario==='approval')approval='bad';
  if(scenario==='zone')plan.zoneId='other';
  if(scenario==='content')plan.record.content='v=spf1 -all';
  if(scenario==='expired')date=new Date(now.getTime()+3600001);
  if(scenario==='drift')plan.beforeDigest='bad';
  if(scenario==='backup')plan.before=[];
  if(scenario!=='approval')approval=digest(plan);
  await assert.rejects(applyPlan(f.api,plan,approval,date));assert.equal(f.writes.length,0);
});
for(const value of ['','v=DMARC1; p=none','apple-domain-verification=x\nother','google-site-verification='+ 'x'.repeat(256)])
  test('reject unsafe verification TXT input',()=>assert.throws(()=>txtContent(value)));
test('DNS listing follows bounded provider pagination',async()=>{
  let calls=0;const rows=await listDns(async()=>({result:[{id:String(++calls)}],result_info:{total_pages:2}}));
  assert.equal(rows.length,2);assert.equal(calls,2);
});
