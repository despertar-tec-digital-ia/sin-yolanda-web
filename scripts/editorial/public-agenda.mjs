// Approved informational projection of the existing editorial records. This adapter
// reuses the programming clock; it is not a second event editor or source catalogue.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { renderBranchAgenda, escapeHtml } from './branch-agenda.mjs';
import { localInstant, nextLocalDay, resolveProgrammingClock } from './programming-clock.mjs';
import { renderShell } from '../seo.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
export const approvalInputs = ['scripts/editorial/front-b-review.json','scripts/editorial/front-b-sources.json','scripts/editorial/branch-agenda.mjs','scripts/editorial/branch-agenda.css','scripts/editorial/programming-clock.mjs','scripts/editorial/public-agenda.mjs','assets/js/agenda-clock.js'];
export function agendaApprovalDigest(root) {
  return hash(JSON.stringify(approvalInputs.map(file => [file,hash(readFileSync(resolve(root,file)))])));
}
export function loadApprovedAgenda(root) {
  const file=resolve(root,'scripts/editorial/approved-agenda.json'); if(!existsSync(file))return null;
  const approval=JSON.parse(readFileSync(file));
  assert.equal(approval.version,1); assert.equal(approval.approvedBy,'Luis');
  resolveProgrammingClock(approval.approvedAt);
  assert.equal(approval.sourceDigest,agendaApprovalDigest(root),'Agenda changed since the approved projection');
  assert.equal(approval.publicationEnabled,true);
  const data=JSON.parse(readFileSync(resolve(root,'scripts/editorial/front-b-review.json'))),registry=JSON.parse(readFileSync(resolve(root,'scripts/editorial/front-b-sources.json')));
  const all=Object.values(data.branches).flatMap(branch=>branch.units);
  assert.equal(new Set(approval.records.map(record=>record.id)).size,approval.records.length);
  for(const record of approval.records) {
    const unit=all.find(unit=>unit.id===record.id);assert.ok(unit);
    assert.ok(!unit.sourceConflict && !unit.validityUnknown && unit.temporalKind!=='weekday-slot');
    assert.equal(record.publishFrom,approval.approvedAt);
    if(unit.date) {
      const expected=unit.end ? localInstant(unit.date,unit.end,unit.timeZone) : localInstant(nextLocalDay(unit.date),'00:00',unit.timeZone);
      assert.equal(record.expiresAt,expected);
      assert.equal(record.expiryBasis,unit.end?'announced-end':'editorial-next-local-midnight');
    } else { assert.equal(record.expiresAt,null);assert.equal(record.expiryBasis,'ongoing-announcement-until-editorial-change'); }
  }
  return {approval,data,registry};
}
export function elementRange(html,tag,id) {
  const open=new RegExp('<'+tag+'\\b[^>]*\\bid="'+id+'"[^>]*>');const match=open.exec(html);if(!match)return null;
  const tokens=new RegExp('<\\/?'+tag+'\\b[^>]*>','g');tokens.lastIndex=match.index;let depth=0;
  for(let token;(token=tokens.exec(html));) {depth+=token[0].startsWith('</')?-1:1;if(!depth)return {start:match.index,end:tokens.lastIndex,html:html.slice(match.index,tokens.lastIndex)};}
  throw new Error('Unclosed public section: '+id);
}
export function selectApprovedAgenda(config,now) {
  const instant=Date.parse(resolveProgrammingClock(now));
  const visible=config.approval.records.filter(record=>instant>=Date.parse(record.publishFrom)&&(!record.expiresAt||instant<Date.parse(record.expiresAt)));
  const transitions=config.approval.records.flatMap(record=>[record.publishFrom,record.expiresAt].filter(value=>value&&Date.parse(value)>instant)).sort();
  return {visible,nextTransitionAt:transitions[0]??null};
}
export function renderApprovedAgenda({id,language,config,now,commit}) {
  const selected=selectApprovedAgenda(config,now),allowed=new Map(selected.visible.map(record=>[record.id,record]));
  const branch={...config.data.branches[id],units:config.data.branches[id].units.filter(unit=>allowed.has(unit.id))};
  let {html}=renderBranchAgenda({id,branch,registry:config.registry,language,asOf:config.data.observedOn,audience:'public',assetPrefix:'/assets/agenda'});
  for(const [unitId,window]of allowed)html=html.replace('data-record="'+unitId+'"','data-record="'+unitId+'" data-publish-from="'+window.publishFrom+'"'+(window.expiresAt?' data-expires-at="'+window.expiresAt+'"':''));
  html=html.replace('class="sy-agenda"','class="sy-agenda" data-agenda-source-commit="'+escapeHtml(commit)+'" data-agenda-approval="'+config.approval.sourceDigest+'"');
  return html;
}
export function projectPublicAgenda(root,{now=new Date().toISOString(),commit}={}) {
  const config=loadApprovedAgenda(root);if(!config)return {files:new Map(),metadata:null};
  assert.match(commit??'',/^[a-f0-9]{40}$/);const files=new Map();
  for(const id of Object.keys(config.data.branches))for(const language of['es','en']) {
    const file=language==='es'?id+'.html':'en/'+id+'/index.html',source=readFileSync(resolve(root,file),'utf8');
    const range=elementRange(source,'section','programacion-'+id);assert.ok(range,'Approved agenda missing from source: '+file);
    const rendered=renderApprovedAgenda({id,language,config,now,commit});
    let html=source.slice(0,range.start)+rendered+source.slice(range.end);
    if(!rendered)html=html.replace(new RegExp('<a class="hh-nav-agenda"[^>]*>[\\s\\S]*?</a>'),'');
    files.set(file,html);
  }
  // Existing homepage campaigns keep their own dates and active-branch filters.
  // Render the same public template at the shared build instant, not a stale SEO shell.
  const home=readFileSync(resolve(root,'index.html'),'utf8'),current=elementRange(home,'section','cartelera');
  if(current){
    const shell=renderShell(home,new Date(resolveProgrammingClock(now)),root),fresh=elementRange(shell,'section','cartelera');
    files.set('index.html',home.slice(0,current.start)+(fresh?.html??'')+home.slice(current.end));
  }
  const selected=selectApprovedAgenda(config,now);
  const renderDigest=hash(JSON.stringify([...files].map(([file,value])=>[file,hash(value)])));
  if(files.has('houston.html'))files.set('houston.html',files.get('houston.html').replace('class="sy-agenda"','class="sy-agenda" data-agenda-render-digest="'+renderDigest+'"'));
  return {files,metadata:{version:1,approvalDigest:config.approval.sourceDigest,renderDigest,evaluatedAt:resolveProgrammingClock(now),visibleIds:selected.visible.map(record=>record.id),nextTransitionAt:selected.nextTransitionAt}};
}
