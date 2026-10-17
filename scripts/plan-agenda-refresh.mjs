// Read-only freshness gate. Scheduled publishing only refreshes the already-live
// approved main revision; it cannot bring an unreleased main revision online.
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadApprovedAgenda } from './editorial/public-agenda.mjs';
import { projectAllAgendas as projectPublicAgenda } from './editorial/all-agendas.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
export async function planAgendaRefresh({root,commit,now=new Date().toISOString(),fetchImpl=fetch,origin='https://sin-yolanda.com'}={}){
  assert.equal(origin,'https://sin-yolanda.com');assert.match(commit??'',/^[a-f0-9]{40}$/);
  const config=loadApprovedAgenda(root);if(!config)return {changed:false,reason:'no-approved-agenda'};
  const projected=projectPublicAgenda(root,{now,commit});
  const probe=await fetchImpl(origin+'/houston',{cache:'no-store',signal:AbortSignal.timeout(30000)});
  assert.equal(probe.status,200);const first=await probe.text();
  if(!first.includes('data-agenda-source-commit="'+commit+'"')||!first.includes('data-agenda-approval="'+config.approval.sourceDigest+'"'))return {changed:false,reason:'main-revision-not-live'};
  if(first.includes('data-agenda-render-digest="'+projected.metadata.renderDigest+'"'))return {changed:false,reason:'unchanged-approved-agenda',nextTransitionAt:projected.metadata.nextTransitionAt};
  let changed=false;
  for(const[file,expected]of projected.files){
    const actual=file==='houston.html'?first:await(async()=>{const response=await fetchImpl(origin+'/'+file,{cache:'no-store',signal:AbortSignal.timeout(30000)});assert.equal(response.status,200);return response.text();})();
    if(hash(actual)!==hash(expected))changed=true;
  }
  return {changed,reason:changed?'approved-visibility-transition':'unchanged-approved-agenda',nextTransitionAt:projected.metadata.nextTransitionAt};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=resolve(import.meta.dirname,'..'),commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  try{
    const result=await planAgendaRefresh({root,commit});console.log(JSON.stringify(result));
    if(process.env.GITHUB_OUTPUT)writeFileSync(process.env.GITHUB_OUTPUT,'changed='+String(result.changed)+'\n',{flag:'a'});
  }catch(error){console.error('Agenda freshness verification failed; no build/publication is authorized by this run');process.exitCode=1;}
}
