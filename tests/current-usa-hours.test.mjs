import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {octoberHours} from '../scripts/editorial/october-2026-update.mjs';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';
import {gdlHoursSpecification} from '../scripts/gdl-operating-hours.mjs';
import {elementRange} from '../scripts/editorial/public-agenda.mjs';
import {visibilityWindow,selectNovember} from '../scripts/editorial/november-2026-programming.mjs';

const root=resolve(import.meta.dirname,'..'),now='2026-11-18T18:00:00.000Z',commit='a'.repeat(40);
const read=file=>readFileSync(resolve(root,file),'utf8');
const ids=['houston','the-woodlands','san-antonio','el-paso'];
const noonSaturday=id=>['houston','the-woodlands'].includes(id);
const schemas=html=>[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match=>JSON.parse(match[1]));
const restaurant=html=>schemas(html).find(item=>item['@type']==='Restaurant');
const plain=value=>JSON.parse(JSON.stringify(value));
const project=at=>projectPublicSite(root,{now:at,commit});
const row=(html,label)=>{
  const found=[...html.matchAll(/<dt>([^<]+)<\/dt><dd>([\s\S]*?)<\/dd>/g)].find(match=>match[1]===label);
  assert.ok(found,'Missing hours row: '+label);
  return found[2];
};
const clocks=html=>[...html.matchAll(/<time datetime="([^"]+)"/g)].map(match=>match[1]);
function confirmedDays(specification){
  const days={};
  for(const period of specification){
    assert.equal(period['@type'],'OpeningHoursSpecification');
    for(const day of [].concat(period.dayOfWeek)){
      const name=day.replace('https://schema.org/','');
      assert.equal(days[name],undefined,'Duplicate weekday: '+name);
      days[name]=[period.opens,period.closes];
    }
  }
  return days;
}
function expectedDays(id){
  return {Monday:['00:00','00:00'],Tuesday:['00:00','00:00'],Thursday:['16:00','02:00'],Friday:['16:00','02:00'],Saturday:[noonSaturday(id)?'12:00':'16:00','02:00'],Sunday:['12:00','21:00']};
}

test('November hours distinguish the two Saturday openings and keep Wednesday closing unspecified',()=>{
  for(const id of ids){
    assert.deepEqual(confirmedDays(plain(octoberHours.specification(id,now))),expectedDays(id),id);
    for(const language of ['es','en']){
      const html=octoberHours.html(language,octoberHours.zones[id],id,now);
      const wednesday=row(html,language==='en'?'Wednesday':'Miércoles');
      assert.deepEqual(clocks(wednesday),['16:00'],id+' Wednesday must not claim a closing time');
      assert.match(wednesday,language==='en'?/Closing/:/(?:[Hh]asta el cierre|[Aa]l cierre)/);
      assert.doesNotMatch(html,/datetime="(?:null|undefined|Closing|closing)"/);
      assert.deepEqual(clocks(row(html,language==='en'?'Saturday':'Sábado')),[noonSaturday(id)?'12:00':'16:00','02:00']);
      assert.deepEqual(clocks(row(html,language==='en'?'Sunday':'Domingo')),['12:00','21:00']);
      assert.match(html,language==='en'?/following day/:/día siguiente/);
    }
    const summary=octoberHours.summaryFor(id,'es',now);
    assert.match(summary,/Lun–Mar cerrado/);
    assert.match(summary,/Mié 4 pm–(?:al cierre|cierre)/);
    assert.match(summary,/Jue–Vie 4 pm–2 am/);
    assert.ok(summary.includes(noonSaturday(id)?'Sáb 12 pm–2 am':'Sáb 4 pm–2 am'));
    assert.match(summary,/Dom 12 pm–9 pm/);
  }
});

test('the current schedule switches on the November 18 local date separately for Central and Mountain time',()=>{
  for(const id of ['houston','the-woodlands','san-antonio']){
    assert.equal(octoberHours.updated(id,'2026-11-18T05:59:59.999Z'),false,id);
    assert.equal(octoberHours.updated(id,'2026-11-18T06:00:00.000Z'),true,id);
  }
  assert.equal(octoberHours.updated('el-paso','2026-11-18T06:59:59.999Z'),false);
  assert.equal(octoberHours.updated('el-paso','2026-11-18T07:00:00.000Z'),true);
  for(const id of ['san-ignacio','ciudad-juarez','san-diego','moreno-valley'])assert.equal(octoberHours.updated(id,now),false,id);
  const boundary=project('2026-11-18T06:00:00.000Z').files;
  assert.deepEqual(confirmedDays(restaurant(boundary.get('houston.html')).openingHoursSpecification),expectedDays('houston'));
  assert.ok(confirmedDays(restaurant(boundary.get('el-paso.html')).openingHoursSpecification).Wednesday,'El Paso must retain its previous schedule until its own midnight');
});

test('browser data updates all four operating locations while preserving Guadalajara and future openings',()=>{
  const data={branches:[...ids,'san-ignacio','ciudad-juarez','san-diego','moreno-valley'].map(id=>({id,hours:'unchanged '+id}))};
  octoberHours.applyToData(data,now);
  for(const branch of data.branches){
    if(ids.includes(branch.id))assert.equal(branch.hours,octoberHours.summaryFor(branch.id,'es',now));
    else assert.equal(branch.hours,'unchanged '+branch.id);
  }
  assert.notEqual(data.branches.find(branch=>branch.id==='houston').hours,data.branches.find(branch=>branch.id==='san-antonio').hours);
});

test('an already-open branch page switches its hours and schema at local midnight without inventing a Wednesday close',()=>{
  for(const id of ids){
    const boundary=id==='el-paso'?'2026-11-18T07:00:00.000Z':'2026-11-18T06:00:00.000Z';
    let instant=Date.parse(boundary)-1,interval,replacements=0,hours;
    const events={};
    const element=html=>({html,attributes:{'data-october-active':'2026-10-29'},getAttribute(key){return this.attributes[key]??null;},setAttribute(key,value){this.attributes[key]=value;},replaceWith(next){hours=next;replacements++;}});
    hours=element(octoberHours.html('en',octoberHours.zones[id],id,new Date(instant)));
    const schema={textContent:JSON.stringify({'@type':'Restaurant',name:'Preserved restaurant',openingHoursSpecification:octoberHours.specification(id,new Date(instant))})};
    const webpage={textContent:JSON.stringify({'@type':'WebPage',name:'Preserved page'})};
    const originalPageSchema=webpage.textContent;
    const document={body:{dataset:{branch:id}},documentElement:{lang:'en'},addEventListener(name,callback){events[name]=callback;},querySelector:()=>hours,querySelectorAll:selector=>selector==='script[type="application/ld+json"]'?[schema,webpage]:[],createElement(){return {set innerHTML(value){this.firstElementChild=element(value);}};}};
    class LiveDate extends Date{constructor(...args){super(...(args.length?args:[instant]));}static now(){return instant;}}
    const window={document,setInterval(callback){interval=callback;},SY_DATA:{branches:[{id,hours:'before'},{id:'san-ignacio',hours:'Guadalajara preserved'}]}};
    vm.runInNewContext(read('assets/js/october-hours.js'),{window,Date:LiveDate});
    events.DOMContentLoaded();
    assert.equal(replacements,0,id+' remains on October schedule before midnight');
    instant=Date.parse(boundary);
    interval();
    assert.equal(replacements,1,id);
    assert.deepEqual(clocks(row(hours.html,'Wednesday')),['16:00']);
    assert.match(row(hours.html,'Wednesday'),/Closing/);
    assert.deepEqual(clocks(row(hours.html,'Saturday')),[noonSaturday(id)?'12:00':'16:00','02:00']);
    const current=JSON.parse(schema.textContent);
    assert.equal(current.name,'Preserved restaurant');
    assert.deepEqual(confirmedDays(current.openingHoursSpecification),expectedDays(id));
    assert.equal(webpage.textContent,originalPageSchema);
    assert.equal(window.SY_DATA.branches[0].hours,octoberHours.summaryFor(id,'es',boundary));
    assert.equal(window.SY_DATA.branches[1].hours,'Guadalajara preserved');
    interval();
    assert.equal(replacements,1,id+' same release does not replace the hours repeatedly');
  }
});

test('event expiry follows the new Sunday and Thursday closes while unknown Wednesday closing uses only editorial date-end',()=>{
  const record=(branchId,date)=>({branchId,date,kind:'dated-event',timeZone:'America/Chicago',publishFrom:'2026-11-10T18:00:00.000Z',sourceEndTime:null});
  const examples=[
    [record('the-woodlands','2026-11-29'),'2026-11-30T03:00:00.000Z','editorial-branch-closing'],
    [record('houston','2026-12-03'),'2026-12-04T08:00:00.000Z','editorial-branch-closing'],
    [record('houston','2026-11-18'),'2026-11-19T06:00:00.000Z','editorial-date-end'],
  ];
  for(const [event,expiry,basis] of examples){
    const window=visibilityWindow(event);
    assert.equal(window.expiresAt,expiry,event.date);
    assert.equal(window.expiryBasis,basis,event.date);
    assert.equal(event.sourceEndTime,null,'An editorial expiry must not become an announced event end');
    assert.equal(selectNovember([event],new Date(Date.parse(expiry)-1).toISOString()).visible.length,1);
    assert.equal(selectNovember([event],expiry).visible.length,0);
  }
});

test('production projection agrees across eight language editions, public records, discovery and cache versions',()=>{
  const {files}=project(now),discovery=JSON.parse(files.get('discovery.json'));
  for(const id of ids){
    const record=discovery.locations.find(item=>item.id===id);
    assert.deepEqual(confirmedDays(record.openingHoursSpecification),expectedDays(id),id+' discovery');
    for(const language of ['es','en']){
      const file=language==='es'?id+'.html':'en/'+id+'/index.html',html=files.get(file);
      assert.ok(html.includes(octoberHours.html(language,octoberHours.zones[id],id,now)),file);
      assert.deepEqual(confirmedDays(restaurant(html).openingHoursSpecification),expectedDays(id),file);
      assert.equal(html.split('class="ve-hours"').length-1,1,file);
      assert.doesNotMatch(html,/Domingos · desde las 11 AM|Sundays · from 11 AM/);
      assert.match(html,language==='en'?/Sundays[^<]*(?:12 PM|noon)/:/Domingos[^<]*(?:12 PM|12 pm|mediodía)/);
    }
  }
  class CurrentDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return Date.parse(now);}}
  const context={window:{},Date:CurrentDate};
  vm.runInNewContext(read('assets/js/october-hours.js'),context);
  vm.runInNewContext(read('assets/js/public-data.js'),context);
  for(const id of ids)assert.equal(context.window.SY_DATA.branches.find(branch=>branch.id===id).hours,octoberHours.summaryFor(id,'es',now));
  const manifest=JSON.parse(read('scripts/public-manifest.json'));
  for(const file of manifest.pages){
    const html=files.get(file)??read(file);
    for(const script of ['october-hours','i18n']){
      const reference=html.match(new RegExp('assets/js/'+script+'\\.js\\?v=([^"\\s]+)'));
      if(reference)assert.equal(reference[1],'20261118-usa-hours',file+' '+script);
    }
  }
});

test('Guadalajara keeps its recurring hours, holiday exceptions and hero through the USA change',()=>{
  const before=project('2026-11-18T05:59:59.999Z').files,after=project(now).files;
  const previous=restaurant(before.get('guadalajara.html')),current=restaurant(after.get('guadalajara.html'));
  assert.deepEqual(current.openingHoursSpecification,gdlHoursSpecification());
  assert.deepEqual(current.openingHoursSpecification,previous.openingHoursSpecification);
  assert.deepEqual(current.specialOpeningHoursSpecification,previous.specialOpeningHoursSpecification);
  assert.deepEqual(current.specialOpeningHoursSpecification.map(item=>item.validFrom),['2026-11-20','2026-12-24','2026-12-25','2027-01-01']);
  assert.equal(elementRange(after.get('guadalajara.html'),'section','san-ignacio').html,elementRange(before.get('guadalajara.html'),'section','san-ignacio').html);
  const location=JSON.parse(after.get('discovery.json')).locations.find(item=>item.id==='san-ignacio');
  assert.deepEqual(location.openingHoursSpecification,current.openingHoursSpecification);
  assert.deepEqual(location.specialOpeningHoursSpecification,current.specialOpeningHoursSpecification);
});

test('the two current summaries switch to English and back without losing Saturday differences',()=>{
  const nodes=['houston','san-antonio'].map(id=>({id,childNodes:[{nodeType:3,textContent:octoberHours.summaryFor(id,'es',now)}]}));
  const document={readyState:'complete',body:{},documentElement:{lang:'es'},querySelector:()=>null,querySelectorAll:selector=>['[aria-label], img[alt]','[data-lang-btn]','[data-i18n-href-es][data-i18n-href-en]','[data-i18n-es][data-i18n-en]'].includes(selector)?[]:nodes};
  const window={};
  vm.runInNewContext(project(now).files.get('assets/js/i18n.js')??read('assets/js/i18n.js'),{document,window,localStorage:{getItem:()=>null,setItem(){}},MutationObserver:class{observe(){}},setTimeout(){}});
  for(let repeat=0;repeat<2;repeat++){
    window.SY_I18N.apply('en');
    for(const node of nodes){
      assert.equal(node.childNodes[0].textContent,octoberHours.summaryFor(node.id,'en',now));
      assert.match(node.childNodes[0].textContent,/Wed 4 pm–[Cc]los(?:e|ing)/);
      assert.ok(node.childNodes[0].textContent.includes(noonSaturday(node.id)?'Sat 12 pm–2 am':'Sat 4 pm–2 am'));
    }
    window.SY_I18N.apply('es');
    for(const node of nodes)assert.equal(node.childNodes[0].textContent,octoberHours.summaryFor(node.id,'es',now));
  }
});
