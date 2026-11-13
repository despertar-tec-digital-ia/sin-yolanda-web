// Promote the reviewed composition without publishing review tooling or inactive actions.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {elementRange} from './public-agenda.mjs';
import {renderPosadasInvitation,renderExpandedPosadasPage,detailFile,campaignMediaFiles} from '../review/gdl-posadas-expanded.mjs';
import {gdlHoursHtml} from '../gdl-operating-hours.mjs';

export const posadasExpiry='2027-01-01T06:00:00.000Z'; // Editorial end of November/December, Guadalajara time.
export const posadasStyle='assets/css/gdl-posadas.css';
export const posadasScript='assets/js/gdl-posadas.js';
export const posadasMedia=campaignMediaFiles.map(file=>'images/posadas-gdl/'+file);
export const posadasContact='https://wa.me/523322319636?text='+encodeURIComponent('Hola, quiero cotizar una posada en Sin Yolanda Guadalajara.');
export const posadasNav='<a class="hh-nav-posadas" href="#posadas" data-posadas-link>Posadas</a>';
export const posadasHeroLink='<a class="gp-hero-link" href="#posadas" data-posadas-link>Organiza tu posada con nosotros</a>';
const style=`<link rel="stylesheet" href="/${posadasStyle}?v=20261113-posadas">`;
const script=`<script defer src="/${posadasScript}?v=20261113-posadas"></script>`;
const hash=value=>createHash('sha256').update(value).digest('hex');
const promoted=html=>html.replaceAll('/assets/review-gdl/','/images/posadas-gdl/')
  .replace('/images/posadas-gdl/gdl-posadas-expanded.css','/'+posadasStyle+'?v=20261113-posadas')
  .replace('/images/posadas-gdl/gdl-posadas-ui.js','/'+posadasScript+'?v=20261113-posadas');
export const posadasArchive='<main id="posada" tabindex="-1"><section class="pd-contact pd-inner"><div><p class="gp-eyebrow">Posadas 2026 · Guadalajara</p><h1>Esta temporada<br>ya terminó.</h1><p>Consulta la programación actual de Sin Yolanda Guadalajara.</p><a class="gp-action" href="/guadalajara">Ver Guadalajara</a></div></section></main>';

export function renderProductionPosadasPage(){
  let html=promoted(renderExpandedPosadasPage());
  const url='https://sin-yolanda.com/guadalajara/posadas/';
  const title='Posadas 2026 en Guadalajara | Sin Yolanda';
  const description='Organiza tu posada en Sin Yolanda Guadalajara. Cotiza por WhatsApp para grupos de 5 a 200 personas y consulta cómo apartar tu fecha.';
  html=html.replace('noindex,nofollow,noarchive','index,follow,max-image-preview:large')
    .replace(/<title>[^<]+<\/title>/,`<title>${title}</title>`)
    .replace(/<meta name="description"[^>]+>/,`<meta name="description" content="${description}">`)
    .replace('<body class="pd-page">',`<body class="pd-page" data-posadas-detail data-posadas-expires-at="${posadasExpiry}" data-branch="san-ignacio" data-language="es">`)
    .replace(/<button type="button" class="gp-action" disabled aria-describedby="pd-contact-status">([\s\S]*?)<\/button>/,
      `<a class="gp-action" href="${posadasContact}" target="_blank" rel="noopener noreferrer" aria-label="Cotizar mi posada por WhatsApp, abre otra pestaña">$1</a>`)
    .replace('<p class="pd-review-note" id="pd-contact-status">En esta prueba el envío está desactivado.</p>','')
    .replace(/<div class="pd-hours">[\s\S]*?<\/div><\/div>/,`<div class="pd-hours"><h3>Horario de la sucursal</h3><div>${gdlHoursHtml().replace('<h3>Horario</h3>','')}<p>Las reservaciones tienen 15 minutos de tolerancia. Si tu grupo necesita otro horario, consúltalo al cotizar.</p></div></div>`)
    .replace('Para grupos de <strong>5 a 9</strong>, consulta los requisitos al cotizar.','Para grupos de <strong>5 a 9</strong>, consulta los requisitos al cotizar. El equipo confirma el acomodo y las condiciones de cada grupo.')
    .replace('</main>','</main><template id="posadas-archive">'+posadasArchive+'</template>');
  const schema={'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':url+'#webpage',url,name:title,description,inLanguage:'es',isPartOf:{'@id':'https://sin-yolanda.com/#website'},about:{'@id':'https://sin-yolanda.com/guadalajara#restaurant'},breadcrumb:{'@id':url+'#breadcrumb'}},
    {'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:[['Sin Yolanda','https://sin-yolanda.com/'],['Guadalajara','https://sin-yolanda.com/guadalajara'],['Posadas',url]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))}
  ]};
  const seo=`<link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Sin Yolanda"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${url}"><meta property="og:image" content="https://sin-yolanda.com/images/posadas-gdl/gdl-posadas-amigas-gallery-1200.webp"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  return html.replace('</head>',seo+'<script defer src="/assets/js/site-measurement.js?v=20261113-posadas-route"></script><link rel="stylesheet" href="/assets/css/ga4-consent.css?v=20261016-ga4-simple-choice"><script defer src="/assets/js/ga4-consent.js?v=20261113-posadas-route"></script></head>');
}

export const posadasApprovalInputs=['scripts/editorial/gdl-posadas.mjs','scripts/review/gdl-posadas-expanded.mjs','scripts/gdl-operating-hours.json','scripts/gdl-operating-hours.mjs',
  'scripts/review/gdl-posadas-design.mjs','scripts/editorial/gdl-contest-config.mjs',detailFile,posadasStyle,posadasScript,...posadasMedia];
export function posadasDigest(root){return hash(JSON.stringify(posadasApprovalInputs.map(file=>[file,hash(readFileSync(resolve(root,file)))])));}

export function projectApprovedPosadas(root,inputFiles,now=new Date().toISOString()){
  const approvalPath=resolve(root,'scripts/editorial/approved-gdl-posadas.json');
  if(!existsSync(approvalPath))return {files:new Map(inputFiles)};
  const approval=JSON.parse(readFileSync(approvalPath,'utf8'));
  assert.equal(approval.authorizer,'Luis');assert.equal(approval.publicationEnabled,true);
  assert.equal(approval.sourceDigest,posadasDigest(root),'Posadas changed after its production review');
  assert.equal(approval.expiresAt,posadasExpiry);assert.ok(Number.isFinite(Date.parse(now)));
  if(Date.parse(now)<Date.parse(approval.approvedAt))return {files:new Map(inputFiles)};
  const active=Date.parse(now)>=Date.parse(approval.approvedAt)&&Date.parse(now)<Date.parse(posadasExpiry);
  const files=new Map(inputFiles);
  let html=files.get('guadalajara.html')??readFileSync(resolve(root,'guadalajara.html'),'utf8');
  assert.ok(!html.includes('data-posadas-campaign'),'Project Posadas once');
  if(active){
    const hero=elementRange(html,'section','san-ignacio');assert.ok(hero);
    assert.equal(hero.html.split('<div class="hh-welcome-foot">').length,2);
    const teaser=promoted(renderPosadasInvitation()).replace('data-local-posadas-review',`data-posadas-campaign data-posadas-expires-at="${posadasExpiry}"`);
    html=html.slice(0,hero.start)+hero.html.replace('<div class="hh-welcome-foot">',posadasHeroLink+'<div class="hh-welcome-foot">')+teaser+html.slice(hero.end);
    assert.equal(html.split('<a class="hh-nav-menu"').length,2);
    html=html.replace('<a class="hh-nav-menu"',posadasNav+'<a class="hh-nav-menu"').replace('</head>',style+'</head>').replace('</body>',script+'</body>');
  }
  files.set('guadalajara.html',html);
  let detail=files.get(detailFile)??readFileSync(resolve(root,detailFile),'utf8');
  if(!active){
    detail=detail.replace(/<main\b[\s\S]*?<\/main>/,posadasArchive).replace(/<template id="posadas-archive">[\s\S]*?<\/template>/,'')
      .replace(/<nav aria-label="Posadas">[\s\S]*?<\/nav>/,'<nav aria-label="Posadas"><a href="/guadalajara">Ver Guadalajara</a></nav>');
  }
  files.set(detailFile,detail);
  return {files,metadata:{active,expiresAt:posadasExpiry,nextTransitionAt:active?posadasExpiry:null,digest:approval.sourceDigest}};
}
