// Trusted control code: never execute code from a downloaded CI/public artifact.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, readdirSync, lstatSync, existsSync, cpSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { target, credential, cloudflare } from './cloudflare-ops.mjs';
import { publicSourceDigest } from './package-public.mjs';
import { verifyRelease } from './verify-release.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const previewSuffix='\n/*\n  X-Robots-Tag: noindex, nofollow\n';
const safePath=path=>typeof path==='string' && /^[A-Za-z0-9_.%/-]+$/.test(path)
  && !path.split('/').some(p=>!p||p.startsWith('.')) && !/%(?:2f|5c|00)/i.test(path)
  && !/(?:^|\/)(?:docs|scripts|tests|deploy|node_modules|archive|pruebas|dashboard|maricarmen)(?:\.html|\/|$)/i.test(path);
function walk(dir,prefix='') {
  return readdirSync(dir).flatMap(name=>{
    const path=resolve(dir,name),s=lstatSync(path),relative=prefix+name;
    assert.ok(!s.isSymbolicLink(),'Artifact symlink rejected');
    return s.isDirectory()?walk(path,relative+'/'):[relative];
  }).sort();
}
export function validateArtifact(directory, report, commit) {
  assert.equal(report.version,1); assert.equal(report.dirty,false); assert.equal(report.commit,commit);
  assert.match(commit,/^[a-f0-9]{40}$/);assert.match(report.publicDigest,/^[a-f0-9]{64}$/);
  const files=Object.keys(report.hashes).sort();
  assert.equal(files.length,report.fileCount);assert.ok(files.includes('index.html')&&files.includes('_headers')&&files.includes('404.html'));
  assert.deepEqual(walk(directory),files,'Extra/missing artifact files');
  for(const file of files){assert.ok(safePath(file),'Unsafe artifact path');
    assert.match(report.hashes[file],/^[a-f0-9]{64}$/);
    assert.equal(hash(readFileSync(resolve(directory,file))),report.hashes[file],'Artifact file hash mismatch');}
  return files;
}
export function productionMetadata(previewDir, report) {
  assert.equal(report.audience,'review','Require the CI review artifact');
  const headers=readFileSync(resolve(previewDir,'_headers'),'utf8');
  assert.ok(headers.endsWith(previewSuffix),'Expected exact preview header suffix');
  const productionHeaders=headers.slice(0,-previewSuffix.length);
  const hashes={...report.hashes,_headers:hash(productionHeaders)};
  assert.equal(publicSourceDigest(hashes),report.publicDigest,'Production bytes differ from original source digest');
  return {headers:productionHeaders,report:{...report,audience:'limited-production',hashes}};
}
export function validateCiRun(run, artifact) {
  assert.equal(run.repository?.full_name,target.repository);assert.equal(run.head_branch,'main');
  assert.equal(run.event,'push');assert.equal(run.conclusion,'success');assert.equal(run.status,'completed');
  assert.equal(run.path,'.github/workflows/quality.yml');assert.match(run.head_sha,/^[a-f0-9]{40}$/);
  assert.equal(artifact.name,'public-site-'+run.head_sha);assert.equal(artifact.expired,false);
  assert.equal(artifact.workflow_run?.id,run.id);assert.equal(artifact.workflow_run?.head_sha,run.head_sha);
  assert.match(artifact.digest,/^sha256:[a-f0-9]{64}$/);assert.ok(artifact.size_in_bytes<200*1024*1024);
}
function gh(path,binary=false){
  try{return execFileSync('gh',['api',`repos/${target.repository}/${path}`],
    {encoding:binary?undefined:'utf8',maxBuffer:210*1024*1024,stdio:['ignore','pipe','pipe']});}
  catch{throw new Error('GitHub artifact operation failed; no provider output logged');}
}
export async function prepare(runId,destination) {
  assert.match(runId,/^[1-9][0-9]*$/);assert.ok(!existsSync(destination),'Use a fresh bundle directory');
  const run=JSON.parse(gh('actions/runs/'+runId));
  const artifacts=JSON.parse(gh(`actions/runs/${runId}/artifacts`)).artifacts;
  const matches=artifacts.filter(a=>a.name==='public-site-'+run.head_sha);
  assert.equal(matches.length,1,'Require one CI artifact');const artifact=matches[0];validateCiRun(run,artifact);
  const zip=gh(`actions/artifacts/${artifact.id}/zip`,true);
  assert.equal('sha256:'+hash(zip),artifact.digest,'Downloaded archive digest mismatch');
  mkdirSync(destination,{recursive:true,mode:0o700});
  writeFileSync(resolve(destination,'ci.zip'),zip,{mode:0o600});
  execFileSync('python3',[resolve(root,'scripts/extract-release.py'),resolve(destination,'ci.zip'),resolve(destination,'preview')],{stdio:'pipe'});
  const preview=JSON.parse(readFileSync(resolve(destination,'preview/release.json'),'utf8'));
  validateArtifact(resolve(destination,'preview/public'),preview,run.head_sha);
  const prod=productionMetadata(resolve(destination,'preview/public'),preview);
  mkdirSync(resolve(destination,'production'),{mode:0o700});
  cpSync(resolve(destination,'preview/public'),resolve(destination,'production/public'),{recursive:true});
  writeFileSync(resolve(destination,'production/public/_headers'),prod.headers);
  writeFileSync(resolve(destination,'production/release.json'),JSON.stringify(prod.report,null,2));
  validateArtifact(resolve(destination,'production/public'),prod.report,run.head_sha);
  const control={version:1,repository:target.repository,ciRunId:Number(runId),commit:run.head_sha,
    ciArtifactId:artifact.id,ciArchiveDigest:artifact.digest,publicDigest:preview.publicDigest,
    previewHashesDigest:hash(JSON.stringify(preview.hashes)),productionHashesDigest:hash(JSON.stringify(prod.report.hashes)),
    productionTransformation:'Only remove the exact global noindex header added by CI; page noindex flags remain'};
  writeFileSync(resolve(destination,'control.json'),JSON.stringify(control,null,2));
  return control;
}
export function checkBundle(directory) {
  const control=JSON.parse(readFileSync(resolve(directory,'control.json'),'utf8'));
  assert.equal(control.version,1);assert.equal(control.repository,target.repository);
  for(const mode of ['preview','production']) {
    const report=JSON.parse(readFileSync(resolve(directory,mode+'/release.json'),'utf8'));
    validateArtifact(resolve(directory,mode+'/public'),report,control.commit);
    assert.equal(hash(JSON.stringify(report.hashes)),control[mode+'HashesDigest']);
    assert.equal(report.publicDigest,control.publicDigest);
  }
  const preview=JSON.parse(readFileSync(resolve(directory,'preview/release.json'),'utf8'));
  const production=JSON.parse(readFileSync(resolve(directory,'production/release.json'),'utf8'));
  assert.deepEqual(productionMetadata(resolve(directory,'preview/public'),preview).report,production);
  return control;
}
export async function projectState(api) {
  const p=(await api(`/accounts/${target.accountId}/pages/projects/${target.project}`)).result;
  assert.equal(p.name,target.project);assert.equal(p.production_branch,target.productionBranch);
  assert.ok(p.domains.includes(target.domain),'Project does not serve the expected official domain');
  assert.match(p.canonical_deployment?.id??'',/^[a-f0-9-]{36}$/,'Missing current production deployment');
  return {productionId:p.canonical_deployment.id};
}
async function deploy(directory,mode,expectedProductionId) {
  assert.ok(['preview','production'].includes(mode));
  const control=checkBundle(directory),token=credential('pages'),api=cloudflare(token);
  const before=await projectState(api);
  if(mode==='production'){
    assert.equal(process.env.GITHUB_ACTIONS,'true','Production only through the reviewed workflow');
    assert.equal(process.env.SY_PRODUCTION_GATE,'approved-environment','Protected environment required');
    assert.equal(before.productionId,expectedProductionId,'Production changed since approval; refuse publication');
    const proof=JSON.parse(readFileSync(resolve(directory,'preview-proof.json'),'utf8'));
    assert.equal(proof.passed,true);assert.equal(proof.commit,control.commit);assert.equal(proof.publicDigest,control.publicDigest);
  }
  const branch=mode==='production'?'main':'review-'+control.commit.slice(0,12);
  try {execFileSync(resolve(root,'deploy/node_modules/.bin/wrangler'),['pages','deploy',resolve(directory,mode+'/public'),
    '--project-name',target.project,'--branch',branch,'--commit-hash',control.commit,'--commit-dirty=false'],
    {cwd:root,env:{...process.env,CLOUDFLARE_API_TOKEN:token,CLOUDFLARE_ACCOUNT_ID:target.accountId,WRANGLER_SEND_METRICS:'false'},
      stdio:['ignore','pipe','pipe'],maxBuffer:1024*1024});}
  catch {throw new Error('Pages upload failed; inspect provider state before retrying; output withheld');}
  const deployments=(await api(`/accounts/${target.accountId}/pages/projects/${target.project}/deployments?per_page=25`)).result;
  const deployment=deployments.find(d=>d.environment===mode && d.deployment_trigger?.metadata?.commit_hash===control.commit
    && d.deployment_trigger?.metadata?.branch===branch && d.latest_stage?.status==='success');
  assert.ok(deployment,'Uploaded deployment not confirmed');
  if(mode==='preview')assert.equal((await projectState(api)).productionId,before.productionId,'Preview changed production unexpectedly');
  else assert.equal((await projectState(api)).productionId,deployment.id,'Production deployment not active');
  const origin=mode==='preview'?deployment.url:'https://'+target.domain;
  assert.ok(mode!=='preview'||new URL(origin).hostname.endsWith('.'+target.project+'.pages.dev'),'Unexpected preview host');
  const metadata=JSON.parse(readFileSync(resolve(directory,mode+'/release.json'),'utf8'));
  const smoke=await verifyRelease({origin,metadata});
  const proof={...smoke,deploymentId:deployment.id,previousProductionId:before.productionId};
  writeFileSync(resolve(directory,mode+'-proof.json'),JSON.stringify(proof,null,2));
  assert.equal(smoke.passed,true,'Served release failed verification; inspect receipt, do not auto-rollback');
  return {url:origin,deploymentId:deployment.id,previousProductionId:before.productionId,commit:control.commit,publicDigest:control.publicDigest};
}
async function main(){
  const [command,path,value]=process.argv.slice(2);let result;
  if(command==='prepare')result=await prepare(path,resolve(value));
  else if(command==='check')result=checkBundle(resolve(path));
  else if(command==='inspect')result=await projectState(cloudflare(credential('pages')));
  else if(command==='preview'||command==='production')result=await deploy(resolve(path),command,value);
  else throw new Error('Use prepare <successful-main-CI-run> <fresh-bundle>, check <bundle>, inspect, preview <bundle>, or production <bundle> <approved-baseline-id>');
  console.log(JSON.stringify(result));
  if(process.env.GITHUB_OUTPUT)for(const [key,v]of Object.entries(result))
    if(typeof v==='string'||typeof v==='number')writeFileSync(process.env.GITHUB_OUTPUT,`${key}=${v}\n`,{flag:'a'});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(e=>{console.error(e.name==='AssertionError'?e.message:'Release operation failed; inspect private/provider receipt');process.exitCode=1;});
