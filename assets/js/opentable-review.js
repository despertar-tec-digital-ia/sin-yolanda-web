// Progressive enhancement only. Real links and the provider own the booking flow.
export function shouldEnhanceBooking(event) {
  return !event.defaultPrevented && (event.button === undefined || event.button === 0)
    && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function createBookingLoad({load, render, timers = globalThis, timeout = 12000}) {
  let state = 'idle', started = false, disposed = false, timer;
  const update = next => {
    if (disposed || state === 'external' || state === next) return;
    state = next;
    if (next !== 'loading') timers.clearTimeout(timer);
    render(next);
  };
  return {
    get state() { return state; },
    start() {
      if (disposed || state === 'external') return false;
      if (started) return true;
      started = true;
      update('loading');
      timer = timers.setTimeout(() => { if (state === 'loading') update('external'); }, timeout);
      try {
        load({frameLoaded: () => update('embedded'), failed: () => update('external')});
      } catch { update('external'); }
      return true;
    },
    dispose() { disposed = true; timers.clearTimeout(timer); },
  };
}

export function initializeBooking(doc = document) {
  const section = doc.querySelector('[data-opentable-pilot]');
  if (!section || section.hasAttribute('data-booking-enhanced')) return null;
  const win = doc.defaultView, host = section.querySelector('[data-booking-host]');
  const status = section.querySelector('[data-booking-status]');
  const start = section.querySelector('[data-booking-start]');
  const direct = section.querySelector('[data-booking-direct]');
  const title = section.querySelector('h2');
  let loader;
  try {
    loader = new URL(section.getAttribute('data-booking-loader'));
    if (loader.origin !== 'https://www.opentable.com'
      || loader.pathname !== '/widget/reservation/loader'
      || loader.searchParams.get('rid') !== section.getAttribute('data-opentable-pilot')) return null;
  } catch { return null; }
  if (!host || !status || !start || !direct || !title) return null;
  const spanish = doc.documentElement.lang.startsWith('es');
  const messages = spanish ? {
    loading: 'Consultando OpenTable… Puedes usar el enlace directo cuando quieras.',
    embedded: 'Si el formulario no aparece, continúa directamente en OpenTable.',
    external: 'Continúa en OpenTable para consultar los horarios disponibles.',
  } : {
    loading: 'Connecting to OpenTable… You can use the direct link at any time.',
    embedded: 'If the form does not appear, continue directly on OpenTable.',
    external: 'Continue on OpenTable to find available times.',
  };
  let frameObserver;
  const controller = createBookingLoad({
    timers: win,
    render(state) {
      section.setAttribute('data-booking-state', state);
      host.setAttribute('aria-busy', String(state === 'loading'));
      for (const entry of doc.querySelectorAll('[data-booking-open]')) {
        if (state === 'external') { entry.removeAttribute('aria-controls'); entry.removeAttribute('aria-expanded'); }
        else entry.setAttribute('aria-expanded', 'true');
      }
      host.hidden = state === 'external';
      start.hidden = state === 'embedded';
      direct.hidden = state === 'external';
      start.textContent = state === 'external'
        ? (spanish ? 'Abrir OpenTable' : 'Open OpenTable')
        : (spanish ? 'Ver disponibilidad' : 'Find a table');
      status.textContent = messages[state];
      if (state === 'external') frameObserver?.disconnect();
    },
    load({frameLoaded, failed}) {
      let observedFrame;
      const observeFrame = () => {
        const frame = host.querySelector('iframe[name="opentable-make-reservation-widget"]');
        if (!frame || frame === observedFrame) return;
        observedFrame = frame;
        // Loading an iframe is a display state, never availability or confirmation.
        frame.addEventListener('load', frameLoaded, {once: true});
      };
      frameObserver = new win.MutationObserver(observeFrame);
      frameObserver.observe(host, {childList: true, subtree: true});
      const script = doc.createElement('script');
      script.src = loader.href;
      script.async = true;
      script.addEventListener('error', failed, {once: true});
      script.addEventListener('load', observeFrame, {once: true});
      host.append(script);
    },
  });
  function enter(event) {
    if (!shouldEnhanceBooking(event) || controller.state === 'external') return;
    event.preventDefault();
    controller.start();
    title.focus({preventScroll: true});
    section.scrollIntoView({block: 'start', behavior: 'instant'});
  }
  for (const entry of doc.querySelectorAll('[data-booking-open]')) {
    entry.addEventListener('click', enter);
    entry.setAttribute('aria-controls', host.id);
    entry.setAttribute('aria-expanded', 'false');
  }
  for (const entry of doc.querySelectorAll('[data-booking-open]')) {
    for (const hint of entry.querySelectorAll('.hh-sr,.bf-sr')) hint.textContent = ' · OpenTable';
  }
  direct.hidden = false;
  section.setAttribute('data-booking-enhanced', '');
  const cleanupFocus = watchBookingModal(doc);
  win.addEventListener('pagehide', event => {
    // A back/forward-cache entry is still live when the visitor returns.
    if (event.persisted) return;
    controller.dispose(); frameObserver?.disconnect(); cleanupFocus?.disconnect();
  });
  if (win.location.hash === '#' + section.id) controller.start();
  return controller;
}

// Return focus only after OpenTable completes its own native close and cleanup.
export function watchBookingModal(doc = document, Observer = doc.defaultView?.MutationObserver ?? MutationObserver) {
  const section = doc.querySelector('[data-opentable-pilot]');
  if (!section) return null;
  let previousModal = null, trigger = null;
  const update = () => {
    const modal = doc.querySelector('dialog[open] iframe[name="cfe-modal-iframe"]')?.closest('dialog') ?? null;
    if (modal) {
      if (!previousModal) trigger = section.querySelector('iframe[name="opentable-make-reservation-widget"]');
      previousModal = modal;
    } else if (previousModal) {
      const closedModal = previousModal; previousModal = null;
      const active = doc.activeElement;
      if ((!active || active === doc.body || !active.isConnected || closedModal.contains?.(active)) && trigger?.isConnected) trigger.focus({preventScroll: true});
      trigger = null;
    }
  };
  const observer = new Observer(update);
  observer.observe(doc.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['open']});
  update();
  return observer;
}

if (typeof document !== 'undefined') initializeBooking();
