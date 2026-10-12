// Read-only loopback QA of the packaged integration. External services/submissions are blocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const base=process.env.SY_QA_ORIGIN||'http://127.0.0.1:8821';
assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/);
assert.ok(process.env.SY_QA_PACKAGE_ROOT,'Provide installed runtime node_modules');
const {chromium}=createRequire(path.resolve(process.env.SY_QA_PACKAGE_ROOT,'../package.json'))('playwright');
const out=path.resolve(import.meta.dirname,'../.artifacts/promotion-qa/routes');
fs.mkdirSync(out,{recursive:true});
const cases=[['/','es'],['/','en'],['/locations','es'],['/houston','es'],['/en/houston/','en'],
 ['/el-paso','es'],['/en/el-paso/','en'],['/catering','es'],['/en/catering/','en']];
const report={cases:[],limitations:['Chromium emulation, not physical Safari/iPad. External Maps/OpenTable/telemetry blocked; no reservation or contact submissions.']};
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 for(const width of [390,768,1440])for(const [route,lang]of cases){
  const record={route,lang,width,ok:false},errors=[],missing=[];
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  context.setDefaultTimeout(8000);
  await context.addInitScript(lang=>{try{localStorage.setItem('sy-lang',lang);}catch{}},lang);
  await context.route('**/*',r=>new URL(r.request().url()).origin===base&&['GET','HEAD'].includes(r.request().method())?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(new URL(r.url()).origin===base&&r.status()>=400)missing.push(new URL(r.url()).pathname);});
  try{
   const response=await page.goto(base+route,{waitUntil:'networkidle'});assert.equal(response.status(),200);
   await page.evaluate(()=>document.fonts.ready);assert.equal(await page.getAttribute('html','lang'),lang);
   assert.equal(await page.locator('h1').count(),1);
   for(const image of await page.locator('img').all()){
    if(!await image.isVisible())continue;
    // Reduced-motion leaves deferred, inactive hero scenes intentionally without src.
    // Their loader is covered by hero-autoplay.test.mjs, not a broken-image assertion.
    if(await image.getAttribute('data-src')){
     assert.equal(await image.evaluate(image=>image.classList.contains('is-active')),false);
     continue;
    }
    await image.scrollIntoViewIfNeeded();await image.evaluate(image=>image.decode());
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Horizontal overflow');
   assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
   if(route.includes('el-paso')){
    assert.ok(await page.locator('a[href="tel:+19153636330"]').count()>0);
    assert.ok(await page.locator('a[href="https://www.opentable.com/restaurant/profile/1559290"]').count()>0);
    assert.ok(await page.locator('a[href="/el-paso/menu/"]').count()>0);
    assert.equal(await page.locator('script[src*="rid=1559290"]').count(),1);
   }
   if(route==='/'){
    assert.equal(await page.locator('[data-hero-motion]').count(),0);
    const el=page.locator('[data-venue][data-branch-id="el-paso"]');
    assert.ok(await el.count());assert.equal(await el.getAttribute('href'),'/el-paso');
    const gdl=page.locator('[data-venue][data-branch-id="san-ignacio"]');
    assert.equal(await gdl.getAttribute('href'),'/san-ignacio');
   }
   if(lang==='es'||route.startsWith('/en/')){
    await page.evaluate(()=>scrollTo(0,0));
    const label=(route==='/'?'home':route.replaceAll('/','-').replace(/^-|-$/g,''))+'-'+lang+'-'+width;
    await page.screenshot({path:path.join(out,label+'.png'),fullPage:true});
    await page.screenshot({path:path.join(out,label+'-top.png')});
    record.screenshot=label+'.png';
   }
   record.ok=true;
  }catch(error){record.error=error.message;}finally{report.cases.push(record);await context.close();}
 }
 const request=await browser.newContext();
 report.qr=[];
 for(const [route,destination]of [['/q/gdl-menu','https://sinyolandagdl.com/menu/'],['/q/el-paso-registro','https://api.leadconnectorhq.com/widget/form/nN59k3I7TT6TOxDl4XET']]){
  const response=await request.request.get(base+route,{maxRedirects:0});
  assert.equal(response.status(),302);assert.ok(response.headers().location.startsWith(destination));
  report.qr.push({route,status:response.status(),destinationPreserved:true});
 }
 await request.close();
}finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
const failures=report.cases.filter(c=>!c.ok);console.log(JSON.stringify({cases:report.cases.length,failures,qr:report.qr,receipts:out}));
if(failures.length)process.exitCode=1;
