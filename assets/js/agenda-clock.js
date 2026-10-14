// Factual visibility only. No analytics, storage, customer data or external requests.
(function(){
  const agendas=[...document.querySelectorAll('.sy-agenda')];if(!agendas.length)return;
  let timer;
  function update(){
    clearTimeout(timer);const now=Date.now(),transitions=[];
    for(const agenda of agendas){
      for(const record of agenda.querySelectorAll('[data-record]')){
        const from=Date.parse(record.dataset.publishFrom),end=Date.parse(record.dataset.expiresAt);
        if((Number.isFinite(from)&&now<from)||(Number.isFinite(end)&&now>=end)){record.remove();continue;}
        for(const time of[from,end])if(Number.isFinite(time)&&time>now)transitions.push(time);
      }
      for(const series of agenda.querySelectorAll('.sy-agenda-series'))if(!series.querySelector('[data-record]'))series.remove();
      for(const section of agenda.querySelectorAll('.sy-agenda-inner>section'))if(!section.querySelector('[data-record]'))section.remove();
      if(!agenda.querySelector('[data-record]')){
        document.querySelector('a.hh-nav-agenda[href="#'+agenda.id+'"]')?.remove();agenda.remove();
      }
    }
    if(transitions.length)timer=setTimeout(update,Math.min(2147483647,Math.max(1,Math.min(...transitions)-now)));
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});window.addEventListener('pageshow',update);update();
})();
