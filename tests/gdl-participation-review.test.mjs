import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {participationBranch,participationDetail,participationUntil} from '../scripts/review/gdl-participation.mjs';
import {measurementHarness} from './helpers/measurement-harness.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('the participation proposal separates the last elimination from the final and keeps registration intent',()=>{
 const now='2026-10-21T18:00:00Z';
 const html=participationBranch(read('guadalajara.html'),{now});
 assert.match(html,/PARTICIPA<\/strong><span>HAY ELIMINATORIAS CADA MIÉRCOLES HASTA EL <time datetime="2026-11-18">18 DE NOVIEMBRE/);
 assert.match(html,/href="tel:\+523319422709" data-record="san-ignacio-canta-5-2026"/);
 assert.ok(html.includes('href="https://wa.me/5213310186159"'),'Reservations retain the branch channel');
 assert.ok(html.includes('<time datetime="2026-12-02">'),'Contest final remains December 2');
 const detail=participationDetail(read('guadalajara/canta-por-tu-cuenta-2026/index.html'),{now});
 assert.match(detail,/class="gdl-detail-phone"/);
 const state=measurementHarness({url:'https://sin-yolanda.com/guadalajara',body:{branch:'san-ignacio'}});
 state.click(new state.Element({href:'tel:+523319422709',dataset:{record:'san-ignacio-canta-5-2026'}}));
 assert.equal(state.calls.length,1);
 assert.equal(state.calls[0][0],'programming_action_click');
 assert.equal(state.calls[0][1].destination,'phone');
});

test('the dated invitation retires after November 18 in fresh HTML and an open tab',()=>{
 const after=participationBranch(read('guadalajara.html'),{now:participationUntil});
 assert.match(after,/<p class="gdl-participate-message" data-gdl-participation="active" hidden>/);
 assert.match(after,/<p class="gdl-feature-date" data-gdl-participation="fallback">/);
 assert.match(after,/<div class="gdl-registration-number"><span>Inscripciones al concurso/,'Do not infer a registration cutoff from the last elimination');
 const ended=participationBranch(read('guadalajara.html'),{now:'2026-12-03T06:00:00Z'});
 assert.match(ended,/<div class="gdl-participation" data-gdl-event-feature="active" hidden>/);
 const nodes=['active','fallback'].map(mode=>({dataset:{gdlParticipation:mode},hidden:false}));
 let instant=Date.parse(participationUntil)-1,tick;
 vm.runInNewContext(read('scripts/review/gdl-participation.js'),{
  Date:{parse:Date.parse,now:()=>instant},document:{querySelectorAll:()=>nodes,addEventListener(){}},window:{setInterval(fn){tick=fn;}}
 });
 assert.deepEqual(nodes.map(n=>n.hidden),[false,true]);
 instant++;tick();assert.deepEqual(nodes.map(n=>n.hidden),[true,false]);
});
