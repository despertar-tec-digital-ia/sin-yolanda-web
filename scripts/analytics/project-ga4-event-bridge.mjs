// Exact integration with the single measurement owner. No competing click listener.
import assert from 'node:assert/strict';

const edits = [
    ['  const previousHookName =',
      '  window.syGa4MeasurementContext = () => {\n' +
      '    if (disabled()) return null;\n' +
      '    touchAcquisition(); return Object.freeze(commonData());\n' +
      '  };\n' +
      '  const previousHookName ='],
    ['function send(name, data) {', 'function send(name, data, replay = false) {'],
    ['    if (typeof window.umami?.track !== "function") { if (pending.length < 20)',
      '    if (!replay && typeof window.syGa4MeasurementObserver === "function") {\n' +
      '      try { Promise.resolve(window.syGa4MeasurementObserver(name, Object.freeze({ ...safe }))).catch(() => {}); } catch {}\n' +
      '    }\n' +
      '    if (typeof window.umami?.track !== "function") { if (pending.length < 20)'],
    ['send(item.name, item.data);', 'send(item.name, item.data, true);'],
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
