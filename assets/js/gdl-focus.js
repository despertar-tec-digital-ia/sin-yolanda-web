// The featured invitation retires with the approved fifth edition, including open tabs.
(() => {
  'use strict';
  const end = Date.parse('2026-12-03T06:00:00.000Z');
  const lastElimination = Date.parse('2026-11-19T06:00:00.000Z');
  function update() {
    const now = Date.now(), active = now < end;
    document.querySelectorAll('[data-gdl-participation]').forEach(element => {
      element.hidden = (element.dataset.gdlParticipation === 'active') !== (now < lastElimination);
    });
    document.querySelectorAll('[data-gdl-event-feature]').forEach(element => {
      element.hidden = (element.dataset.gdlEventFeature === 'active') !== active;
    });
    document.querySelectorAll('[data-gdl-contest-link]').forEach(element => {
      element.setAttribute('href',active?element.dataset.contestActiveHref:element.dataset.contestFallbackHref);
      if(active)element.dataset.record=element.dataset.contestRecord;
      else delete element.dataset.record;
    });
  }
  update();
  window.setInterval(update, 30000);
  document.addEventListener('visibilitychange', update);
})();
