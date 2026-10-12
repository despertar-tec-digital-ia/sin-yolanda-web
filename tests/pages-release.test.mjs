import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { validateArtifact,productionMetadata,validateCiRun,projectState } from '../scripts/pages-release.mjs';
import { publicSourceDigest } from '../scripts/package-public.mjs';
import { target } from '../scripts/cloudflare-ops.mjs';
import { verifyRelease } from '../scripts/verify-release.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const commit='a'.repeat(40),suffix='\n/*\n  X-Robots-Tag: noindex, nofollow\n';
function fixture(t){const dir=mkdtempSync(join(tmpdir(),'sy-pages-release-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const files={'index.html':'<h1>Home</h1>','404.html':'<h1>Missing</h1>','_headers':'/*\n  X-Test: yes\n'};
  const original=Object.fromEntries(Object.entries(files).map(([k,v])=>[k,hash(v)]));
  files._headers+=suffix;for(const [k,v]of Object.entries(files))writeFileSync(join(dir,k),v);
  return {dir,files,report:{version:1,commit,dirty:false,audience:'review',reviewPages:[],fileCount:3,
    hashes:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,hash(v)])),publicDigest:publicSourceDigest(original)}};
}
test('preview and production share exact source bytes except the documented noindex suffix',t=>{
  const f=fixture(t);assert.equal(validateArtifact(f.dir,f.report,commit).length,3);
  const prod=productionMetadata(f.dir,f.report);assert.equal(prod.headers,'/*\n  X-Test: yes\n');
  assert.equal(prod.report.audience,'limited-production');assert.equal(prod.report.publicDigest,f.report.publicDigest);
});
for(const mode of ['hash','extra','symlink','dirty','sha','digest','suffix'])test('artifact rejects '+mode,t=>{
  const f=fixture(t);
  if(mode==='hash')writeFileSync(join(f.dir,'index.html'),'changed');
  if(mode==='extra')writeFileSync(join(f.dir,'secret.env'),'not allowed');
  if(mode==='symlink'){rmSync(join(f.dir,'index.html'));symlinkSync(join(f.dir,'404.html'),join(f.dir,'index.html'));}
  if(mode==='dirty')f.report.dirty=true;
  if(mode==='sha')f.report.commit='b'.repeat(40);
  if(mode==='digest')f.report.publicDigest='b'.repeat(64);
  if(mode==='suffix')writeFileSync(join(f.dir,'_headers'),'not the known suffix');
  assert.throws(()=>{validateArtifact(f.dir,f.report,commit);productionMetadata(f.dir,f.report);});
});
function runFixture(){const run={id:42,repository:{full_name:target.repository},head_branch:'main',event:'push',
  conclusion:'success',status:'completed',path:'.github/workflows/quality.yml',head_sha:commit};
  const artifact={name:'public-site-'+commit,expired:false,workflow_run:{id:42,head_sha:commit},digest:'sha256:'+'c'.repeat(64),size_in_bytes:100};
  return {run,artifact};}
test('only successful main quality push artifacts are accepted',()=>{const f=runFixture();validateCiRun(f.run,f.artifact);});
for(const key of ['repository','head_branch','event','conclusion','status','path','head_sha','artifact-name','expired','artifact-run','archive-digest'])
  test('reject untrusted CI source '+key,()=>{const f=runFixture();
    if(key==='artifact-name')f.artifact.name='arbitrary';
    else if(key==='expired')f.artifact.expired=true;
    else if(key==='artifact-run')f.artifact.workflow_run.id=99;
    else if(key==='archive-digest')f.artifact.digest='invalid';
    else f.run[key]=key==='repository'?{full_name:'someone/else'}:'invalid';
    assert.throws(()=>validateCiRun(f.run,f.artifact));
  });
test('preflight checks project, official domain, main branch and production deployment',async()=>{
  const result={name:target.project,production_branch:'main',domains:[target.domain],canonical_deployment:{id:'c438ff4a-244d-40c0-9f67-1d6d66b8dc25'}};
  assert.equal((await projectState(async()=>({result}))).productionId,result.canonical_deployment.id);
  await assert.rejects(projectState(async()=>({result:{...result,production_branch:'other'}})));
  await assert.rejects(projectState(async()=>({result:{...result,domains:['another.example']}})));
});
test('preview verification requires noindex headers without weakening production checks',async t=>{
  const f=fixture(t),aliases={'/':'index.html','/index.html':'index.html','/404':'404.html','/404/':'404.html','/404.html':'404.html'};
  const fetchImpl=async url=>aliases[url.pathname]?new Response(f.files[aliases[url.pathname]],{headers:{'Content-Type':'text/html','X-Robots-Tag':'noindex, nofollow'}}):new Response('missing',{status:404});
  const report=await verifyRelease({origin:'https://fixture.sin-yolanda-web.pages.dev',metadata:f.report,fetchImpl});
  assert.equal(report.passed,true);
  const official=await verifyRelease({origin:'https://sin-yolanda.com',metadata:f.report,fetchImpl});
  assert.equal(official.passed,false);assert.ok(official.observations.some(x=>x.problems.includes('home-is-noindex')));
});
test('release workflow has manual trigger, separate environments, fixed actions and no DNS secrets',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/pages-release.yml',import.meta.url),'utf8');
  assert.match(workflow,/workflow_dispatch/);assert.doesNotMatch(workflow,/pull_request_target|SY_CLOUDFLARE_DNS_TOKEN|doppler run/);
  assert.match(workflow,/name: production/);assert.match(workflow,/name: preview/);
  assert.match(workflow,/cancel-in-progress: false/);assert.doesNotMatch(workflow,/on:\s*\n\s*push:/);
  for(const action of workflow.matchAll(/uses: (\S+)/g))assert.match(action[1],/@[a-f0-9]{40}$/);
});
