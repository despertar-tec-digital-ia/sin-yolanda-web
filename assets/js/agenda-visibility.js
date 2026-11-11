// Keeps dated visibility current in an already-open page. No network or storage.
(function () {
  const agendas = [...document.querySelectorAll('.sy-agenda')];
  if (!agendas.length) return;
  let timer;
  function refresh() {
    clearTimeout(timer);
    const now = Date.now(), transitions = [];
    for (const agenda of agendas) {
      for (const record of agenda.querySelectorAll('[data-record]')) {
        const from = Date.parse(record.dataset.publishFrom), end = Date.parse(record.dataset.expiresAt);
        record.hidden = (Number.isFinite(from) && now < from) || (Number.isFinite(end) && now >= end);
        for (const value of [from, end]) if (Number.isFinite(value) && value > now) transitions.push(value);
      }
      for (const group of agenda.querySelectorAll('[data-agenda-series],.sy-agenda-series')) {
        const records = [...group.querySelectorAll('[data-record]')];
        if (records.length) group.hidden = records.every(record => record.hidden);
      }
      for (const group of agenda.querySelectorAll('[data-agenda-group],.sy-agenda-dates,.sy-agenda-outside')) {
        const cards = [...group.querySelectorAll('article')];
        if (cards.length) group.hidden = cards.every(card => card.hidden);
      }
    }
    if (transitions.length) timer = setTimeout(refresh, Math.min(2147483647, Math.max(1, Math.min(...transitions) - now)));
  }
  document.addEventListener('visibilitychange', () => {if (!document.hidden) refresh();});
  window.addEventListener('pageshow', refresh);
  refresh();
})();
