// Reuse Houston's tested controller, with the same module URL so it initializes once.
import {createMotionController} from './branch-social-motion.js?v=20261104-instagram-minimal';

export function initializeEventMedia(root=document) {
  const doc=root.ownerDocument||root,win=doc.defaultView;
  const cards=[...root.querySelectorAll('[data-sy-event-motion]')];
  const feeds=[...root.querySelectorAll('.sy-event-feed')];
  if(!cards.length&&!feeds.length)return;
  const preference=win.matchMedia('(prefers-reduced-motion: reduce)'), connection=win.navigator.connection;
  const policy=()=>({hidden:doc.hidden,reduced:preference.matches,saveData:!!connection?.saveData});
  const controllers=new Map();
  for(const card of cards) {
    const video=card.querySelector('video'),link=card.querySelector('.sy-social-media-link');
    const controller=createMotionController({kind:'reel',count:1,
      play:async()=>{
        if(!video.getAttribute('src')) {video.muted=true;video.defaultMuted=true;video.src=video.dataset.src;}
        if(video.error)video.load(); await video.play();
      },pause:()=>video.pause()});
    video.addEventListener('playing',()=>card.classList.add('sy-motion-playing'));
    video.addEventListener('error',()=>{card.classList.remove('sy-motion-playing');controller.update({blocked:true});});
    link.addEventListener('keydown',event=>{
      if(!event.repeat&&(event.key===' '||event.code==='Space')) {event.preventDefault();controller.toggle();}
    });
    controller.update(policy());controllers.set(card,controller);
  }
  const updatePolicy=()=>{for(const controller of controllers.values())controller.update(policy());};
  doc.addEventListener('visibilitychange',updatePolicy);
  preference.addEventListener('change',()=>{for(const controller of controllers.values())controller.update({...policy(),optedIn:false});});
  connection?.addEventListener('change',updatePolicy);
  if('IntersectionObserver' in win) {
    const observer=new win.IntersectionObserver(entries=>{for(const entry of entries)controllers.get(entry.target)?.update({visible:entry.isIntersecting&&entry.intersectionRatio>=.35});},{threshold:[0,.35]});
    for(const card of cards)observer.observe(card);
  } else for(const controller of controllers.values())controller.update({visible:true});
  let timer;
  const refresh=()=>{
    win.clearTimeout(timer); const now=Date.now(),next=[];
    for(const card of root.querySelectorAll('[data-media-expires-at]')) {
      const end=Date.parse(card.dataset.mediaExpiresAt); card.hidden=Number.isFinite(end)&&now>=end;
      if(card.hidden)controllers.get(card)?.update({hidden:true});else if(Number.isFinite(end))next.push(end);
    }
    for(const feed of feeds) {
      const count=[...feed.querySelectorAll('.sy-social-post')].filter(card=>!card.hidden).length;
      feed.dataset.visiblePosts=String(count);feed.hidden=count===0;
    }
    if(next.length)timer=win.setTimeout(refresh,Math.min(2147483647,Math.max(1,Math.min(...next)-now)));
  };
  doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)refresh();});
  win.addEventListener('pageshow',()=>{updatePolicy();refresh();});
  win.addEventListener('pagehide',()=>{for(const controller of controllers.values())controller.update({hidden:true});});
  refresh();
}
if(typeof document!=='undefined')initializeEventMedia();
