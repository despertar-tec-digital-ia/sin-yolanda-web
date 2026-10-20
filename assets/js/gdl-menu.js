// Native dialog with a normal image-link fallback when JavaScript is unavailable.
(() => {
  'use strict';
  const dialog=document.querySelector('#gm-zoom');
  if(!dialog||typeof dialog.showModal!=='function')return;
  const image=dialog.querySelector('img'),title=dialog.querySelector('#gm-zoom-title');
  const closer=dialog.querySelector('[data-gm-close]'),plus=dialog.querySelector('[data-gm-plus]'),minus=dialog.querySelector('[data-gm-minus]');
  let opener,base=1,scale=1;
  function resize(){image.style.width=Math.min(1800,base*scale)+'px';plus.disabled=base*scale>=1800;minus.disabled=scale<=1;}
  document.querySelectorAll('.gm-page>a').forEach(link=>link.addEventListener('click',event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();opener=link;scale=1;base=Math.min(1000,window.innerWidth-48);
    image.src=link.href;image.alt=link.querySelector('img').alt;title.textContent=link.closest('figure').querySelector('figcaption span').textContent;
    resize();dialog.showModal();document.body.classList.add('gm-zoom-open');
  }));
  plus.addEventListener('click',()=>{scale=Math.min(1800/base,scale*1.5);resize();});
  minus.addEventListener('click',()=>{scale=Math.max(1,scale/1.5);resize();});
  closer.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{document.body.classList.remove('gm-zoom-open');image.removeAttribute('src');opener?.focus();});
})();
