import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { packagePublic, inspectPublic, projectRoot } from '../scripts/package-public.mjs';
import { checkPublic } from '../scripts/check-public.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'sy-public-test-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  for (const path of [...inspectPublic().files, 'scripts/public-manifest.json', 'scripts/branch-import-manifest.json', 'package.json']) {
    mkdirSync(dirname(join(root,path)), {recursive:true});
    cpSync(join(projectRoot,path), join(root,path));
  }
  return root;
}
function amend(root, fn) {
  const file = join(root,'scripts/public-manifest.json');
  const manifest = JSON.parse(readFileSync(file,'utf8'));
  fn(manifest);
  writeFileSync(file,JSON.stringify(manifest));
}
test('clean standalone source passes checks without donor or fixed folder name', t => {
  assert.equal(checkPublic(fixture(t)).pages,15);
});
test('reject stale home action stylesheet before release', t => {
  const root=fixture(t),file=join(root,'index.html');
  const source=readFileSync(file,'utf8');
  assert.match(source, /assets\/css\/home-actions\.css\?v=/);
  writeFileSync(file,source.replace(/(assets\/css\/home-actions\.css\?v=)[^"']+/, '$1stale'));
  assert.throws(()=>checkPublic(root), /Stale shared asset version/);
});
test('public package is deterministic, excludes incidental files and cannot overwrite', t => {
  const root=fixture(t);
  writeFileSync(join(root,'accidental.html'),'never publish');
  writeFileSync(join(root,'dashboard.html'),'never publish');
  const first=packagePublic({root,destination:join(root,'out-a')});
  const second=packagePublic({root,destination:join(root,'out-b')});
  assert.deepEqual(first.hashes,second.hashes);
  for(const file of ['dashboard.html','accidental.html','assets/js/mock-data.js','scripts','tests','README.md'])
    assert.ok(!existsSync(join(root,'out-a',file)),file);
  assert.throws(()=>packagePublic({root,destination:join(root,'out-a')}), /overwrite/);
});
for(const file of ['dashboard.html','assets/js/mock-data.js','../escape.html','.env','archive/retired/maricarmen.html']) {
  test('reject forbidden manifest entry: '+file, t=>{
    const root=fixture(t);
    amend(root,m=>m.assets.push(file));
    assert.throws(()=>packagePublic({root,destination:join(root,'out')}), /Forbidden|Unsafe/);
    assert.ok(!existsSync(join(root,'out')));
  });
}
test('reject symlink, including linked directories', t=>{
  const root=fixture(t);
  symlinkSync(join(root,'assets/media'),join(root,'linked'));
  amend(root,m=>m.assets.push('linked/hero-night.webp'));
  assert.throws(()=>inspectPublic(root), /Symlinks/);
});
test('reject links to non-public assets or retired pages', t=>{
  const root=fixture(t),file=join(root,'index.html');
  writeFileSync(file,readFileSync(file,'utf8')+'<a href="dashboard.html">Internal</a>');
  assert.throws(()=>checkPublic(root), /retired demo/);
  writeFileSync(file,'<img src="/missing.webp">');
  assert.throws(()=>checkPublic(root), /Missing public reference/);
});
test('reject duplicate files and missing mandatory 404 before writing', t=>{
  const root=fixture(t);
  amend(root,m=>m.assets.push('styles.css'));
  assert.throws(()=>inspectPublic(root), /Duplicate/);
  amend(root,m=>{m.assets.pop();m.pages=m.pages.filter(p=>p!=='404.html');});
  assert.throws(()=>inspectPublic(root), /404/);
});
test('reject internal collections even if the file uses a public name', t=>{
  const root=fixture(t),file=join(root,'assets/js/public-data.js');
  writeFileSync(file,readFileSync(file,'utf8')+'\nwindow.SY_DATA.metrics = {};');
  assert.throws(()=>checkPublic(root), /Internal collections/);
});
