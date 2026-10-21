// Approved Guadalajara presentation; reused by builds and scheduled expiry projections.
import {elementRange} from './public-agenda.mjs';
export const featuredUntil='2026-12-03T06:00:00.000Z';

export function arrangeGdlAgenda(html) {
  const promoted=[];
  for(const id of ['agenda-san-ignacio-canta','agenda-san-ignacio-solteras']) {
    const part=elementRange(html,'section',id);
    if(part){promoted.push(part.html);html=html.slice(0,part.start)+html.slice(part.end);}
  }
  return html.replace(/(<h2 id="programacion-san-ignacio-title")[^>]*>/,'$1 class="sy-agenda-sr">')
    .replace('</h2>','</h2>'+promoted.join('\n'));
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
