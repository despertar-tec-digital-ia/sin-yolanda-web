// The group page selects one real provider at a time. A new URL gives each
// OpenTable loader a fresh document so one location cannot inherit another's form.
const choices = [...document.querySelectorAll('[data-booking-choice]')];
const countries = [...document.querySelectorAll('[data-booking-country]')];
const regions = [...document.querySelectorAll('[data-booking-region]')];
const upcoming = [...document.querySelectorAll('[data-booking-upcoming]')];
const result = document.querySelector('.booking-result');
const content = document.querySelector('[data-booking-result-content]');
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const currentLanguage = () => document.documentElement.lang === 'en' ? 'en' : 'es';

function selectCountry(country = 'all', focusRegion = false) {
  for (const button of countries) button.setAttribute('aria-pressed', String(button.dataset.bookingCountry === country));
  for (const region of regions) region.hidden = country !== 'all' && region.dataset.bookingRegion !== country;
  for (const card of upcoming) card.hidden = country !== 'all' && card.dataset.country !== country;
  if (focusRegion) {
    const heading = country === 'all'
      ? document.getElementById('booking-picker-title')
      : regions.find(region => region.dataset.bookingRegion === country)?.querySelector('h3');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({preventScroll: true});
    heading?.scrollIntoView({block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  }
}

function bookingLoader(rid, language) {
  const loader = new URL('https://www.opentable.com/widget/reservation/loader');
  for (const [key, value] of Object.entries({rid, type: 'standard', theme: 'wide', color: '1', dark: 'false', iframe: 'false', domain: 'com', lang: language === 'en' ? 'en-US' : 'es-MX', newtab: 'false', ot_source: 'Restaurant website', cfe: 'true'})) loader.searchParams.set(key, value);
  return loader;
}

function branchDetails(choice, language, fallback) {
  const branchPage = choice.dataset.branchPage;
  const phone = choice.dataset.phone;
  const phoneUrl = choice.dataset.phoneUrl;
  return `<div class="booking-detail"><a href="${escapeHtml(branchPage)}">${language === 'en' ? 'View this location' : 'Ver esta sucursal'}</a><a href="${escapeHtml(phoneUrl)}">${language === 'en' ? 'Call' : 'Llamar'} ${escapeHtml(phone)}</a>${fallback ? `<a href="${escapeHtml(fallback)}" target="_blank" rel="noopener noreferrer">${language === 'en' ? 'Continue directly on OpenTable' : 'Continuar directo en OpenTable'}</a>` : ''}</div>`;
}

function renderWhatsApp(choice, language) {
  const url = new URL(choice.dataset.providerUrl);
  if (url.hostname !== 'wa.me') return;
  const title = language === 'en' ? 'Request a table.' : 'Solicita tu mesa.';
  const copy = language === 'en' ? 'Send a WhatsApp message to the cantina. The team will confirm availability and your booking details.' : 'Escríbele a la cantina por WhatsApp. El equipo confirmará la disponibilidad y los detalles de tu mesa.';
  const action = language === 'en' ? 'Open WhatsApp' : 'Abrir WhatsApp';
  content.innerHTML = `<div class="booking-wa"><div><h2>${title}</h2><p>${copy}</p></div><a class="booking-wa-action" href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${action}</a></div>${branchDetails(choice, language)}`;
  result.hidden = false;
}

async function renderOpenTable(choice, language) {
  const rid = choice.dataset.rid;
  if (!/^\d{6,8}$/.test(rid)) return;
  const fallback = new URL(choice.dataset.providerUrl);
  if (fallback.origin !== 'https://www.opentable.com' || fallback.searchParams.get('restref') !== rid) return;
  fallback.searchParams.set('lang', language === 'en' ? 'en-US' : 'es-MX');
  const loader = bookingLoader(rid, language);
  const name = choice.querySelector('h4')?.textContent?.trim() ?? '';
  const slug = choice.dataset.bookingChoice;
  const id = `reservar-${slug}`;
  // Import before insertion: the approved module's auto-init then sees no
  // section, and we initialize exactly once after building this branch.
  let module;
  try { module = await import('/assets/js/opentable-review.js?v=20261106-keyboard'); } catch { /* The direct link remains usable. */ }
  content.innerHTML = `<section class="sy-booking" id="${id}" data-opentable-pilot="${rid}" data-booking-branch="${escapeHtml(slug)}" data-booking-loader="${escapeHtml(loader.href)}" data-booking-state="idle" aria-labelledby="${id}-title" aria-describedby="${id}-location"><div class="sy-booking-inner"><div class="sy-booking-copy"><h2 id="${id}-title" tabindex="-1">${language === 'en' ? 'Book a table.' : 'Reserva tu mesa.'}</h2><p class="sy-booking-location" id="${id}-location">${escapeHtml(name)} · OpenTable</p></div><div class="sy-booking-panel"><a class="sy-booking-start" data-booking-start data-booking-open href="${escapeHtml(fallback.href)}" target="_blank" rel="noopener noreferrer">${language === 'en' ? 'Find a table' : 'Ver disponibilidad'}</a><div class="sy-booking-placeholder" data-booking-placeholder hidden aria-hidden="true"><span></span><span></span><span></span><span></span></div><div class="sy-booking-widget" id="${id}-form" data-booking-host hidden></div><p class="sy-booking-status" data-booking-status role="status" aria-live="polite" aria-atomic="true"></p><div class="sy-booking-foot"><span>${language === 'en' ? 'Reservations with OpenTable' : 'Reservas con OpenTable'}</span><p>${language === 'en' ? 'Need help?' : '¿Necesitas ayuda?'} <a href="${escapeHtml(choice.dataset.phoneUrl)}">${escapeHtml(choice.dataset.phone)}</a></p></div></div></div></section>${branchDetails(choice, language, fallback.href)}`;
  result.hidden = false;
  if (module) module.initializeBooking()?.start();
}

function initNavigation() {
  const toggle = document.querySelector('.booking-header .menu-toggle');
  const nav = document.getElementById('public-nav');
  toggle?.addEventListener('click', () => {
    const opened = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(opened));
    nav?.classList.toggle('open', opened);
  });
  nav?.addEventListener('click', event => {
    if (!event.target.closest('a')) return;
    nav.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || toggle?.getAttribute('aria-expanded') !== 'true') return;
    nav?.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  });
}

async function init() {
  initNavigation();
  document.body.dataset.bookingEnhanced = 'true';
  if (currentLanguage() === 'en') {
    document.querySelector('.booking-countries')?.setAttribute('aria-label', 'Filter locations by country');
    result?.setAttribute('aria-label', 'Booking for the selected location');
  }
  // Card links point to the providers in the HTML, so they also work without JS.
  // Once enhanced, a fresh page loads the selected branch's inline channel.
  for (const choice of choices) {
    const link = choice.querySelector('[data-venue]');
    if (link) link.href = `/reservar?sucursal=${encodeURIComponent(choice.dataset.bookingChoice)}`;
  }
  const params = new URLSearchParams(location.search);
  const slug = params.get('sucursal');
  const selected = choices.find(choice => choice.dataset.bookingChoice === slug);
  const requestedCountry = params.get('pais');
  selectCountry(selected?.dataset.country ?? (countries.some(button => button.dataset.bookingCountry === requestedCountry) ? requestedCountry : 'all'));
  for (const button of countries) button.addEventListener('click', () => selectCountry(button.dataset.bookingCountry, true));
  if (!selected) return;
  document.body.dataset.bookingSelected = 'true';
  const language = currentLanguage();
  const name = selected.querySelector('h4')?.textContent?.trim() ?? '';
  const photo = selected.querySelector(':scope > img')?.cloneNode();
  if (photo) {
    photo.loading = 'eager';
    photo.alt = '';
    document.querySelector('[data-booking-result-photo]')?.replaceChildren(photo);
  }
  document.querySelector('[data-booking-result-title]').textContent = name;
  if (selected.dataset.channel === 'whatsapp') renderWhatsApp(selected, language);
  else if (selected.dataset.channel === 'opentable') await renderOpenTable(selected, language);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-lang-btn]')) queueMicrotask(() => location.reload());
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
else void init();
