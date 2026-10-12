import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/js/site.js', import.meta.url), 'utf8');
const start = source.indexOf('  function initHeroCinema()');
const cinema = source.slice(start, source.indexOf('\n  function ', start + 1));

function harness({ reducedMotion = false, saveData = false, slideCount = 3 } = {}) {
  const events = target => {
    target.listeners = {};
    target.addEventListener = (name, callback) => { target.listeners[name] = callback; };
    target.fire = name => target.listeners[name]?.();
    return target;
  };
  const reduced = events({ matches: reducedMotion });
  const connection = events({ saveData });
  const document = events({ hidden: false });
  const timers = new Map();
  let timerId = 0, intersection;
  const slides = Array.from({ length: slideCount }, (_, index) => {
    const classes = new Set(index === 0 ? ['is-active'] : []);
    return { dataset: index ? { src: `scene-${index}.webp`, srcset: `scene-${index}-640.webp 640w` } : {},
      classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
      classes, decode: async () => {} };
  });
  const hero = { querySelectorAll: () => slides };
  document.querySelector = selector => selector === '.home-hero-cinema' ? hero : null;
  vm.runInNewContext(cinema + '\ninitHeroCinema()', {
    document, window: { matchMedia: () => reduced }, navigator: { connection },
    clearTimeout: id => timers.delete(id),
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; },
    IntersectionObserver: class {
      constructor(callback) { intersection = callback; }
      observe(target) { assert.equal(target, hero); }
    }
  });
  return { slides, reduced, connection, document, timers,
    active: () => slides.findIndex(slide => slide.classes.has('is-active')),
    visible: value => intersection([{ isIntersecting: value }]),
    tick: async () => {
      const [id, timer] = [...timers][0] ?? [];
      assert.ok(timer, 'Autoplay must be scheduled without a control element');
      assert.equal(timer.delay, 6500);
      timers.delete(id);
      await timer.callback();
    }
  };
}

test('hero rotates every scene without any playback control and lazily loads the next image', async () => {
  const h = harness();
  assert.equal(h.active(), 0);
  assert.ok(h.slides[1].dataset.src);
  await h.tick();
  assert.equal(h.active(), 1);
  assert.equal(h.slides[1].src, 'scene-1.webp');
  assert.equal(h.slides[1].dataset.src, undefined);
  assert.ok(h.slides[2].dataset.src);
  await h.tick();
  assert.equal(h.active(), 2);
  await h.tick();
  assert.equal(h.active(), 0);
  assert.equal(h.timers.size, 1);
});

test('device motion and data-saving preferences stop and resume autoplay without a UI button', () => {
  const h = harness({ reducedMotion: true });
  assert.equal(h.timers.size, 0);
  h.reduced.matches = false; h.reduced.fire('change');
  assert.equal(h.timers.size, 1);
  h.connection.saveData = true; h.connection.fire('change');
  assert.equal(h.timers.size, 0);
  h.connection.saveData = false; h.connection.fire('change');
  assert.equal(h.timers.size, 1);
  h.reduced.matches = true; h.reduced.fire('change');
  assert.equal(h.timers.size, 0);
});

test('offscreen or hidden hero does not rotate until visible again', () => {
  const h = harness();
  h.visible(false); assert.equal(h.timers.size, 0);
  h.visible(true); assert.equal(h.timers.size, 1);
  h.document.hidden = true; h.document.fire('visibilitychange');
  assert.equal(h.timers.size, 0);
  h.document.hidden = false; h.document.fire('visibilitychange');
  assert.equal(h.timers.size, 1);
});

test('a failed image preserves the current photograph and does not freeze the scheduler', async () => {
  const h = harness();
  h.slides[1].decode = async () => { throw new Error('Image unavailable'); };
  await h.tick();
  assert.equal(h.active(), 0);
  assert.equal(h.timers.size, 1);
  h.slides[1].decode = async () => {};
  await h.tick();
  assert.equal(h.active(), 1);
});

test('a preference change during image decoding prevents an unwanted transition', async () => {
  const h = harness();
  let resolveDecode;
  h.slides[1].decode = () => new Promise(resolve => { resolveDecode = resolve; });
  const advancing = h.tick();
  h.reduced.matches = true; h.reduced.fire('change');
  resolveDecode(); await advancing;
  assert.equal(h.active(), 0);
  assert.equal(h.timers.size, 0);
});

test('a single scene needs no autoplay timer', () => {
  assert.equal(harness({ slideCount: 1 }).timers.size, 0);
});
