import {registrationPhone,registrationNumber,contestRecord} from '../editorial/gdl-contest-config.mjs';
import {refreshGdlFeature} from '../editorial/gdl-featured.mjs';

// User-confirmed final elimination date; Guadalajara's following local midnight.
export const participationUntil='2026-11-19T06:00:00.000Z';
const phone=()=>`<div class="gdl-registration-number"><span>Inscripciones al concurso</span><a href="${registrationPhone}" data-record="${contestRecord}" aria-label="Llamar al ${registrationNumber} para inscribirte al concurso">${registrationNumber}</a></div>`;

export function refreshParticipation(source,{now}={}){
 const instant=Date.parse(now);if(!Number.isFinite(instant))throw new Error('Valid participation clock required');
 const active=instant<Date.parse(participationUntil);
 return source.replace(/<[^>]+data-gdl-participation="(active|fallback)"[^>]*>/g,(tag,mode)=>{
  tag=tag.replace(/\s+hidden(?:="[^"]*")?/g,'');
  return (mode==='active')===active?tag:tag.replace(/>$/,' hidden>');
 });
}

export function participationBranch(source,{now}={}){
 const original=/<p class="gdl-feature-date" data-gdl-event-feature="active"(?: hidden)?>[\s\S]*?<\/p>/;
 if(!original.test(source))throw new Error('Expected Guadalajara feature introduction');
 const message=`<div class="gdl-participation" data-gdl-event-feature="active"><p class="gdl-participate-message" data-gdl-participation="active"><strong>PARTICIPA</strong><span>HAY ELIMINATORIAS CADA MIÉRCOLES HASTA EL <time datetime="2026-11-18">18 DE NOVIEMBRE</time></span></p><p class="gdl-feature-date" data-gdl-participation="fallback" hidden>Concurso de canto · 5.ª edición<br>Gran final: <time datetime="2026-12-02">2 de diciembre de 2026</time>.</p>${phone()}</div>`;
 return refreshGdlFeature(refreshParticipation(source.replace(original,message).replace('<body ','<body data-participation-review="" '),{now}),{now});
}

export function participationDetail(source,{now}={}){
 const marker=/<p class="cp-registration-note"[^>]*>[\s\S]*?<\/p>/;
 if(!marker.test(source))throw new Error('Expected contest registration note');
 const intro=`<div class="gdl-detail-phone" data-gdl-event-feature="active">${phone()}</div>`;
 return refreshGdlFeature(refreshParticipation(source.replace(marker,match=>match+intro).replace('<body ','<body data-participation-review="" '),{now}),{now});
}
