/* Anonymous site measurement. This module never changes navigation or presentation. */
(function () {
  "use strict";

  const hosts = new Set(["sin-yolanda.com", "www.sin-yolanda.com"]);
  const websiteId = "cbfa7fb3-230e-405c-a0b8-06c762d6216b";
  const publicRoutes = new Set([
    "/", "/locations", "/la-cantina", "/catering", "/eventos", "/tienda",
    "/el-paso", "/san-ignacio", "/san-antonio", "/the-woodlands", "/houston",
    "/aviso-de-privacidad", "/en/houston", "/houston/menu", "/en/san-antonio",
    "/san-antonio/menu", "/en/san-antonio/menu", "/en/the-woodlands",
    "/the-woodlands/menu", "/san-ignacio/menu", "/en/el-paso", "/en/catering",
  ]);
  const branches = new Set(["group", "catering", "san-ignacio", "san-antonio", "the-woodlands", "houston", "el-paso"]);
  const actions = new Set([
    "location_select", "location_selector_open", "branch_click", "catering_click",
    "reservation_click", "menu_click", "phone_click", "directions_click", "social_click",
    "programming_action_click", "language_switch_click", "filter_all", "filter_mx", "filter_us",
    "filter_soon", "contact_section", "instagram",
  ]);
  const events = new Set([
    "location_select", "location_selector_open", "branch_click", "catering_click",
    "reservation_click", "menu_click", "phone_click", "directions_click", "social_click",
    "programming_action_click", "language_switch_click", "location_filter_click", "catering_contact_click",
  ]);

  function route(pathname) {
    const clean = pathname.replace(/\/index(?:\.html)?\/?$/, "/").replace(/\.html$/, "").replace(/\/$/, "") || "/";
    return publicRoutes.has(clean) ? clean : null;
  }

  function disabled() {
    if ([navigator.doNotTrack, navigator.msDoNotTrack, window.doNotTrack].some(value => value === "1" || value === "yes")) return true;
    try { return Boolean(window.localStorage.getItem("umami.disabled")); } catch { return false; }
  }

  if (window.location.protocol !== "https:" || !hosts.has(window.location.hostname) || !route(window.location.pathname) || disabled()) return;
  if (window.__sySiteAnalytics || typeof window.sySiteAnalyticsSanitize !== "undefined") return;
  window.__sySiteAnalytics = true;

  const previousHookName = document.currentScript?.getAttribute("data-before-send") || "sySiteAnalyticsBeforeSend";
  const previousHook = typeof window[previousHookName] === "function" ? window[previousHookName] : null;

  function safeReferrer(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") return "";
      return url.origin + (hosts.has(url.hostname) ? route(url.pathname) || "" : "");
    } catch { return ""; }
  }

  function safePayload(payload) {
    const pathname = route(window.location.pathname);
    if (!payload || !pathname || disabled()) return false;
    if (payload.name && !events.has(payload.name)) return false;
    const result = {
      website: websiteId,
      hostname: window.location.hostname,
      url: pathname,
      title: "Sin Yolanda",
      referrer: safeReferrer(payload.referrer),
    };
    if (typeof payload.language === "string" && /^[a-z]{2}(?:-[A-Za-z]{2})?$/.test(payload.language)) result.language = payload.language;
    if (typeof payload.screen === "string" && /^\d{1,5}x\d{1,5}$/.test(payload.screen)) result.screen = payload.screen;
    if (payload.name) {
      const data = payload.data || {};
      if (!actions.has(data.action) || !branches.has(data.branch) || !["es", "en"].includes(data.language)) return false;
      result.name = payload.name;
      result.data = { action: data.action, branch: data.branch, language: data.language };
    }
    return result;
  }

  // A configured hook keeps its identity and can still veto a send. Our hook sanitizes its result.
  window.sySiteAnalyticsSanitize = function (type, payload) {
    try {
      const prepared = previousHook ? previousHook(type, payload) : payload;
      return prepared && typeof prepared.then === "function" ? prepared.then(safePayload).catch(() => false) : safePayload(prepared);
    } catch { return false; }
  };

  const pending = [];
  function send(name, data) {
    if (disabled()) return;
    if (typeof window.umami?.track !== "function") {
      if (pending.length < 20) pending.push([name, data]);
      return;
    }
    try { Promise.resolve(window.umami.track(name, data)).catch(() => {}); } catch { /* Analytics never blocks a link. */ }
  }

  function branchFromPath(pathname) {
    const match = route(pathname)?.match(/^\/(?:en\/)?(san-ignacio|san-antonio|the-woodlands|houston|el-paso)(?:\/menu)?$/);
    return match?.[1] || null;
  }

  function contextBranch(element) {
    const owner = element.closest("[data-branch-id],[data-branch],[data-agenda-branch]");
    const explicit = owner?.dataset.branchId || owner?.dataset.branch || owner?.dataset.agendaBranch;
    if (branches.has(explicit)) return explicit;
    const card = element.closest(".location-card");
    if (card) {
      for (const link of card.querySelectorAll("a[href]")) {
        try {
          const url = new URL(link.getAttribute("href"), window.location.href);
          const branch = hosts.has(url.hostname) && branchFromPath(url.pathname);
          if (branch) return branch;
        } catch { /* Ignore a malformed destination. */ }
      }
    }
    return branchFromPath(window.location.pathname) || (route(window.location.pathname)?.endsWith("/catering") ? "catering" : "group");
  }

  function destinationBranch(url, fallback) {
    // Public data identifies existing official contacts; neither URL nor phone is sent.
    for (const branch of window.SY_DATA?.branches || []) {
      if (!branches.has(branch.id)) continue;
      if (url.protocol === "tel:" && url.pathname === branch.phoneIntl) return branch.id;
      if (url.hostname === "wa.me" && url.pathname === "/" + branch.whatsapp && branch.whatsapp) return branch.id;
      try {
        const reservation = new URL(branch.reserveUrl);
        if (reservation.origin === url.origin && reservation.pathname === url.pathname) return branch.id;
      } catch { /* Not every branch has an online reservation URL. */ }
    }
    return fallback;
  }

  function identify(element) {
    const branch = contextBranch(element);
    const language = document.documentElement.lang === "en" ? "en" : "es";
    const decision = (name, action = name, targetBranch = branch, targetLanguage = language) => ({
      name, data: { branch: targetBranch, language: targetLanguage, action },
    });
    const filter = element.dataset.venueFilter;
    if (["all", "mx", "us", "soon"].includes(filter)) return decision("location_filter_click", "filter_" + filter);
    if (element.matches("[data-select-location]")) return decision("location_selector_open");
    if (!element.matches("a[href]")) {
      return ["es", "en"].includes(element.dataset.langBtn) ? decision("language_switch_click", "language_switch_click", branch, element.dataset.langBtn) : null;
    }
    let url;
    try { url = new URL(element.getAttribute("href"), window.location.href); } catch { return null; }
    if (element.matches("[data-venue]") && branches.has(element.dataset.branchId)) return decision("location_select", "location_select", element.dataset.branchId);
    // These existing handlers send directly to Umami. Do not bridge their custom event again.
    if (element.matches("[data-programming-action]")) return null;
    const branchHandler = document.querySelector('script[src*="/BranchLanding.astro_astro_type_script_index_0_"],script[src*="/BranchLanding.astro_astro_type_script_index_1_"],script[src*="/BranchLayout.astro_astro_type_script_index_1_"]');
    const branchOwnedAction = element.matches(".hh-reserve,.bf-book,.header-reserve,.hh-nav-menu,.hh-welcome-menu,.hh-table-copy>a,.bf-navigation a[hreflang]") || url.protocol === "tel:" || (url.hostname === "www.google.com" && url.pathname.startsWith("/maps")) || element.closest(".bf-social");
    if (document.body.dataset.branch && branchHandler && branchOwnedAction) return null;
    if (element.matches(".ct-nav-contact,.ct-opening-contact,.ct-text-link")) return decision("catering_contact_click", "contact_section");
    if (element.matches(".ct-profile-link") && url.hostname === "www.instagram.com") return decision("catering_contact_click", "instagram");
    if ((element.matches(".hh-language,.ct-language-switch") || element.lang) && ["es", "en"].includes(element.lang) && hosts.has(url.hostname) && route(url.pathname)) return decision("language_switch_click", "language_switch_click", branch, element.lang);
    if (url.hostname === "www.opentable.com" || url.hostname === "opentable.com" || url.hostname === "wa.me") return decision("reservation_click", "reservation_click", destinationBranch(url, branch));
    if (url.protocol === "tel:") return decision("phone_click", "phone_click", destinationBranch(url, branch));
    if (["www.google.com", "maps.google.com", "maps.app.goo.gl"].includes(url.hostname) && (url.pathname.startsWith("/maps") || url.hostname === "maps.app.goo.gl")) return decision("directions_click");
    if (!hosts.has(url.hostname)) return null;
    const destination = route(url.pathname);
    if (destination === "/catering" || destination === "/en/catering") return decision("catering_click");
    if (destination?.endsWith("/menu")) return decision("menu_click", "menu_click", branchFromPath(url.pathname) || branch);
    if (branchFromPath(url.pathname)) return decision("branch_click", "branch_click", branchFromPath(url.pathname));
    if (destination === "/locations" || (destination === "/" && url.hash === "#ubicaciones")) return decision("location_selector_open");
    return null;
  }

  document.addEventListener("click", event => {
    if (event.isTrusted === false) return;
    const element = event.target instanceof Element ? event.target.closest("a[href],button[data-venue-filter],button[data-lang-btn]") : null;
    if (!element) return;
    const chosen = identify(element);
    if (chosen) send(chosen.name, chosen.data);
  });

  if (!document.querySelector("#sy-umami-tracker")) {
    const tracker = document.createElement("script");
    tracker.id = "sy-umami-tracker";
    tracker.src = "https://analytics.despertartdigital.cloud/script.js";
    tracker.async = true;
    tracker.referrerPolicy = "origin";
    for (const [name, value] of Object.entries({
      "data-website-id": websiteId,
      "data-domains": [...hosts].join(","),
      "data-do-not-track": "true",
      "data-exclude-search": "true",
      "data-exclude-hash": "true",
      "data-before-send": "sySiteAnalyticsSanitize",
    })) tracker.setAttribute(name, value);
    tracker.addEventListener("load", () => {
      if (typeof window.umami?.track === "function") pending.splice(0).forEach(([name, data]) => send(name, data));
    });
    tracker.addEventListener("error", () => { pending.length = 0; });
    document.head.appendChild(tracker);
  }
})();
