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
