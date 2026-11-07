import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {buildCiudadJuarezShare} from '../scripts/build-ciudad-juarez-share.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
function fixture(t){
 const root=mkdtempSync(resolve(tmpdir(),'cj-share-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const baseline=resolve(root,'baseline'),source=resolve(root,'source'),out=resolve(root,'output');
 mkdirSync(resolve(baseline,'public'),{recursive:true});mkdirSync(resolve(source,'assets/css'),{recursive:true});
 writeFileSync(resolve(baseline,'public/houston.html'),'unchanged booking preview');const hashes={'houston.html':hash('unchanged booking preview')};
 const digest=hash(JSON.stringify(hashes));writeFileSync(resolve(baseline,'release.json'),JSON.stringify({commit:'a'.repeat(40),publicDigest:digest,hashes}));
 writeFileSync(resolve(source,'assets/css/ciudad-juarez-opening.css'),'.cj { color: white; }');
 writeFileSync(resolve(source,'ciudad-juarez.html'),'<html><head><meta name="robots" content="index,follow"><link href="/assets/css/ciudad-juarez-opening.css?v=old"><script defer src="/assets/js/site-measurement.js"></script><script defer src="/assets/js/ga4-consent.js"></script></head><body><a href="/locations">Sucursales</a><a href="#apertura">Apertura</a></body></html>');
 return {root:source,baseline,out,commit:'b'.repeat(40),dirty:false,expectedBaselineDigest:digest};
}
test('shared preview preserves booking bytes, disables analytics and sends other destinations to the official site',t=>{
 const options=fixture(t),report=buildCiudadJuarezShare(options),html=readFileSync(resolve(options.out,'public/ciudad-juarez.html'),'utf8');
 assert.equal(readFileSync(resolve(options.out,'public/houston.html'),'utf8'),'unchanged booking preview');
 assert.equal(report.unchangedBaselineFiles,1);assert.equal(report.fileCount,3);
 assert.match(html,/noindex,nofollow,noarchive/);assert.doesNotMatch(html,/<script/);
 assert.match(html,/href="https:\/\/sin-yolanda.com\/locations"/);assert.match(html,/href="#apertura"/);assert.match(html,/css\?v=review-[a-f0-9]{12}/);
 assert.throws(()=>buildCiudadJuarezShare(options),/overwrite/);
});
for(const mode of ['changed-byte','extra-file','dirty','missing-dependency','overlap'])test('refuses '+mode+' before publishing an artifact',t=>{
 const o=fixture(t);
 if(mode==='changed-byte')writeFileSync(resolve(o.baseline,'public/houston.html'),'changed');
 if(mode==='extra-file')writeFileSync(resolve(o.baseline,'public/private.txt'),'not allowed');
 if(mode==='dirty')o.dirty=true;
 if(mode==='missing-dependency')writeFileSync(resolve(o.root,'ciudad-juarez.html'),'<meta name="robots" content="index"><img src="/missing.jpg">');
 if(mode==='overlap'){
  const p=resolve(o.baseline,'release.json'),prior=JSON.parse(readFileSync(p));
  writeFileSync(resolve(o.baseline,'public/ciudad-juarez.html'),'original');prior.hashes['ciudad-juarez.html']=hash('original');
  prior.publicDigest=hash(JSON.stringify(prior.hashes));writeFileSync(p,JSON.stringify(prior));o.expectedBaselineDigest=prior.publicDigest;
 }
 assert.throws(()=>buildCiudadJuarezShare(o));
});
