import {readFileSync} from 'node:fs';
export const gdlHours=JSON.parse(readFileSync(new URL('./gdl-operating-hours.json',import.meta.url)));
export const gdlHoursSpecification=()=>gdlHours.periods.map(period=>({'@type':'OpeningHoursSpecification',dayOfWeek:period.days.map(day=>'https://schema.org/'+day),opens:period.opens??'00:00',closes:period.closes??'00:00'}));
const label=clock=>{const [hour,minute]=clock.split(':').map(Number);return `${hour%12||12}:${String(minute).padStart(2,'0')} ${hour<12?'a. m.':'p. m.'}`;};
export function gdlHoursHtml(){
  return `<div class="ve-hours" data-hours-zone="${gdlHours.timeZone}"><h3>Horario</h3><dl>${gdlHours.periods.map(period=>`<div><dt>${period.es}</dt><dd>${period.closed?'Cerrado':`<time datetime="${period.opens}">${label(period.opens)}</time><span aria-hidden="true"> – </span><span class="ve-sr"> a </span><time datetime="${period.closes}">${label(period.closes)}</time>`}</dd></div>`).join('')}</dl><p class="ve-sr">Hora local. Los cierres de madrugada corresponden al día siguiente.</p></div>`;
}
