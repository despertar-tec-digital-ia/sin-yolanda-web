// The group page selects one real provider at a time. A new URL gives each
// OpenTable loader a fresh document so one location cannot inherit another's form.
const choices = [...document.querySelectorAll('[data-booking-choice]')];
const countries = [...document.querySelectorAll('[data-booking-country]')];
const regions = [...document.querySelectorAll('[data-booking-region]')];
const upcoming = [...document.querySelectorAll('[data-booking-upcoming]')];
const result = document.querySelector('.booking-result');
const content = document.querySelector('[data-booking-result-content]');
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const currentLanguage = () => {
  // The site translator applies its saved preference on DOMContentLoaded; this
  // module can render the selected branch before that handler updates <html>.
  try { return localStorage.getItem('sy-lang') === 'en' ? 'en' : 'es'; }
  catch { return document.documentElement.lang === 'en' ? 'en' : 'es'; }
};
// WhatsApp mark from Simple Icons: https://github.com/simple-icons/simple-icons/blob/develop/icons/whatsapp.svg
const whatsappIcon = '<svg class="booking-wa-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';

function selectCountry(country = 'all', focusRegion = false) {
  for (const button of countries) button.setAttribute('aria-pressed', String(button.dataset.bookingCountry === country));
  for (const region of regions) region.hidden = country !== 'all' && region.dataset.bookingRegion !== country;
  for (const card of upcoming) card.hidden = country !== 'all' && card.dataset.country !== country;
  if (focusRegion) {
    const heading = country === 'all'
      ? document.getElementById('booking-picker-title')
      : regions.find(region => region.dataset.bookingRegion === country)?.querySelector('h2');
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
  const copy = language === 'en' ? 'Tell us when you are coming and how many are in your group. The team will confirm availability and details on WhatsApp.' : 'Cuéntanos cuándo vienes y cuántas personas son. El equipo confirmará disponibilidad y detalles por WhatsApp.';
  const action = language === 'en' ? 'Open WhatsApp' : 'Abrir WhatsApp';
  content.innerHTML = `<div class="booking-wa"><div class="booking-wa-copy"><h2>${title}</h2><p>${copy}</p></div><a class="booking-wa-action" href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${whatsappIcon}<span>${action}</span></a></div>${branchDetails(choice, language)}`;
  result.hidden = false;
}

async function renderOpenTable(choice, language) {
  const rid = choice.dataset.rid;
  if (!/^\d{6,8}$/.test(rid)) return;
  const fallback = new URL(choice.dataset.providerUrl);
  if (fallback.origin !== 'https://www.opentable.com' || fallback.searchParams.get('restref') !== rid) return;
  fallback.searchParams.set('lang', language === 'en' ? 'en-US' : 'es-MX');
  const loader = bookingLoader(rid, language);
  const slug = choice.dataset.bookingChoice;
  const id = `reservar-${slug}`;
  // Import before insertion: the approved module's auto-init then sees no
  // section, and we initialize exactly once after building this branch.
  let module;
  try { module = await import('/assets/js/opentable-review.js?v=20261106-keyboard'); } catch { /* The direct link remains usable. */ }
  content.innerHTML = `<section class="sy-booking" id="${id}" data-opentable-pilot="${rid}" data-booking-branch="${escapeHtml(slug)}" data-booking-loader="${escapeHtml(loader.href)}" data-booking-state="idle" aria-labelledby="booking-result-title ${id}-title"><div class="sy-booking-inner"><div class="sy-booking-copy"><h2 id="${id}-title" tabindex="-1">${language === 'en' ? 'Book a table.' : 'Reserva tu mesa.'}</h2></div><div class="sy-booking-panel"><a class="sy-booking-start" data-booking-start data-booking-open href="${escapeHtml(fallback.href)}" target="_blank" rel="noopener noreferrer">${language === 'en' ? 'Find a table' : 'Ver disponibilidad'}</a><div class="sy-booking-placeholder" data-booking-placeholder hidden aria-hidden="true"><span></span><span></span><span></span><span></span></div><div class="sy-booking-widget" id="${id}-form" data-booking-host hidden></div><p class="sy-booking-status" data-booking-status role="status" aria-live="polite" aria-atomic="true"></p><div class="sy-booking-foot"><span>${language === 'en' ? 'Reservations with OpenTable' : 'Reservas con OpenTable'}</span><p>${language === 'en' ? 'Need help?' : '¿Necesitas ayuda?'} <a href="${escapeHtml(choice.dataset.phoneUrl)}">${escapeHtml(choice.dataset.phone)}</a></p></div></div></div></section>${branchDetails(choice, language, fallback.href)}`;
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
  const name = selected.querySelector('h3')?.textContent?.trim() ?? '';
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
