// Approved selector sizing, shared by release builds and scheduled agenda updates.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const hash=value=>createHash('sha256').update(value).digest('hex');
export function loadApprovedSelector(root) {
  const path=resolve(root,'scripts/editorial/approved-selector.json');
  if(!existsSync(path))return null;
  const approval=JSON.parse(readFileSync(path,'utf8'));
  assert.equal(approval.version,1);assert.equal(approval.authorizer,'Luis');
  assert.ok(Number.isFinite(Date.parse(approval.approvedAt))&&approval.authorization.trim());
  assert.deepEqual(Object.keys(approval.assets).sort(),[
    'assets/css/venue-selector-capacity-review.css','assets/js/venue-selector-capacity-review.js']);
  assert.deepEqual(Object.keys(approval.baseline).sort(),[
    'assets/css/venue-selector.css','assets/js/venue-selector.js']);
  for(const[file,expected]of Object.entries({...approval.assets,...approval.baseline}))
    assert.equal(hash(readFileSync(resolve(root,file))),expected,'Selector source differs from the approved candidate: '+file);
  assert.match(approval.assetVersion,/^\d{8}-[a-z0-9-]+$/);
  return approval;
}

export function projectApprovedSelector(root,inputFiles) {
  const approval=loadApprovedSelector(root),files=new Map(inputFiles);
  if(!approval)return {files};
  const read=file=>files.get(file)??readFileSync(resolve(root,file),'utf8');
  assert.equal(hash(read('assets/js/venue-selector.js')),approval.baseline['assets/js/venue-selector.js']);
  assert.equal(hash(read('assets/css/venue-selector.css')),approval.baseline['assets/css/venue-selector.css']);
  const controller=readFileSync(resolve(root,'assets/js/venue-selector-capacity-review.js'),'utf8')
    .replace(/^export function /gm,'function ');
  files.set('assets/js/venue-selector.js','(function () {\n"use strict";\n'+controller+'\n})();\n');
  files.set('assets/css/venue-selector.css',read('assets/css/venue-selector.css')+'\n'+
    readFileSync(resolve(root,'assets/css/venue-selector-capacity-review.css'),'utf8'));
  for(const file of ['index.html','locations.html']) {
    let html=read(file);
    for(const asset of ['assets/js/venue-selector.js','assets/css/venue-selector.css']) {
      const pattern=new RegExp('((?:src|href)="\\/?'+asset.replaceAll('.','\\.')+')\\?v=[^"\\s]+','g');
      assert.equal([...html.matchAll(pattern)].length,1,'Expected one selector dependency in '+file);
      html=html.replace(pattern,'$1?v='+approval.assetVersion);
    }
    files.set(file,html);
  }
  return {files,metadata:{version:1,approvedAt:approval.approvedAt}};
}
