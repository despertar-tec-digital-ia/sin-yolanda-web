import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,rmSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createHeaderState} from '../assets/js/branch-ui-review.js';
import {buildUsaUiReview,texasBranches,uiAssets,refineTexasPage} from '../scripts/usa-ui-review.mjs';

const root=resolve(import.meta.dirname,'..'),hash=b=>createHash('sha256').update(b).digest('hex');

test('header ignores small reversals, reveals promptly on upward scroll and keeps keyboard focus visible',()=>{
 const update=createHeaderState(200);
 assert.deepEqual(update({y:220}),{hidden:false,scrolled:true});
 assert.equal(update({y:238}).hidden,true);
 assert.equal(update({y:234}).hidden,true);
 assert.equal(update({y:229}).hidden,true);
 assert.equal(update({y:228}).hidden,false);
 assert.equal(update({y:300,protectedFocus:true}).hidden,false);
 assert.equal(update({y:500,reset:true}).hidden,false);
 assert.equal(update({y:520}).hidden,false);
});

test('compact header uses separate enter/exit boundaries and clamps elastic overscroll',()=>{
 const update=createHeaderState();
 assert.equal(update({y:33}).scrolled,true);
 assert.equal(update({y:23}).scrolled,true);
 assert.equal(update({y:16}).scrolled,false);
 assert.equal(update({y:29}).scrolled,false);
 assert.deepEqual(update({y:-40}),{hidden:false,scrolled:false});
 update({y:1000,maxY:500,reset:true});
 assert.equal(update({y:1010,maxY:500}).hidden,false);
});

test('review changes only Texas ES/EN and Catering, preserves all other source bytes and original media',t=>{
 const out=resolve(root,'.artifacts/usa-ui-test-'+process.pid);
 t.after(()=>rmSync(out,{recursive:true,force:true}));assert.equal(existsSync(out),false);
 const report=buildUsaUiReview({root,out,now:'2026-11-05T12:00:00Z'});
 const baseline=JSON.parse(readFileSync(resolve(out,'baseline-release.json')));
 const changes=JSON.parse(readFileSync(resolve(out,'changes.json')));
 assert.equal(report.audience,'review');assert.equal(report.productionIntegrated,false);
 assert.equal(Object.keys(changes).length,10);
 for(const[file,expected]of Object.entries(baseline.hashes)){
   const bytes=readFileSync(resolve(out,'public',file));
   if(!changes[file]){assert.equal(hash(bytes),expected,file+' must remain byte-identical');continue;}
   let restored=bytes.toString();
   for(const patch of [...changes[file]].reverse())restored=restored.replace(patch.after,()=>patch.before);
   assert.equal(hash(restored),expected,file+' must restore exactly outside the declared UI changes');
 }
 for(const branch of texasBranches)for(const lang of ['es','en']){
   const file=lang==='es'?branch+'.html':'en/'+branch+'/index.html';
   const html=readFileSync(resolve(out,'public',file),'utf8');
   assert.equal((html.match(/data-catering-teaser=/g)||[]).length,1,file);
   assert.ok(html.includes(`href="#catering-${branch}"`));
   assert.ok(!html.includes('script_index_0_lang.'),'Only one header controller may run');
   const section=html.match(/<section class="bct"[\s\S]*?<\/section>/)[0];
   assert.ok(section.includes(lang==='es'?'href="/catering/"':'href="/en/catering/"'));
   if(branch!=='houston')assert.ok(!section.includes('Houston'),'No Houston copy may leak into another branch');
 }
 for(const file of ['catering.html','en/catering/index.html']){
   const html=readFileSync(resolve(out,'public',file),'utf8');
   assert.ok(!html.includes('Houston'));
   assert.ok(!html.includes('"areaServed"'),'Do not invent delivery coverage or radius');
 }
 const manifest=JSON.parse(readFileSync(resolve(root,'scripts/public-manifest.json')));
 for(const asset of uiAssets)assert.ok(!manifest.assets.includes(asset),'Review must not silently enter production');
});

test('overlay refuses a non-Texas branch and cannot silently apply twice',()=>{
 assert.throws(()=>refineTexasPage('',{branch:'san-ignacio'}));
 assert.throws(()=>refineTexasPage('data-usa-ui-review="houston"',{branch:'houston',language:'es'}),/twice/);
 assert.throws(()=>buildUsaUiReview({root,out:resolve(root,'public-ui')}),/ignored local artifact/);
});
