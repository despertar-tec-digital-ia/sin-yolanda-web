import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {restoreSeoBaseline} from '../scripts/seo.mjs';
const root=new URL('../',import.meta.url);
const read=file=>fs.readFileSync(new URL(file,root));
const hash=value=>createHash('sha256').update(value).digest('hex');
const contract=JSON.parse(read('scripts/demo-promotion.json'));
// The separately authorized route migration changes only these bounded link/cache tokens.
// Restoring them must recover the complete original hash, not just the visual body.
const restoreRoutes=(file,value)=>{
 let source=restoreSeoBaseline(file,value.toString());
 // Only the two Houston heads gain the approved overlay correction. Removing
 // that exact link must recover every original byte, including hero and content.
 if(['houston.html','en/houston/index.html'].includes(file))source=source.replace('<link rel="stylesheet" href="/assets/css/houston-header.css?v=20261012-overlay">','');
 source=source.replaceAll('guadalajara.html','san-ignacio.html')
  .replaceAll('assets/js/public-data.js?v=20261012-root-routing','assets/js/public-data.js?v=20261011-demo-polish');
 source=source.replaceAll('assets/js/site-analytics.js?v=20261012-root-routing','assets/js/site-analytics.js?v=20261008-migration-measurement');
 if(file==='assets/js/site-analytics.js')source=source.replace('"/el-paso", "/guadalajara", "/san-ignacio",','"/el-paso", "/san-ignacio",');
 if(file==='_redirects')source=source.replace('\n# Branch canonical rename; original menu routes are deliberately unchanged.\n/san-ignacio /guadalajara 301\n/san-ignacio/ /guadalajara 301\n/san-ignacio.html /guadalajara 301\n','');
 return source;
};
test('promotion retains the approved demo bytes rather than introducing a new design',()=>{
 assert.equal(contract.sourceCommit,'3a3ce446a901ce3bb167bef0bc636c71b4ee8ff4');
 for(const [file,expected]of Object.entries(contract.exactDemo))assert.equal(hash(/\.(html|js)$/.test(file)?restoreRoutes(file,read(file)):read(file)),expected,file);
});
test('promotion preserves native menus, QR, privacy, analytics and El Paso PR18/19',()=>{
 for(const [file,expected]of Object.entries(contract.preserved))assert.equal(hash(/\.(html|js)$/.test(file)||['robots.txt','sitemap.xml','_redirects'].includes(file)?restoreRoutes(file,read(file)):read(file)),expected,file);
 for(const file of contract.protectedFiles)assert.ok(contract.preserved[file],file);
 assert.equal(contract.protectedFiles.filter(file=>file.includes('/menu/')).length,6);
});
test('the public El Paso registry agrees with the newer native business facts',()=>{
 const context={window:{}};vm.runInNewContext(read('assets/js/public-data.js').toString(),context);
 const branch=context.window.SY_DATA.branches.find(branch=>branch.id==='el-paso');
 const native=JSON.parse(read('scripts/branch-import-manifest.json'))['el-paso'];
 assert.equal(branch.status,'active');assert.equal(branch.phoneIntl,native.facts.phone.e164);
 assert.equal(branch.reserveUrl,native.facts.reservation.url);assert.equal(branch.reserveChannel,'opentable');
 assert.equal(branch.hours,'Horario por confirmar');
});
