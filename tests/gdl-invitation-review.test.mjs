import test from 'node:test';
import assert from 'node:assert/strict';
import {loadGdlApproval} from '../scripts/editorial/gdl-approved.mjs';
import {renderGdlAgenda} from '../scripts/editorial/gdl-agenda.mjs';
import {arrangeGdlAgenda as arrangeInvitation} from '../scripts/editorial/gdl-featured.mjs';
import {contestPath,contestRecord,registrationWhatsapp} from '../scripts/editorial/gdl-contest-config.mjs';
import {measurementHarness} from './helpers/measurement-harness.mjs';
const root=new URL('../',import.meta.url).pathname;

test('the GDL invitation leads to its edition before direct signup, with one current contest',()=>{
 const {records}=loadGdlApproval(root);
 const html=arrangeInvitation(renderGdlAgenda({records}));
 assert.equal((html.match(/class="sy-gdl-competition"/g)||[]).length,1);
 const primary=html.match(/class="gdl-contest-primary" href="([^"]+)"/);
 assert.equal(primary?.[1],contestPath);
 assert.ok(html.indexOf('gdl-contest-primary')<html.indexOf('gdl-register-link'));
 assert.ok(html.indexOf('agenda-san-ignacio-canta')<html.indexOf('agenda-san-ignacio-solteras'));
 assert.ok(html.includes('aria-label="Conocer Canta por tu Cuenta y cómo participar"'));
 assert.ok(!html.includes('Preguntas e inscripción'));
 const state=measurementHarness({url:'https://sin-yolanda.com/guadalajara',body:{branch:'san-ignacio'}});
 const record=new state.Element({tag:'article',dataset:{record:contestRecord}});
 for(const href of [contestPath,registrationWhatsapp])state.click(new state.Element({href,parent:record}));
 assert.deepEqual(state.calls.map(([name,data])=>[name,data.event_id,data.destination]),[
  ['programming_action_click',contestRecord,'agenda_section'],['programming_action_click',contestRecord,'whatsapp']
 ]);
});

test('the invitation keeps the approved event windows and remaining cards when the contest ends',()=>{
 const {records,approval}=loadGdlApproval(root),after=Date.parse('2026-12-03T06:00:00Z');
 const visible=approval.records.filter(r=>!r.expiresAt||Date.parse(r.expiresAt)>after);
 const html=arrangeInvitation(renderGdlAgenda({records,visibleIds:visible.map(r=>r.id)}));
 assert.ok(!html.includes('sy-gdl-competition'));
 assert.ok(!html.includes('gdl-contest-primary'));
 assert.ok(html.includes('agenda-san-ignacio-solteras'));
});
