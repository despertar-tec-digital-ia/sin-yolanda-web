// Compile only approved public identifiers. Editorial facts remain in their existing owners.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {loadApprovedAgenda} from './editorial/public-agenda.mjs';

export function compileMeasurementContract(root) {
  const read=file=>readFileSync(resolve(root,file),'utf8');
  const manifest=JSON.parse(read('scripts/public-manifest.json'));
  const context={window:{}};vm.runInNewContext(read('assets/js/public-data.js'),context);
  const publicData=context.window.SY_DATA;
  const routes={};
  for(const file of manifest.pages){
    if(file==='404.html')continue;
    const html=read(file),branch=html.match(/<body\b[^>]*\bdata-branch="([^"]+)"/)?.[1];
    const route=file==='index.html'?'/':'/'+file.replace(/\/index\.html$/,'').replace(/\.html$/,'');
    const inferred=publicData.branches.find(branch=>branch.page!=='#'&&[('/'+branch.id),('/en/'+branch.id),('/'+branch.id+'/menu'),('/en/'+branch.id+'/menu')].includes(route))?.id;
    routes[route]=branch||inferred||(route.endsWith('/catering')?'catering':'group');
  }
  routes['/guadalajara']='san-ignacio';
  const approved=loadApprovedAgenda(root),events={};
  const posts=new Map(approved.registry.posts.map(post=>[post.id,post.url]));
  const tickets=new Map(approved.registry.tickets.map(ticket=>[ticket.id,ticket]));
  for(const record of approved.approval.records){
    const entry=Object.entries(approved.data.branches).find(([,branch])=>branch.units.some(unit=>unit.id===record.id));
    assert.ok(entry);const[branchId,branch]=entry,unit=branch.units.find(unit=>unit.id===record.id);
    const ticket=tickets.get(unit.action),verified=ticket?.linkVerification?.exactDestinationConfirmed===true;
    const postId=unit.action&&!verified?unit.sourceRefs.find(id=>posts.has(id)):unit.imageSource||unit.sourceRefs.find(id=>posts.has(id));
    events[unit.id]={branch:branchId,kind:unit.semanticKind,post:posts.get(postId),...(verified?{tickets:ticket.url}:{})};
  }
  const series={};
  const workshops=Object.entries(events).filter(([,event])=>event.kind==='workshop');
  if(workshops.length)series['houston-pinta-y-canta']={branch:'houston',kind:'workshop',events:workshops.map(([id])=>id),post:workshops[0][1].post};
  const registry=JSON.parse(read('scripts/legacy-redirects/sin-yolanda-legacy-redirects/redirects.json'));
  const legacyHosts={};
  for(const [,host]of read('scripts/legacy-redirects/sin-yolanda-root-routing/root-engine.php').matchAll(/'([a-z0-9.-]+\.com)'\s*=>/g)){
    const kind=host.match(/^sinyolanda(tx|usa|gdl)\.com$/)?.[1]||(host==='maricarmengdl.com'?'maricarmen':null);
    assert.ok(kind,'Review new legacy attribution host');legacyHosts[host]=kind;
  }
  return {version:2,routes,branches:[...new Set(['group','catering',...Object.values(routes)])],events,series,
    editorialCampaigns:Array.from(publicData.events,event=>event.id),
    utmValues:registry.utmValues,
    // No campaign codes are invented from editorial titles or an Instagram post.
    trafficCampaigns:[],legacyHosts};
}
export const contractStart='/* BEGIN GENERATED MEASUREMENT CONTRACT */';
export const contractEnd='/* END GENERATED MEASUREMENT CONTRACT */';
export function readEmbeddedContract(source){
  const start=source.indexOf(contractStart),end=source.indexOf(contractEnd);
  assert.ok(start>=0&&end>start);
  return JSON.parse(source.slice(start+contractStart.length,end).trim());
}
