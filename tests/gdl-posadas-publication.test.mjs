import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';
import {elementRange} from '../scripts/editorial/public-agenda.mjs';
import {posadasExpiry,posadasStyle,posadasScript,posadasMedia,posadasContact,posadasNav,posadasHeroLink,renderProductionPosadasPage,posadasDigest} from '../scripts/editorial/gdl-posadas.mjs';
import {packagePublic} from '../scripts/package-public.mjs';
import {gdlHours,gdlHoursHtml,gdlHoursSpecification} from '../scripts/gdl-operating-hours.mjs';
import {posadasSource,restorePosadasSource} from '../scripts/posadas-source-contract.mjs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),commit='a'.repeat(40),now='2026-11-13T20:00:00Z';
const project=extra=>projectPublicSite(root,{now,commit,...extra});
test('the production invitation preserves all existing branch content outside its exact navigation and module',()=>{
  const baseline=project({posadas:false}),current=project();
  let html=current.files.get('guadalajara.html');
  const section=elementRange(html,'section','posadas');assert.ok(section);
  html=(html.slice(0,section.start)+html.slice(section.end)).replace(posadasNav,'').replace(posadasHeroLink,'')
    .replace(`<link rel="stylesheet" href="/${posadasStyle}?v=20261113-posadas">`,'')
    .replace(`<script defer src="/${posadasScript}?v=20261113-posadas"></script>`,'');
  assert.equal(html,baseline.files.get('guadalajara.html'));
  for(const[file,before]of baseline.files)if(!['guadalajara.html','houston.html'].includes(file))assert.equal(current.files.get(file),before,file);
  assert.equal(current.files.get('houston.html').replace(/ data-agenda-render-digest="[^"]+"/,''),baseline.files.get('houston.html').replace(/ data-agenda-render-digest="[^"]+"/,''));
});
test('the public detail has the supplied WhatsApp, original artwork and real SEO without preview-only actions',()=>{
  const html=project().files.get('guadalajara/posadas/index.html');
  assert.ok(html.includes(`href="${posadasContact}"`));
  assert.match(html,/rel="canonical" href="https:\/\/sin-yolanda.com\/guadalajara\/posadas\/"/);
  assert.doesNotMatch(html,/noindex|disabled|prueba|review-gdl|localhost|<form\b|a tu medida/i);
  for(const value of ['5 a 200','$500 MXN por persona','a cuenta de consumo','19:00','15 minutos','33 2231 9636'])assert.ok(html.includes(value),value);
  assert.doesNotMatch(html,/5:00 a 8:30/);
  for(const file of posadasMedia)assert.ok(readFileSync(resolve(root,file)).length>0);
  assert.equal(readFileSync(resolve(root,'guadalajara/posadas/index.html'),'utf8'),renderProductionPosadasPage());
  const approval=JSON.parse(readFileSync(resolve(root,'scripts/editorial/approved-gdl-posadas.json')));
  assert.equal(approval.sourceDigest,posadasDigest(root));
});
test('the server and scheduler remove only Posadas at Guadalajara midnight after December',()=>{
  const before=projectPublicSite(root,{now:'2027-01-01T05:59:59.999Z',commit});
  assert.match(before.files.get('guadalajara.html'),/data-posadas-campaign/);
  assert.equal(before.posadas.nextTransitionAt,posadasExpiry);
  const ended=projectPublicSite(root,{now:posadasExpiry,commit}),baseline=projectPublicSite(root,{now:posadasExpiry,commit,posadas:false});
  assert.equal(ended.files.get('guadalajara.html'),baseline.files.get('guadalajara.html'));
  const html=ended.files.get('guadalajara/posadas/index.html');
  assert.match(html,/Esta temporada<br>ya terminó/);assert.doesNotMatch(html,/wa\.me|href="#cotizar"|<template/);
  assert.equal(ended.posadas.active,false);
});
test('review tools may omit the campaign but production packaging cannot',()=>{
  assert.throws(()=>packagePublic({root,destination:resolve(root,'.artifacts/must-not-create'),posadas:false}),/Only local review/);
});
test('Guadalajara follows its confirmed Google hours without rewriting any USA schedule',()=>{
 const html=readFileSync(resolve(root,'guadalajara.html'),'utf8');assert.ok(html.includes(gdlHoursHtml()));
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 assert.deepEqual(schema.openingHoursSpecification,gdlHoursSpecification());
 const discovery=JSON.parse(readFileSync(resolve(root,'discovery.json')));
 assert.deepEqual(discovery.locations.find(l=>l.id==='san-ignacio').openingHoursSpecification,gdlHoursSpecification());
 const context={window:{}};vm.runInNewContext(readFileSync(resolve(root,'assets/js/public-data.js'),'utf8'),context);
 assert.equal(context.window.SY_DATA.branches.find(b=>b.id==='san-ignacio').hours,gdlHours.summary);
 assert.equal(gdlHours.timeZone,'America/Mexico_City');
});
test('the new additive source contract preserves complete historical byte guards and refuses unknown or ambiguous changes',()=>{
 const hash=value=>createHash('sha256').update(value).digest('hex');
 for(const[file,entry]of Object.entries(posadasSource.files)){
  const source=readFileSync(resolve(root,file),'utf8');assert.equal(hash(source),entry.afterSha256,file);
  const restored=restorePosadasSource(file,source);assert.equal(hash(restored),entry.beforeSha256,file);
  assert.equal(restorePosadasSource(file,restored),restored);
  assert.notEqual(hash(restorePosadasSource(file,source+'unknown edit')),entry.beforeSha256);
 }
});
