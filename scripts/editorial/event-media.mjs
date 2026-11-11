// Opt-in editorial media. Native Instagram URLs are sources, never a runtime feed.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {config as november, applyNovemberHtml, classRange, branchIds} from './november-2026-programming.mjs';
import {escapeHtml as esc} from './branch-agenda.mjs';

export const mediaConfig = JSON.parse(readFileSync(new URL('./event-media-review.json', import.meta.url)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const mediaDigest = data => {
  const {publicationEnabled,authorizer,approvedAt,authorization,approvedDigest,...content}=data;
  return hash(JSON.stringify(content));
};
export const sharedAssets = ['assets/css/branch-social-feed.css','assets/css/branch-social-motion.css','assets/js/branch-social-motion.js'];
const english = language => language === 'en';

export function validateEventMedia(root, data = mediaConfig) {
  assert.equal(data.version,1);
  assert.equal(data.automatedFeed,false);
  assert.deepEqual(Object.keys(data.profiles).sort(),[...branchIds].sort());
  const accounts={houston:'sinyolandahouston','the-woodlands':'sinyolanda.tw','san-antonio':'sinyolanda.sa','el-paso':'sinyolandaelpaso'};
  for(const [branch,profile] of Object.entries(data.profiles))assert.equal(profile.username,accounts[branch]);
  assert.equal(new Set(data.feeds.map(feed=>feed.branchId)).size,data.feeds.length);
  const assertMedia = media => {
    assert.ok(media && data.files[media.file], 'Unknown reviewed media');
    assert.ok(media.width>0 && media.height>0);
  };
  for(const entry of data.legacy) {
    assert.ok(data.profiles[entry.branchId]);
    assert.match(entry.recordId,new RegExp('^'+entry.branchId+'-[a-z0-9-]+$'));
    assert.match(entry.id,/^[A-Za-z0-9_-]+$/);
    assert.equal(entry.permalink,'https://www.instagram.com/'+(entry.kind==='reel'?'reel':'p')+'/'+entry.id+'/');
    assertMedia(entry.poster);
    assert.ok(entry.title.es&&entry.title.en&&entry.alt.es&&entry.alt.en);
    if(entry.kind==='reel') {assertMedia(entry.video);assert.equal(entry.video.audioTracks,0);assert.equal(entry.video.codec,'h264');}
    assert.ok(Number.isFinite(Date.parse(entry.expiresAt)));
    for(const copy of Object.values(entry.copy||{}))assert.ok(copy.before&&copy.after&&!/[<>]/.test(copy.after));
  }
  for (const [file,expected] of Object.entries(data.files)) {
    assert.match(file,/^assets\/(?:agenda\/[A-Za-z0-9_-]+\.jpg|event-media-20261110\/[A-Za-z0-9_-]+\.(?:mp4|webp)|(?:js|css)\/branch-event-media\.(?:js|css))$/);
    const bytes=readFileSync(resolve(root,file));
    assert.equal(bytes.length,expected.bytes,'Media length changed: '+file);
    assert.equal(hash(bytes),expected.sha256,'Media changed after review: '+file);
  }
  for (const feed of data.feeds) {
    const profile=data.profiles[feed.branchId]; assert.ok(profile);
    assert.ok(feed.items.length && feed.items.length<=3);
    const ids=new Set();
    for (const item of feed.items) {
      assert.equal(item.branchId,feed.branchId); assert.ok(!ids.has(item.id)); ids.add(item.id);
      assert.match(item.id,/^[A-Za-z0-9_-]+$/);
      assert.equal(item.sourceProfile,profile.username,'Source account must match the location');
      assert.equal(item.permalink,'https://www.instagram.com/'+(item.kind==='reel'?'reel':'p')+'/'+item.id+'/');
      assert.ok(['recurring-event','dated-event'].includes(item.category));
      assert.ok(item.title.es && item.title.en && item.alt.es && item.alt.en);
      assert.ok(['image','reel'].includes(item.kind));
      assertMedia(item.poster);
      if (item.kind==='reel') {
        assertMedia(item.video); assert.equal(item.video.audioTracks,0); assert.equal(item.video.codec,'h264');
        assert.ok(item.video.duration>0 && item.video.duration<60);
      }
      if(item.expiresAt) assert.ok(Number.isFinite(Date.parse(item.expiresAt)));
    }
  }
  return data;
}

export function eventMediaRecords(data = mediaConfig) {
  const changes=new Map(data.overrides.map(item=>[item.id,item]));
  return {...november, records:[...november.records.map(record=>({...record,...(changes.get(record.id)||{})})),...data.additions],
    withheld:november.withheld.filter(item=>!data.resolvedReviewIds.includes(item.id))};
}
const visibleItems=(feed,now)=>feed.items.filter(item=>!item.expiresAt||Date.parse(now)<Date.parse(item.expiresAt));
const openLabel=(title,language)=>title+' · Instagram · '+(english(language)?'opens in a new tab':'abre otra pestaña');

function image(media,alt,sizes='(max-width: 640px) calc((100vw - 44px)/2), (max-width: 900px) calc((100vw - 88px)/3), 400px') {
  const responsive=media.file.endsWith('-800.webp')?` srcset="/${media.file.replace('-800.webp','-400.webp')} 400w, /${media.file} ${media.width}w" sizes="${sizes}"`:'';
  return `<img src="/${media.file}"${responsive} width="${media.width}" height="${media.height}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
}
function motion(item,language) {
  const hintId='event-motion-'+item.id+'-'+language;
  const hint=english(language)?'Space: pause or play. Enter: open on Instagram.':'Espacio: pausar o reproducir. Enter: abrir en Instagram.';
  const video=`<video class="sy-social-video" muted loop playsinline preload="none" data-src="/${item.video.file}" poster="/${item.poster.file}" aria-hidden="true"></video>`;
  return `<div class="sy-social-photo"><a class="sy-social-media-link" href="${item.permalink}" target="_blank" rel="noopener noreferrer" aria-label="${esc(openLabel(item.title[language],language))}" aria-describedby="${hintId}" aria-keyshortcuts="Space">${image(item.poster,item.alt[language],item.recordId?'(max-width: 700px) calc(100vw - 40px), 45vw':undefined)}${video}</a><span class="sy-motion-keyboard-hint" id="${hintId}">${hint}</span></div>`;
}

export function renderLocationFeed(feed,language,now,data=mediaConfig) {
  const items=visibleItems(feed,now); if(!items.length)return '';
  const profile=data.profiles[feed.branchId], id='instagram-'+feed.branchId;
  const cards=items.map(item=>{
    const dated=item.expiresAt?` data-media-expires-at="${item.expiresAt}"`:'';
    const content=item.kind==='reel'?motion(item,language):`<a href="${item.permalink}" target="_blank" rel="noopener noreferrer" aria-label="${esc(openLabel(item.title[language],language))}"><div class="sy-social-photo">${image(item.poster,item.alt[language])}</div></a>`;
    return `<article class="sy-social-post"${item.kind==='reel'?' data-sy-event-motion':''}${dated}>${content}</article>`;
  }).join('');
  return `<section class="sy-social-feed sy-event-feed" id="${id}" aria-labelledby="${id}-title" data-social-motion="event-media-20261110" data-visible-posts="${items.length}"><div class="sy-social-inner"><div class="sy-social-heading"><div><h2 id="${id}-title">${english(language)?'This is Sin Yolanda.':'Así se vive Sin Yolanda.'}</h2><p>${esc(profile.name)}. ${english(language)?'Songs, friends and a good toast.':'Entre canciones, amigos y brindis.'}</p></div><a class="sy-social-profile" href="https://www.instagram.com/${profile.username}/" target="_blank" rel="noopener noreferrer" aria-label="${esc((english(language)?'Instagram · ':'Instagram de ')+profile.name)}">@${profile.username}</a></div><div class="sy-social-grid">${cards}</div></div></section>`;
}

function replaceLegacy(html,entry,language,now) {
  const record=new RegExp('<article\\b[^>]*data-record="'+entry.recordId+'"[^>]*>[\\s\\S]*?</article>','g');
  let count=0;
  html=html.replace(record,card=>{
    count++;
    const art=classRange(card,'figure','sy-agenda-art'); assert.ok(art,'Existing artwork boundary missing');
    let figure;
    if(entry.kind==='reel') figure=`<figure class="sy-agenda-art sy-event-media" data-sy-event-motion>${motion(entry,language)}</figure>`;
    else figure=`<figure class="sy-agenda-art sy-event-poster"><a href="${entry.permalink}" target="_blank" rel="noopener noreferrer" aria-label="${esc(openLabel(entry.title[language],language))}">${image(entry.poster,entry.alt[language])}</a></figure>`;
    card=card.slice(0,art.start)+figure+card.slice(art.end);
    if(entry.copy?.[language]) {
      const copy=entry.copy[language]; assert.equal(card.split(copy.before).length,2,'Existing event copy changed');
      card=card.replace(copy.before,()=>copy.after);
    }
    return card;
  });
  assert.ok(count===1 || (!count&&Date.parse(now)>=Date.parse(entry.expiresAt)),'Expected existing event exactly once: '+entry.recordId);
  return html;
}

export function projectEventMedia(root,files,now,{review=false,data=mediaConfig}={}) {
  if(!data.publicationEnabled&&!review)return {metadata:null};
  if(!review) {
    assert.equal(data.authorizer,'Luis'); assert.ok(data.authorization && data.approvedAt);
    assert.equal(data.approvedDigest,mediaDigest(data),'Event media changed outside approval');
    if(Date.parse(now)<Date.parse(data.approvedAt))return {metadata:null};
  }
  validateEventMedia(root,data);
  const records=eventMediaRecords(data),ids=[],transitions=[];
  for(const branch of Object.keys(data.profiles))for(const language of ['es','en']) {
    const file=language==='es'?branch+'.html':'en/'+branch+'/index.html';
    const projected=applyNovemberHtml(files.get(file)||readFileSync(resolve(root,file),'utf8'),branch,language,now,records);
    let html=projected.html;
    if(language==='es')ids.push(...projected.visible.map(item=>item.id));
    if(projected.nextTransitionAt)transitions.push(projected.nextTransitionAt);
    for(const entry of data.legacy.filter(item=>item.branchId===branch))html=replaceLegacy(html,entry,language,now);
    const feed=data.feeds.find(item=>item.branchId===branch);
    if(feed) {
      const rendered=renderLocationFeed(feed,language,now,data);
      assert.ok(!html.includes('id="instagram-'+branch+'"'),'Duplicate Instagram section');
      const marker='<div><section class="bct"'; assert.equal(html.split(marker).length,2,'Expected Catering boundary');
      html=html.replace(marker,rendered+marker);
    }
    for(const [path,version] of [['assets/css/branch-social-feed.css','20261104-instagram-houston'],['assets/css/branch-social-motion.css','20261104-instagram-minimal'],['assets/css/branch-event-media.css','20261110-event-media']]) {
      if(!html.includes('href="/'+path))html=html.replace('</head>',`<link rel="stylesheet" href="/${path}?v=${version}"></head>`);
    }
    html=html.replace('</head>','<script type="module" src="/assets/js/branch-event-media.js?v=20261110-event-media"></script></head>');
    files.set(file,html);
  }
  for(const feed of data.feeds)for(const item of feed.items)if(item.expiresAt&&Date.parse(item.expiresAt)>Date.parse(now))transitions.push(item.expiresAt);
  return {metadata:{digest:mediaDigest(data),visibleIds:[...new Set(ids)],nextTransitionAt:transitions.sort()[0]||null,automatedFeed:false}};
}
