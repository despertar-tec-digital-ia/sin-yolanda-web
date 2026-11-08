// Local-only review. The approved package and scheduler are left untouched.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packagePublic} from './package-public.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function buildSelectorReview({root,out,now}={}) {
  root=resolve(root);out=resolve(out);assert.ok(out.startsWith(resolve(root,'.artifacts')+'/'));
  const publicRoot=resolve(out,'public'),baseline=packagePublic({root,destination:publicRoot,audience:'review',now});
  const hashes={...baseline.hashes};
  const assets=['assets/js/venue-selector-capacity-review.js','assets/css/venue-selector-capacity-review.css'];
  for(const file of assets){copyFileSync(resolve(root,file),resolve(publicRoot,file));hashes[file]=hash(readFileSync(resolve(root,file)));}
  const changed=[];
  for(const file of ['index.html','locations.html']){
    let html=readFileSync(resolve(publicRoot,file),'utf8');
    html=html.replace(/<script\b[^>]*src="[^"]*(?:site-measurement|site-analytics|ga4-consent|umami|webmcp)[^"]*"[^>]*>\s*<\/script>/g,'');
    const controller=/<script src="\/?assets\/js\/venue-selector\.js\?v=[^"]+"><\/script>/g;
    assert.equal([...html.matchAll(controller)].length,1);
    html=html.replace(controller,`<script type="module" src="/${assets[0]}?v=review-${hashes[assets[0]].slice(0,12)}"></script>`);
    html=html.replace('</head>',`<link rel="stylesheet" href="/${assets[1]}?v=review-${hashes[assets[1]].slice(0,12)}"><meta name="robots" content="noindex,nofollow"></head>`);
    writeFileSync(resolve(publicRoot,file),html);hashes[file]=hash(html);changed.push(file);
  }
  const report={...baseline,hashes,fileCount:Object.keys(hashes).length,publicDigest:hash(JSON.stringify(hashes)),reviewOnly:true,productionIntegrated:false,
    selectorReview:{changedPages:changed,addedAssets:assets,baselineDigest:baseline.publicDigest,baselineHashes:baseline.hashes}};
  writeFileSync(resolve(out,'release.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=buildSelectorReview({root:resolve(import.meta.dirname,'..'),out:process.argv[2]});console.log(JSON.stringify({files:r.fileCount,reviewOnly:true,productionIntegrated:false,digest:r.publicDigest}));
}
