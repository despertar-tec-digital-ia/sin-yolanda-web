// Read-only responsive review, including a deliberately slow agenda image.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const base=process.env.SY_TEST_BASE||'http://127.0.0.1:8813';
assert.ok(/^http:\/\/127\.0\.0\.1:\d+$/.test(base)||base==='https://demo-sin-yolanda.despertartdigital.cloud');
const out=path.resolve(process.env.SY_QA_RECEIPTS||'.artifacts/demo-polish-20261011/local');
const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const report={base,cases:[],limitations:['Chromium emulation, not physical Safari/iPad; external services and non-GET/HEAD blocked. Slow-media case intentionally delays the large agenda photo.']};
 try{
  for(const width of [320,390,768,1440])for(const language of ['es','en']){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
   const errors=[];const record={width,language,ok:false};
   try{
    await context.addInitScript(lang=>localStorage.setItem('sy-lang',lang),language);
    await context.route('**/*',route=>new URL(route.request().url()).origin===base&&['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.getAttribute('html','lang'),language);
    assert.equal(await page.locator('.opening-announcement').count(),0);
    assert.equal(await page.locator('[data-branch-id="el-paso"] .venue-badge').count(),0);
    for(const id of ['moreno-valley','san-diego']){
     const card=page.locator(`[data-branch-id="${id}"]`);
     await card.scrollIntoViewIfNeeded();await card.locator('img').evaluate(image=>image.decode());
     assert.match(await card.locator('img').getAttribute('src'),/\/venues\/future\//);
     assert.equal(await card.getAttribute('href'),null);
     await card.hover();
     if(language==='es'&&[390,1440].includes(width))await card.screenshot({path:path.join(out,`${id}-${width}.png`)});
    }
    record.themes=[];
    for(const [id,tone]of[['catering','light'],['plan','dark'],['cartelera','light'],['experiencia','dark'],['cumple','light']]){
     await page.locator('#'+id).evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));await page.waitForTimeout(60);
     await page.evaluate(()=>scrollBy({top:-24,behavior:'instant'}));await page.waitForTimeout(60);
     assert.equal(await page.locator('.public-header').getAttribute('data-tone'),tone);
     const colors=await page.locator('.public-header').evaluate(header=>({background:getComputedStyle(header).backgroundColor,text:getComputedStyle(header.querySelector('.public-nav>a')).color}));
     const ratio=contrast(colors.background,colors.text);assert.ok(ratio>=4.5,`Header contrast ${ratio}`);
     record.themes.push({id,tone,contrast:ratio});
     if(id==='cartelera'){
      const bounds=await page.locator('.home-agenda-media').evaluate(frame=>{const image=frame.querySelector('img'),a=frame.getBoundingClientRect(),b=image.getBoundingClientRect();return{gap:a.bottom-b.bottom,widthGap:a.width-b.width,background:getComputedStyle(frame).backgroundImage};});
      assert.ok(Math.abs(bounds.gap)<1&&Math.abs(bounds.widthGap)<1);assert.match(bounds.background,/agenda-canto-preview/);
      if(language==='es'&&[390,1440].includes(width)){await page.locator('#cartelera img').evaluate(image=>image.decode());await page.screenshot({path:path.join(out,`agenda-navbar-${width}.png`)});}
     }
    }
    const footer=page.locator('.group-footer');await footer.scrollIntoViewIfNeeded();await footer.locator('img').evaluate(image=>image.decode());
    assert.equal(await footer.locator('a[href="/el-paso"]').count(),1);
    assert.equal(await footer.locator('.group-footer-upcoming').getByText('El Paso',{exact:true}).count(),0);
    const logo=await footer.locator('.footer-brand-link img').evaluate(image=>image.getBoundingClientRect().width);assert.ok(logo>=280);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    if(language==='es'&&[390,768,1440].includes(width))await footer.screenshot({path:path.join(out,`footer-${width}.png`)});
    assert.deepEqual(errors,[]);record.ok=true;
   }catch(error){record.error=error.message;}finally{report.cases.push(record);await context.close();}
  }
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
   const record={width,scenario:'slow-agenda',ok:false};
   try{
    await context.route('**/*',async route=>{
     if(new URL(route.request().url()).origin!==base||!['GET','HEAD'].includes(route.request().method()))return route.abort();
     if(/agenda-canto-(640|1280)\.webp/.test(route.request().url()))await new Promise(resolve=>setTimeout(resolve,2000));
     return route.continue();
    });
    const page=await context.newPage();await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await page.locator('#cartelera').evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));await page.waitForTimeout(120);
    const media=page.locator('.home-agenda-media');
    record.pending=await media.evaluate(frame=>{const image=frame.querySelector('img');return{loaded:image.complete&&image.naturalWidth>0,background:getComputedStyle(frame).backgroundImage,height:frame.getBoundingClientRect().height};});
    assert.match(record.pending.background,/agenda-canto-preview/);assert.ok(record.pending.height>=300);
    await media.screenshot({path:path.join(out,`agenda-pending-${width}.png`)});
    await page.locator('#cartelera img').evaluate(image=>image.decode());
    const finalHeight=await media.evaluate(frame=>frame.getBoundingClientRect().height);assert.ok(Math.abs(finalHeight-record.pending.height)<1);
    record.ok=true;
   }catch(error){record.error=error.message;}finally{report.cases.push(record);await context.close();}
  }
 }finally{await browser.close();report.observedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
 const failures=report.cases.filter(c=>!c.ok);console.log(JSON.stringify({cases:report.cases.length,failures,receipts:out}));if(failures.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
