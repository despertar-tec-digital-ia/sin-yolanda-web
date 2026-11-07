import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,rmSync,mkdtempSync,mkdirSync,copyFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {buildSiteUiReview} from '../scripts/site-ui-review.mjs';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';
import {loadApprovedUi} from '../scripts/editorial/ui-approved.mjs';
import {uiSource,restoreUiSource} from '../scripts/ui-source-contract.mjs';
import {restoreCiudadJuarezOpening} from '../scripts/ciudad-juarez-opening-source-contract.mjs';
import {packagePublic} from '../scripts/package-public.mjs';

const root=resolve(import.meta.dirname,'..'),now='2026-11-05T12:00:00Z';
const hash=data=>createHash('sha256').update(data).digest('hex');
test('approved production UI matches the complete reviewed candidate; only script cache versions and render digest differ',t=>{
  const out=resolve(root,'.artifacts/ui-parity-test-'+process.pid);
  t.after(()=>rmSync(out,{recursive:true,force:true}));
  const reviewed=buildSiteUiReview({root,out,now});
  const live=projectPublicSite(root,{now,commit:reviewed.commit});
  const normalize=s=>s.replace(/ data-agenda-render-digest="[a-f0-9]+"/g,'')
    .replace(/((?:src|href)="\/?assets\/js\/(?:site|i18n)\.js)\?v=[^"\s]+/g,'$1?v=APPROVED');
  for(const[file,actual]of live.files){
    assert.equal(normalize(actual),normalize(readFileSync(resolve(out,'public',file),'utf8')),file);
  }
  assert.equal(live.ui.pages,26);
  assert.ok(live.files.get('ciudad-juarez.html')?.includes('data-site-ui-review="subtle"'));
  const siteScriptVersion=JSON.parse(readFileSync(resolve(root,'scripts/public-manifest.json'),'utf8')).assetVersions['assets/js/site.js'];
  for(const[file,html]of live.files){
    const match=html.match(/assets\/js\/site\.js\?v=([^"\s]+)/);
    if(match)assert.equal(match[1],siteScriptVersion,file+' must use the current shared renderer version');
  }
  const later=projectPublicSite(root,{now:'2026-11-24T12:00:00Z',commit:reviewed.commit});
  for(const file of ['houston.html','en/houston/index.html','guadalajara.html']){
    assert.ok(later.files.get(file).includes('data-site-ui-review="subtle"'));
    assert.ok(!later.files.get(file).includes('data-record="houston-nfl-poster-202611"'));
  }
  assert.throws(()=>packagePublic({root,destination:out+'/forbidden',presentation:'baseline'}),/Only local review/);
});
test('UI approval binds exact assets and refuses a changed stylesheet',t=>{
  const fixture=mkdtempSync(resolve(tmpdir(),'sy-ui-approval-'));t.after(()=>rmSync(fixture,{recursive:true,force:true}));
  const config=loadApprovedUi(root);
  for(const file of ['scripts/editorial/approved-ui.json','scripts/editorial/ui-refinements.mjs','scripts/public-manifest.json',...Object.keys(config.approval.assets)]){
    mkdirSync(dirname(resolve(fixture,file)),{recursive:true});copyFileSync(resolve(root,file),resolve(fixture,file));
  }
  writeFileSync(resolve(fixture,'assets/css/site-ui-review.css'),'unknown UI change');
  assert.throws(()=>loadApprovedUi(fixture),/UI asset differs/);
});
test('UI source allowance is exact, reversible and cannot hide unrelated manifest changes',()=>{
  const source=restoreCiudadJuarezOpening(uiSource.file,readFileSync(resolve(root,uiSource.file),'utf8'));
  assert.equal(hash(source),uiSource.afterSha256);
  assert.equal(hash(restoreUiSource(uiSource.file,source)),uiSource.beforeSha256);
  assert.notEqual(hash(restoreUiSource(uiSource.file,source+'unexpected edit')),uiSource.beforeSha256);
  assert.throws(()=>restoreUiSource(uiSource.file,source+uiSource.patches[0].after),/UI source patch/);
});
