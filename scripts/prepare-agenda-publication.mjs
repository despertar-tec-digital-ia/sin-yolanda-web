// Explicit, one-time source adoption after the approved local composition. Never run in CI.
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { projectBranch,integrateAgenda } from './editorial/branch-agenda.mjs';
import { agendaApprovalDigest,loadApprovedAgenda,renderApprovedAgenda } from './editorial/public-agenda.mjs';
import { localInstant,nextLocalDay,resolveProgrammingClock } from './editorial/programming-clock.mjs';
const root=resolve(import.meta.dirname,'..'),hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(process.argv[2],'--asset-root');const assetRoot=resolve(process.argv[3]);
assert.equal(process.argv[4],'--approved-at');const approvedAt=resolveProgrammingClock(process.argv[5]);
const approvalFile=resolve(root,'scripts/editorial/approved-agenda.json');assert.ok(!existsSync(approvalFile),'Do not replace an existing approval');
const data=JSON.parse(readFileSync(resolve(root,'scripts/editorial/front-b-review.json')));
const records=Object.values(data.branches).flatMap(branch=>projectBranch(branch,data.observedOn).visible).map(unit=>({id:unit.id,publishFrom:approvedAt,expiresAt:unit.date?(unit.end?localInstant(unit.date,unit.end,unit.timeZone):localInstant(nextLocalDay(unit.date),'00:00',unit.timeZone)):null,expiryBasis:unit.date?(unit.end?'announced-end':'editorial-next-local-midnight'):'ongoing-announcement-until-editorial-change'}));
writeFileSync(approvalFile,JSON.stringify({version:1,approvedBy:'Luis',approvedAt,publicationEnabled:true,authorization:'Ok, las apruebo. sigue, no sé si toca publicarlos, si toca eso pues hazlo.',sourceDigest:agendaApprovalDigest(root),records},null,2)+'\n');
const config=loadApprovedAgenda(root),commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const contract={version:1,baseCommit:'b3040ef',files:{}};
function patch(file,before,after){const path=resolve(root,file),source=readFileSync(path,'utf8');assert.equal(source.split(before).length-1,1,'Ambiguous patch: '+file);writeFileSync(path,source.replace(before,after));(contract.files[file]??={patches:[]}).patches.push({before,after});}
mkdirSync(resolve(root,'assets/agenda'),{recursive:true});
const assets=['assets/css/branch-agenda.css','assets/js/agenda-clock.js'];
let css=readFileSync(resolve(root,'scripts/editorial/branch-agenda.css'),'utf8').replace(/\.sy-review-controls[^{}]*\{[^}]*\}/g,'').replace('/* Review controls belong to the artifact, never to a customer release. */','');
css+='\n.sy-agenda-functions:has(>:only-child){grid-template-columns:minmax(0,1fr)}\n';
writeFileSync(resolve(root,'assets/css/branch-agenda.css'),css);
for(const branch of Object.values(data.branches))for(const unit of projectBranch(branch,data.observedOn).visible){
  if(!unit.artwork)continue;const art=unit.artwork,file='assets/agenda/'+art.file;
  assert.equal(hash(readFileSync(resolve(assetRoot,art.file))),art.sha256);copyFileSync(resolve(assetRoot,art.file),resolve(root,file));if(!assets.includes(file))assets.push(file);
}
for(const id of Object.keys(data.branches))for(const language of['es','en']){
  const file=language==='es'?id+'.html':'en/'+id+'/index.html',source=readFileSync(resolve(root,file),'utf8');
  const html=renderApprovedAgenda({id,language,config,now:approvedAt,commit});
  const integrated=integrateAgenda(source,id,html,language).replace('/assets/review-agenda/branch-agenda.css','/assets/css/branch-agenda.css?v=20261013-approved-agenda').replace('</head>','<script defer src="/assets/js/agenda-clock.js?v=20261013-approved-agenda"></script></head>');
  patch(file,source,integrated);
}
// The El Paso document opens in a new tab and shares the branch's literal header.
const menuFile='el-paso/menu/index.html',menu=readFileSync(resolve(root,menuFile),'utf8');
const header=readFileSync(resolve(root,'en/el-paso/index.html'),'utf8').match(/<header\b[\s\S]*?<\/header>/)[0];
const previousHeader=menu.match(/<header\b[\s\S]*?<\/header>/)[0];
if(header!==previousHeader)patch(menuFile,previousHeader,header);
const file='assets/js/public-data.js',source=readFileSync(resolve(root,file),'utf8'),prefix='window.SY_DATA = ';
const publicData=JSON.parse(source.slice(prefix.length).trim().replace(/;$/,''));
const intake=JSON.parse(readFileSync(resolve(root,'scripts/editorial/front-b-events.json')));
for(const occurrence of publicData.events.find(event=>event.id==='catrinas-2026').occurrences){const record=intake.records.find(record=>record.branchId===occurrence.branchId&&record.id.includes('-catrinas-'));assert.ok(record);occurrence.date=record.date;}
patch(file,source,prefix+JSON.stringify(publicData,null,2)+';\n');
const manifestPath=resolve(root,'scripts/public-manifest.json'),manifest=JSON.parse(readFileSync(manifestPath));
const previousVersion=manifest.assetVersions[file],version='20261013-approved-agenda';
for(const consumer of manifest.pages){const value=readFileSync(resolve(root,consumer),'utf8'),before='assets/js/public-data.js?v='+previousVersion;if(value.includes(before))patch(consumer,value,value.replaceAll(before,'assets/js/public-data.js?v='+version));}
manifest.assetVersions[file]=version;manifest.assetVersions['assets/css/branch-agenda.css']=version;manifest.assetVersions['assets/js/agenda-clock.js']=version;
manifest.assets=[...new Set([...manifest.assets,...assets])];writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
// The public data/template now own the corrected dates. Prerender only the campaign block.
const {renderShell}=await import('./seo.mjs');const {elementRange}=await import('./editorial/public-agenda.mjs');
const home=readFileSync(resolve(root,'index.html'),'utf8'),old=elementRange(home,'section','cartelera'),fresh=elementRange(renderShell(home,new Date(approvedAt)),'section','cartelera');assert.ok(old&&fresh);patch('index.html',old.html,fresh.html);
for(const file of Object.keys(contract.files)){
  const source=readFileSync(resolve(root,file),'utf8'),clean=source.replace(/[ \t]+(?=\n)/g,'');
  if(source!==clean)patch(file,source,clean);
}
writeFileSync(resolve(root,'scripts/agenda-source-patches.json'),JSON.stringify(contract,null,2)+'\n');
console.log(JSON.stringify({approvedAt,records:records.length,files:Object.keys(contract.files),assets:assets.length}));
