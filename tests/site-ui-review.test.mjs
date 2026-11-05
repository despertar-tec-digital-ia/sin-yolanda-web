import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {buildSiteUiReview,siteUiAsset,cateringCopy} from '../scripts/site-ui-review.mjs';

test('full-site candidate preserves every byte outside declared patches, including hero, artwork and legal copy',t=>{
  const root=resolve(import.meta.dirname,'..'),out=resolve(root,'.artifacts/site-ui-test-'+process.pid);
  t.after(()=>rmSync(out,{recursive:true,force:true}));
  const report=buildSiteUiReview({root,out,now:'2026-11-05T12:00:00Z'});
  const baseline=JSON.parse(readFileSync(resolve(out,'baseline-release.json')));
  const changes=JSON.parse(readFileSync(resolve(out,'changes.json')));
  const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
  const pages=Object.keys(baseline.hashes).filter(file=>file.endsWith('.html'));
  assert.deepEqual(report.uiReview.reviewedPages,pages);
  assert.equal(report.productionIntegrated,false);
  for(const[file,expected]of Object.entries(baseline.hashes)){
    const bytes=readFileSync(resolve(out,'public',file));
    let restored=bytes.toString();
    for(const patch of [...(changes[file]??[])].reverse())restored=restored.replace(patch.after,()=>patch.before);
    assert.equal(changes[file]?sha(restored):sha(bytes),expected,file+' must restore exactly');
  }
  // Home and Guadalajara HTML only receive the opt-in marker and stylesheet, no content changes.
  for(const file of ['index.html','guadalajara.html','san-ignacio/menu/index.html',
    'guadalajara/canta-por-tu-cuenta-2026/index.html','aviso-de-privacidad.html']){
    assert.equal(changes[file].length,2,file);
    assert.ok(changes[file][0].before.startsWith('<body'));
    assert.equal(changes[file][1].before,'</head>');
  }
  assert.deepEqual(changes['assets/js/site.js'],[{before:cateringCopy.es[0],after:cateringCopy.es[1]}]);
  assert.equal(changes['assets/js/i18n.js'].length,2);
  const manifest=JSON.parse(readFileSync(resolve(root,'scripts/public-manifest.json')));
  assert.ok(!manifest.assets.includes(siteUiAsset),'Local review cannot silently enter production');
});
