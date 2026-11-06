// Local pilot only: official widget codes, no account configuration or production integration.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packagePublic} from './package-public.mjs';
import {texasBranches} from './editorial/ui-refinements.mjs';
const stylesheet='assets/css/opentable-review.css';
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
    assert.equal(loader.searchParams.get('ot_source'),'Restaurant website');
    assert.equal(fallback.origin,loader.origin);assert.equal(fallback.searchParams.get('restref'),String(b.rid));
  }
}
export function refineBooking(html,branch,language){
  const en=language==='en',name=branch.slug==='the-woodlands'?'The Woodlands':branch.slug.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
  assert.ok(!html.includes('data-opentable-pilot='));
  const loader=new URL(branch.loader);loader.searchParams.set('lang',en?'en-US':'es-MX');
  const fallback=new URL(branch.fallback);fallback.searchParams.set('lang',en?'en-US':'es-MX');
  const id='reservar-'+branch.slug;
  const section=`<section class="sy-booking" id="${id}" data-opentable-pilot="${branch.rid}" aria-labelledby="${id}-title"><div class="sy-booking-inner"><div class="sy-booking-copy"><p class="sy-booking-kicker">Sin Yolanda ${name}</p><h2 id="${id}-title">${en?'Reserve your table.':'Reserva tu mesa.'}</h2><p>${en?'Choose your date, time and party size. Get ready for a toast.':'Elige el día, la hora y cuántos vienen. Prepara el brindis.'}</p><a class="sy-booking-fallback" href="${escape(fallback.href)}" target="_blank" rel="noopener noreferrer">${en?'Reserve directly on OpenTable':'Reservar directamente en OpenTable'} ↗</a></div><div class="sy-booking-widget"><script type="text/javascript" src="${escape(loader.href)}"></script></div></div></section>`;
  const marker='<section class="hh-table"';assert.equal(html.split(marker).length,2);
  // Preserve the existing buttons and their accessible provider labels; only their local destination changes.
  let links=0;
  html=html.replace(/<a\b[^>]*href="https:\/\/www\.opentable\.com\/(?:r\/|restaurant\/profile\/)[^"<>]+"[^>]*>[\s\S]*?<\/a>/g,tag=>{
    links++;return tag.replace(/href="[^"]+"/,`href="#${id}"`).replace(/ target="_blank"/,'')
      .replaceAll(' (abre otra pestaña)','').replaceAll(' (opens in a new tab)','');
  });
  assert.equal(links,2,'Expected the two branch reservation links');
  return html.replace(marker,section+marker).replace('</head>',`<link rel="stylesheet" href="/${stylesheet}?v=20261105-opentable-pilot"></head>`);
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
  copyFileSync(resolve(root,stylesheet),resolve(publicRoot,stylesheet));
  const files=[...Object.keys(baseline.hashes),stylesheet];
  const hashes=Object.fromEntries(files.map(f=>[f,hash(readFileSync(resolve(publicRoot,f)))]));
  const report={...baseline,fileCount:files.length,hashes,publicDigest:hash(JSON.stringify(hashes)),reviewOnly:true,productionIntegrated:false,bookingPilot:{changedPages:changed,rids:config.branches.map(b=>b.rid)}};
  writeFileSync(resolve(out,'release.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=buildOpenTableReview({root:resolve(import.meta.dirname,'..'),out:process.argv[2]});
  console.log(JSON.stringify({fileCount:report.fileCount,productionIntegrated:false,pages:report.bookingPilot.changedPages}));
}
