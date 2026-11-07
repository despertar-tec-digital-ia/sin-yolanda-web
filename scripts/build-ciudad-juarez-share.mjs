// Add one pre-opening review to an immutable reservation preview, preserving every existing byte.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const hash=value=>createHash('sha256').update(value).digest('hex');
export const reservationBaselineDigest='d0148bf505672e9cb9e492fcda774119cf37e0c49ce50f4c7fd751a19ef54251';
const cssFile='assets/css/ciudad-juarez-opening.css';
const walk=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const path=resolve(directory,entry.name);assert.ok(!lstatSync(path).isSymbolicLink(),'No symlinks in a preview');
  return entry.isDirectory()?walk(path):[path];
});
export function buildCiudadJuarezShare({root,baseline,out,commit,dirty,expectedBaselineDigest=reservationBaselineDigest}) {
  assert.match(commit??'',/^[a-f0-9]{40}$/);assert.equal(dirty,false,'Share only clean committed source');
  assert.ok(!existsSync(out),'Never overwrite a review artifact');
  const prior=JSON.parse(readFileSync(resolve(baseline,'release.json'),'utf8'));
  assert.equal(prior.publicDigest,expectedBaselineDigest,'Unexpected reservation preview baseline');
  assert.equal(hash(JSON.stringify(prior.hashes)),prior.publicDigest,'Invalid baseline manifest');
  const original=resolve(baseline,'public'),files=walk(original).map(file=>relative(original,file)).sort();
  assert.deepEqual(files,Object.keys(prior.hashes).sort(),'Unexpected files in baseline public directory');
  for(const[file,expected]of Object.entries(prior.hashes)){
    assert.ok(!file.startsWith('/')&&!file.split('/').includes('..'));
    assert.equal(hash(readFileSync(resolve(original,file))),expected,'Reservation baseline changed: '+file);
  }
  const css=readFileSync(resolve(root,cssFile),'utf8');
  let html=readFileSync(resolve(root,'ciudad-juarez.html'),'utf8');
  html=html.replace(/<script\b[^>]*src="[^"]*(?:site-measurement|site-analytics|ga4-consent|umami|webmcp)[^"]*"[^>]*>\s*<\/script>/g,'');
  html=html.replace(/<meta name="robots"[^>]*>/g,'<meta name="robots" content="noindex,nofollow,noarchive">');
  html=html.replace(/href="(\/[^"<>]*)"/g,(whole,href)=>/^\/(?:assets|images|fonts|_astro)\//.test(href)||/^\/ciudad-juarez(?:\.html)?(?:#.*)?$/.test(href)?whole:`href="https://sin-yolanda.com${href}"`);
  html=html.replace(/(ciudad-juarez-opening\.css)\?v=[^"\s]+/g,'$1?v=review-'+hash(css).slice(0,12));
  assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
  assert.doesNotMatch(html,/<script\b[^>]*src="[^"]*(?:site-measurement|site-analytics|ga4-consent|umami|webmcp)/);
  const additions={'ciudad-juarez.html':html,[cssFile]:css};
  for(const file of Object.keys(additions))assert.ok(!Object.hasOwn(prior.hashes,file),'Would overwrite a reservation-preview asset: '+file);
  const available=new Set([...files,...Object.keys(additions)]);
  const references=[...html.matchAll(/(?:src|href)="(\/[^"<>]*)"/g)].map(match=>match[1]);
  for(const match of html.matchAll(/srcset="([^"]+)"/g))references.push(...match[1].split(',').map(item=>item.trim().split(/\s+/)[0]));
  for(const ref of references){
    const path=decodeURIComponent(new URL(ref,'https://review.invalid').pathname).slice(1);
    assert.ok(available.has(path)||available.has(path+'.html'),'Missing preview dependency: '+path);
  }
  const publicRoot=resolve(out,'public'),hashes={...prior.hashes};mkdirSync(publicRoot,{recursive:true});
  for(const file of files){const dest=resolve(publicRoot,file);mkdirSync(dirname(dest),{recursive:true});copyFileSync(resolve(original,file),dest);}
  for(const[file,value]of Object.entries(additions)){const dest=resolve(publicRoot,file);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,value);hashes[file]=hash(value);}
  const report={version:1,kind:'branch-review-overlay',commit,dirty:false,baselineCommit:prior.commit,baselinePublicDigest:prior.publicDigest,
    fileCount:Object.keys(hashes).length,hashes,publicDigest:hash(JSON.stringify(hashes)),
    shareReview:{officialSite:false,analyticsDisabled:true,scope:'Ciudad Juárez pre-opening design; unchanged Houston ES/EN booking preview'},
    unchangedBaselineFiles:files.length,addedFiles:Object.keys(additions)};
  writeFileSync(resolve(out,'release.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=resolve(import.meta.dirname,'..'),[baseline,out]=process.argv.slice(2);assert.ok(baseline&&out,'Pass baseline and new output directories');
  const report=buildCiudadJuarezShare({root,baseline:resolve(baseline),out:resolve(out),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim()});
  console.log(JSON.stringify({commit:report.commit,files:report.fileCount,digest:report.publicDigest,preserved:report.unchangedBaselineFiles}));
}
