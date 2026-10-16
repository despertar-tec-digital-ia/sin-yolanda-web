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

export function createGa4EventAdapter({ config, contract, hasConsent, readContext, sendEvent }) {
  if (!config || !/^G-[A-Z0-9]+$/.test(config.measurementId) || contract?.version !== 2 ||
      [hasConsent, readContext, sendEvent].some(value => typeof value !== 'function')) throw new TypeError('Verified GA4 config, current contract and explicit callbacks are required');
  const measurementId = config.measurementId, enabled = config.enabled === true;
  let pageViewSent = false;
  function permittedPage() {
    if (!enabled || config.enabled !== true || !['ga4-only', 'all-optional'].includes(config.consentScope) || hasConsent() !== true) return null;
    const context = readContext();
    if (!context || context.globalPrivacyControl === true || context.umamiDisabled ||
        [context.doNotTrack, context.msDoNotTrack, context.windowDoNotTrack].some(value => value === '1' || value === 'yes')) return null;
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
