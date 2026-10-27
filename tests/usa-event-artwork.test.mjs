import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { projectAllAgendas } from '../scripts/editorial/all-agendas.mjs';
import { applyOctoberHtml, eventArtwork } from '../scripts/editorial/october-2026-update.mjs';
import { elementRange } from '../scripts/editorial/public-agenda.mjs';
const root=resolve(import.meta.dirname,'..');
const read=file=>readFileSync(resolve(root,file),'utf8');
const project=now=>projectAllAgendas(root,{now,commit:'a'.repeat(40)}).files;
const ids=['houston','the-woodlands','el-paso','san-antonio'];
const article=(html,id)=>html.match(new RegExp('<article[^>]*data-record="'+id+'"[\\s\\S]*?</article>'))?.[0];

test('all five supplied originals are explicitly packaged with their verified bytes and dimensions',()=>{
 const assets=JSON.parse(read('scripts/public-manifest.json')).assets;
 assert.equal(Object.keys(eventArtwork.assets).length,5);
 for(const asset of Object.values(eventArtwork.assets)){
  assert.ok(assets.includes(asset.file));
  assert.equal(createHash('sha256').update(readFileSync(resolve(root,asset.file))).digest('hex'),asset.sha256);
  assert.ok(asset.width>0&&asset.height>0&&asset.alt.es&&asset.alt.en);
 }
});

test('each ES/EN branch has one Halloween and Catrinas event with the correct full-size poster',()=>{
 const files=project('2026-10-27T02:00:00Z');
 for(const id of ids)for(const lang of ['es','en']){
  const html=files.get(lang==='es'?id+'.html':'en/'+id+'/index.html');
  const catrinas=article(html,id+'-catrinas-october-update'),halloween=article(html,id+'-halloween-october-update');
  const date=id==='san-antonio'?'2026-11-01':'2026-10-30';
  assert.ok(catrinas&&halloween);
  assert.equal(html.split('data-record="'+id+'-catrinas-october-update"').length-1,1);
  assert.equal(html.split('data-record="'+id+'-halloween-october-update"').length-1,1);
  assert.match(catrinas,new RegExp('datetime="'+date+'"'));
  assert.ok(catrinas.includes(eventArtwork.assets[id==='san-antonio'?'catrinasSunday':'catrinasFriday'].file));
  assert.ok(!catrinas.includes(eventArtwork.assets[id==='san-antonio'?'catrinasFriday':'catrinasSunday'].file));
  assert.ok(halloween.includes(eventArtwork.assets.halloween.file));
  for(const card of [catrinas,halloween])assert.match(card,/<a href="\/assets\/agenda\/[^\"]+\.jpg" target="_blank"[^>]+aria-label=/);
  const sequence=[...html.matchAll(/data-record="[^"]+-(catrinas|halloween)-october-update"/g)].map(m=>m[1]);
  assert.deepEqual(sequence,id==='san-antonio'?['halloween','catrinas']:['catrinas','halloween']);
 }
});

test('Jorge uses the supplied poster in his existing two records and retains the external SA venue',()=>{
 const files=project('2026-10-27T02:00:00Z');
 for(const id of ids)for(const lang of ['es','en']){
  const html=files.get(lang==='es'?id+'.html':'en/'+id+'/index.html');
  const expected=id==='houston'||id==='san-antonio';
  assert.equal(html.includes(eventArtwork.assets.jorge.file),expected);
  if(!expected)continue;
  const record=eventArtwork.jorgeByBranch[id],card=article(html,record);
  assert.equal(html.split('data-record="'+record+'"').length-1,1);
  assert.equal((card.match(/<figure/g)||[]).length,1);
  assert.match(card,id==='houston'?/2026-11-13/:/2026-11-14/);
  if(id==='san-antonio')assert.match(card,/K\.O\.P\. Sports &amp; Entertainment Center/);
 }
});

test('NFL poster retires in each local zone while the single weekly brunch remains',()=>{
 const before=project('2026-11-23T05:59:59Z'),central=project('2026-11-23T06:00:00Z'),after=project('2026-11-23T07:00:00Z');
 for(const id of ids)for(const lang of ['es','en']){
  const file=lang==='es'?id+'.html':'en/'+id+'/index.html';
  assert.ok(before.get(file).includes(eventArtwork.assets.nfl.file));
  assert.equal(central.get(file).includes(eventArtwork.assets.nfl.file),id==='el-paso');
  assert.ok(!after.get(file).includes(eventArtwork.assets.nfl.file));
  assert.equal(after.get(file).split('Recovery Brunch + NFL').length-1,1);
  assert.match(before.get(file),new RegExp('data-record="'+id+'-nfl-poster-202611" data-expires-at="'));
 }
 assert.ok(!project('2026-11-02T06:00:00Z').get('san-antonio.html').includes(eventArtwork.assets.catrinasSunday.file));
 assert.ok(!project('2026-11-01T07:00:00Z').get('houston.html').includes(eventArtwork.assets.halloween.file));
});

test('poster integration is repeatable and changes no content outside the existing branch agenda or its stylesheet version',()=>{
 for(const id of ids)for(const lang of ['es','en']){
  const file=lang==='es'?id+'.html':'en/'+id+'/index.html',html=read(file);
  assert.equal(applyOctoberHtml(html,id,lang,'2026-10-27T02:00:00Z'),html);
  const previous=execFileSync('git',['show','f508cf780ebd80cc87c8fdcb5f18fc081c26f01f:'+file],{cwd:root,encoding:'utf8'});
  const rest=value=>{const range=elementRange(value,'section','programacion-'+id);return (value.slice(0,range.start)+value.slice(range.end)).replace(/october-update\.css\?v=[a-z0-9-]+/,'october-update.css');};
  assert.equal(rest(html),rest(previous));
 }
});
