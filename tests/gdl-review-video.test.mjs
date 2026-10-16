import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../scripts/editorial/gdl-review-video.js', import.meta.url), 'utf8');
function player({ reducedMotion = false, saveData = false, blocked = false } = {}) {
  const videoEvents = {}, documentEvents = {};
  let intersect, preferenceChange;
  const video = {
    paused: true, muted: false, src: '', dataset: { src: '/local-review.mp4' }, calls: 0,
    getAttribute(name) { return this[name]; },
    play() {
      this.calls++;
      if (blocked) return Promise.reject(new Error('Autoplay denied'));
      this.paused = false; videoEvents.play?.(); return Promise.resolve();
    },
    pause() { this.paused = true; videoEvents.pause?.(); },
    addEventListener(name, handler) { videoEvents[name] = handler; },
  };
  const toggle = { hidden: true, textContent: '', addEventListener(name, handler) { this[name] = handler; } };
  const frame = { querySelector(selector) { return selector === 'video' ? video : toggle; } };
  const document = { hidden: false, querySelector() { return frame; }, addEventListener(name, handler) { documentEvents[name] = handler; } };
  const reduced = { matches: reducedMotion, addEventListener(name, handler) { preferenceChange = handler; } };
  const IntersectionObserver = class { constructor(callback) { intersect = callback; } observe() {} };
  vm.runInNewContext(source, { document, matchMedia: () => reduced, navigator: { connection: { saveData } }, IntersectionObserver, window: { IntersectionObserver } });
  return { video, toggle, videoEvents,
    viewport(visible) { intersect([{ isIntersecting: visible }]); },
    hidden(value) { document.hidden = value; documentEvents.visibilitychange(); },
    reduce(value) { reduced.matches = value; preferenceChange(); },
  };
}

test('local video stays unloaded off screen and starts silently on entry', () => {
  const p = player();
  assert.equal(p.video.src, ''); assert.equal(p.video.calls, 0);
  p.viewport(true);
  assert.equal(p.video.src, '/local-review.mp4'); assert.equal(p.video.muted, true);
  assert.equal(p.video.paused, false); assert.equal(p.toggle.textContent, 'Pausar video');
  p.viewport(false); assert.equal(p.video.paused, true);
  p.viewport(true); assert.equal(p.video.paused, false);
});

test('manual pause survives visibility changes; explicit play resumes', () => {
  const p = player(); p.viewport(true); p.toggle.click();
  assert.equal(p.video.paused, true);
  p.viewport(false); p.viewport(true); p.hidden(true); p.hidden(false);
  assert.equal(p.video.paused, true);
  p.toggle.click(); assert.equal(p.video.paused, false);
  p.hidden(true); assert.equal(p.video.paused, true);
  p.hidden(false); assert.equal(p.video.paused, false);
});

test('reduced motion and data saving keep the poster until explicit playback', () => {
  for (const options of [{ reducedMotion: true }, { saveData: true }]) {
    const p = player(options); p.viewport(true);
    assert.equal(p.video.src, ''); assert.equal(p.video.calls, 0);
    assert.equal(p.toggle.textContent, 'Reproducir video');
    p.toggle.click(); assert.equal(p.video.paused, false);
  }
  const p = player(); p.viewport(true); p.reduce(true);
  assert.equal(p.video.paused, true);
});

test('browser autoplay refusal leaves a usable manual control without retry loops', async () => {
  const p = player({ blocked: true }); p.viewport(true);
  await Promise.resolve();
  assert.equal(p.video.calls, 1); assert.equal(p.video.paused, true);
  assert.equal(p.toggle.hidden, false); assert.equal(p.toggle.textContent, 'Reproducir video');
  p.videoEvents.error(); assert.equal(p.toggle.hidden, true);
});

test('the GDL intake groups the two reels once and keeps unbounded Solteras held', () => {
  const data = JSON.parse(readFileSync(new URL('../scripts/editorial/gdl-event-review.json', import.meta.url)));
  assert.equal(data.publicationEnabled, false);
  const contest = data.records.filter(r => r.kind === 'competition-series');
  assert.equal(contest.length, 1); assert.equal(contest[0].sourceRefs.length, 2);
  assert.equal(contest[0].approval, null);
  assert.equal(data.existingRecords.find(r => r.id === 'san-ignacio-solteras-weekly').decision, 'held');
  const birthday = data.sources.find(r => r.id === 'gdl-birthday-20261016');
  assert.deepEqual(birthday.facts.weekdays, [5, 6]);
  assert.equal(birthday.facts.endsOn, '2026-10-31');
});
