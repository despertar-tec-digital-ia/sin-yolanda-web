(function (scope) {
  "use strict";
  const zones = { houston: "America/Chicago", "san-antonio": "America/Chicago", "the-woodlands": "America/Chicago", "el-paso": "America/Denver" };
  const effectiveDate = "2026-10-29";
  const summaries = {
    es: "Lun–Mié cerrado · Jue 4 pm–12 am · Vie–Sáb 4 pm–2 am · Dom 11 am–2 am",
    en: "Mon–Wed closed · Thu 4 pm–12 am · Fri–Sat 4 pm–2 am · Sun 11 am–2 am"
  };
  const periods = [
    { days: ["Monday", "Tuesday", "Wednesday"], es: "Lunes a miércoles", en: "Monday to Wednesday", closed: true },
    { days: ["Thursday"], es: "Jueves", en: "Thursday", opens: "16:00", closes: "00:00" },
    { days: ["Friday", "Saturday"], es: "Viernes y sábado", en: "Friday and Saturday", opens: "16:00", closes: "02:00" },
    { days: ["Sunday"], es: "Domingo", en: "Sunday", opens: "11:00", closes: "02:00" }
  ];
  function localDay(now, zone) {
    const parts = new Intl.DateTimeFormat("en", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
    return ["year", "month", "day"].map(type => parts.find(p => p.type === type).value).join("-");
  }
  const active = (id, now = new Date()) => Boolean(zones[id]) && localDay(now, zones[id]) >= effectiveDate;
  const specification = () => periods.map(p => ({ "@type": "OpeningHoursSpecification", dayOfWeek: p.days.map(day => "https://schema.org/" + day), opens: p.opens || "00:00", closes: p.closes || "00:00" }));
  function html(language, zone) {
    const en = language === "en", label = clock => {
      const [h, m] = clock.split(":").map(Number);
      return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${en ? (h < 12 ? "AM" : "PM") : (h < 12 ? "a. m." : "p. m.")}`;
    };
    return `<div class="ve-hours" data-hours-zone="${zone}"><h3>${en ? "Hours" : "Horario"}</h3><dl>${periods.map(p => `<div><dt>${p[language]}</dt><dd>${p.closed ? (en ? "Closed" : "Cerrado") : `<time datetime="${p.opens}">${label(p.opens)}</time><span aria-hidden="true"> – </span><span class="ve-sr"> ${en ? "to" : "a"} </span><time datetime="${p.closes}">${label(p.closes)}</time>`}</dd></div>`).join("")}</dl><p class="ve-sr">${en ? "Local time. A 2:00 AM closing is on the following day." : "Hora local. El cierre a las 2:00 a. m. corresponde al día siguiente."}</p></div>`;
  }
  function notice(language) {
    return `<p class="sy-hours-notice" data-october-hours-notice>${language === "en" ? "New hours from October 29: " : "Nuevo horario desde el 29 de octubre: "}${summaries[language]}.</p>`;
  }
  function applyToData(data, now = new Date()) {
    for (const branch of data.branches) if (active(branch.id, now)) branch.hours = summaries.es;
  }
  scope.SY_OCTOBER_HOURS = { zones, effectiveDate, summaries, periods, active, specification, html, notice, applyToData };
  if (!scope.document) return;
  function refresh() {
    scope.document.querySelectorAll("[data-october-approval] [data-expires-at]").forEach(node => {
      if (Date.now() >= Date.parse(node.dataset.expiresAt)) node.remove();
    });
    scope.document.querySelectorAll(".sy-october-dates").forEach(node => {
      if (!node.querySelector("article")) node.remove();
    });
    const id = scope.document.body.dataset.branch;
    if (active(id)) {
      const hours = scope.document.querySelector(".ve-hours");
      if (hours && !hours.hasAttribute("data-october-active")) {
        const wrapper = scope.document.createElement("div"); wrapper.innerHTML = html(scope.document.documentElement.lang === "en" ? "en" : "es", zones[id]);
        wrapper.firstElementChild.setAttribute("data-october-active", ""); hours.replaceWith(wrapper.firstElementChild);
      }
      scope.document.querySelectorAll("[data-october-hours-notice]").forEach(node => node.remove());
      scope.document.querySelectorAll('script[type="application/ld+json"]').forEach(node => {
        const value = JSON.parse(node.textContent);
        if (value["@type"] === "Restaurant") { value.openingHoursSpecification = specification(); node.textContent = JSON.stringify(value); }
      });
    }
    if (scope.SY_DATA) applyToData(scope.SY_DATA);
  }
  scope.document.addEventListener("DOMContentLoaded", refresh);
  scope.document.addEventListener("visibilitychange", refresh);
  scope.setInterval(refresh, 60000);
})(typeof window === "undefined" ? globalThis : window);
