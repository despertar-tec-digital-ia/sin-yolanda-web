// Progressive enhancement only. Real links and the provider own the booking flow.
export function shouldEnhanceBooking(event) {
  return !event.defaultPrevented && (event.button === undefined || event.button === 0)
    && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

// Reuse the existing sanitizer and consent-aware adapters; never send form values.
export async function reportBookingIntent(win, branch, language) {
  if (typeof win.sySiteAnalyticsSanitize !== 'function') return;
  try {
    const safe = await win.sySiteAnalyticsSanitize('event', {name: 'reservation_click', data: {
      action: 'reservation_click', branch, language, link_location: 'content', destination: 'reservation',
    }});
    if (!safe?.data) return;
    try { await win.syGa4MeasurementObserver?.('reservation_click', Object.freeze({...safe.data})); } catch {}
    try { await win.umami?.track?.('reservation_click', safe.data); } catch {}
  } catch { /* Measurement must never interrupt the provider's submission. */ }
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
        load({widgetLoaded: () => update('embedded'), failed: () => update('external')});
      } catch { update('external'); }
      return true;
    },
    dispose() { disposed = true; timers.clearTimeout(timer); },
  };
}

// Use the provider's own close button; never hide the popup or alter its internal state.
export function dismissBookingDatePicker(event, host) {
  if (event.defaultPrevented || event.key !== 'Escape' || !event.target?.matches?.('.ot-datepicker')) return false;
  const close = host.querySelector('.picker--opened .picker__close');
  if (!close || close.disabled || typeof close.click !== 'function') return false;
  event.preventDefault();
  event.stopPropagation();
  close.click();
  return true;
}

export function initializeBooking(doc = document) {
  const section = doc.querySelector('[data-opentable-pilot]');
  if (!section || section.hasAttribute('data-booking-enhanced')) return null;
  const win = doc.defaultView, host = section.querySelector('[data-booking-host]');
  const status = section.querySelector('[data-booking-status]');
  const start = section.querySelector('[data-booking-start]');
  const placeholder = section.querySelector('[data-booking-placeholder]');
  const title = section.querySelector('h2');
  let loader;
  try {
    loader = new URL(section.getAttribute('data-booking-loader'));
    if (loader.origin !== 'https://www.opentable.com'
      || loader.pathname !== '/widget/reservation/loader'
      || loader.searchParams.get('rid') !== section.getAttribute('data-opentable-pilot')) return null;
  } catch { return null; }
  if (!host || !status || !start || !placeholder || !title) return null;
  const spanish = doc.documentElement.lang.startsWith('es');
  const messages = spanish ? {
    loading: 'Cargando horarios…',
    embedded: '',
    external: 'El formulario no cargó. Continúa con tu reserva.',
  } : {
    loading: 'Loading available times…',
    embedded: '',
    external: 'The form could not load. Continue with your reservation.',
  };
  let widgetObserver, viewportObserver;
  const controller = createBookingLoad({
    timers: win,
    render(state) {
      section.setAttribute('data-booking-state', state);
      host.setAttribute('aria-busy', String(state === 'loading'));
      for (const entry of doc.querySelectorAll('[data-booking-open]')) {
        if (state === 'external') entry.removeAttribute('aria-controls');
      }
      host.hidden = state === 'external';
      start.hidden = state === 'loading' || state === 'embedded';
      placeholder.hidden = state !== 'loading';
      status.textContent = messages[state];
      if (state === 'external') widgetObserver?.disconnect();
    },
    load({widgetLoaded, failed}) {
      let observedForm;
      const observeWidget = () => {
        const inline = host.querySelector('#ot-reservation-widget');
        const form = inline?.querySelector('form');
        if (!form?.querySelector('[type="submit"]') || !form.querySelector('select')) return;
        for (const [selector, label] of [
          ['.ot-party-size-picker', spanish ? 'Personas' : 'Guests'],
          ['.ot-date-picker', spanish ? 'Fecha' : 'Date'],
          ['.ot-time-picker', spanish ? 'Hora' : 'Time'],
        ]) {
          const picker = inline.querySelector(selector);
          picker?.setAttribute('data-sy-label', label);
          const control = picker?.querySelector('select,input[role="combobox"]');
          const name = control?.getAttribute('aria-label') || '';
          if (control && !name.toLowerCase().includes(label.toLowerCase())) control.setAttribute('aria-label', name ? `${label}. ${name}` : label);
        }
        const landmark = inline.querySelector('[role="main"]');
        // The inline widget lives inside this page's main landmark.
        if (landmark) { landmark.setAttribute('role', 'group'); landmark.setAttribute('aria-labelledby', title.id); }
        if (form !== observedForm) {
          observedForm = form;
          form.addEventListener('submit', () => { void reportBookingIntent(win, section.getAttribute('data-booking-branch'), spanish ? 'es' : 'en'); });
        }
        // Visible controls are a display state, never availability or confirmation.
        widgetLoaded();
      };
      widgetObserver = new win.MutationObserver(observeWidget);
      widgetObserver.observe(host, {childList: true, subtree: true});
      const script = doc.createElement('script');
      script.src = loader.href;
      script.async = true;
      script.addEventListener('error', failed, {once: true});
      script.addEventListener('load', observeWidget, {once: true});
      host.append(script);
    },
  });
  function enter(event) {
    if (!shouldEnhanceBooking(event) || controller.state === 'external') return;
    event.preventDefault();
    controller.start();
    title.focus({preventScroll: true});
    section.scrollIntoView({block: 'start', behavior: doc.documentElement.hasAttribute?.('data-sy-motion-review') ? 'auto' : 'instant'});
  }
  for (const entry of doc.querySelectorAll('[data-booking-open]')) {
    entry.addEventListener('click', enter);
    entry.setAttribute('aria-controls', host.id);
    entry.removeAttribute('aria-expanded');
  }
  for (const entry of doc.querySelectorAll('[data-booking-open]')) {
    for (const hint of entry.querySelectorAll('.hh-sr,.bf-sr')) hint.textContent = entry.querySelector('img[alt="OpenTable"]') ? '' : ' · OpenTable';
  }
  const dismissDate = event => { dismissBookingDatePicker(event, host); };
  host.addEventListener('keydown', dismissDate);
  section.setAttribute('data-booking-enhanced', '');
  const cleanupFocus = watchBookingModal(doc);
  win.addEventListener('pagehide', event => {
    // A back/forward-cache entry is still live when the visitor returns.
    if (event.persisted) return;
    host.removeEventListener('keydown', dismissDate);
    controller.dispose(); widgetObserver?.disconnect(); viewportObserver?.disconnect(); cleanupFocus?.disconnect();
  });
  if (win.location.hash === '#' + section.id) controller.start();
  else if (win.IntersectionObserver) {
    viewportObserver = new win.IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { controller.start(); viewportObserver.disconnect(); }
    }, {rootMargin: '160px 0px', threshold: 0});
    viewportObserver.observe(section);
  }
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
      if (!previousModal) trigger = section.querySelector('#ot-reservation-widget [type="submit"]');
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
