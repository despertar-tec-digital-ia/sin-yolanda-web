import {contestPath,contestRecord,microphoneIcon} from '../editorial/gdl-contest-config.mjs';
import {refreshGdlFeature} from '../editorial/gdl-featured.mjs';
export {participationUntil,refreshParticipation} from '../editorial/gdl-featured.mjs';

export function participationBranch(source,{now}={}){
 if(source.includes('class="gdl-participation-cta"'))return refreshGdlFeature(source,{now});
 const original=/<p class="gdl-feature-date" data-gdl-event-feature="active"(?: hidden)?>[\s\S]*?<\/p>/;
 if(!original.test(source))throw new Error('Expected Guadalajara feature introduction');
 const invitation='<p class="hh-invitation gdl-local-invitation">A cantar,<br>bailar y<br>brindar.</p>';
 const callout=`<div class="gdl-participation" data-gdl-event-feature="active"><a class="gdl-participation-cta" href="${contestPath}" data-record="${contestRecord}"><span class="gdl-participation-icon" aria-hidden="true">${microphoneIcon}</span><span class="gdl-participation-content"><span class="gdl-contest-name">Canta por tu Cuenta · 5.ª edición</span><strong class="gdl-participation-title" data-gdl-participation="active">Participa</strong><strong class="gdl-participation-title" data-gdl-participation="fallback" hidden>Ven al concurso</strong><span class="gdl-participation-schedule" data-gdl-participation="active">Hay eliminatorias cada miércoles<br>hasta el <time datetime="2026-11-18">18 de noviembre</time></span><span class="gdl-participation-schedule" data-gdl-participation="fallback" hidden>Gran final: <time datetime="2026-12-02">2 de diciembre de 2026</time>.</span><span class="gdl-participation-action">Ver concurso <span aria-hidden="true">↗</span></span></span></a></div>`;
 source=source.replace(/<p class="hh-invitation" data-gdl-event-feature="active"(?: hidden)?>[\s\S]*?<\/p>/,invitation)
  .replace(/<p class="hh-invitation" data-gdl-event-feature="fallback"(?: hidden)?>[\s\S]*?<\/p>/,'')
  .replace(original,callout);
 // The callout is the single contest access; the existing table-reservation button stays separate.
 source=source.replace(/<div class="hh-welcome-actions" data-gdl-event-feature="active">[\s\S]*?<a class="hh-reserve"[\s\S]*?<\/a>/,'<div class="hh-welcome-actions" data-gdl-event-feature="active">');
 return refreshGdlFeature(source.replace('<body ','<body data-participation-review="" '),{now});
}
