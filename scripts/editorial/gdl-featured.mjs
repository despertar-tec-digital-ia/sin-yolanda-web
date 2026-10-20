// Approved Guadalajara presentation; reused by builds and scheduled expiry projections.
import {elementRange} from './public-agenda.mjs';
import {escapeHtml as esc} from './branch-agenda.mjs';
import {registrationWhatsapp,whatsappIcon} from './gdl-contest-config.mjs';
export const featuredUntil='2026-12-03T06:00:00.000Z';

export function arrangeGdlAgenda(html) {
  const promoted=[];
  for(const id of ['agenda-san-ignacio-canta','agenda-san-ignacio-solteras']) {
    const part=elementRange(html,'section',id);
    if(part){promoted.push(part.html);html=html.slice(0,part.start)+html.slice(part.end);}
  }
  html=html.replace(/(<h2 id="programacion-san-ignacio-title")[^>]*>/,'$1 class="sy-agenda-sr">')
    .replace('</h2>','</h2>'+promoted.join('\n'))
    .replace('Bases e inscripción<span','Preguntas e inscripción<span')
    .replace('Para mayores de edad. Inscripción: envía un video cantando a capela el coro de una canción al (33) 1942 2709. Consulta requisitos y disponibilidad con la sucursal.','Para mayores de edad. Consulta cómo inscribirte, requisitos y disponibilidad al (33) 1942 2709.');
  return html.replace(/<a class="sy-gdl-detail-link"[\s\S]*?<\/a>/,link=>`<div class="gdl-card-actions"><a class="gdl-register-link" href="${esc(registrationWhatsapp)}" target="_blank" rel="noopener noreferrer">${whatsappIcon}Inscribirme por WhatsApp<span class="sy-agenda-sr"> · abre otra pestaña</span></a>${link}</div>`);
}

export function refreshGdlFeature(source,{now}={}) {
  const instant=Date.parse(now);if(!Number.isFinite(instant))throw new Error('Valid Guadalajara feature clock required');
  const active=instant<Date.parse(featuredUntil);
  source=source.replace(/<[^>]+data-gdl-event-feature="(active|fallback)"[^>]*>/g,(tag,mode)=>{
    tag=tag.replace(/\s+hidden(?:="[^"]*")?/g,'');
    return (mode==='active')===active?tag:tag.replace(/>$/,' hidden>');
  });
  return source.replace(/<a\b[^>]*\bdata-gdl-contest-link\b[^>]*>/g,tag=>{
    const href=tag.match(new RegExp('data-contest-'+(active?'active':'fallback')+'-href="([^"]+)"'))?.[1];
    const record=tag.match(/data-contest-record="([^"]+)"/)?.[1];
    if(!href||!record)throw new Error('Guadalajara feature navigation missing destinations');
    tag=tag.replace(/\shref="[^"]+"/,' href="'+href+'"').replace(/\sdata-record="[^"]+"/,'');
    return active?tag.replace(/>$/,' data-record="'+record+'">'):tag;
  });
}
