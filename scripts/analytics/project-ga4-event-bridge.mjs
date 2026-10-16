// Exact integration with the single measurement owner. No competing click listener.
import assert from 'node:assert/strict';

const edits = [
    ['  const previousHookName =',
      '  window.syGa4MeasurementContext = () => {\n' +
      '    touchAcquisition(); return Object.freeze(commonData());\n' +
      '  };\n' +
      '  const previousHookName ='],
    ['function send(name, data) {\n    if (disabled()) { discardSession(); pending.length = 0; return; }', 'function send(name, data, replay = false) {'],
    ['    if (typeof window.umami?.track !== "function") { if (pending.length < 20)',
      '    if (!replay && typeof window.syGa4MeasurementObserver === "function") {\n' +
      '      try { Promise.resolve(window.syGa4MeasurementObserver(name, Object.freeze({ ...safe }))).catch(() => {}); } catch {}\n' +
      '    }\n' +
      '    if (disabled()) { pending.length = 0; return; }\n' +
      '    if (typeof window.umami?.track !== "function") { if (pending.length < 20)'],
    ['send(item.name, item.data);', 'send(item.name, item.data, true);'],
    ['  if (disabled()) { discardSession(); return; }\n  if (window.__sySiteAnalytics', '  if (window.__sySiteAnalytics'],
    ['  entry = acquisition();\n  try {', '  entry = acquisition();\n  if (disabled()) discardSession();\n  else try {'],
    ['  function touchAcquisition() {\n    const now = Date.now();', '  function touchAcquisition() {\n    if (disabled()) { discardSession(); return; }\n    const now = Date.now();'],
    ['  if (!document.querySelector("#sy-umami-tracker")) {', '  if (!disabled() && !document.querySelector("#sy-umami-tracker")) {'],
];
export function projectGa4EventBridge(source) {
  for (const [before, after] of edits) {
    assert.equal(source.split(before).length - 1, 1, 'Review the current measurement owner before adapting GA4');
    source = source.replace(before, after);
  }
  return source;
}

export function restoreGa4EventBridge(source) {
  for (const [before, after] of [...edits].reverse()) {
    assert.equal(source.split(after).length - 1, 1, 'Review the current measurement owner before restoring GA4');
    source = source.replace(after, before);
  }
  return source;
}
