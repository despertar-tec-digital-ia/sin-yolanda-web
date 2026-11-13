import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {renderPosadasInvitation,projectExpandedInvitation,renderExpandedPosadasPage,detailPath} from '../scripts/review/gdl-posadas-expanded.mjs';
import {projectPosadasDesign,navLink,heroLink,styleTag} from '../scripts/review/gdl-posadas-design.mjs';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';
import {elementRange} from '../scripts/editorial/public-agenda.mjs';
import {buildExpandedPosadas} from '../scripts/build-gdl-posadas-expanded.mjs';

const root=resolve(import.meta.dirname,'..');
test('the expanded invitation preserves Guadalajara outside the authorized module and navigation',()=>{
 const original=projectPublicSite(root,{now:'2026-11-12T19:00:00Z',posadas:false,commit:'a'.repeat(40)}).files.get('guadalajara.html');
 let candidate=projectExpandedInvitation(projectPosadasDesign(original));
 const range=elementRange(candidate,'section','posadas');assert.ok(range);
 candidate=candidate.slice(0,range.start)+candidate.slice(range.end);
 candidate=candidate.replace(navLink,'').replace(heroLink,'').replace(/<link rel="preload" href="\/fonts\/bebas-neue-400\.woff2"[^>]+><link rel="stylesheet" href="\/assets\/review-gdl\/gdl-posadas-expanded\.css">/,'');
 assert.equal(candidate,original);
 assert.doesNotMatch(renderPosadasInvitation(),/GpPoster|500|disabled|<details/);
 assert.match(renderPosadasInvitation(),new RegExp(`href="${detailPath}"`));
});
test('the local detail includes the supplied commercial information without activating contact or inventing a package',()=>{
 const page=renderExpandedPosadasPage();
 assert.equal((page.match(/<h1\b/g)||[]).length,1);
 for(const text of ['5 a 200','10 o más','$500 MXN por persona','a cuenta de consumo','5 a 9','5:00 a 8:30 pm','15 minutos de tolerancia','33 2231 9636','Avenida San Ignacio 78','2026'])assert.ok(page.includes(text),text);
 assert.equal((page.match(/<details\b/g)||[]).length,5);
 assert.match(page,/noindex,nofollow,noarchive/);
 assert.match(page,/<button[^>]+disabled/);
 assert.doesNotMatch(page,/wa\.me|<form\b|a tu medida|desde\s*\$500|sinyolandagdl\.com\/posadas/i);
 assert.deepEqual([...page.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)].map(m=>m[0]),['<script defer src="/assets/review-gdl/gdl-posadas-ui.js"></script>']);
 assert.equal((page.match(/name="posadas-faq"/g)||[]).length,5);
 assert.equal((page.match(/<details[^>]* open>/g)||[]).length,1);
 const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
 for(const [,id] of page.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(id),id);
 const manifest=readFileSync(resolve(root,'scripts/public-manifest.json'),'utf8');assert.doesNotMatch(manifest,/assets\/review-gdl/);
});
test('the expanded builder retains the fresh local artifact boundary',()=>{
 assert.throws(()=>buildExpandedPosadas());assert.throws(()=>buildExpandedPosadas(root));
});
test('the local campaign art opens detail from the branch and contact from the detail, while social photos stay separate',()=>{
 const invitation=renderPosadasInvitation(),page=renderExpandedPosadasPage();
 assert.match(invitation,/class="pd-campaign-link" href="\/guadalajara\/posadas\/"/);
 assert.match(page,/class="pd-campaign-link" href="#cotizar"/);
 assert.match(invitation,/gdl-posadas-campaign-capture\.webp/);
 assert.match(page,/class="pd-gallery"/);
 for(const name of ['amigas','dueto']){
  assert.match(page,new RegExp(`gdl-posadas-${name}-gallery-600\\.webp`));
  assert.ok(readFileSync(resolve(root,`scripts/review/assets/gdl-posadas-${name}-gallery-1200.webp`)).length>0);
 }
 assert.doesNotMatch(page,/wa\.me/);
});
