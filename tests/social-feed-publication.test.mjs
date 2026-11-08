import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {loadApprovedSocialFeed} from '../scripts/editorial/social-feed-approved.mjs';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';
import {projectAllAgendas} from '../scripts/editorial/all-agendas.mjs';
import {renderSocialFeed} from '../scripts/editorial/social-feed.mjs';
import {createHash} from 'node:crypto';
import {socialFeedSource,restoreSocialFeedSource} from '../scripts/social-feed-source-contract.mjs';
import {restoreSocialMotionSource} from '../scripts/social-motion-source-contract.mjs';
import {loadApprovedSocialMotion,enhanceSocialMotionHtml} from '../scripts/editorial/social-motion-approved.mjs';

const root=resolve(import.meta.dirname,'..'),commit='a'.repeat(40);
const config=loadApprovedSocialFeed(root);
const stripDigest=html=>html.replace(/ data-agenda-render-digest="[a-f0-9]+"/,'');

test('the exact allowlist addition preserves historical hashes and rejects ambiguous patches',()=>{
 const file=socialFeedSource.file,source=restoreSocialMotionSource(file,readFileSync(resolve(root,file),'utf8'));
 const hash=value=>createHash('sha256').update(value).digest('hex');
 assert.equal(hash(source),socialFeedSource.afterSha256);
 assert.equal(hash(restoreSocialFeedSource(file,source)),socialFeedSource.beforeSha256);
 assert.notEqual(hash(restoreSocialFeedSource(file,source+'unknown edit')),socialFeedSource.beforeSha256);
 assert.throws(()=>restoreSocialFeedSource(file,source+socialFeedSource.patches[0].after),/Social feed manifest patch/);
});

test('isolated social projection preserves every reviewed photo and all existing page content',()=>{
 // Isolate the social layer; the independently approved selector has its own
 // full-composition and scheduler regression checks in selector-publication.
 const options={now:'2026-11-05T02:08:21Z',commit,ui:false,selector:false,booking:false};
 const before=projectAllAgendas(root,options),after=projectPublicSite(root,options);
 assert.equal(after.socialFeed.postCount,3);assert.equal(after.socialFeed.automatedFeed,false);
 assert.deepEqual([...after.files.keys()],[...before.files.keys()]);
 for(const[file,original]of before.files){
  let actual=after.files.get(file);
  if(['houston.html','en/houston/index.html'].includes(file)){
   const language=file==='houston.html'?'es':'en';
   const motion=loadApprovedSocialMotion(root);
   const feed=enhanceSocialMotionHtml(renderSocialFeed(config.selection,language).replace('data-social-review="true"','data-social-selection="houston-20261104"').replaceAll('/assets/social-feed-review/','/assets/social-feed-houston/'),motion,language);
   assert.equal(actual.split(feed).length,2,'Publish the exact reviewed section once');
   actual=actual.replace(feed,'').replace('<link rel="stylesheet" href="/assets/css/branch-social-feed.css?v=20261104-instagram-houston">','')
    .replace(`<link rel="stylesheet" href="/${motion.stylesheet}?v=${motion.assetVersion}"><script type="module" src="/${motion.script}?v=${motion.assetVersion}"></script>`,'');
   assert.equal(stripDigest(actual),stripDigest(original),'Hero, agenda, Catering and tracking must remain intact');
  }else assert.equal(actual,original,file);
 }
 const html=after.files.get('houston.html');
 for(const privateValue of [config.selection.items[0].accountId,'data-social-review=','review/social-feed','sy-shared-review-notice'])assert.ok(!html.includes(privateValue));
 const manifest=JSON.parse(readFileSync(resolve(root,'scripts/public-manifest.json')));
 assert.ok(!manifest.assets.some(p=>p.includes('selection.json')||p.includes('approved-social-feed')));
});

test('a changed selection or image cannot silently reuse the publication approval',t=>{
 const fixture=mkdtempSync(resolve(tmpdir(),'sy-social-approval-'));t.after(()=>rmSync(fixture,{recursive:true,force:true}));
 const paths=['scripts/editorial/approved-social-feed.json','scripts/editorial/houston-social-selection.json','scripts/public-manifest.json','assets/css/branch-social-feed.css',...config.selection.items.flatMap(i=>i.media.map(m=>'assets/social-feed-houston/'+m.file))];
 for(const path of paths){mkdirSync(dirname(resolve(fixture,path)),{recursive:true});copyFileSync(resolve(root,path),resolve(fixture,path));}
 const selectionPath=resolve(fixture,'scripts/editorial/houston-social-selection.json');
 writeFileSync(selectionPath,readFileSync(selectionPath,'utf8')+' ');
 assert.throws(()=>loadApprovedSocialFeed(fixture),/Selection changed/);
 copyFileSync(resolve(root,'scripts/editorial/houston-social-selection.json'),selectionPath);
 const mediaPath=resolve(fixture,paths[4]);writeFileSync(mediaPath,Buffer.alloc(config.selection.items[0].media[0].bytes));
 assert.throws(()=>loadApprovedSocialFeed(fixture),/Reviewed image bytes changed/);
});

test('future agenda refreshes retain the fixed editorial selection without resurrecting expired dates',()=>{
 const current=projectPublicSite(root,{now:'2026-11-05T02:08:21Z',commit});
 const later=projectPublicSite(root,{now:'2026-11-24T12:00:00Z',commit});
 for(const file of ['houston.html','en/houston/index.html']){
  const a=current.files.get(file),b=later.files.get(file);
  const feed=html=>html.match(/<section class="sy-social-feed"[\s\S]*?<\/section>/)[0];
  assert.equal(feed(a),feed(b));
  assert.ok(!b.includes('data-record="houston-nfl-poster-202611"'));
 }
 assert.notEqual(current.metadata.renderDigest,later.metadata.renderDigest);
});
