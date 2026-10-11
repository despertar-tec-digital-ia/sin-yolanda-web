import {test} from 'node:test';
import assert from 'node:assert/strict';
import {refreshHoustonPresentation} from '../scripts/refresh-houston-presentation.mjs';
const ref='1'.repeat(40);
const page=(hash,robots='noindex,nofollow',content='Own Houston hours')=>`<html><head><meta name="robots" content="${robots}"><link rel="canonical" href="https://sin-yolanda.com/houston"><link rel="stylesheet" href="/_astro/BranchLanding.${hash}.css"></head><body data-branch="houston"><main>${content}</main><script type="module" src="/_astro/BranchLanding.astro_type_script.${hash}.js"></script></body></html>`;
test('visual refresh preserves current indexation/canonical and all branch content',()=>{
 const current=page('old','index,follow,max-image-preview:large');const next=refreshHoustonPresentation(current,page('new'),ref);
 assert.match(next,/index,follow,max-image-preview:large/);assert.match(next,/https:\/\/sin-yolanda.com\/houston/);assert.match(next,/<main>Own Houston hours<\/main>/);assert.match(next,/BranchLanding.new.css/);assert.match(next,/BranchLanding.astro_type_script.new.js/);
});
test('visual refresh rejects changed facts and a missing body',()=>{
 assert.throws(()=>refreshHoustonPresentation(page('old'),page('new','noindex,nofollow','Different hours'),ref),/Body\/content changed/);
 assert.throws(()=>refreshHoustonPresentation(page('old').replace(/<body[\s\S]*/,''),page('new'),ref));
});
test('visual refresh rejects an added script resource',()=>{
 const donor=page('new').replace('</body>','<script type="module" src="/_astro/Extra.new.js"></script></body>');assert.throws(()=>refreshHoustonPresentation(page('old'),donor,ref));
});
test('a new build observation never replaces the retained campaign snapshot or timestamp',()=>{
 const campaign=(hash,time,snapshot='same')=>page(hash).replace('<main>',`<main data-evaluated-at="${time}" data-programming-snapshot="${snapshot}">`);
 const oldTime='2026-10-08T16:16:21.671Z',newTime='2026-10-10T23:47:53.619Z';
 const current=campaign('old',oldTime);const next=refreshHoustonPresentation(current,campaign('new',newTime),ref);
 assert.ok(next.includes(oldTime));assert.ok(!next.includes(newTime));
 assert.throws(()=>refreshHoustonPresentation(current,campaign('new',newTime,'changed'),ref),/Body\/content changed/);
});
