import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';
import {refineBooking} from '../scripts/editorial/booking-refinements.mjs';
import {loadApprovedBooking} from '../scripts/editorial/booking-approved.mjs';
import {approvedPreviewsSource,restoreApprovedPreviewsSource} from '../scripts/approved-previews-source-contract.mjs';
import {restoreNovemberSource} from '../scripts/november-source-contract.mjs';
const root=resolve(import.meta.dirname,'..'),options={now:'2026-11-08T02:00:00Z',commit:'a'.repeat(40)};
const read=file=>readFileSync(resolve(root,file),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
const strip=html=>html.replace(/ data-agenda-render-digest="[a-f0-9]+"/g,'');
test('Houston alone receives the reviewed native booking and motion in both languages',()=>{
  const baseline=projectPublicSite(root,{...options,booking:false}),live=projectPublicSite(root,options);
  const changed=[...live.files].filter(([f,s])=>strip(s)!==strip(baseline.files.get(f))).map(([f])=>f);
  assert.deepEqual(changed,['houston.html','en/houston/index.html']);
  const {config}=loadApprovedBooking(root),branch=config.branches.find(b=>b.slug==='houston');
  for(const[file,language]of [['houston.html','es'],['en/houston/index.html','en']]){
    const html=live.files.get(file),expected=refineBooking(baseline.files.get(file),branch,language);
    // Shared UI sheets are composed after the widget; the reviewed body is exact.
    const body=s=>strip(s.slice(s.indexOf('<body')));
    assert.equal(body(html),body(expected));
    assert.equal((html.match(/data-opentable-pilot="1524058"/g)||[]).length,1);
    assert.equal((html.match(/data-booking-open/g)||[]).length,3);
    assert.match(html,/data-sy-motion-review/);
    assert.match(html,language==='es'?/lang=es-MX/:/lang=en-US/);
    assert.doesNotMatch(html,/Prueba de diseño|No confirmes una reserva|<script[^>]+src="https:\/\/www\.opentable\.com/);
    const links=[...html.matchAll(/<a\b[^>]*data-booking-open[^>]*href="([^"]+)"/g)].map(m=>new URL(m[1].replaceAll('&amp;','&')));
    assert.equal(links.length,3);
    for(const url of links){assert.equal(url.origin,'https://www.opentable.com');assert.equal(url.searchParams.get('restref'),'1524058');}
  }
  for(const file of ['san-antonio.html','the-woodlands.html','el-paso.html'])assert.doesNotMatch(live.files.get(file),/data-opentable-pilot/);
});
test('the approved Ciudad Juárez source and allowlist delta restore exactly, with unrelated edits still visible',()=>{
  for(const[file,entry]of Object.entries(approvedPreviewsSource.files)){
    const actual=restoreNovemberSource(file,read(file));assert.equal(hash(actual),entry.afterSha256,file);
    assert.equal(hash(restoreApprovedPreviewsSource(file,actual)),entry.beforeSha256,file);
    assert.notEqual(hash(restoreApprovedPreviewsSource(file,actual+'unapproved edit')),entry.beforeSha256,file);
    assert.throws(()=>restoreApprovedPreviewsSource(file,actual+entry.patches[0].after),/ambiguous/);
  }
  const cj=projectPublicSite(root,options).files.get('ciudad-juarez.html');
  assert.match(cj,/hh-hero/);assert.match(cj,/branch-footer cj-footer/);assert.match(cj,/index,follow/);
  assert.doesNotMatch(cj,/data-opentable-pilot|tel:|wa\.me|@type":"Restaurant|google\.com\/maps/);
  const manifest=JSON.parse(read('scripts/public-manifest.json'));
  assert.ok(![...manifest.pages,...manifest.assets].some(f=>/ejemplo-11|opening-label-local/.test(f)));
});
test('scheduled updates retain Houston booking and approved media cannot silently change',t=>{
  const later=projectPublicSite(root,{...options,now:'2026-12-03T18:00:00Z'});
  assert.match(later.files.get('houston.html'),/data-opentable-pilot="1524058"/);
  assert.match(later.files.get('index.html'),/data-i18n-es="Próxima apertura"/);
  const fixture=mkdtempSync(resolve(tmpdir(),'sy-booking-approval-'));t.after(()=>rmSync(fixture,{recursive:true,force:true}));
  const {approval}=loadApprovedBooking(root);
  for(const f of ['scripts/editorial/approved-booking.json','scripts/public-manifest.json',...Object.keys(approval.assets),...Object.keys(approval.inputs)]){
    mkdirSync(dirname(resolve(fixture,f)),{recursive:true});copyFileSync(resolve(root,f),resolve(fixture,f));
  }
  writeFileSync(resolve(fixture,'assets/js/opentable-review.js'),'unapproved code');
  assert.throws(()=>loadApprovedBooking(fixture),/differs from the reviewed/);
});
