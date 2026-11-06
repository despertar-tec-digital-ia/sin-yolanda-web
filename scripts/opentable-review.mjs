// Local pilot only: official widget codes, no account configuration or production integration.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packagePublic} from './package-public.mjs';
import {texasBranches} from './editorial/ui-refinements.mjs';
const stylesheet='assets/css/opentable-review.css';
const controller='assets/js/opentable-review.js';
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const hash=s=>createHash('sha256').update(s).digest('hex');
export function validateWidget(config){
  assert.equal(config.version,1);assert.equal(config.reviewOnly,true);
  assert.deepEqual(config.branches.map(b=>b.slug).sort(),[...texasBranches].sort());
  assert.equal(new Set(config.branches.map(b=>b.rid)).size,4);
  for(const b of config.branches){
    const loader=new URL(b.loader),fallback=new URL(b.fallback);
    assert.equal(loader.origin,'https://www.opentable.com');
    assert.equal(loader.pathname,'/widget/reservation/loader');
    assert.equal(loader.searchParams.get('rid'),String(b.rid));
    assert.equal(loader.searchParams.get('newtab'),'false');
    assert.equal(loader.searchParams.get('iframe'),'false');
    assert.equal(loader.searchParams.get('theme'),'wide');
    assert.equal(loader.searchParams.get('ot_source'),'Restaurant website');
    assert.equal(fallback.origin,loader.origin);assert.equal(fallback.searchParams.get('restref'),String(b.rid));
  }
}
export function refineBooking(html,branch,language){
  const en=language==='en',name=branch.slug==='the-woodlands'?'The Woodlands':branch.slug.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
  assert.ok(!html.includes('data-opentable-pilot='));
  const loader=new URL(branch.loader);loader.searchParams.set('lang',en?'en-US':'es-MX');
  const fallback=new URL(branch.fallback);fallback.searchParams.set('lang',en?'en-US':'es-MX');
  const contact=html.match(/<a\b[^>]*class="ve-phone"[^>]*href="(tel:\+\d+)"[^>]*>([^<]+)<\/a>/);
  assert.ok(contact,'A branch needs its own verified phone before booking integration');
  const id='reservar-'+branch.slug;
  const section=`<section class="sy-booking" id="${id}" data-opentable-pilot="${branch.rid}" data-booking-branch="${branch.slug}" data-booking-loader="${escape(loader.href)}" data-booking-state="idle" aria-labelledby="${id}-title">
<div class="sy-booking-inner"><div class="sy-booking-copy"><h2 id="${id}-title" tabindex="-1">${en?'Reserve your table.':'Reserva tu mesa.'}</h2><p class="sy-booking-location">Sin Yolanda ${name}</p></div>
<div class="sy-booking-panel"><a class="sy-booking-start" data-booking-start data-booking-open href="${escape(fallback.href)}" target="_blank" rel="noopener noreferrer">${en?'Find a table':'Ver disponibilidad'}</a><div class="sy-booking-placeholder" data-booking-placeholder hidden aria-hidden="true"><span></span><span></span><span></span><span></span></div><div class="sy-booking-widget" id="${id}-form" data-booking-host hidden></div><p class="sy-booking-status" data-booking-status id="${id}-status" role="status" aria-live="polite" aria-atomic="true"></p></div>
<div class="sy-booking-foot"><span>${en?'Reservations with OpenTable':'Reservas con OpenTable'}</span><p>${en?'Need help?':'¿Necesitas ayuda?'} <a href="${escape(contact[1])}">${escape(contact[2])}</a></p></div></div></section>`;
  const marker='<section class="hh-table"';assert.equal(html.split(marker).length,2);
  // Baseline links stay real: analytics, modifiers and JavaScript-free navigation keep working.
  let links=0;
  html=html.replace(/<a\b[^>]*href="https:\/\/www\.opentable\.com\/(?:r\/|restaurant\/profile\/)[^"<>]+"[^>]*>[\s\S]*?<\/a>/g,tag=>{
    links++;return tag.replace('<a ','<a data-booking-open ').replace(/href="[^"]+"/,`href="${escape(fallback.href)}"`);
  });
  assert.equal(links,2,'Expected the two branch reservation links');
  return html.replace(marker,section+marker).replace('</head>',`<link rel="stylesheet" href="/${stylesheet}?v=20261106-sy-form"><script type="module" src="/${controller}?v=20261106-sy-form"></script></head>`);
}
export function buildOpenTableReview({root,out,now}={}){
  root=resolve(root);out=resolve(out);assert.ok(out.startsWith(resolve(root,'.artifacts')+'/'));assert.ok(!existsSync(out));
  const config=JSON.parse(readFileSync(resolve(root,'scripts/editorial/opentable-review.json'),'utf8'));validateWidget(config);
  const publicRoot=resolve(out,'public');const baseline=packagePublic({root,destination:publicRoot,audience:'review',now});
  writeFileSync(resolve(out,'baseline-release.json'),JSON.stringify(baseline,null,2)+'\n');
  const changed=[];
  for(const branch of config.branches)for(const language of ['es','en']){
    const file=language==='es'?branch.slug+'.html':'en/'+branch.slug+'/index.html';
    writeFileSync(resolve(publicRoot,file),refineBooking(readFileSync(resolve(publicRoot,file),'utf8'),branch,language));changed.push(file);
  }
  for (const file of [stylesheet,controller]) copyFileSync(resolve(root,file),resolve(publicRoot,file));
  const files=[...Object.keys(baseline.hashes),stylesheet,controller];
  const hashes=Object.fromEntries(files.map(f=>[f,hash(readFileSync(resolve(publicRoot,f)))]));
  const report={...baseline,fileCount:files.length,hashes,publicDigest:hash(JSON.stringify(hashes)),reviewOnly:true,productionIntegrated:false,bookingPilot:{changedPages:changed,rids:config.branches.map(b=>b.rid)}};
  writeFileSync(resolve(out,'release.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=buildOpenTableReview({root:resolve(import.meta.dirname,'..'),out:process.argv[2]});
  console.log(JSON.stringify({fileCount:report.fileCount,productionIntegrated:false,pages:report.bookingPilot.changedPages}));
}
