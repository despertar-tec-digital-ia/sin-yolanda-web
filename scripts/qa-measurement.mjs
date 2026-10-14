// Isolated browser QA with the actual deployed SDK and intercepted collector.
// No synthetic telemetry reaches the production provider or external destinations.
import assert from'node:assert/strict';
import{createRequire}from'node:module';import{readFileSync,mkdirSync,writeFileSync}from'node:fs';import{resolve}from'node:path';
import{loadReviewPackage,startReviewServer}from'./serve-review.mjs';
const artifact=resolve(process.argv[2]),sdkFile=resolve(process.argv[3]),output=resolve(process.argv[4]);
assert.ok(artifact.startsWith(resolve('.artifacts')+'/'));assert.ok(sdkFile.startsWith(resolve('.artifacts')+'/'));assert.ok(output.startsWith(resolve('.artifacts')+'/'));
mkdirSync(output,{recursive:true});const sdk=readFileSync(sdkFile,'utf8');
const{chromium}=createRequire(resolve(process.env.SY_QA_PACKAGE_ROOT,'../package.json'))('playwright');
const server=await startReviewServer({...loadReviewPackage(artifact),port:0});
const local='http://127.0.0.1:'+server.address().port,official='https://sin-yolanda.com';
const browser=await chromium.launch({executablePath:process.env.SY_QA_BROWSER});
const report={cases:[],collectorIntercepted:true,limitations:['Chromium emulation; actual SDK with intercepted sends, not backend persistence of the new candidate. No external checkout or physical Safari certification.']};
async function context({width=1440,privacy,delay=false,fail=false}={}){
 const ctx=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
 ctx.setDefaultTimeout(8000);
 // A test may click a phone link to verify its event, but never launches a call.
 await ctx.addInitScript(()=>document.addEventListener('click',event=>{const link=event.target instanceof Element?event.target.closest('a[href]'):null;if(link?.getAttribute('href')?.startsWith('tel:'))event.preventDefault();},true));
 if(privacy)await ctx.addInitScript(mode=>Object.defineProperty(navigator,mode==='gpc'?'globalPrivacyControl':'doNotTrack',{get:()=>mode==='gpc'?true:'1'}),privacy);
 const sends=[],errors=[],outgoing=[];let release;const gate=delay?new Promise(resolve=>{release=resolve}):Promise.resolve();
 await ctx.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin==='https://analytics.despertartdigital.cloud'){
   if(url.pathname==='/script.js'){if(fail)return route.abort();await gate;return route.fulfill({status:200,contentType:'application/javascript',body:sdk});}
   if(url.pathname==='/api/send'){assert.equal(request.method(),'POST');sends.push(request.postDataJSON());return route.fulfill({status:200,contentType:'application/json',body:'{"cache":"isolated-fixture"}'});}
  }
  if([official,'https://sin-yolanda-web.pages.dev'].includes(url.origin)){
   const response=await fetch(local+url.pathname+url.search);return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  }
  if(url.origin===local)return route.continue();
  outgoing.push(url.origin);return route.abort();
 });
 const page=await ctx.newPage();page.on('pageerror',error=>errors.push(error.message));
 return{ctx,page,sends,errors,outgoing,release};
}
const events=state=>state.sends.filter(send=>send.payload?.name);
async function waitUntil(predicate){for(let n=0;n<100;n++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,25));}assert.ok(predicate(),'Expected intercepted telemetry was not observed');}
async function clickOne(state,locator,{name,destination,mode='click'}={}){
 const before=events(state).length;
 if(mode==='keyboard')await locator.press('Enter');else await locator.click(mode==='middle'?{button:'middle'}:mode==='modified'?{modifiers:['Meta']}:{});
 await waitUntil(()=>events(state).length>before);assert.equal(events(state).length,before+1,'One user action must send one event');
 const payload=events(state).at(-1).payload;if(name)assert.equal(payload.name,name);if(destination)assert.equal(payload.data.destination,destination);
 assert.equal(payload.data.schema_version,2);assert.ok(!/email|phoneIntl|fbclid|gclid|href|visitor_id|distinct_id/.test(JSON.stringify(payload)));
 return payload;
}
async function run(label,job){const item={label,passed:false};try{await job(item);item.passed=true;}catch(error){item.failure=error.message.split('\n')[0];item.details=error.message;}report.cases.push(item);writeFileSync(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({case:label,passed:item.passed,failure:item.failure}));}
try{
 for(const branch of['houston','the-woodlands','san-antonio','el-paso'])for(const language of['es','en']){
  await run(branch+'-'+language,async item=>{
   const state=await context({width:language==='es'?1440:390});
   try{
    const path=language==='es'?'/'+branch:'/en/'+branch+'/';await state.page.goto(official+path+'?utm_source=instagram&utm_medium=social&email=fixture%40example.invalid',{referer:'https://www.instagram.com/'});
    await waitUntil(()=>state.sends.some(send=>!send.payload.name));
    const view=state.sends.find(send=>!send.payload.name).payload;assert.ok(view.url.endsWith('?utm_source=instagram&utm_medium=social'));assert.equal(view.data.source,'instagram');
    assert.equal(view.data.page_branch,branch);assert.doesNotMatch(JSON.stringify(state.sends),/fixture%40|fixture@example|email=/);
    const post=state.page.locator('.sy-agenda a[href*="instagram.com"]').first();
    const payload=await clickOne(state,post,{name:'programming_action_click',destination:'instagram_post'});
    assert.equal(payload.data.branch,branch);assert.equal(payload.data.page_language,language);assert.equal(payload.data.link_location,'agenda');assert.ok(payload.data.event_id||payload.data.series_id);
    await clickOne(state,post,{name:'programming_action_click',destination:'instagram_post',mode:'keyboard'});
    await clickOne(state,post,{name:'programming_action_click',destination:'instagram_post',mode:'middle'});
    await clickOne(state,post,{name:'programming_action_click',destination:'instagram_post',mode:'modified'});
    if(branch==='houston'){
     assert.equal(await state.page.locator('.sy-agenda a[href*="eventbrite.com"]').count(),2);
     const ticket=await clickOne(state,state.page.locator('.sy-agenda a[href*="eventbrite.com"]').first(),{name:'programming_action_click',destination:'tickets'});
     assert.equal(ticket.data.event_id,'houston-pinta-canta-20261014');
    }
    const reserve=await clickOne(state,state.page.locator('.bf-book'),{name:'reservation_click',destination:'reservation'});assert.equal(reserve.data.link_location,'footer');
    await clickOne(state,state.page.locator('footer a[href*="google.com/maps/dir"]').first(),{name:'directions_click',destination:'maps'});
    await clickOne(state,state.page.locator('footer a[href^="tel:"]').first(),{name:'phone_click',destination:'phone'});
    if(language==='es'){await state.page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await state.page.waitForFunction(()=>!document.querySelector('.hh-header')?.hasAttribute('data-hidden'));}
    const menu=await clickOne(state,state.page.locator(language==='es'?'.hh-nav-menu':'.hh-welcome-menu'),{name:'menu_click',destination:'menu'});assert.equal(menu.data.link_location,language==='es'?'header':'hero');
    assert.equal(state.errors.length,0);item.clickEvents=events(state).length;item.width=language==='es'?1440:390;
   }finally{await state.ctx.close();}
  });
 }
 for(const privacy of['dnt','gpc'])await run('privacy-'+privacy,async()=>{
  const state=await context({privacy});try{await state.page.goto(official+'/houston');assert.equal(await state.page.locator('#sy-umami-tracker').count(),0);assert.equal(state.sends.length,0);assert.equal(await state.page.evaluate(()=>sessionStorage.getItem('sy-acquisition-v2')),null);}finally{await state.ctx.close();}
 });
 for(const target of[local+'/houston','https://sin-yolanda-web.pages.dev/houston'])await run('excluded-'+new URL(target).hostname,async()=>{
  const state=await context();try{await state.page.goto(target);assert.equal(await state.page.locator('#sy-umami-tracker').count(),0);assert.equal(state.sends.length,0);}finally{await state.ctx.close();}
 });
 await run('delayed-sdk-single-queued-click',async()=>{
  const state=await context({delay:true});try{await state.page.goto(official+'/houston',{waitUntil:'domcontentloaded'});await state.page.locator('.sy-agenda a[href*="instagram.com"]').first().click();assert.equal(state.sends.length,0);state.release();await waitUntil(()=>events(state).length===1);assert.equal(events(state)[0].payload.name,'programming_action_click');assert.equal(state.errors.length,0);}finally{state.release();await state.ctx.close();}
 });
 await run('sdk-failure-does-not-block-link',async()=>{
  const state=await context({fail:true});try{await state.page.goto(official+'/houston');await state.page.locator('.sy-agenda a[href*="instagram.com"]').first().click();await waitUntil(()=>state.outgoing.includes('https://www.instagram.com'));assert.equal(state.sends.length,0);assert.equal(state.errors.length,0);}finally{await state.ctx.close();}
 });
 await run('selector-to-ficha-first-acquisition',async()=>{
  const state=await context();try{
   await state.page.goto(official+'/locations?utm_source=instagram&utm_medium=social',{referer:'https://www.instagram.com/'});await waitUntil(()=>state.sends.length>0);
   const first=await clickOne(state,state.page.locator('a[data-venue][data-branch-id="houston"]'),{name:'location_select',destination:'branch'});assert.equal(first.data.link_location,'selector');
   await state.page.waitForURL('**/houston**');await waitUntil(()=>state.sends.some(send=>send.payload.url==='/houston'));
   const after=state.sends.find(send=>send.payload.url==='/houston'&&!send.payload.name).payload;assert.equal(after.data.landing_path,'/locations');assert.equal(after.data.source,'instagram');
   assert.equal(new URL(state.page.url()).search,'');assert.equal(state.errors.length,0);
  }finally{await state.ctx.close();}
 });
 await run('catering-contact-section',async()=>{
  const state=await context();try{await state.page.goto(official+'/catering');await waitUntil(()=>state.sends.length>0);await clickOne(state,state.page.locator('.ct-opening-contact'),{name:'catering_contact_click',destination:'contact_section'});assert.equal(state.errors.length,0);}finally{await state.ctx.close();}
 });
 await run('guadalajara-historic-id',async()=>{
  const state=await context();try{await state.page.goto(official+'/guadalajara');await waitUntil(()=>state.sends.length>0);const view=state.sends.find(send=>!send.payload.name).payload;assert.equal(view.data.page_branch,'san-ignacio');const menu=await clickOne(state,state.page.locator('.hh-nav-menu'),{name:'menu_click',destination:'menu'});assert.equal(menu.data.branch,'san-ignacio');}finally{await state.ctx.close();}
 });
 await run('home-language-source-and-destination',async()=>{
  const state=await context();try{await state.page.goto(official+'/');await waitUntil(()=>state.sends.length>0);const payload=await clickOne(state,state.page.locator('button[data-lang-btn="en"]'),{name:'language_switch_click',destination:'language'});assert.equal(payload.data.language,'en');assert.equal(payload.data.page_language,'es');assert.equal(payload.data.destination_language,'en');assert.equal(state.errors.length,0);}finally{await state.ctx.close();}
 });
 await run('menu-language-single-owner',async()=>{
  const state=await context();try{await state.page.goto(official+'/san-antonio/menu/');await waitUntil(()=>state.sends.length>0);const payload=await clickOne(state,state.page.locator('a[lang="en"]').first(),{name:'language_switch_click',destination:'language'});assert.equal(payload.data.page_language,'es');assert.equal(payload.data.destination_language,'en');assert.equal(payload.data.branch,'san-antonio');assert.equal(state.errors.length,0);}finally{await state.ctx.close();}
 });
 await run('idle-acquisition-expires-in-real-sdk',async()=>{
  const state=await context();try{await state.page.clock.install({time:new Date('2026-10-14T04:30:00Z')});await state.page.goto(official+'/houston?utm_source=instagram&utm_medium=social');await waitUntil(()=>state.sends.length>0);assert.equal(state.sends[0].payload.data.source,'instagram');await state.page.clock.fastForward(1800001);const payload=await clickOne(state,state.page.locator('.sy-agenda a[href*="instagram.com"]').first(),{name:'programming_action_click',destination:'instagram_post'});assert.equal(payload.data.source,undefined);assert.equal(payload.data.entry_referrer,'unknown');}finally{await state.ctx.close();}
 });
 report.passed=report.cases.every(item=>item.passed);writeFileSync(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,failures:report.cases.filter(item=>!item.passed),output}));if(!report.passed)process.exitCode=1;
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
