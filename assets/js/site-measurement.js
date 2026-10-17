/* Anonymous measurement. It never changes links or presentation. */
(function () {
  "use strict";
  const contract =
/* BEGIN GENERATED MEASUREMENT CONTRACT */
{"version":2,"routes":{"/":"group","/locations":"group","/la-cantina":"group","/catering":"catering","/eventos":"group","/tienda":"group","/el-paso":"el-paso","/guadalajara":"san-ignacio","/san-antonio":"san-antonio","/the-woodlands":"the-woodlands","/houston":"houston","/aviso-de-privacidad":"group","/en/houston":"houston","/houston/menu":"houston","/en/san-antonio":"san-antonio","/san-antonio/menu":"san-antonio","/en/san-antonio/menu":"san-antonio","/en/the-woodlands":"the-woodlands","/the-woodlands/menu":"the-woodlands","/san-ignacio/menu":"san-ignacio","/en/el-paso":"el-paso","/en/catering":"catering","/el-paso/menu":"el-paso"},"branches":["group","catering","el-paso","san-ignacio","san-antonio","the-woodlands","houston"],"events":{"houston-pinta-canta-20261014":{"branch":"houston","kind":"workshop","post":"https://www.instagram.com/glossyco.tx/p/DdpUHLrH4mo/","tickets":"https://www.eventbrite.com/e/pinta-y-canta-despechados-ladies-night-tickets-2002912451058"},"houston-pinta-20261028":{"branch":"houston","kind":"workshop","post":"https://www.instagram.com/glossyco.tx/p/DdpUHLrH4mo/","tickets":"https://www.eventbrite.com/e/pinta-y-canta-peluca-halloween-tickets-2002912558379"},"houston-jorge-mariana-20261113":{"branch":"houston","kind":"performance","post":"https://www.instagram.com/p/DeaxjMhxieb/"},"houston-ladies-weekly":{"branch":"houston","kind":"recurring-night","post":"https://www.instagram.com/reel/DeL7Ly_vyo2/"},"houston-dontcry-weekly":{"branch":"houston","kind":"recurring-night","post":"https://www.instagram.com/reel/Dd9juidPsf6/"},"the-woodlands-mes-hispano-20261015":{"branch":"the-woodlands","kind":"theme-night","post":"https://www.instagram.com/p/DefaT9GBok6/"},"the-woodlands-ladies-weekly":{"branch":"the-woodlands","kind":"recurring-night","post":"https://www.instagram.com/reel/DeL7RNGubUK/"},"the-woodlands-thursday-offer":{"branch":"the-woodlands","kind":"offer","post":"https://www.instagram.com/p/Dd9hkdrJRo3/"},"the-woodlands-jets-cars-20261114":{"branch":"the-woodlands","kind":"external-sponsorship","post":"https://www.instagram.com/p/DeKHqcjy606/"},"san-antonio-pelucas-20261017":{"branch":"san-antonio","kind":"theme-night","post":"https://www.instagram.com/p/DeavaGDhror/"},"san-antonio-ladies-weekly":{"branch":"san-antonio","kind":"recurring-night","post":"https://www.instagram.com/reel/DeL7NjSxiSY/"},"san-antonio-jorge-20261114":{"branch":"san-antonio","kind":"external-performance","post":"https://www.instagram.com/p/DeaxTe3hV7k/"},"el-paso-jorge-20261016":{"branch":"el-paso","kind":"performance","post":"https://www.instagram.com/p/DeZ3riUJ5Bu/"},"el-paso-recovery-brunch":{"branch":"el-paso","kind":"brunch","post":"https://www.instagram.com/p/DeV29DjNFhF/"},"san-ignacio-brujas-20261031":{"branch":"san-ignacio","kind":"dated-event","post":"https://www.instagram.com/p/DeIbppdgMu3/"},"san-ignacio-solteras-weekly":{"branch":"san-ignacio","kind":"weekly-promotion","post":"https://www.instagram.com/p/Dd7fzQkg_wG/"},"san-ignacio-cumpleanos-202610":{"branch":"san-ignacio","kind":"seasonal-promotion","post":"https://www.instagram.com/p/DeSh3VJxBxE/"},"san-ignacio-canta-5-2026":{"branch":"san-ignacio","kind":"competition-series","post":"https://www.instagram.com/reel/DeNifbXAYbT/","additionalPosts":["https://www.instagram.com/reel/DefY-g7RTFo/"]}},"series":{"houston-pinta-y-canta":{"branch":"houston","kind":"workshop","events":["houston-pinta-canta-20261014","houston-pinta-20261028"],"post":"https://www.instagram.com/glossyco.tx/p/DdpUHLrH4mo/"}},"editorialCampaigns":["catrinas-2026","halloween-2026"],"utmValues":{"utm_source":["instagram","facebook","google","google_maps","bing","whatsapp","qr","newsletter","opentable","tripadvisor"],"utm_medium":["organic","referral","social","paid_social","cpc","email","qr"],"utm_campaign":[],"utm_id":[],"utm_term":[],"utm_content":[]},"trafficCampaigns":[],"legacyHosts":{"sinyolandatx.com":"tx","sinyolandausa.com":"usa","maricarmengdl.com":"maricarmen","sinyolandagdl.com":"gdl"}}
/* END GENERATED MEASUREMENT CONTRACT */
  ;
  const hosts = new Set(["sin-yolanda.com", "www.sin-yolanda.com"]);
  const websiteId = "cbfa7fb3-230e-405c-a0b8-06c762d6216b";
  const branchIds = new Set(contract.branches);
  const events = new Set(["location_select", "location_selector_open", "branch_click", "catering_click", "reservation_click", "menu_click", "phone_click", "directions_click", "social_click", "programming_action_click", "language_switch_click", "location_filter_click", "catering_contact_click"]);
  const actions = new Set([...events, "filter_all", "filter_mx", "filter_us", "filter_soon", "contact_section", "instagram", "post", "tickets", "agenda_section"]);
  const destinations = new Set(["branch", "menu", "selector", "reservation", "whatsapp", "phone", "maps", "catering", "contact_section", "instagram_post", "tickets", "instagram_profile", "facebook", "tiktok", "language", "filter", "agenda_section"]);
  const locations = new Set(["header", "hero", "selector", "agenda", "footer", "content", "unknown"]);
  const sessionKey = "sy-acquisition-v2", sessionIdle = 30 * 60 * 1000;
  function route(pathname) {
    const clean = pathname.replace(/\/index(?:\.html)?\/?$/, "/").replace(/\.html$/, "").replace(/\/$/, "") || "/";
    return Object.hasOwn(contract.routes, clean) ? clean : null;
  }
  const pageBranch = () => contract.routes[route(window.location.pathname)] || "group";
  const pageLanguage = () => document.documentElement.lang === "en" ? "en" : "es";
  function disabled() {
    if (navigator.globalPrivacyControl === true || [navigator.doNotTrack, navigator.msDoNotTrack, window.doNotTrack].some(value => value === "1" || value === "yes")) return true;
    try { return Boolean(window.localStorage.getItem("umami.disabled")); } catch { return false; }
  }
  let entry;
  const discardSession = () => { entry = { landing_path: route(window.location.pathname), entry_referrer: "unknown" }; try { window.sessionStorage?.removeItem(sessionKey); } catch {} };
  if (window.location.protocol !== "https:" || !hosts.has(window.location.hostname) || !route(window.location.pathname)) return;
  if (window.__sySiteAnalytics || typeof window.sySiteAnalyticsSanitize !== "undefined") return;
  window.__sySiteAnalytics = true;
  function registeredUtms(search) {
    const input = new URLSearchParams(search), result = {};
    for (const key of ["utm_source", "utm_medium"]) {
      const values = input.getAll(key);
      if (values.length === 1 && contract.utmValues[key]?.includes(values[0])) result[key] = values[0];
    }
    const campaign = input.getAll("utm_campaign");
    if (campaign.length === 1 && contract.trafficCampaigns.some(item => item.code === campaign[0] && item.source === result.utm_source && item.medium === result.utm_medium)) result.utm_campaign = campaign[0];
    return result;
  }
  const referralGroups = { instagram: ["instagram.com", "www.instagram.com", "l.instagram.com"], facebook: ["facebook.com", "www.facebook.com", "l.facebook.com", "lm.facebook.com"], google: ["google.com", "www.google.com"], bing: ["bing.com", "www.bing.com"], opentable: ["opentable.com", "www.opentable.com"], tripadvisor: ["tripadvisor.com", "www.tripadvisor.com"] };
  function referrerDetails(value) {
    try {
      const url = new URL(value); if (!["http:", "https:"].includes(url.protocol)) throw Error();
      if (hosts.has(url.hostname)) return { kind: "internal", safe: url.origin + (route(url.pathname) || "") };
      const legacy = contract.legacyHosts[url.hostname.replace(/^www\./, "")];
      if (legacy) return { kind: "legacy", legacy, safe: url.origin };
      for (const [kind, allowed] of Object.entries(referralGroups)) if (allowed.includes(url.hostname)) return { kind, safe: url.origin };
      return { kind: "other_external", safe: "" };
    } catch { return { kind: "unknown", safe: "" }; }
  }
  const entryReferrer = referrerDetails(document.referrer), entryUtms = registeredUtms(window.location.search);
  function acquisition() {
    const result = { landing_path: route(window.location.pathname), entry_referrer: entryReferrer.kind };
    if (entryReferrer.legacy) result.legacy_hop = entryReferrer.legacy;
    if (entryUtms.utm_source) result.source = entryUtms.utm_source;
    if (entryUtms.utm_medium) result.medium = entryUtms.utm_medium;
    if (entryUtms.utm_campaign) result.campaign = entryUtms.utm_campaign;
    return result;
  }
  function safeAcquisition(value) {
    if (!value || !route(value.landing_path) || !["unknown", "internal", "legacy", "other_external", ...Object.keys(referralGroups)].includes(value.entry_referrer)) return null;
    const result = { landing_path: route(value.landing_path), entry_referrer: value.entry_referrer };
    if (Object.values(contract.legacyHosts).includes(value.legacy_hop)) result.legacy_hop = value.legacy_hop;
    if (contract.utmValues.utm_source.includes(value.source)) result.source = value.source;
    if (contract.utmValues.utm_medium.includes(value.medium)) result.medium = value.medium;
    if (contract.trafficCampaigns.some(item => item.code === value.campaign && item.source === result.source && item.medium === result.medium)) result.campaign = value.campaign;
    return result;
  }
  entry = acquisition();
  if (disabled()) discardSession();
  else try {
    const stored = JSON.parse(window.sessionStorage?.getItem(sessionKey) || "null");
    // Only our own navigation inherits acquisition; an external return starts again.
    if (entryReferrer.kind === "internal" && !Object.keys(entryUtms).length && stored?.version === 2 && Number.isFinite(stored.seenAt) && Date.now() >= stored.seenAt && Date.now() - stored.seenAt < sessionIdle) entry = safeAcquisition(stored.entry) || entry;
    window.sessionStorage?.setItem(sessionKey, JSON.stringify({ version: 2, seenAt: Date.now(), entry }));
  } catch {}
  let lastActivity = Date.now();
  function touchAcquisition() {
    if (disabled()) { discardSession(); return; }
    const now = Date.now();
    if (now - lastActivity >= sessionIdle) entry = { landing_path: route(window.location.pathname), entry_referrer: "unknown" };
    lastActivity = now;
    try { window.sessionStorage?.setItem(sessionKey, JSON.stringify({ version: 2, seenAt: now, entry })); } catch {}
  }
  const commonData = () => ({ schema_version: 2, page_branch: pageBranch(), page_language: pageLanguage(), ...entry });
  function safeEventData(data, name) {
    if (!data || !actions.has(data.action) || !branchIds.has(data.branch) || !["es", "en"].includes(data.language)) return null;
    const allowedActions = name === "programming_action_click" ? ["post", "tickets", "agenda_section", name] : name === "location_filter_click" ? ["filter_all", "filter_mx", "filter_us", "filter_soon"] : name === "catering_contact_click" ? ["contact_section", "instagram", name] : [name];
    if (!allowedActions.includes(data.action)) return null;
    const result = { action: data.action, branch: data.branch, language: data.language, ...commonData() };
    // A trusted click snapshots its source language before the UI switches it.
    if (data.schema_version === 2 && ["es", "en"].includes(data.page_language)) result.page_language = data.page_language;
    if (locations.has(data.link_location)) result.link_location = data.link_location;
    if (destinations.has(data.destination)) result.destination = data.destination;
    if (["es", "en"].includes(data.destination_language)) result.destination_language = data.destination_language;
    if (data.event_id) { const event = contract.events[data.event_id]; if (!event || event.branch !== result.branch || (data.destination === "tickets" && !event.tickets)) return null; result.event_id = data.event_id; result.event_kind = event.kind; }
    if (data.series_id) { const series = contract.series[data.series_id]; if (!series || series.branch !== result.branch) return null; result.series_id = data.series_id; result.event_kind = series.kind; }
    if (contract.editorialCampaigns.includes(data.campaign_id)) result.campaign_id = data.campaign_id;
    return result;
  }
  window.syGa4MeasurementContext = () => {
    touchAcquisition(); return Object.freeze(commonData());
  };
  const previousHookName = document.currentScript?.getAttribute("data-before-send") || "sySiteAnalyticsBeforeSend";
  const previousHook = typeof window[previousHookName] === "function" ? window[previousHookName] : null;
  function safePayload(type, payload) {
    const path = route(window.location.pathname);
    if (type !== "event" || !payload || !path || disabled()) { if (disabled()) discardSession(); return false; }
    if (payload.name && !events.has(payload.name)) return false;
    const result = { website: websiteId, hostname: window.location.hostname, url: path, title: "Sin Yolanda", referrer: referrerDetails(payload.referrer).safe };
    // Reinsert only registered labels after the SDK strips search parameters.
    if (typeof payload.language === "string" && /^[a-z]{2}(?:-[A-Za-z]{2})?$/.test(payload.language)) result.language = payload.language;
    if (typeof payload.screen === "string" && /^\d{1,5}x\d{1,5}$/.test(payload.screen)) result.screen = payload.screen;
    if (payload.name) {
      let data = safeEventData(payload.data, payload.name); if (!data) return false;
      const sourceLanguage = data.page_language;touchAcquisition();
      data = safeEventData(payload.data, payload.name);data.page_language = sourceLanguage;
      result.name = payload.name;result.data = data;
    }
    else {
      touchAcquisition(); result.data = commonData();
      if (Object.keys(entryUtms).length && entryUtms.utm_source === entry.source && entryUtms.utm_medium === entry.medium) result.url += "?" + new URLSearchParams(entryUtms).toString();
    }
    return result;
  }
  window.sySiteAnalyticsSanitize = function (type, payload) {
    try { const prepared = previousHook ? previousHook(type, payload) : payload;
      return prepared && typeof prepared.then === "function" ? prepared.then(value => safePayload(type, value)).catch(() => false) : safePayload(type, prepared);
    } catch { return false; }
  };
  const pending = [];
  function send(name, data, replay = false) {
    if (!events.has(name)) return;
    let safe = safeEventData(data, name); if (!safe) return;
    const sourceLanguage=safe.page_language;touchAcquisition();safe=safeEventData(data,name);safe.page_language=sourceLanguage;
    if (!replay && typeof window.syGa4MeasurementObserver === "function") {
      try { Promise.resolve(window.syGa4MeasurementObserver(name, Object.freeze({ ...safe }))).catch(() => {}); } catch {}
    }
    if (disabled()) { pending.length = 0; return; }
    if (typeof window.umami?.track !== "function") { if (pending.length < 20) pending.push({ name, data: safe, at: Date.now() }); return; }
    try { Promise.resolve(window.umami.track(name, safe)).catch(() => {}); } catch {}
  }
  function contextBranch(element) {
    const owner = element.closest("[data-branch-id],[data-branch],[data-agenda-branch]");
    const explicit = owner?.dataset.branchId || owner?.dataset.branch || owner?.dataset.agendaBranch;
    if (branchIds.has(explicit)) return explicit;
    const card = element.closest(".location-card");
    if (card) for (const link of card.querySelectorAll("a[href]")) {
      try { const url = new URL(link.getAttribute("href"), window.location.href); const branch = hosts.has(url.hostname) && contract.routes[route(url.pathname)]; if (branchIds.has(branch)) return branch; } catch {}
    }
    return pageBranch();
  }
  function linkLocation(element) {
    if (element.closest("header,.hh-header,.ct-header,.site-header")) return "header";
    if (element.closest("footer,.bf-footer,.ct-footer")) return "footer";
    if (element.closest(".sy-agenda,.home-campaign,.programming-block")) return "agenda";
    if (element.closest(".location-card,#ubicaciones")) return "selector";
    if (element.closest(".hh-welcome,.home-hero,.hero,.ct-opening")) return "hero";
    return "content";
  }
  function destinationBranch(url, fallback) {
    for (const branch of window.SY_DATA?.branches || []) {
      if (!branchIds.has(branch.id)) continue;
      if (url.protocol === "tel:" && url.pathname === branch.phoneIntl) return branch.id;
      if (url.hostname === "wa.me" && url.pathname === "/" + branch.whatsapp && branch.whatsapp) return branch.id;
      try { const reserve = new URL(branch.reserveUrl); if (reserve.origin === url.origin && reserve.pathname === url.pathname) return branch.id; } catch {}
    }
    return fallback;
  }
  function destinationKey(value) { try { const url = value instanceof URL ? value : new URL(value); return url.protocol === "https:" ? url.origin + url.pathname.replace(/\/$/, "") : null; } catch { return null; } }
  function identify(element) {
    const branch = contextBranch(element), language = pageLanguage(), location = linkLocation(element);
    const decision = (name, destination, action = name, targetBranch = branch, extras = {}) => ({ name, data: { action, branch: targetBranch, language, link_location: location, destination, ...extras } });
    const filter = element.dataset.venueFilter;
    if (["all", "mx", "us", "soon"].includes(filter)) return decision("location_filter_click", "filter", "filter_" + filter);
    if (element.matches("[data-select-location]")) return decision("location_selector_open", "selector");
    if (!element.matches("a[href]")) return ["es", "en"].includes(element.dataset.langBtn) ? decision("language_switch_click", "language", "language_switch_click", branch, { language: element.dataset.langBtn, destination_language: element.dataset.langBtn }) : null;
    let url; try { url = new URL(element.getAttribute("href"), window.location.href); } catch { return null; }
    if (element.matches("[data-venue]") && branchIds.has(element.dataset.branchId)) return decision("location_select", "branch", "location_select", element.dataset.branchId);
    const record = element.closest("[data-record]");
    if (record) {
      const id = record.dataset.record, event = contract.events[id]; if (!event || event.branch !== branch) return null;
      const key = destinationKey(url), destination = [event.post, ...(event.additionalPosts || [])].some(post => key === destinationKey(post)) ? "instagram_post" : event.tickets && key === destinationKey(event.tickets) ? "tickets" : null;
      return destination ? decision("programming_action_click", destination, destination === "tickets" ? "tickets" : "post", branch, { event_id: id }) : null;
    }
    const seriesNode = element.closest(".sy-agenda-series");
    if (seriesNode) {
      const ids = [...seriesNode.querySelectorAll("[data-record]")].map(record => record.dataset.record);
      for (const [id, series] of Object.entries(contract.series)) if (series.branch === branch && ids.length && ids.every(record => series.events.includes(record)) && destinationKey(url) === destinationKey(series.post)) return decision("programming_action_click", "instagram_post", "post", branch, { series_id: id });
      return null;
    }
    const campaign = element.closest("[data-campaign]")?.dataset.campaign;
    if (contract.editorialCampaigns.includes(campaign) && hosts.has(url.hostname) && contract.routes[route(url.pathname)] === branch) return decision("programming_action_click", "branch", "programming_action_click", branch, { campaign_id: campaign });
    // Compatibility for already-open pages with the old immutable branch bundles.
    const oldHandler = document.querySelector('script[src*="_script_index_1_lang.BlqKqRiJ.js"]');
    const oldOwned = element.matches(".hh-reserve,.bf-book,.header-reserve,.hh-nav-menu,.hh-welcome-menu,.hh-table-copy>a,.bf-navigation a[hreflang]") || url.protocol === "tel:" || (url.hostname === "www.google.com" && url.pathname.startsWith("/maps")) || element.closest(".bf-social");
    if (document.body.dataset.branch && oldHandler && oldOwned) return null;
    if (element.matches(".ct-nav-contact,.ct-opening-contact,.ct-text-link")) return decision("catering_contact_click", "contact_section", "contact_section");
    if (pageBranch() === "catering" && url.hostname === "wa.me") return decision("catering_contact_click", "whatsapp");
    if ((element.matches(".hh-language,.ct-language-switch") || element.lang) && ["es", "en"].includes(element.lang) && hosts.has(url.hostname) && route(url.pathname)) return decision("language_switch_click", "language", "language_switch_click", branch, { language: element.lang, destination_language: element.lang });
    if (["www.opentable.com", "opentable.com", "wa.me"].includes(url.hostname)) return decision("reservation_click", url.hostname === "wa.me" ? "whatsapp" : "reservation", "reservation_click", destinationBranch(url, branch));
    if (url.protocol === "tel:") return decision("phone_click", "phone", "phone_click", destinationBranch(url, branch));
    if (["www.google.com", "maps.google.com", "maps.app.goo.gl"].includes(url.hostname) && (url.pathname.startsWith("/maps") || url.hostname === "maps.app.goo.gl")) return decision("directions_click", "maps");
    if (element.closest(".bf-social") || element.matches(".ct-profile-link")) {
      const social = { "instagram.com": "instagram_profile", "www.instagram.com": "instagram_profile", "facebook.com": "facebook", "www.facebook.com": "facebook", "www.tiktok.com": "tiktok", "tiktok.com": "tiktok" }[url.hostname];
      return social ? decision(pageBranch() === "catering" ? "catering_contact_click" : "social_click", social, pageBranch() === "catering" ? "instagram" : "social_click") : null;
    }
    if (!hosts.has(url.hostname)) return null;
    const destination = route(url.pathname);
    if (destination === route(window.location.pathname) && url.hash.startsWith("#programacion-")) return decision("programming_action_click", "agenda_section", "agenda_section");
    if (["/catering", "/en/catering"].includes(destination)) return decision("catering_click", "catering");
    if (destination?.endsWith("/menu")) return decision("menu_click", "menu", "menu_click", contract.routes[destination]);
    if (!["group", "catering", undefined].includes(contract.routes[destination])) return decision("branch_click", "branch", "branch_click", contract.routes[destination]);
    if (destination === "/locations" || (destination === "/" && url.hash === "#ubicaciones")) return decision("location_selector_open", "selector");
    return null;
  }
  document.addEventListener("click", event => {
    if (event.isTrusted === false) return;
    const element = event.target instanceof Element ? event.target.closest("a[href],button[data-venue-filter],button[data-lang-btn]") : null;
    if (!element) return; const chosen = identify(element); if (chosen) send(chosen.name, chosen.data);
  }, true);
  document.addEventListener("auxclick", event => {
    if (event.isTrusted === false || event.button !== 1) return;
    const element = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!element) return; const chosen = identify(element); if (chosen) send(chosen.name, chosen.data);
  }, true);
  if (!disabled() && !document.querySelector("#sy-umami-tracker")) {
    const tracker = document.createElement("script"); tracker.id = "sy-umami-tracker";
    tracker.src = "https://analytics.despertartdigital.cloud/script.js"; tracker.async = true; tracker.referrerPolicy = "origin";
    for (const [name, value] of Object.entries({ "data-website-id": websiteId, "data-domains": [...hosts].join(","), "data-do-not-track": "true", "data-exclude-search": "true", "data-exclude-hash": "true", "data-before-send": "sySiteAnalyticsSanitize" })) tracker.setAttribute(name, value);
    tracker.addEventListener("load", () => { if (typeof window.umami?.track === "function") pending.splice(0).forEach(item => { if (Date.now() - item.at < 60000) send(item.name, item.data, true); }); });
    tracker.addEventListener("error", () => { pending.length = 0; }); document.head.appendChild(tracker);
  }
})();
