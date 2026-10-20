// The featured invitation retires with the approved fifth edition, including open tabs.
(() => {
  'use strict';
  const end = Date.parse('2026-12-03T06:00:00.000Z');
  function update() {
    const active = Date.now() < end;
    document.querySelectorAll('[data-gdl-event-feature]').forEach(element => {
      element.hidden = (element.dataset.gdlEventFeature === 'active') !== active;
    });
  }
  update();
  window.setInterval(update, 30000);
  document.addEventListener('visibilitychange', update);
})();
