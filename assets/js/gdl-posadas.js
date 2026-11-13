// Orientation only: no tracking, storage, contact action or external request.
const header=document.querySelector('.pd-header');
const links=[...document.querySelectorAll('.pd-header a[href^="#"]')];
const targets=links.map(link=>({link,section:document.querySelector(link.getAttribute('href'))})).filter(item=>item.section);
let frame=0;
function updateSection(){
  frame=0;
  const line=(header?.getBoundingClientRect().height??80)+120;
  const current=[...targets].reverse().find(item=>item.section.getBoundingClientRect().top<=line);
  for(const item of targets){
    if(item===current)item.link.setAttribute('aria-current','location');
    else item.link.removeAttribute('aria-current');
  }
}
function queueUpdate(){if(!frame)frame=requestAnimationFrame(updateSection);}
addEventListener('scroll',queueUpdate,{passive:true});
addEventListener('resize',queueUpdate,{passive:true});
addEventListener('pageshow',queueUpdate);
updateSection();

// Hide a cached campaign at the same Guadalajara midnight as the server projection.
const expiry=Date.parse(document.querySelector('[data-posadas-expires-at]')?.dataset.posadasExpiresAt||'');
function expirePosadas(){
  if(!Number.isFinite(expiry)||Date.now()<expiry)return;
  document.querySelector('[data-posadas-campaign]')?.remove();
  document.querySelectorAll('[data-posadas-link]').forEach(link=>link.remove());
  const archive=document.querySelector('#posadas-archive');
  if(archive){
    document.querySelector('main')?.replaceWith(archive.content.cloneNode(true));
    archive.remove();
    const nav=document.querySelector('.pd-header nav');
    if(nav)nav.innerHTML='<a href="/guadalajara">Ver Guadalajara</a>';
  }
}
expirePosadas();
addEventListener('pageshow',expirePosadas);
addEventListener('focus',expirePosadas);
if(Number.isFinite(expiry)&&Date.now()<expiry){
  const delay=expiry-Date.now();
  // Longer waits are rechecked daily; no overflowing 32-bit timer.
  setTimeout(function checkExpiry(){expirePosadas();if(Date.now()<expiry)setTimeout(checkExpiry,Math.min(expiry-Date.now(),86400000));},Math.min(delay,86400000));
}
