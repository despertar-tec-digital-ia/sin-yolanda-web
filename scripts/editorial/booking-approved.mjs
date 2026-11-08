import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {refineBooking,validateWidget} from './booking-refinements.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function loadApprovedBooking(root) {
  const path=resolve(root,'scripts/editorial/approved-booking.json');
  if(!existsSync(path))return null;
  const approval=JSON.parse(readFileSync(path,'utf8'));
  assert.equal(approval.version,1);assert.equal(approval.authorizer,'Luis');
  assert.ok(approval.authorization.trim()&&Number.isFinite(Date.parse(approval.approvedAt)));
  assert.deepEqual(approval.branches,['houston']);
  const manifest=JSON.parse(readFileSync(resolve(root,'scripts/public-manifest.json'),'utf8'));
  const required=['assets/css/opentable-review.css','assets/js/opentable-review.js','assets/css/branch-motion-review.css','assets/js/branch-motion-review.js'];
  assert.deepEqual(Object.keys(approval.assets).sort(),required.sort());
  for(const[file,expected]of Object.entries(approval.assets)){
    assert.ok(manifest.assets.includes(file));
    assert.equal(hash(readFileSync(resolve(root,file))),expected,'Booking asset differs from the reviewed preview');
  }
  for(const[file,expected]of Object.entries(approval.inputs))
    assert.equal(hash(readFileSync(resolve(root,file))),expected,'Approved booking input changed');
  const config=JSON.parse(readFileSync(resolve(root,'scripts/editorial/opentable-review.json'),'utf8'));
  validateWidget(config);
  return {approval,config};
}
export function projectApprovedBooking(root,inputFiles) {
  const loaded=loadApprovedBooking(root),files=new Map(inputFiles);
  if(!loaded)return {files};
  for(const slug of loaded.approval.branches) {
    const branch=loaded.config.branches.find(b=>b.slug===slug);assert.ok(branch);
    for(const language of ['es','en']) {
      const file=language==='es'?slug+'.html':'en/'+slug+'/index.html';
      files.set(file,refineBooking(files.get(file)??readFileSync(resolve(root,file),'utf8'),branch,language));
    }
  }
  return {files,metadata:{version:1,branches:loaded.approval.branches,approvedAt:loaded.approval.approvedAt}};
}
