// Keep the invitation accurate if a review tab remains open past the last elimination.
(() => {
 const until=Date.parse('2026-11-19T06:00:00.000Z');
 function update(){
  const active=Date.now()<until;
  document.querySelectorAll('[data-gdl-participation]').forEach(element=>{
   element.hidden=(element.dataset.gdlParticipation==='active')!==active;
  });
 }
 update();window.setInterval(update,30000);document.addEventListener('visibilitychange',update);
})();
