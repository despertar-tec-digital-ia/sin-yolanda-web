import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {texasBranches,uiAssets,refineTexasPage,refineCateringPage,siteUiAsset,cateringCopy} from './ui-refinements.mjs';

const hash=data=>createHash('sha256').update(data).digest('hex');
export function loadApprovedUi(root) {
  const path=resolve(root,'scripts/editorial/approved-ui.json');
  if(!existsSync(path))return null;
  const approval=JSON.parse(readFileSync(path,'utf8'));
  assert.equal(approval.version,1);assert.equal(approval.authorizer,'Luis');
  assert.ok(Number.isFinite(Date.parse(approval.approvedAt))&&approval.authorization.trim());
  const manifest=JSON.parse(readFileSync(resolve(root,'scripts/public-manifest.json'),'utf8'));
  assert.deepEqual(Object.keys(approval.assets).sort(),[...uiAssets,siteUiAsset].sort());
  for(const[file,expected]of Object.entries(approval.assets)){
    assert.ok(manifest.assets.includes(file));
    assert.equal(hash(readFileSync(resolve(root,file))),expected,'UI asset differs from the approved candidate');
  }
  assert.equal(hash(readFileSync(resolve(root,'scripts/editorial/ui-refinements.mjs'))),approval.refinementsDigest);
  return {approval,manifest};
}

export function projectApprovedUi(root,inputFiles) {
  const config=loadApprovedUi(root),files=new Map(inputFiles);
  if(!config)return {files};
  const read=file=>files.get(file)??readFileSync(resolve(root,file),'utf8');
  const teasers={};
  for(const language of ['es','en'])teasers[language]=read(language==='es'?'houston.html':'en/houston/index.html')
    .match(/<div><section class="bct"[\s\S]*?<\/section><\/div>/)[0];
  for(const branch of texasBranches)for(const language of ['es','en']){
    const file=language==='es'?branch+'.html':'en/'+branch+'/index.html';
    files.set(file,refineTexasPage(read(file),{branch,language,teaser:teasers[language]}).html);
  }
  for(const[file,language]of [['catering.html','es'],['en/catering/index.html','en']])
    files.set(file,refineCateringPage(read(file),language).html);
  for(const file of config.manifest.pages){
    let html=read(file);assert.ok(!html.includes('data-site-ui-review='),'UI must be projected once');
    html=html.replace(/<body\b[^>]*>/,body=>body.replace('>',' data-site-ui-review="subtle">'));
    html=html.replace('</head>',`<link rel="stylesheet" href="/${siteUiAsset}?v=20261105-site-ui"></head>`);
    // These two scripts keep their historical sources; the approved projection also versions their URLs.
    html=html.replace(/((?:src|href)="\/?assets\/js\/(?:site|i18n)\.js)\?v=[^"\s]+/g,'$1?v='+config.approval.scriptVersion);
    files.set(file,html);
  }
  for(const[file,pairs]of [['assets/js/site.js',[cateringCopy.es]],['assets/js/i18n.js',[cateringCopy.es,cateringCopy.en]]]){
    let js=read(file);
    for(const[before,after]of pairs){assert.equal(js.split(before).length,2);js=js.replace(before,()=>after);}
    files.set(file,js);
  }
  return {files,metadata:{version:1,approvedAt:config.approval.approvedAt,pages:config.manifest.pages.length}};
}
