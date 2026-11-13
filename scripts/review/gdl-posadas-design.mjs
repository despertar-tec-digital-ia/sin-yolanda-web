import assert from 'node:assert/strict';
import {outline} from '../build-gdl-posadas-outline.mjs';
import {escapeHtml as esc} from '../editorial/branch-agenda.mjs';
import {elementRange} from '../editorial/public-agenda.mjs';
import {whatsappIcon} from '../editorial/gdl-contest-config.mjs';

export const stylePath='assets/review-gdl/gdl-posadas-design.css';
export const photoFiles=[800,1600].map(width=>`gdl-posadas-amigas-${width}.webp`);
export const photoPath=file=>`assets/review-gdl/${file}`;
export const styleTag=`<link rel="preload" href="/fonts/alfa-slab-one-latin-400.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/${stylePath}?v=20261112-posadas-local">`;
export const navLink='<a class="hh-nav-posadas" href="#posadas">Posadas</a>';
export const heroLink='<a class="gp-hero-link" href="#posadas">Organiza tu posada con nosotros</a>';
const action=(label)=>`<button class="gp-action" type="button" disabled aria-describedby="gp-review-status">${whatsappIcon}<span>${esc(label)}</span></button>`;

export function renderPosadasDesign(data=outline) {
  assert.equal(data.publicationEnabled,false);
  assert.equal(data.section.action.enabled,false);
  const s=data.section;
  const titleParts=s.title.split(' en Sin Yolanda');
  const titleHtml=titleParts.length===2?`<span>${esc(titleParts[0])}</span> <span>en Sin Yolanda${esc(titleParts[1])}</span>`:esc(s.title);
  return `<section class="gp-posadas" id="posadas" aria-labelledby="gp-title" tabindex="-1" data-local-posadas-review>
<div class="gp-feature"><h2 class="gp-title" id="gp-title">${titleHtml}</h2>
<div class="gp-invitation"><p class="gp-lead">${esc(s.lead)}</p>${action(s.action.label)}<p class="gp-qualification">${esc(s.qualification)}</p></div>
<figure class="gp-photo"><img src="/${photoPath(photoFiles[1])}" srcset="/${photoPath(photoFiles[0])} 800w, /${photoPath(photoFiles[1])} 1600w" sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 55vw" width="1600" height="2400" alt="Tres amigas cantan y brindan con un micrófono de Sin Yolanda." loading="lazy" decoding="async"></figure>
</div>
<div class="gp-support"><div class="gp-support-inner"><section aria-labelledby="gp-steps-title"><h3 class="gp-heading" id="gp-steps-title">${esc(s.stepsTitle)}</h3><ol class="gp-steps">${s.steps.map(item=>`<li><div><h4>${esc(item.title)}</h4><p>${esc(item.text)}</p></div></li>`).join('')}</ol></section>
<a class="gp-location" href="#visita-san-ignacio">${esc(s.locationLink.label)}</a>
</div></div>
<p class="gp-sr" id="gp-review-status">Vista previa de diseño. El botón permanece inactivo mientras se confirma el canal de posadas; no envía solicitudes ni confirma reservas.</p>
</section>`;
}

export function projectPosadasDesign(source,data=outline) {
  assert.ok(!source.includes('data-local-posadas-review'),'Already contains the local posadas section');
  const hero=elementRange(source,'section','san-ignacio');assert.ok(hero,'Expected Guadalajara hero');
  const heroSource=hero.html;
  assert.equal(heroSource.split('<div class="hh-welcome-foot">').length,2,'Expected hero address boundary');
  const heroWithLink=heroSource.replace('<div class="hh-welcome-foot">',heroLink+'<div class="hh-welcome-foot">');
  let html=source.slice(0,hero.start)+heroWithLink+renderPosadasDesign(data)+source.slice(hero.end);
  const navMarker='<a class="hh-nav-menu"';assert.equal(html.split(navMarker).length,2,'Expected single Guadalajara menu nav');
  html=html.replace(navMarker,navLink+navMarker);
  assert.equal(html.split('</head>').length,2);html=html.replace('</head>',styleTag+'</head>');
  return html;
}
