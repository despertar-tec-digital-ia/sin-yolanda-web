import {createGbpHoursModel, REVIEWED_USA_BRANCHES} from './gbp-hours-model.js?v=20261119-gbp-reviewed';

export function installReviewedHours({window: win, document: doc, data, now = () => new Date().toISOString()} = {}) {
  const model = createGbpHoursModel(data);
  let timer, pending, stopped = false;
  const active = id => REVIEWED_USA_BRANCHES.includes(id);
  const compatibility = Object.freeze({
    zones: Object.freeze(Object.fromEntries(REVIEWED_USA_BRANCHES.map(id => [id, model.location(id).timeZone]))),
    active, updated: active, effectiveDate: model.data.observedAt.slice(0, 10), updatedDate: model.data.observedAt.slice(0, 10),
    summaryFor: model.summaryFor, specification: model.specification, applyToData: model.applyToData, notice: () => '',
    html: (language, zone, id, instant) => {
      if (zone !== model.location(id).timeZone) throw new Error('Reviewed hours zone mismatch');
      return model.html(id, language, instant);
    },
  });
  // Replace this candidate's compatibility object; never mutate the imported
  // historical October model or run its stale interval/controller alongside ours.
  win.SY_OCTOBER_HOURS = compatibility;
  win.SY_REVIEWED_HOURS = model;
  function refresh() {
    if (stopped) return;
    win.clearTimeout(timer);
    const instant = now(), language = doc.documentElement.lang === 'en' ? 'en' : 'es';
    const id = doc.body?.dataset.branch;
    if (active(id)) {
      const hours = doc.querySelector('.ve-hours');
      if (hours && hours.getAttribute('data-gbp-hours-key') !== model.renderKey(id, language, instant)) {
        const wrapper = doc.createElement('div'); wrapper.innerHTML = model.html(id, language, instant);
        hours.replaceWith(wrapper.firstElementChild);
      }
      doc.querySelectorAll('script[type="application/ld+json"]').forEach(node => {
        const value = JSON.parse(node.textContent), previous = JSON.stringify(value);
        model.updateRestaurant(value, id, instant);
        if (JSON.stringify(value) !== previous) node.textContent = JSON.stringify(value);
      });
    }
    if (win.SY_DATA) model.applyToData(win.SY_DATA);
    doc.querySelectorAll('[data-gbp-hours-summary]').forEach(node => {
      const branchId = node.getAttribute('data-gbp-hours-summary');
      if (!active(branchId)) return;
      const summary = model.summaryFor(branchId, language);
      if (node.textContent !== summary) node.textContent = summary;
    });
    const next = model.nextTransitionAt(instant);
    if (next) timer = win.setTimeout(refresh, Math.min(2147483647, Math.max(1, Date.parse(next) - Date.parse(instant))));
  }
  function queueRefresh() {
    if (stopped || pending !== undefined) return;
    pending = win.setTimeout(() => {pending = undefined; refresh();}, 0);
  }
  const listeners = [[doc, 'DOMContentLoaded', refresh], [doc, 'visibilitychange', refresh], [win, 'pageshow', refresh], [win, 'languagechange', refresh]];
  for (const [target, event, callback] of listeners) target.addEventListener(event, callback);
  const observer = win.MutationObserver ? new win.MutationObserver(queueRefresh) : null;
  observer?.observe(doc.documentElement, {attributes: true, attributeFilter: ['lang']});
  observer?.observe(doc.body, {childList: true, subtree: true});
  refresh();
  return {model, refresh, disconnect() {
    stopped = true; win.clearTimeout(timer); win.clearTimeout(pending); observer?.disconnect();
    for (const [target, event, callback] of listeners) target.removeEventListener?.(event, callback);
  }};
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const element = document.getElementById('sy-reviewed-hours-data');
  if (element) installReviewedHours({window, document, data: JSON.parse(element.textContent)});
}
