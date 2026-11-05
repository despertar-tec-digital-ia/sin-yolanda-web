// Only the exact reviewed Houston selection may enter the public artifact.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {validateSocialSelection,renderSocialFeed,socialFeedCss} from './social-feed.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
export function loadApprovedSocialFeed(root) {
  const path=resolve(root,'scripts/editorial/approved-social-feed.json');
  if(!existsSync(path))return null;
  const approval=JSON.parse(readFileSync(path,'utf8'));
  assert.equal(approval.version,1);assert.equal(approval.authorizer,'Luis');
  assert.equal(approval.automatedFeed,false);
  assert.equal(approval.selectionId,'houston-20261104');
  assert.ok(Number.isFinite(Date.parse(approval.approvedAt)));
  assert.ok(typeof approval.authorization==='string'&&approval.authorization.trim());
  assert.equal(approval.selectionFile,'scripts/editorial/houston-social-selection.json');
  const bytes=readFileSync(resolve(root,approval.selectionFile));
  assert.equal(hash(bytes),approval.selectionDigest,'Selection changed outside its approval');
  const selection=validateSocialSelection(JSON.parse(bytes));
  assert.deepEqual(selection.items.map(i=>i.id).sort(),approval.postIds);
  assert.equal(selection.items.length,3,'This release approves exactly three Houston posts');
  assert.equal(approval.stylesheet,'assets/css/branch-social-feed.css');
  assert.equal(approval.stylesheetVersion,'20261104-instagram-houston');
  const css=readFileSync(resolve(root,approval.stylesheet),'utf8');
  assert.equal(css,socialFeedCss,'Approved preview styling must remain unchanged');
  assert.equal(hash(css),approval.stylesheetDigest);
  const manifest=JSON.parse(readFileSync(resolve(root,'scripts/public-manifest.json'),'utf8'));
  assert.equal(manifest.assetVersions[approval.stylesheet],approval.stylesheetVersion);
  for(const item of selection.items)for(const media of item.media){
    const file='assets/social-feed-houston/'+media.file;
    assert.ok(manifest.assets.includes(file),'Reviewed media must be explicitly allowlisted');
    const content=readFileSync(resolve(root,file));
    assert.equal(content.length,media.bytes);assert.equal(hash(content),media.sha256,'Reviewed image bytes changed');
  }
  assert.ok(manifest.assets.includes(approval.stylesheet));
  return {approval,selection};
}

export function projectApprovedSocialFeed(root,inputFiles) {
  const config=loadApprovedSocialFeed(root);
  if(!config)return {files:new Map(inputFiles)};
  const {selection,approval}=config,files=new Map(inputFiles);
  for(const[file,language]of[['houston.html','es'],['en/houston/index.html','en']]){
    const html=files.get(file)??readFileSync(resolve(root,file),'utf8');
    assert.ok(!html.includes('id="instagram-houston"'),'Duplicate Instagram section');
    const marker='<div><section class="bct"';
    assert.equal(html.split(marker).length,2,'Expected original Houston Catering boundary');
    assert.equal(html.split('</head>').length,2);
    const feed=renderSocialFeed(selection,language)
      .replace('data-social-review="true"','data-social-selection="'+approval.selectionId+'"')
      .replaceAll('/assets/social-feed-review/','/assets/social-feed-houston/');
    assert.ok(!feed.includes('data-social-review=')&&!feed.includes('/social-feed-review/'));
    const link='<link rel="stylesheet" href="/'+approval.stylesheet+'?v='+approval.stylesheetVersion+'">';
    files.set(file,html.replace('</head>',link+'</head>').replace(marker,feed+marker));
  }
  return {files,metadata:{version:1,branch:'houston',selectionId:approval.selectionId,
    selectionDigest:approval.selectionDigest,postCount:selection.items.length,automatedFeed:false}};
}
