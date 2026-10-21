import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGdlAgenda,loadGdlApproval} from '../scripts/editorial/gdl-approved.mjs';
import {projectAllAgendas} from '../scripts/editorial/all-agendas.mjs';
import {featuredUntil} from '../scripts/editorial/gdl-featured.mjs';
const root=new URL('../',import.meta.url).pathname;
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const detail='guadalajara/canta-por-tu-cuenta-2026/index.html';

test('approved GDL production feature survives fresh agenda projection without duplication',()=>{
 const {approval}=loadGdlApproval(root);
 assert.equal(approval.approvedAt,'2026-10-17T00:04:42.276Z','Keep original publication windows');
 assert.ok(approval.presentationApprovedAt);
 const result=projectAllAgendas(root,{now:'2026-10-20T03:00:00Z',commit:'a'.repeat(40)});
 const html=result.files.get('guadalajara.html');
 const order=['id="san-ignacio"','id="programacion-san-ignacio"','id="agenda-san-ignacio-canta"','id="agenda-san-ignacio-solteras"','class="sy-agenda-dates"','id="mesa"'].map(x=>html.indexOf(x));
 assert.ok(order.every(x=>x>=0));assert.deepEqual(order,[...order].sort((a,b)=>a-b));
 assert.equal((html.match(/class="gdl-register-link"/g)||[]).length,1);
 assert.equal((html.match(/<article[^>]*data-record="san-ignacio-canta-5-2026"/g)||[]).length,1);
 assert.ok(html.includes('data-agenda-approval="'+approval.sourceDigest+'"'));
 assert.ok(html.includes('10:00 a. m.–2:00 a. m. del día siguiente.'));
 for(const page of [html,result.files.get(detail)])assert.doesNotMatch(page,/assets\/review-gdl|noindex,nofollow/);
 const footer=result.files.get(detail).match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
 assert.ok(footer?.includes('cp-footer-full'));
 assert.match(footer,/href="https:\/\/wa.me\/5213310186159"/,'Footer reservations keep the branch channel');
 assert.ok(!footer.includes('data-record='),'Footer reservation must not inherit contest signup intent');
 for(const href of ['/guadalajara','/san-ignacio/menu/','/#ubicaciones','/aviso-de-privacidad'])assert.ok(footer.includes('href="'+href+'"'));
});

test('a fresh build retires registration on both GDL pages at final-date local midnight',()=>{
 const before=projectGdlAgenda(root,{now:new Date(Date.parse(featuredUntil)-1).toISOString()}).files;
 const after=projectGdlAgenda(root,{now:featuredUntil}).files;
 assert.match(before.get(detail),/data-gdl-event-feature="active">/);
 const archived=after.get(detail);
 assert.match(archived,/data-gdl-event-feature="fallback"><p>Esta edición ha terminado/);
 assert.ok(archived.indexOf('Esta edición ha terminado')<archived.indexOf('<h1'));
 assert.ok([...archived.matchAll(/<[^>]+data-gdl-event-feature="active"[^>]*>/g)].every(([tag])=>tag.includes(' hidden')));
 const branch=after.get('guadalajara.html');
 assert.ok(!branch.includes('id="agenda-san-ignacio-canta"'));
 assert.ok(branch.includes('id="agenda-san-ignacio-solteras"'));
 assert.match(branch,/<a class="hh-nav-agenda" href="#programacion-san-ignacio"/);
 assert.match(branch,/data-gdl-event-feature="fallback">Pasa a la/);
});

test('the published menu keeps exact supplied v82 PDF and fifteen original page pairs',()=>{
 const html=read('san-ignacio/menu/index.html');
 assert.equal((html.match(/class="gm-page digital-menu-group"/g)||[]).length,15);
 assert.equal((html.match(/srcset="/g)||[]).length,15);
 assert.ok(!html.includes('data-menu-item'));
 const hash=createHash('sha256').update(readFileSync(new URL('../assets/menus/gdl-v82/original.pdf',import.meta.url))).digest('hex');
 assert.equal(hash,'fbcf290eb0af66b539781f592ecfca230662b5a926d94a81ef5bce2d12f3c341');
 assert.match(html,/href="\/#ubicaciones"/);
 assert.match(html,/id="cocktails"[^<]*<\/span><figure[^>]*id="pagina-8"/);
});
