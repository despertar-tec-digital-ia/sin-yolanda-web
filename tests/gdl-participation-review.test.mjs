import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {participationUntil,featuredUntil} from '../scripts/editorial/gdl-featured.mjs';
import {projectGdlAgenda} from '../scripts/editorial/gdl-approved.mjs';
import {measurementHarness} from './helpers/measurement-harness.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const root=new URL('../',import.meta.url).pathname;
const project=now=>projectGdlAgenda(root,{now,commit:'a'.repeat(40)});

test('the GDL hero keeps the branch invitation and directs its participation callout to the contest',()=>{
 const now='2026-10-21T18:00:00Z';
 const html=project(now).files.get('guadalajara.html');
 assert.match(html,/A cantar,<br>bailar y<br>brindar\./);
 assert.match(html,/class="gdl-participation-cta" href="\/guadalajara\/canta-por-tu-cuenta-2026\/" data-record="san-ignacio-canta-5-2026"/);
 assert.match(html,/Hay eliminatorias cada miércoles<br>hasta el <time datetime="2026-11-18">18 de noviembre/);
 assert.ok(!html.includes('gdl-registration-number'),'Phone enlargement is withdrawn until Luis confirms its purpose');
 assert.ok(html.includes('href="https://wa.me/5213310186159"'),'Reservations retain the branch channel');
 assert.ok(html.includes('<time datetime="2026-12-02">'),'Contest final remains December 2');
 assert.equal((html.match(/class="gdl-participation-cta"/g)||[]).length,1);
 const actions=html.match(/<div class="hh-welcome-actions" data-gdl-event-feature="active">[\s\S]*?<\/div>/)?.[0];
 assert.ok(actions?.includes('Reservar mesa'));
 assert.ok(!actions.includes('Ver concurso'),'The callout replaces the old duplicate hero button');
 assert.doesNotMatch(html,/data-participation-review|assets\/review-gdl/);
 const state=measurementHarness({url:'https://sin-yolanda.com/guadalajara',body:{branch:'san-ignacio'}});
 state.click(new state.Element({href:'/guadalajara/canta-por-tu-cuenta-2026/',dataset:{record:'san-ignacio-canta-5-2026'}}));
 assert.equal(state.calls.length,1);
 assert.equal(state.calls[0][0],'programming_action_click');
 assert.equal(state.calls[0][1].destination,'agenda_section');
});

test('the dated invitation retires after November 18 in fresh HTML and an open tab',()=>{
 const before=project(new Date(Date.parse(participationUntil)-1).toISOString());
 assert.equal(before.metadata.nextTransitionAt,participationUntil,'The scheduler rebuilds the presentation at Guadalajara midnight');
 const result=project(participationUntil),after=result.files.get('guadalajara.html');
 assert.equal(result.metadata.nextTransitionAt,featuredUntil);
 assert.match(after,/<strong class="gdl-participation-title" data-gdl-participation="active" hidden>/);
 assert.match(after,/<strong class="gdl-participation-title" data-gdl-participation="fallback">Ven al concurso/);
 const ended=project(featuredUntil).files.get('guadalajara.html');
 assert.match(ended,/<div class="gdl-participation" data-gdl-event-feature="active" hidden>/);
 assert.match(ended,/<p class="hh-invitation gdl-local-invitation">A cantar,<br>bailar y<br>brindar\./,'Permanent branch invitation survives the contest');
 const nodes=['active','fallback'].map(mode=>({dataset:{gdlParticipation:mode},hidden:false}));
 const featureNodes=['active','fallback'].map(mode=>({dataset:{gdlEventFeature:mode},hidden:false}));
 let instant=Date.parse(participationUntil)-1,tick;
 vm.runInNewContext(read('assets/js/gdl-focus.js'),{
  Date:{parse:Date.parse,now:()=>instant},document:{querySelectorAll:selector=>selector==='[data-gdl-participation]'?nodes:selector==='[data-gdl-event-feature]'?featureNodes:[],addEventListener(){}},window:{setInterval(fn){tick=fn;}}
 });
 assert.deepEqual(nodes.map(n=>n.hidden),[false,true]);
 instant++;tick();assert.deepEqual(nodes.map(n=>n.hidden),[true,false]);
 assert.deepEqual(featureNodes.map(n=>n.hidden),[false,true],'The November change does not close the contest');
 instant=Date.parse(featuredUntil);tick();assert.deepEqual(featureNodes.map(n=>n.hidden),[true,false]);
});
