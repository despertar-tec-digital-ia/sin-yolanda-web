// A fresh local candidate only. The public manifest, source approval and WordPress stay intact.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packagePublic,publicSourceDigest,projectRoot as root} from './package-public.mjs';
import {elementRange} from './editorial/public-agenda.mjs';
import {escapeHtml as esc} from './editorial/branch-agenda.mjs';
import {contestPath,contestRecord,registrationWhatsapp,microphoneIcon,whatsappIcon} from './review/gdl-contest-config.mjs';
import {projectContestMeasurement,projectContestGa4Bundle} from './review/gdl-contest-measurement.mjs';
import {renderContestPage} from './review/gdl-contest-page.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const featuredUntil='2026-12-03T06:00:00.000Z';
const take=(source,id)=>{const range=elementRange(source,'section',id);assert.ok(range,'Missing section: '+id);return range;};

export function focusGuadalajara(source,{now=new Date().toISOString()}={}) {
  if(source.includes('data-gdl-contest-link'))return source;
  const active=Date.parse(now)<Date.parse(featuredUntil);
  assert.ok(Number.isFinite(Date.parse(now)),'Explicit valid review clock required');
  const agenda=take(source,'programacion-san-ignacio');
  let inside=agenda.html;
  const ids=['agenda-san-ignacio-canta','agenda-san-ignacio-solteras'];
  const promoted=[];
  for(const id of ids){const part=elementRange(inside,'section',id);if(part){promoted.push(part.html);inside=inside.slice(0,part.start)+inside.slice(part.end);}}
  inside=inside.replace(/(<h2 id="programacion-san-ignacio-title")[^>]*>/,'$1 class="sy-agenda-sr">');
  inside=inside.replace('</h2>','</h2>'+promoted.join('\n'))
    .replace('Bases e inscripción<span','Preguntas e inscripción<span')
    .replace('Para mayores de edad. Inscripción: envía un video cantando a capela el coro de una canción al (33) 1942 2709. Consulta requisitos y disponibilidad con la sucursal.','Para mayores de edad. Consulta cómo inscribirte, requisitos y disponibilidad al (33) 1942 2709.')
    .replace(/ data-agenda-approval="[^"]+"/,' data-agenda-review="gdl-focus-20261019"');
  inside=inside.replace(/<a class="sy-gdl-detail-link"[\s\S]*?<\/a>/,link=>`<div class="gdl-card-actions"><a class="gdl-register-link" href="${esc(registrationWhatsapp)}" target="_blank" rel="noopener noreferrer">${whatsappIcon}Inscribirme por WhatsApp<span class="sy-agenda-sr"> · abre otra pestaña</span></a>${link}</div>`);
  source=source.slice(0,agenda.start)+source.slice(agenda.end);
  const hero=take(source,'san-ignacio');
  source=source.slice(0,hero.end)+inside+source.slice(hero.end);
  source=source.replace('<span class="hh-sr">Sin Yolanda </span>Guadalajara','<span class="hh-sr">Sin Yolanda · </span>Tu cantina en Guadalajara');
  const invitation='<p class="hh-invitation">Pasa a la<br>cantina.</p>';
  assert.ok(source.includes(invitation),'Unexpected hero source');
  source=source.replace(invitation,`<p class="hh-invitation" data-gdl-event-feature="active"${active?'':' hidden'}>Canta por<br>tu Cuenta.</p><p class="gdl-feature-date" data-gdl-event-feature="active"${active?'':' hidden'}>Concurso de canto · 5.ª edición<br>Miércoles, hasta el 2 de diciembre de 2026.</p><p class="hh-invitation" data-gdl-event-feature="fallback"${active?' hidden':''}>Pasa a la<br>cantina.</p>`);
  const actions=source.match(/<div class="hh-welcome-actions">[\s\S]*?<\/div>/)?.[0];
  assert.ok(actions,'Unexpected welcome actions');
  const reserve='<a class="hh-welcome-menu" href="https://wa.me/5213310186159" target="_blank" rel="noopener noreferrer">'+whatsappIcon+'Reservar mesa<span class="hh-sr"> por WhatsApp · abre otra pestaña</span></a>';
  source=source.replace(actions,`<div class="hh-welcome-actions" data-gdl-event-feature="active"${active?'':' hidden'}><a class="hh-reserve" href="${contestPath}" data-record="${contestRecord}">${microphoneIcon}Ver concurso</a>${reserve}</div>`+actions.replace('<span>Reservar',whatsappIcon+'<span>Reservar').replace('class="hh-welcome-actions"',`class="hh-welcome-actions" data-gdl-event-feature="fallback"${active?' hidden':''}`));
  source=source.replace('<a class="hh-nav-agenda" href="#programacion-san-ignacio">Agenda</a>',`<a class="hh-nav-agenda" href="${active?contestPath:'#programacion-san-ignacio'}" data-gdl-contest-link data-contest-active-href="${contestPath}" data-contest-fallback-href="#programacion-san-ignacio" data-contest-record="${contestRecord}"${active?` data-record="${contestRecord}"`:''}><span data-gdl-event-feature="active"${active?'':' hidden'}>Concurso</span><span data-gdl-event-feature="fallback"${active?' hidden':''}>Agenda</span></a>`);
  const visit=take(source,'visita-san-ignacio');
  source=source.slice(0,visit.start)+visit.html.replace('--local-secondary:#005251','--local-secondary:#bd4a15')+source.slice(visit.end);
  source=source.replace('</head>','<link rel="stylesheet" href="/assets/review-gdl/gdl-focus.css?v=20261019-gdl-focus"></head>')
    .replace('</body>','<script defer src="/assets/review-gdl/gdl-focus.js?v=20261019-gdl-focus"></script></body>');
  source=source.replace(/\/assets\/js\/site-measurement\.js\?v=[^"\s]+/,'/assets/review-gdl/contest-measurement.js?v=20261019-contest-review');
  source=source.replace(/\/assets\/js\/ga4-consent\.js\?v=[^"\s]+/,'/assets/review-gdl/contest-consent.js?v=20261019-contest-review');
  return source;
}

export function originalMenuPage(source,menu) {
  let head=source.slice(0,source.indexOf('</head>'))
    .replace(/<link rel="stylesheet" href="\/_astro\/[^"]+">/g,'');
  head+='<link rel="stylesheet" href="/assets/review-gdl/gdl-menu.css?v=20261019-gdl-v82"></head>';
  const body=source.match(/<body\b[^>]*>/)?.[0];assert.ok(body);
  const open=body.replace(/class="[^"]*"/,'class="gdl-original-menu"')
    .replace('data-menu-presentation="san-ignacio-linked-es"','data-menu-presentation="gdl-original-v82"');
  const asset='/assets/menus/gdl-v82/';
  const jumps=[[2,'Botellas'],[8,'Cócteles'],[10,'Shots'],[11,'Cervezas y bebidas'],[12,'Comida']];
  const pages=menu.pages.map(page=>{
    const full=page.files.find(file=>file.width===1800),small=page.files.find(file=>file.width===900);assert.ok(full&&small);
    return `${page.page===8?'<span id="cocktails" aria-hidden="true"></span>':''}<figure class="gm-page digital-menu-group" data-menu-group="page-${page.page}" id="pagina-${page.page}"><a href="${asset+full.file}" target="_blank" rel="noopener" aria-label="Ampliar página ${page.page}: ${esc(page.label)} · abre otra pestaña"><img src="${asset+small.file}" srcset="${asset+small.file} 900w, ${asset+full.file} 1800w" sizes="(max-width:1000px) 100vw, 1000px" width="${page.width}" height="${page.height}" alt="Página ${page.page} del menú original de Guadalajara: ${esc(page.label)}" loading="${page.page===1?'eager':'lazy'}" decoding="async"></a><figcaption><span>${page.page} / 15 · ${esc(page.label)}</span><span>Ampliar ↗</span></figcaption></figure>`;
  }).join('\n');
  return head+open+`<a class="gm-skip" href="#contenido">Saltar al menú</a><header class="gm-header"><div class="gm-header-inner"><a class="gm-brand" href="/guadalajara" aria-label="Sin Yolanda Guadalajara"><img src="/images/sin-yolanda-logo.png" width="220" height="66" alt="Sin Yolanda"></a><nav aria-label="Menú de Guadalajara"><a href="/guadalajara">Volver a la cantina</a><a class="gm-pdf" href="${asset}original.pdf" download="Menu-Sin-Yolanda-Guadalajara-v82.pdf">Descargar PDF</a></nav></div><nav class="gm-index" aria-label="Secciones del menú">${jumps.map(([page,label])=>`<a href="#pagina-${page}">${label}</a>`).join('')}</nav></header><main id="contenido" tabindex="-1"><div class="gm-intro"><h1>Menú de Guadalajara</h1><p>Comida y bebidas · Octubre de 2026</p><p>Toca una página para ampliarla o descarga el PDF original.</p></div><div class="gm-pages">${pages}</div></main><footer class="gm-footer"><a href="/guadalajara">Volver a la cantina</a><a href="/aviso-de-privacidad">Privacidad</a></footer><dialog class="gm-zoom" id="gm-zoom" aria-labelledby="gm-zoom-title"><div class="gm-zoom-head"><p id="gm-zoom-title">Menú de Guadalajara</p><nav aria-label="Ampliación del menú"><button type="button" data-gm-minus>Alejar −</button><button type="button" data-gm-plus>Acercar +</button><button type="button" data-gm-close>Cerrar</button></nav></div><p class="gm-zoom-help">Acerca la imagen y desliza para recorrer la página.</p><div class="gm-zoom-stage"><img alt=""></div></dialog><script defer src="/assets/review-gdl/gdl-menu.js?v=20261019-gdl-v82"></script><script defer src="/assets/js/ga4-consent.js?v=20261016-gdl-agenda"></script></body></html>`;
}

export function buildGdlFocusReview({destination,menuDirectory,contestDirectory,now=new Date().toISOString()}={}) {
  const out=resolve(destination||''),where=relative(resolve(root,'.artifacts'),out);
  assert.ok(destination&&where&&!where.startsWith('..')&&!isAbsolute(where),'Fresh local .artifacts destination required');
  assert.ok(!existsSync(out),'Refuse to overwrite a candidate');
  const menuRoot=resolve(menuDirectory),menu=JSON.parse(readFileSync(resolve(menuRoot,'manifest.json')));
  assert.equal(menu.pages.length,15);assert.equal(menu.original.sha256,'fbcf290eb0af66b539781f592ecfca230662b5a926d94a81ef5bce2d12f3c341');
  const inputs=[menu.original,...menu.pages.flatMap(page=>page.files)];
  for(const input of inputs){assert.match(input.file,/^[a-zA-Z0-9_.-]+$/);assert.equal(hash(readFileSync(resolve(menuRoot,input.file))),input.sha256,'Menu source changed');}
  assert.ok(contestDirectory,'Verified contest artwork directory required');
  const contestRoot=resolve(contestDirectory),poster=JSON.parse(readFileSync(resolve(contestRoot,'manifest.json')));
  assert.equal(poster.sourceSha256,'d6b44bd42620c67a442349c3bed904e9c9f8d736f64ce53df2b352bbe8b99283');
  assert.equal(poster.asset.file,'poster-web.webp');
  assert.equal(hash(readFileSync(resolve(contestRoot,poster.asset.file))),poster.asset.sha256,'Contest poster changed');
  const report=packagePublic({destination:out,audience:'review',now});
  const files=new Set(Object.keys(report.hashes));
  const write=(path,bytes)=>{mkdirSync(dirname(resolve(out,path)),{recursive:true});writeFileSync(resolve(out,path),bytes);files.add(path);};
  write('guadalajara.html',focusGuadalajara(readFileSync(resolve(out,'guadalajara.html'),'utf8'),{now}));
  write('san-ignacio/menu/index.html',originalMenuPage(readFileSync(resolve(out,'san-ignacio/menu/index.html'),'utf8'),menu));
  write(contestPath.slice(1)+'index.html',renderContestPage({active:Date.parse(now)<Date.parse(featuredUntil)}));
  for(const name of ['gdl-focus.css','gdl-focus.js','gdl-menu.css','gdl-menu.js','gdl-contest-page.css'])write('assets/review-gdl/'+name,readFileSync(resolve(root,'scripts/review/'+name)));
  write('assets/review-gdl/canta-2026-poster.webp',readFileSync(resolve(contestRoot,poster.asset.file)));
  write('assets/review-gdl/contest-measurement.js',projectContestMeasurement(readFileSync(resolve(root,'assets/js/site-measurement.js'),'utf8')));
  write('assets/review-gdl/contest-consent.js',projectContestGa4Bundle(readFileSync(resolve(root,'assets/js/ga4-consent.js'),'utf8')));
  for(const input of inputs)write('assets/menus/gdl-v82/'+input.file,readFileSync(resolve(menuRoot,input.file)));
  const hashes=Object.fromEntries([...files].sort().map(file=>[file,hash(readFileSync(resolve(out,file)))]));
  const {publicDigest:baseProjectionDigest,agenda:baseAgenda,...baseReport}=report;
  const result={...baseReport,baseProjectionDigest,baseAgenda,audience:'local-gdl-focus-review',publicationEnabled:false,fileCount:files.size,hashes,publicDigest:publicSourceDigest(hashes),menuSourceSha256:menu.original.sha256,contestPosterSourceSha256:poster.sourceSha256,featuredUntil};
  writeFileSync(resolve(out,'../release.json'),JSON.stringify(result,null,2)+'\n');
  return {originPath:out,fileCount:files.size,publicationEnabled:false,featuredUntil};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(buildGdlFocusReview({destination:process.argv[2],menuDirectory:process.argv[3],contestDirectory:process.argv[4],now:process.argv[5]}),null,2));
