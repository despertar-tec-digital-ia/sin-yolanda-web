import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import vm from 'node:vm';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';
import {loadApprovedSelector} from '../scripts/editorial/selector-approved.mjs';
import {packagePublic} from '../scripts/package-public.mjs';

const root=resolve(import.meta.dirname,'..'),now='2026-11-07T20:00:00Z',commit='a'.repeat(40);
const strip=value=>value.replace(/ data-agenda-render-digest="[a-f0-9]+"/g,'');
test('approved selector changes only home, directory and their existing two resources',()=>{
  const baseline=projectPublicSite(root,{now,commit,selector:false}),live=projectPublicSite(root,{now,commit});
  const changed=[];
  for(const file of new Set([...baseline.files.keys(),...live.files.keys()])) {
    const before=baseline.files.get(file)??readFileSync(resolve(root,file),'utf8');
    const after=live.files.get(file)??readFileSync(resolve(root,file),'utf8');
    if(strip(before)!==strip(after))changed.push(file);
  }
  assert.deepEqual(changed.sort(),['assets/css/venue-selector.css','assets/js/site.js','assets/js/venue-selector.js','index.html','locations.html']);
  for(const file of ['index.html','locations.html']) {
    const html=live.files.get(file);
    assert.match(html,/venue-selector\.js\?v=20261107-selector-opening/);
    assert.match(html,/venue-selector\.css\?v=20261107-selector-opening/);
    assert.doesNotMatch(html,/ejemplo-11|opening-label-local|selector-capacity-review\.js/);
    assert.match(html,/venue-coming-soon" data-i18n-es="Próxima apertura" data-i18n-en="Opening soon">Próxima apertura/);
    assert.doesNotMatch(html,/data-i18n-es="Muy pronto"/);
  }
  const js=live.files.get('assets/js/venue-selector.js');
  assert.doesNotMatch(js,/^export /m);
  vm.runInNewContext(js,{window:{},document:{querySelector:()=>null}});
  assert.ok(live.selector);
});
test('future scheduled agenda refresh keeps the same approved selector without changing media or the manifest',t=>{
  const out=resolve(root,'.artifacts/selector-publication-test-'+process.pid);
  t.after(()=>rmSync(out,{recursive:true,force:true}));
  const build=packagePublic({root,destination:out,now});
  const scheduled=projectPublicSite(root,{now:'2026-11-24T12:00:00Z',commit});
  for(const file of ['assets/js/venue-selector.js','assets/css/venue-selector.css'])
    assert.equal(readFileSync(resolve(out,file),'utf8'),scheduled.files.get(file));
  const manifest=JSON.parse(readFileSync(resolve(root,'scripts/public-manifest.json'),'utf8'));
  assert.equal(build.fileCount,manifest.pages.length+manifest.assets.length);
  assert.ok(!Object.keys(build.hashes).some(file=>/ejemplo-11|opening-label-local|capacity-review/.test(file)));
});
test('selector approval cannot be reused after changing reviewed sizing or baseline resources',t=>{
  const fixture=mkdtempSync(resolve(tmpdir(),'sy-selector-approval-'));
  t.after(()=>rmSync(fixture,{recursive:true,force:true}));
  const approval=loadApprovedSelector(root);
  for(const file of ['scripts/editorial/approved-selector.json',...Object.keys(approval.assets),...Object.keys(approval.baseline)]){
    mkdirSync(dirname(resolve(fixture,file)),{recursive:true});copyFileSync(resolve(root,file),resolve(fixture,file));
  }
  const changed='assets/css/venue-selector-capacity-review.css';
  writeFileSync(resolve(fixture,changed),'Unapproved opening badge');
  assert.throws(()=>loadApprovedSelector(fixture),/differs from the approved/);
});
