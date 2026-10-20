(function () {
"use strict";
window.SY_GA4_CONFIG = Object.freeze({"enabled":true,"measurementId":"G-PZQE63983T","consentScope":"ga4-only","consentVersion":1,"consentMaxAgeDays":180});
window.SY_GA4_CONTRACT = {"version":2,"routes":{"/":"group","/locations":"group","/la-cantina":"group","/catering":"catering","/eventos":"group","/tienda":"group","/el-paso":"el-paso","/guadalajara":"san-ignacio","/san-antonio":"san-antonio","/the-woodlands":"the-woodlands","/houston":"houston","/aviso-de-privacidad":"group","/en/houston":"houston","/houston/menu":"houston","/en/san-antonio":"san-antonio","/san-antonio/menu":"san-antonio","/en/san-antonio/menu":"san-antonio","/en/the-woodlands":"the-woodlands","/the-woodlands/menu":"the-woodlands","/san-ignacio/menu":"san-ignacio","/en/el-paso":"el-paso","/en/catering":"catering","/el-paso/menu":"el-paso","/guadalajara/canta-por-tu-cuenta-2026":"san-ignacio"},"branches":["group","catering","el-paso","san-ignacio","san-antonio","the-woodlands","houston"],"events":{"houston-pinta-canta-20261014":{"branch":"houston","kind":"workshop","post":"https://www.instagram.com/glossyco.tx/p/DdpUHLrH4mo/","tickets":"https://www.eventbrite.com/e/pinta-y-canta-despechados-ladies-night-tickets-2002912451058"},"houston-pinta-20261028":{"branch":"houston","kind":"workshop","post":"https://www.instagram.com/glossyco.tx/p/DdpUHLrH4mo/","tickets":"https://www.eventbrite.com/e/pinta-y-canta-peluca-halloween-tickets-2002912558379"},"houston-jorge-mariana-20261113":{"branch":"houston","kind":"performance","post":"https://www.instagram.com/p/DeaxjMhxieb/"},"houston-ladies-weekly":{"branch":"houston","kind":"recurring-night","post":"https://www.instagram.com/reel/DeL7Ly_vyo2/"},"houston-dontcry-weekly":{"branch":"houston","kind":"recurring-night","post":"https://www.instagram.com/reel/Dd9juidPsf6/"},"the-woodlands-mes-hispano-20261015":{"branch":"the-woodlands","kind":"theme-night","post":"https://www.instagram.com/p/DefaT9GBok6/"},"the-woodlands-ladies-weekly":{"branch":"the-woodlands","kind":"recurring-night","post":"https://www.instagram.com/reel/DeL7RNGubUK/"},"the-woodlands-thursday-offer":{"branch":"the-woodlands","kind":"offer","post":"https://www.instagram.com/p/Dd9hkdrJRo3/"},"the-woodlands-jets-cars-20261114":{"branch":"the-woodlands","kind":"external-sponsorship","post":"https://www.instagram.com/p/DeKHqcjy606/"},"san-antonio-pelucas-20261017":{"branch":"san-antonio","kind":"theme-night","post":"https://www.instagram.com/p/DeavaGDhror/"},"san-antonio-ladies-weekly":{"branch":"san-antonio","kind":"recurring-night","post":"https://www.instagram.com/reel/DeL7NjSxiSY/"},"san-antonio-jorge-20261114":{"branch":"san-antonio","kind":"external-performance","post":"https://www.instagram.com/p/DeaxTe3hV7k/"},"el-paso-jorge-20261016":{"branch":"el-paso","kind":"performance","post":"https://www.instagram.com/p/DeZ3riUJ5Bu/"},"el-paso-recovery-brunch":{"branch":"el-paso","kind":"brunch","post":"https://www.instagram.com/p/DeV29DjNFhF/"},"san-ignacio-brujas-20261031":{"branch":"san-ignacio","kind":"dated-event","post":"https://www.instagram.com/p/DeIbppdgMu3/"},"san-ignacio-solteras-weekly":{"branch":"san-ignacio","kind":"weekly-promotion","post":"https://www.instagram.com/p/Dd7fzQkg_wG/"},"san-ignacio-cumpleanos-202610":{"branch":"san-ignacio","kind":"seasonal-promotion","post":"https://www.instagram.com/p/DeSh3VJxBxE/"},"san-ignacio-canta-5-2026":{"branch":"san-ignacio","kind":"competition-series","post":"https://www.instagram.com/reel/DeNifbXAYbT/","additionalPosts":["https://www.instagram.com/reel/DefY-g7RTFo/"],"detailRoute":"/guadalajara/canta-por-tu-cuenta-2026","registrationWhatsapp":"https://wa.me/523319422709?text=Hola%2C%20quiero%20inscribirme%20a%20Canta%20por%20tu%20Cuenta%2C%205.%C2%AA%20edici%C3%B3n%2C%20en%20Guadalajara.%20%C2%BFMe%20comparten%20disponibilidad%20y%20los%20pasos%3F","registrationPhone":"tel:+523319422709"}},"series":{"houston-pinta-y-canta":{"branch":"houston","kind":"workshop","events":["houston-pinta-canta-20261014","houston-pinta-20261028"],"post":"https://www.instagram.com/glossyco.tx/p/DdpUHLrH4mo/"}},"editorialCampaigns":["catrinas-2026","halloween-2026"],"utmValues":{"utm_source":["instagram","facebook","google","google_maps","bing","whatsapp","qr","newsletter","opentable","tripadvisor"],"utm_medium":["organic","referral","social","paid_social","cpc","email","qr"],"utm_campaign":[],"utm_id":[],"utm_term":[],"utm_content":[]},"trafficCampaigns":[],"legacyHosts":{"sinyolandatx.com":"tx","sinyolandausa.com":"usa","maricarmengdl.com":"maricarmen","sinyolandagdl.com":"gdl"}};
// Provider adapter. This module neither loads Google nor stores consent.
// The consent owner supplies explicit permission and the compiled public contract.
const publicHosts = new Set(['sin-yolanda.com', 'www.sin-yolanda.com']);
const referralHosts = new Set(['instagram.com', 'www.instagram.com', 'l.instagram.com',
  'facebook.com', 'www.facebook.com', 'l.facebook.com', 'lm.facebook.com',
  'google.com', 'www.google.com', 'bing.com', 'www.bing.com', 'opentable.com',
  'www.opentable.com', 'tripadvisor.com', 'www.tripadvisor.com']);
const eventNames = new Set(['location_select', 'location_selector_open', 'branch_click',
  'catering_click', 'reservation_click', 'menu_click', 'phone_click', 'directions_click',
  'social_click', 'programming_action_click', 'language_switch_click',
  'location_filter_click', 'catering_contact_click']);
const destinations = new Set(['branch', 'menu', 'selector', 'reservation', 'whatsapp',
  'phone', 'maps', 'catering', 'contact_section', 'instagram_post', 'tickets',
  'instagram_profile', 'facebook', 'tiktok', 'language', 'filter', 'agenda_section']);
const locations = new Set(['header', 'hero', 'selector', 'agenda', 'footer', 'content', 'unknown']);
const languages = new Set(['es', 'en']);
const referrerKinds = new Set(['unknown', 'internal', 'legacy', 'other_external',
  'instagram', 'facebook', 'google', 'bing', 'opentable', 'tripadvisor']);
const own = (object, key) => Object.hasOwn(object, key);

function route(path, contract) {
  const clean = path.replace(/\/index(?:\.html)?\/?$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
  return own(contract.routes, clean) ? clean : null;
}
function publicReferrer(value, contract) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return '';
    if (publicHosts.has(url.hostname)) {
      const path = route(url.pathname, contract);
      return path ? 'https://sin-yolanda.com' + path : '';
    }
    if (referralHosts.has(url.hostname) || own(contract.legacyHosts, url.hostname.replace(/^www\./, ''))) return url.origin;
  } catch { /* Unknown/private origins must not become telemetry. */ }
  return '';
}
function publicPage(context, contract) {
  try {
    const url = new URL(context.href);
    if (url.protocol !== 'https:' || !publicHosts.has(url.hostname) || url.username || url.password || url.port) return null;
    const path = route(url.pathname, contract);
    if (!path) return null;
    return { path, branch: contract.routes[path], page_location: 'https://sin-yolanda.com' + path,
      page_title: 'Sin Yolanda', page_referrer: publicReferrer(context.referrer, contract) };
  } catch { return null; }
}
function permittedAction(name, action) {
  if (name === 'programming_action_click') return ['post', 'tickets', 'agenda_section', name].includes(action);
  if (name === 'location_filter_click') return ['filter_all', 'filter_mx', 'filter_us', 'filter_soon'].includes(action);
  if (name === 'catering_contact_click') return ['contact_section', 'instagram', name].includes(action);
  return name === action;
}
function safeAcquisition(data, contract) {
  const safe = {};
  if (languages.has(data.page_language)) safe.page_language = data.page_language;
  if (typeof data.landing_path === 'string' && own(contract.routes, data.landing_path)) safe.landing_path = data.landing_path;
  if (referrerKinds.has(data.entry_referrer)) safe.entry_referrer = data.entry_referrer;
  if (Object.values(contract.legacyHosts).includes(data.legacy_hop)) safe.legacy_hop = data.legacy_hop;
  if (contract.utmValues.utm_source.includes(data.source)) safe.entry_source = data.source;
  if (contract.utmValues.utm_medium.includes(data.medium)) safe.entry_medium = data.medium;
  if (contract.trafficCampaigns.some(item => item.code === data.campaign && item.source === safe.entry_source && item.medium === safe.entry_medium)) safe.entry_campaign = data.campaign;
  return safe;
}
function safeEvent(name, data, page, contract) {
  if (!eventNames.has(name) || !data || data.schema_version !== 2 ||
      !contract.branches.includes(data.branch) || !languages.has(data.language) ||
      data.page_branch !== page.branch || !languages.has(data.page_language) ||
      !permittedAction(name, data.action)) return null;
  const safe = { schema_version: 2, action: data.action, branch: data.branch,
    language: data.language, page_branch: page.branch, page_language: data.page_language };
  if (locations.has(data.link_location)) safe.link_location = data.link_location;
  if (destinations.has(data.destination)) safe.destination = data.destination;
  if (languages.has(data.destination_language)) safe.destination_language = data.destination_language;
  if (data.event_id && data.series_id) return null;
  if (data.event_id) {
    const event = own(contract.events, data.event_id) && contract.events[data.event_id];
    if (name !== 'programming_action_click' || !event || event.branch !== safe.branch ||
        (data.destination === 'tickets' && !event.tickets)) return null;
    safe.event_id = data.event_id; safe.event_kind = event.kind;
  }
  if (data.series_id) {
    const series = own(contract.series, data.series_id) && contract.series[data.series_id];
    if (name !== 'programming_action_click' || !series || series.branch !== safe.branch || data.destination === 'tickets') return null;
    safe.series_id = data.series_id; safe.event_kind = series.kind;
  }
  if (data.action === 'tickets' && (data.destination !== 'tickets' || !safe.event_id)) return null;
  if (data.destination === 'tickets' && (data.action !== 'tickets' || !safe.event_id)) return null;
  // An editorial event is not an acquisition campaign in Google's configuration.
  if (contract.editorialCampaigns.includes(data.campaign_id)) safe.editorial_campaign_id = data.campaign_id;
  return { ...safe, ...safeAcquisition(data, contract) };
}

function createGa4EventAdapter({ config, contract, hasConsent, readContext, sendEvent }) {
  if (!config || !/^G-[A-Z0-9]+$/.test(config.measurementId) || contract?.version !== 2 ||
      [hasConsent, readContext, sendEvent].some(value => typeof value !== 'function')) throw new TypeError('Verified GA4 config, current contract and explicit callbacks are required');
  const measurementId = config.measurementId, enabled = config.enabled === true;
  let pageViewSent = false;
  function permittedPage() {
    if (!enabled || config.enabled !== true || !['ga4-only', 'all-optional'].includes(config.consentScope) || hasConsent() !== true) return null;
    const context = readContext();
    if (!context) return null;
    if (config.enabled !== true || hasConsent() !== true) return null;
    const page = publicPage(context, contract);
    return page && { ...page, acquisition: safeAcquisition(context.acquisition || {}, contract) };
  }
  function deliver(name, data, page) {
    const { path, branch, acquisition, ...pageFields } = page;
    const result = sendEvent(name, { ...acquisition, ...data, ...pageFields, send_to: measurementId });
    if (result && typeof result.then === 'function') Promise.resolve(result).catch(() => {});
  }
  return Object.freeze({
    configuration() {
      try {
        const page = permittedPage(); if (!page) return null;
        const { path, branch, acquisition, ...fields } = page;
        const result = { ...fields, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false };
        if (acquisition.entry_source && acquisition.entry_medium) {
          result.campaign_source = acquisition.entry_source;
          result.campaign_medium = acquisition.entry_medium;
          if (acquisition.entry_campaign) result.campaign_name = acquisition.entry_campaign;
        }
        return Object.freeze(result);
      } catch { return null; }
    },
    event(name, data) {
      try {
        const page = permittedPage(); if (!page) return false;
        const safe = safeEvent(name, data, page, contract); if (!safe) return false;
        deliver(name, safe, page); return true;
      } catch { return false; }
    },
    pageView() {
      try {
        if (pageViewSent) return false;
        const page = permittedPage(); if (!page) return false;
        deliver('page_view', { page_branch: page.branch }, page);
        pageViewSent = true; return true;
      } catch { return false; }
    },
  });
}

/* Bundled with the current event adapter and compiled contract.
 * Basic consent: Google is never requested before an explicit, stored grant. */
(function () {
  "use strict";
  const config = window.SY_GA4_CONFIG;
  const contract = window.SY_GA4_CONTRACT;
  if (!config || !/^G-[A-Z0-9]+$/.test(config.measurementId) || config.consentScope !== "ga4-only"
      || contract?.version !== 2 || window.__syGA4Consent || window.syGa4MeasurementObserver) return;
  const hosts = new Set(["sin-yolanda.com", "www.sin-yolanda.com"]);
  const preview = new Set(["localhost", "127.0.0.1", "[::1]"]).has(location.hostname);
  const official = location.protocol === "https:" && hosts.has(location.hostname)
    && !location.port && !location.username && !location.password;
  const routes = new Set(Object.keys(contract.routes));
  function route(path) {
    const clean = path.replace(/\/index(?:\.html)?\/?$/, "/").replace(/\.html$/, "").replace(/\/+$/, "") || "/";
    return routes.has(clean) ? clean : null;
  }
  const page = route(location.pathname);
  if (!page || (!official && !preview) || (!config.enabled && !preview)) return;
  const id = config.measurementId;
  const key = "sy-ga4-consent-v1";
  const maxAge = config.consentMaxAgeDays * 86400000;
  if (config.consentVersion !== 1 || !(maxAge > 0 && maxAge <= 180 * 86400000)) return;
  window.__syGA4Consent = true;
  const messages = {en: {
    description: "Allow Google Analytics cookies to measure visits and clicks? You can reject them or change your choice at any time.",
    privacy: "Privacy notice", accept: "Accept", reject: "Reject", preferences: "Privacy preferences",
    accepted: "You have accepted Google Analytics cookies.", rejected: "You have rejected Google Analytics cookies.",
    storage: "We could not save your choice. Google Analytics will remain off on this page."
  }, es: {
    description: "¿Aceptas cookies de Google Analytics para medir visitas y clics? Puedes rechazar o cambiar tu elección cuando quieras.",
    privacy: "Aviso de privacidad", accept: "Aceptar", reject: "Rechazar", preferences: "Preferencias de privacidad",
    accepted: "Has aceptado las cookies de Google Analytics.", rejected: "Has rechazado las cookies de Google Analytics.",
    storage: "No pudimos guardar tu elección. Google Analytics seguirá desactivado en esta página."
  }};
  let copy = messages[document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "es"];
  let record = null, ready = false, active = false, loading = false, generation = 0, script = null;
  let returnFocus = null, panel = null, status = null, accept = null, expiryTimer = null;
  let storageFailed = false, description, privacy, preferences, headerObserver;
  const pending = [];
  const denied = {analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied"};
  function denialGuard() {
    try { return document.cookie.split(";").some(value => value.trim() === "sy_ga4_denied=1"); }
    catch (_) { return true; }
  }
  function setDenialGuard(clear = false) {
    try {
      document.cookie = "sy_ga4_denied=" + (clear ? "" : "1") + "; Max-Age=" + (clear ? 0 : maxAge / 1000)
        + "; Path=/; SameSite=Lax" + (official ? "; Secure" : "");
    } catch (_) { /* A blocked cookie cannot be used as proof of a stored preference. */ }
  }
  function readChoice(ignoreGuard = false) {
    if (!ignoreGuard && denialGuard()) return null;
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null"), now = Date.now();
      if (!value || value.version !== config.consentVersion || value.scope !== config.consentScope || !["granted", "denied"].includes(value.choice)
        || !Number.isFinite(value.updatedAt) || !Number.isFinite(value.expiresAt)
        || value.updatedAt > now + 300000 || value.updatedAt < 0 || value.expiresAt <= now
        || value.expiresAt <= value.updatedAt || value.expiresAt - value.updatedAt > maxAge) return null;
      return value;
    } catch (_) { return null; }
  }
  function allowed() {
    expire();
    const permitted = official && config.enabled === true && config.consentScope === "ga4-only"
      && !denialGuard() && record?.choice === "granted";
    if (!permitted && (active || loading)) stop();
    return permitted;
  }
  function expire() {
    // A fallback rejection from another tab has no localStorage event. Recheck it
    // when this document is used or becomes visible, not only at the next load.
    if (record && (record.expiresAt <= Date.now() || denialGuard())) {
      record = null;
      stop();
      show();
    }
  }
  function scheduleExpiry() {
    clearTimeout(expiryTimer);
    if (!record) return;
    expiryTimer = setTimeout(() => { expire(); scheduleExpiry(); }, Math.min(86400000, Math.max(1, record.expiresAt - Date.now())));
  }
  function tag() {
    window.dataLayer.push(arguments);
  }
  function clearCookies() {
    for (const name of ["_ga", "_ga_" + id.slice(2)]) {
      for (const domain of ["", location.hostname, ".sin-yolanda.com"]) {
        try { document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax" + (domain ? "; Domain=" + domain : ""); }
        catch (_) { /* ga-disable still blocks this property even if cookie storage is unavailable. */ }
      }
    }
  }
  function stop() {
    window["ga-disable-" + id] = true;
    active = false;
    clearTimeout(expiryTimer);
    pending.length = 0;
    generation++;
    if (loading) {
      script?.remove();
      script = null;
      loading = false;
    }
    if (ready) tag("consent", "update", denied);
    clearCookies();
  }
  const adapter = createGa4EventAdapter({ config, contract, hasConsent: allowed,
    readContext: () => ({ href: location.href, referrer: document.referrer,
      acquisition: window.syGa4MeasurementContext?.() }),
    sendEvent: (name, data) => {
      if (!allowed()) return;
      if (ready && active) tag("event", name, data);
      else if (loading && pending.length < 20) pending.push({name, data});
    }
  });
  function activate() {
    if (!allowed() || active) return;
    const settings = adapter.configuration();
    if (!settings) { stop(); return; }
    active = true;
    window["ga-disable-" + id] = false;
    tag("consent", "update", {...denied, analytics_storage: "granted"});
    tag("js", new Date());
    tag("config", id, {
      ...settings,
      cookie_domain: "sin-yolanda.com", cookie_path: "/", cookie_flags: "SameSite=Lax;Secure",
      cookie_expires: maxAge / 1000, cookie_update: false
    });
    adapter.pageView();
    pending.splice(0).forEach(value => emit(value));
  }
  function start() {
    if (!allowed() || loading) return;
    if (ready) { activate(); return; }
    window.dataLayer = window.dataLayer || [];
    if (!Array.isArray(window.dataLayer)) return;
    if (!window.gtag) window.gtag = tag;
    window["ga-disable-" + id] = false;
    tag("consent", "default", denied);
    const current = ++generation;
    script = document.createElement("script");
    script.async = true;
    script.referrerPolicy = "origin";
    script.id = "sy-ga4-tag";
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    loading = true;
    script.onload = function () {
      if (current !== generation) return;
      loading = false;
      ready = true;
      activate();
    };
    script.onerror = function () {
      if (current !== generation) return;
      loading = false;
      pending.length = 0;
      script?.remove();
      script = null;
    };
    document.head.appendChild(script);
  }
  function emit(value) {
    if (!allowed()) { pending.length = 0; return; }
    if (ready) tag("event", value.name, {...value.data, send_to: id});
    else if (loading && pending.length < 20) pending.push(value);
  }
  // The existing measurement owner is the only click listener. No historical emitters.
  window.syGa4MeasurementObserver = (name, data) => adapter.event(name, data);
  function element(name, className, text) {
    const node = document.createElement(name);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function show() {
    if (!panel) return;
    status.textContent = storageFailed ? copy.storage : record ? (record.choice === "granted" ? copy.accepted : copy.rejected) : denialGuard() ? copy.rejected : "";
    panel.hidden = false;
    updateClearance();
  }
  function hide() {
    if (!panel) return;
    panel.hidden = true;
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
    returnFocus = null;
  }
  function choose(choice) {
    if (!["granted", "denied"].includes(choice)) return false;
    if (choice === "denied") stop();
    storageFailed = false;
    const now = Date.now();
    const next = {version: config.consentVersion, scope: config.consentScope, choice, updatedAt: now, expiresAt: now + maxAge};
    let saved = false;
    try {
      localStorage.setItem(key, JSON.stringify(next));
      saved = JSON.stringify(readChoice(true)) === JSON.stringify(next);
    } catch (_) { /* A storage failure never implies consent. */ }
    if (!saved) {
      if (choice === "denied") {
        try { localStorage.removeItem(key); } catch (_) { /* The denial guard also overrides an older grant. */ }
        setDenialGuard();
      }
      record = null;
      storageFailed = true;
      stop();
      show();
      return false;
    }
    setDenialGuard(true);
    if (denialGuard()) {
      record = null;
      storageFailed = true;
      stop();
      show();
      return false;
    }
    record = next;
    scheduleExpiry();
    if (choice === "granted") start();
    hide();
    return true;
  }
  function open() {
    expire();
    returnFocus = document.activeElement;
    panel?.setAttribute("data-sy-consent-mode", "preferences");
    show();
    accept?.focus({preventScroll: true});
  }
  function updateClearance() {
    if (!panel || panel.hidden || panel.getAttribute("data-sy-consent-mode") === "preferences") return;
    const header = document.querySelector("header");
    const outsideFlow = header && ["fixed", "absolute"].includes(getComputedStyle(header).position);
    const clearance = outsideFlow ? Math.max(0, header.getBoundingClientRect().bottom - panel.getBoundingClientRect().top) : 0;
    panel.style.setProperty("--sy-consent-header-clearance", clearance + "px");
  }
  function refreshLanguage() {
    const nextCopy = messages[document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "es"];
    if (nextCopy === copy) return;
    copy = nextCopy;
    if (!panel) return;
    panel.setAttribute("aria-label", copy.preferences);
    description.textContent = copy.description;
    privacy.textContent = copy.privacy;
    accept.textContent = copy.accept;
    panel.querySelector('[data-sy-consent-choice="denied"]').textContent = copy.reject;
    if (preferences) preferences.textContent = copy.preferences;
    if (!panel.hidden) show();
  }
  function createUI() {
    panel = element("section", "sy-consent");
    panel.setAttribute("data-sy-consent", "");
    panel.setAttribute("data-sy-consent-mode", "initial");
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", copy.preferences);
    panel.hidden = true;
    const inner = element("div", "sy-consent__inner");
    const content = element("div", "sy-consent__copy");
    description = element("p", "sy-consent__description", copy.description);
    privacy = element("a", "sy-consent__notice", copy.privacy);
    privacy.href = "/aviso-de-privacidad";
    content.appendChild(description);
    content.appendChild(privacy);
    status = element("p", "sy-consent__status");
    status.setAttribute("data-sy-consent-status", "");
    status.setAttribute("role", "status");
    content.appendChild(status);
    const buttons = element("div", "sy-consent__actions");
    for (const [choice, label] of [["denied", copy.reject], ["granted", copy.accept]]) {
      const button = element("button", "sy-consent__button", label);
      button.type = "button";
      button.setAttribute("data-sy-consent-choice", choice);
      button.addEventListener("click", () => choose(choice));
      buttons.appendChild(button);
      if (choice === "granted") accept = button;
    }
    inner.appendChild(content);
    inner.appendChild(buttons);
    panel.appendChild(inner);
    const main = document.querySelector("main");
    if (main) main.parentNode.insertBefore(panel, main);
    else document.body.appendChild(panel);
    const footer = document.querySelector("footer");
    if (footer) {
      const container = element("div", "sy-consent-preferences");
      preferences = element("button", "sy-consent-preferences__button", copy.preferences);
      preferences.type = "button";
      preferences.setAttribute("data-sy-consent-open", "");
      preferences.addEventListener("click", open);
      container.appendChild(preferences);
      footer.appendChild(container);
    }
    record = readChoice();
    scheduleExpiry();
    if (!record) show();
    else if (record.choice === "granted") start();
    if (typeof MutationObserver !== "undefined") new MutationObserver(refreshLanguage)
      .observe(document.documentElement, {attributes: true, attributeFilter: ["lang"]});
    const header = document.querySelector("header");
    if (header && typeof ResizeObserver !== "undefined") {
      headerObserver = new ResizeObserver(updateClearance);
      headerObserver.observe(header);
    }
    window.addEventListener("resize", updateClearance);
  }
  window.SY_GA4_CONSENT = Object.freeze({open, choose, getChoice: () => { expire(); return record?.choice || null; }});
  window.addEventListener("storage", event => {
    if (event.key !== key && event.key !== null) return;
    record = readChoice();
    if (allowed()) start(); else stop();
    scheduleExpiry();
    if (!record) show(); else if (panel && !panel.hidden) show();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    expire();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", createUI, {once: true});
  else createUI();
}());

}());
