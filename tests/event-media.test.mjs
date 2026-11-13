import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {mediaConfig,mediaDigest,validateEventMedia,eventMediaRecords,projectEventMedia,renderLocationFeed} from '../scripts/editorial/event-media.mjs';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';
import {elementRange} from '../scripts/editorial/public-agenda.mjs';
import {createHash} from 'node:crypto';
import {eventMediaSource,restoreEventMediaSource} from '../scripts/event-media-source-contract.mjs';
import {visibilityWindow} from '../scripts/editorial/november-2026-programming.mjs';
import {restorePosadasSource} from '../scripts/posadas-source-contract.mjs';

const root=resolve(import.meta.dirname,'..'), now='2026-11-11T03:30:00Z',commit='a'.repeat(40);
const candidate=time=>{
  const files=projectPublicSite(root,{now:time,commit,eventMedia:false}).files;
  projectEventMedia(root,files,time,{review:true});return files;
};

test('the media allowlist adds only reviewed files and reverses exactly before historical guards',()=>{
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const file=eventMediaSource.file,source=restorePosadasSource(file,readFileSync(resolve(root,file),'utf8'));
  assert.equal(hash(source),eventMediaSource.afterSha256);
  const restored=restoreEventMediaSource(file,source);
  assert.equal(hash(restored),eventMediaSource.beforeSha256);
  assert.equal(restoreEventMediaSource(file,restored),restored);
  assert.notEqual(hash(restoreEventMediaSource(file,source+'unknown edit')),eventMediaSource.beforeSha256);
  assert.throws(()=>restoreEventMediaSource(file,source+eventMediaSource.patches[0].after),/Event media source patch/);
  const before=JSON.parse(restored),after=JSON.parse(source);
  assert.deepEqual(after.pages,before.pages);
  assert.deepEqual(after.assets.filter(f=>!before.assets.includes(f)).sort(),Object.keys(mediaConfig.files).sort());
  assert.deepEqual(eventMediaSource.assets,Object.fromEntries(Object.entries(mediaConfig.files).map(([f,v])=>[f,v.sha256])));
});
test('event media requires explicit approval of its exact content and never changes historical releases',()=>{
  assert.equal(mediaConfig.publicationEnabled,true);
  assert.equal(mediaConfig.approvedDigest,mediaDigest(mediaConfig));
  const draft={...mediaConfig,publicationEnabled:false};
  assert.deepEqual(projectEventMedia(root,new Map(),now,{data:draft}),{metadata:null});
  const edited=structuredClone(mediaConfig);edited.additions[0].date='2026-11-28';
  assert.throws(()=>projectEventMedia(root,new Map(),now,{data:edited}),/changed outside approval/);
  assert.deepEqual(projectEventMedia('/unavailable-historical-root',new Map(),'2026-10-14T02:00:00Z'),{metadata:null});
  const live=projectPublicSite(root,{now,commit});
  assert.equal(live.eventMedia.digest,mediaConfig.approvedDigest);
  const reviewed=candidate(now);
  const normalize=html=>html.replace(/ data-agenda-render-digest="[a-f0-9]+"/,'');
  for(const [file,html] of reviewed)assert.equal(normalize(live.files.get(file)),normalize(html),file);
  const published=projectPublicSite(root,{now:'2026-11-11T03:00:00Z',commit});
  assert.equal(published.eventMedia,undefined);
  for(const html of published.files.values())assert.doesNotMatch(html,/branch-event-media|id="instagram-(?:san-antonio|the-woodlands|el-paso)"/);
});
test('all reviewed bytes are bound and feeds cannot borrow another location’s account',t=>{
  assert.equal(validateEventMedia(root).feeds.length,3);
  const cross=structuredClone(mediaConfig);cross.feeds[0].items[0].sourceProfile='sinyolandaelpaso';
  assert.throws(()=>validateEventMedia(root,cross),/Source account/);
  const badLink=structuredClone(mediaConfig);badLink.feeds[0].items[0].permalink='javascript:alert(1)';
  assert.throws(()=>validateEventMedia(root,badLink));
  const fixture=mkdtempSync(resolve(tmpdir(),'sy-event-media-'));t.after(()=>rmSync(fixture,{recursive:true,force:true}));
  for(const file of Object.keys(mediaConfig.files)){mkdirSync(dirname(resolve(fixture,file)),{recursive:true});copyFileSync(resolve(root,file),resolve(fixture,file));}
  writeFileSync(resolve(fixture,'assets/js/branch-event-media.js'),'unreviewed');
  assert.throws(()=>validateEventMedia(fixture),/Media length changed|Media changed/);
});
test('new posts resolve Federica only in Woodlands and add the separately dated Ahogo functions',()=>{
  const data=eventMediaRecords();assert.equal(data.records.length,28);
  const guest=data.records.find(r=>r.id==='the-woodlands-concurso-canto-20261112');
  assert.match(guest.title.es,/Palomazo con Federica/);assert.equal(guest.date,'2026-11-12');
  assert.equal(guest.series,null);assert.equal(guest.postUrl,'https://www.instagram.com/p/Dfj_I3tt_ls/');
  assert.ok(!data.withheld.some(r=>r.id==='the-woodlands-federica-20261112'));
  const ep=data.records.find(r=>r.id==='el-paso-ahogo-desahogo-20261113');
  assert.equal(visibilityWindow(ep).expiresAt,'2026-11-14T09:00:00.000Z');
  const epSaturday=data.records.find(r=>r.id==='el-paso-ahogo-desahogo-20261114');
  assert.equal(ep.series,epSaturday.series);assert.equal(visibilityWindow(epSaturday).expiresAt,'2026-11-15T09:00:00.000Z');
  assert.equal(data.records.find(r=>r.id==='houston-ahogo-desahogo-20261114').date,'2026-11-14');
});
test('new sections match the requested minimal feed and lazy silent playback contract',()=>{
  const files=candidate(now);
  for(const id of ['san-antonio','the-woodlands','el-paso'])for(const lang of ['es','en']){
    const file=lang==='es'?id+'.html':'en/'+id+'/index.html',html=files.get(file);
    const feed=elementRange(html,'section','instagram-'+id)?.html;assert.ok(feed,file);
    assert.equal((feed.match(/class="sy-social-post"/g)||[]).length,id==='san-antonio'?2:3);
    assert.equal((feed.match(/<video\b/g)||[]).length,id==='san-antonio'?1:2);
    assert.doesNotMatch(feed,/sy-social-(?:copy|format|open)|<button\b|<time\b|autoplay|\scontrols(?:\s|>)/);
    for(const video of feed.match(/<video\b[^>]+>/g)){
      assert.match(video,/muted loop playsinline preload="none"/);assert.match(video,/data-src="\/assets\/event-media-/);
      assert.doesNotMatch(video,/(?<!data-)src=/);
    }
    assert.match(feed,/aria-keyshortcuts="Space"/);assert.match(feed,/srcset=/);
  }
});
test('the existing Houston Instagram block and all content outside agenda/new feeds remain exact',()=>{
  const before=projectPublicSite(root,{now,commit,eventMedia:false}).files,after=candidate(now);
  const oldHouston=elementRange(before.get('houston.html'),'section','instagram-houston').html;
  assert.equal(elementRange(after.get('houston.html'),'section','instagram-houston').html,oldHouston);
  const strip=(html,id)=>{
    for(const name of ['programacion-'+id,'instagram-'+id]){
      if(name==='instagram-houston')continue;
      const range=elementRange(html,'section',name);if(range)html=html.slice(0,range.start)+html.slice(range.end);
    }
    return html.replace(/<(?:link|script)\b[^>]*(?:href|src)="\/assets\/(?:css|js)\/branch-(?:event-media|social-feed|social-motion)\.[^>]*>(?:<\/script>)?/g,'');
  };
  for(const id of Object.keys(mediaConfig.profiles))for(const lang of ['es','en']){
    const file=lang==='es'?id+'.html':'en/'+id+'/index.html';
    assert.equal(strip(after.get(file),id),strip(before.get(file),id),file);
  }
  for(const file of ['index.html','locations.html','guadalajara.html','ciudad-juarez.html'])assert.equal(after.get(file),before.get(file),file);
});
test('Houston and the external San Antonio concert keep their dates, venues and distinct media',()=>{
  const files=candidate(now),hou=files.get('houston.html'),sa=files.get('san-antonio.html');
  assert.match(hou,/houston-jorge-20261113-DfkAfDSxETr\.jpg/);
  assert.match(hou,/Con Mariana Ochoa y Federica Quijano como invitadas especiales/);
  assert.equal((hou.match(/data-record="houston-jorge-mariana-20261113"/g)||[]).length,1);
  const outside=sa.slice(sa.indexOf('id="agenda-san-antonio-outside"'));
  assert.match(outside,/Dfk1XaZNfGf\.mp4/);assert.match(outside,/K\.O\.P\. Sports/);assert.match(outside,/314 Nolan Street/);
  assert.match(sa,/san-antonio-exs-night-20261113/);assert.doesNotMatch(sa,/jungle-fever|exs-night-20261114/);
});
test('dated guest and concert media retire; weekly lineup also expires inside the social block',()=>{
  const nextDay=candidate('2026-11-13T06:00:00Z');
  assert.doesNotMatch(nextDay.get('the-woodlands.html'),/woodlands-federica-20261112-Dfj-I3tt-ls\.jpg/);
  const afterConcert=candidate('2026-11-15T05:30:00Z');assert.doesNotMatch(afterConcert.get('san-antonio.html'),/Dfk1XaZNfGf/);
  const secondNight=candidate('2026-11-14T09:00:00Z').get('el-paso.html');
  assert.doesNotMatch(secondNight,/data-record="el-paso-ahogo-desahogo-20261113"/);
  assert.match(secondNight,/data-record="el-paso-ahogo-desahogo-20261114"/);
  assert.match(secondNight,/el-paso-weekly-20261112-DflCr0SuqwH\.jpg/);
  const feed=mediaConfig.feeds.find(f=>f.branchId==='the-woodlands');
  assert.match(renderLocationFeed(feed,'es','2026-11-16T07:59:59Z'),/DflCxOyt5Gk/);
  const retired=renderLocationFeed(feed,'es','2026-11-16T08:00:00Z');
  assert.doesNotMatch(retired,/DflCxOyt5Gk/);assert.match(retired,/data-visible-posts="2"/);
  const past=candidate('2026-12-04T09:00:00Z');
  for(const id of Object.keys(mediaConfig.profiles))assert.doesNotMatch(past.get(id+'.html'),/sy-november-event|sy-november-series/);
});
test('all native clips use audited h264 exports without audio, and unposted later dates keep text cards',()=>{
  const clips=[...mediaConfig.feeds.flatMap(f=>f.items.filter(i=>i.kind==='reel')),...mediaConfig.legacy.filter(i=>i.kind==='reel')];
  assert.equal(clips.length,6);
  for(const item of clips){assert.equal(item.video.codec,'h264');assert.equal(item.video.audioTracks,0);assert.ok(item.video.duration>0&&item.video.duration<60);}
  for(const feed of mediaConfig.feeds)for(const item of feed.items)assert.doesNotMatch(item.title.es,/Halloween|7 de noviembre/);
  const hou=candidate(now).get('houston.html');
  assert.match(hou,/data-record="houston-retro-20261120"/);assert.match(hou,/Noche ochentera/);
});
