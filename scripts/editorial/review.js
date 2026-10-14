// Local review navigation only. No trackers, storage, requests or production writes.
(function(){
  const buttons=[...document.querySelectorAll('[data-branch]')];
  function show(id){
    if(!buttons.some(button=>button.dataset.branch===id))return;
    for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.branch===id));
    for(const view of document.querySelectorAll('.branch-view'))view.hidden=view.id!=='branch-'+id;
  }
  for(const button of buttons)button.addEventListener('click',()=>show(button.dataset.branch));
  const requested=new URL(location.href).searchParams.get('branch');
  if(requested)show(requested);
})();
