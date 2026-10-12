// TXT-only, additive operator. No mail/site record updates, deletion or zone replacement.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { target, credential, cloudflare } from './cloudflare-ops.mjs';

export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function canonicalTxt(value) {
  if(typeof value==='string' && value.startsWith('"') && value.endsWith('"')) {
    try { const unquoted=JSON.parse(value);if(typeof unquoted==='string')return unquoted; } catch {}
  }
  return value;
}
export function normalize(records) {
  return records.map(r=>({id:r.id,type:r.type,name:r.name,content:r.content,ttl:r.ttl,
    proxied:r.proxied ?? false,priority:r.priority ?? null,comment:r.comment ?? null,
    tags:r.tags ?? [],settings:r.settings ?? {}})).sort((a,b)=>a.id.localeCompare(b.id));
}
export function txtContent(content) {
  assert.equal(typeof content, 'string', 'TXT content must be text');
  assert.ok(content.length && Buffer.byteLength(content) <= 255 && !/[\r\n\x00-\x1f]/.test(content),
    'Use one nonempty TXT value up to 255 bytes');
  assert.match(content, /^(?:apple-domain-verification|google-site-verification)=[A-Za-z0-9_-]+$/,
    'This operator adds only domain-verification TXT, not mail policies or arbitrary records');
  return content;
}
export async function listDns(api) {
  const records = [];
  for (let page=1; page<=100; page++) {
    const body = await api(`/zones/${target.zoneId}/dns_records?per_page=100&page=${page}`);
    records.push(...body.result);
    if (page >= (body.result_info?.total_pages ?? 1)) return records;
  }
  throw new Error('DNS pagination exceeded safety limit');
}
export function makePlan(records, content, now = new Date()) {
  txtContent(content);
  const before = normalize(records);
  const exists = records.some(r=>r.type==='TXT' && r.name===target.domain && canonicalTxt(r.content)===content);
  return {version:1, zoneId:target.zoneId, domain:target.domain, createdAt:now.toISOString(),
    action:exists?'noop':'add-verification-txt', beforeDigest:digest(before), before,
    record:{type:'TXT',name:target.domain,content,ttl:1}};
}
export async function applyPlan(api, plan, approvedDigest, now = new Date()) {
  assert.equal(plan.version,1); assert.equal(plan.zoneId,target.zoneId); assert.equal(plan.domain,target.domain);
  assert.equal(approvedDigest,digest(plan),'Approval must match the exact plan digest');
  assert.ok(now - new Date(plan.createdAt) >= 0 && now - new Date(plan.createdAt) <= 3600000,
    'DNS plan expired; reread current records');
  assert.deepEqual(plan.record,{type:'TXT',name:target.domain,content:txtContent(plan.record.content),ttl:1});
  assert.ok(['noop','add-verification-txt'].includes(plan.action));
  const before = await listDns(api);
  assert.equal(digest(normalize(before)),plan.beforeDigest,'DNS changed since planning; refuse write');
  assert.equal(digest(plan.before),plan.beforeDigest,'Invalid backup digest');
  const existing = before.filter(r=>r.type==='TXT'&&r.name===target.domain&&canonicalTxt(r.content)===plan.record.content);
  if (existing.length) return {changed:false,recordId:existing[0].id,existingRecordsUnchanged:true};
  assert.equal(plan.action,'add-verification-txt','No-op plan cannot become a write');
  // No automatic retry: after an unknown outcome, reread DNS before attempting again.
  const result = await api(`/zones/${target.zoneId}/dns_records`,
    {method:'POST',body:JSON.stringify(plan.record)});
  const after = await listDns(api);
  const added=after.find(r=>r.id===result.result.id);
  assert.ok(added?.type==='TXT'&&added.name===target.domain&&canonicalTxt(added.content)===plan.record.content,
    'Created record does not match the approved TXT');
  const preserved = after.filter(r=>r.id!==result.result.id);
  assert.equal(digest(normalize(preserved)),plan.beforeDigest,'Unexpected existing-record change; inspect backup');
  return {changed:true,recordId:result.result.id,existingRecordsUnchanged:true,
    rollback:'Delete only this created record ID after a separate authorization',after:normalize(after)};
}

function privateJson(path, value) {
  const privateRoot=fileURLToPath(new URL('../../../.secrets/sinyolanda-dns/',import.meta.url));
  assert.ok(path.startsWith(resolve(privateRoot)+sep),'DNS plans/receipts belong only in Agent/.secrets/sinyolanda-dns');
  assert.ok(!existsSync(path),'Use a new private receipt/plan path');
  mkdirSync(dirname(path),{recursive:true,mode:0o700}); chmodSync(dirname(path),0o700);
  writeFileSync(path,JSON.stringify(value,null,2)+'\n',{mode:0o600,flag:'wx'});
}
async function main() {
  const [command,path,value] = process.argv.slice(2);
  const api = cloudflare(credential('dns'));
  if (command==='inspect') {
    const records=await listDns(api);
    console.log(JSON.stringify({domain:target.domain,count:records.length,digest:digest(normalize(records))}));
  } else if (command==='plan') {
    assert.ok(path && value,'plan requires private output path and content-file path');
    const plan=makePlan(await listDns(api),readFileSync(resolve(value),'utf8').trim());
    privateJson(resolve(path),plan);
    console.log(JSON.stringify({action:plan.action,planDigest:digest(plan),recordType:'TXT',domain:plan.domain}));
  } else if (command==='apply') {
    assert.ok(path && value,'apply requires the private plan path and explicitly approved plan digest');
    const plan=JSON.parse(readFileSync(resolve(path),'utf8'));
    const receipt=await applyPlan(api,plan,value);
    privateJson(resolve(path)+'.receipt.json',receipt);
    console.log(JSON.stringify({changed:receipt.changed,recordId:receipt.recordId,existingRecordsUnchanged:true}));
  } else throw new Error('Use inspect, plan <private-plan.json> <content-file>, or apply <plan.json> <approved-digest>');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(error=>{console.error(error.name==='AssertionError'?error.message:'DNS operation failed; inspect privately');process.exitCode=1;});
