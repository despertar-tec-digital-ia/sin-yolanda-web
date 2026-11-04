// Packages a review-only overlay. Does not edit public sources or deployment manifest.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {packagePublic,publicSourceDigest} from './package-public.mjs';
import {validateSocialSelection,integrateSocialFeed} from './review/social-feed.mjs';

const root = fileURLToPath(new URL('../',import.meta.url));
const input = resolve(process.argv[2] ?? resolve(root,'.artifacts/social-feed-input'));
const artifactName = process.argv[3] ?? 'social-feed-review-20261103';
assert.match(artifactName, /^social-feed-review-[a-z0-9-]+$/);
const directory = resolve(root,'.artifacts',artifactName);
assert.ok(!existsSync(directory), 'Use a fresh artifact directory; never replace an existing review');
const selection = validateSocialSelection(JSON.parse(readFileSync(resolve(input,'selection.json'),'utf8')));
const hash = content => createHash('sha256').update(content).digest('hex');
const destination = resolve(directory,'public');
const report = packagePublic({root,destination,metadata:resolve(directory,'release.json'),audience:'review'});
const before = {...report.hashes};
for (const [file,language] of [['houston.html','es'],['en/houston/index.html','en']]) {
  const path=resolve(destination,file);
  writeFileSync(path,integrateSocialFeed(readFileSync(path,'utf8'),selection,language));
  report.hashes[file]=hash(readFileSync(path));
}
const mediaRoot=resolve(destination,'assets/social-feed-review'); mkdirSync(mediaRoot,{recursive:true});
for (const item of selection.items) for (const media of item.media) {
  const source=resolve(input,media.file),content=readFileSync(source);
  assert.equal(content.length,media.bytes);assert.equal(hash(content),media.sha256);
  copyFileSync(source,resolve(mediaRoot,media.file));report.hashes['assets/social-feed-review/'+media.file]=media.sha256;
}
const changed=Object.keys(before).filter(file=>before[file]!==report.hashes[file]);
assert.deepEqual(changed.sort(),['en/houston/index.html','houston.html']);
report.fileCount=Object.keys(report.hashes).length;
report.baselinePublicDigest=report.publicDigest;
report.publicDigest=publicSourceDigest(report.hashes);
report.socialReview={version:1,localOnly:true,automatedFeed:false,postCount:selection.items.length,changedFiles:changed,unchangedBaselineFiles:Object.keys(before).length-changed.length};
writeFileSync(resolve(directory,'release.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(resolve(directory,'selection-public.json'),JSON.stringify({branch:selection.branch,posts:selection.items.map(i=>({id:i.id,permalink:i.permalink,category:i.category,kind:i.kind,origin:i.origin}))},null,2)+'\n');
console.log(JSON.stringify({directory,sourceCommit:report.commit,...report.socialReview}));
