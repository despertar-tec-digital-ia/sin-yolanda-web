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
