import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {projectPosadasDesign,renderPosadasDesign,styleTag,navLink,heroLink} from '../scripts/review/gdl-posadas-design.mjs';
import {buildPosadasDesign} from '../scripts/build-gdl-posadas-design.mjs';
import {elementRange} from '../scripts/editorial/public-agenda.mjs';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';

const root=resolve(import.meta.dirname,'..');
test('the local design changes only the new section and its explicit navigation entries',()=>{
  const source=projectPublicSite(root,{now:'2026-11-12T19:00:00Z',commit:'a'.repeat(40)}).files.get('guadalajara.html');
  let candidate=projectPosadasDesign(source);
  const range=elementRange(candidate,'section','posadas');assert.ok(range);
  assert.ok(candidate.indexOf('id="san-ignacio"')<range.start);
  assert.ok(candidate.indexOf('id="programacion-san-ignacio"')>range.end);
  candidate=candidate.slice(0,range.start)+candidate.slice(range.end);
  assert.equal(candidate.replace(navLink,'').replace(heroLink,'').replace(styleTag,''),source);
  assert.throws(()=>projectPosadasDesign(projectPosadasDesign(source)),/Already contains/);
  assert.throws(()=>projectPosadasDesign('<html></html>'),/Guadalajara hero/);
});
test('the proposal cannot publish unconfirmed prices, capacity or active contact actions',()=>{
  const html=renderPosadasDesign();
  assert.equal((html.match(/<button\b[^>]*\bdisabled/g)||[]).length,1);
  assert.doesNotMatch(html,/500|200 personas|2231|wa\.me|<form\b|<script\b/);
  assert.match(html,/gdl-posadas-amigas-1600\.webp/);
  assert.doesNotMatch(html,/a tu medida|san-ignacio-footer/iu);
  for(const width of [800,1600])assert.ok(readFileSync(resolve(root,`scripts/review/assets/gdl-posadas-amigas-${width}.webp`)).length>0);
  const manifest=readFileSync(resolve(root,'scripts/public-manifest.json'),'utf8');
  assert.doesNotMatch(manifest,/gdl-posadas|revision-posadas/);
  assert.doesNotMatch(readFileSync(resolve(root,'scripts/editorial/public-site.mjs'),'utf8'),/posadas/);
});
test('review packaging refuses production locations and never replaces a previous candidate',t=>{
  mkdirSync(resolve(root,'.artifacts'),{recursive:true});
  const previous=mkdtempSync(resolve(root,'.artifacts/posadas-test-'));
  t.after(()=>rmSync(previous,{recursive:true,force:true}));
  for(const output of [undefined,root,resolve(root,'public'),previous])assert.throws(()=>buildPosadasDesign(output));
});
