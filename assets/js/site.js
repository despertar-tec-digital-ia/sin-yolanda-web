(function () {
  "use strict";

  const data = window.SY_DATA;
  const page = document.body.dataset.page || "home";
  const branchId = document.body.dataset.branch || "";
  const root = document.getElementById("site-shell");

  const branchById = (id) => data.branches.find((branch) => branch.id === id);
  const displayRating = (value) => (value ? value.toFixed(1) : "—");
  const statusBadge = (label, tone = "neutral") => `<span class="status status-${tone}">${label}</span>`;

  function publicHeader() {
    return `
      <div class="demo-bar">SIN YOLANDA® · Cantina contemporánea · Guadalajara y Texas</div>
      <header class="public-header">
        <a class="brand" href="index.html" aria-label="Sin Yolanda, inicio">
          <img src="assets/media/brand-logo-gdl.png" alt="Sin Yolanda" />
        </a>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="public-nav">Menú</button>
        <nav id="public-nav" class="public-nav" aria-label="Navegación principal">
          <a href="locations.html">Ubicaciones</a>
          <a href="eventos.html">Eventos</a>
          <a href="la-cantina.html">La Cantina</a>
          <a href="index.html#cumple">Cumpleaños</a>
          <a class="nav-cta" href="locations.html">Reservar mesa</a>
        </nav>
      </header>`;
  }

  function publicFooter() {
    return `
      <footer class="public-footer">
        <div>
          <img src="assets/media/brand-logo-gdl.png" alt="Sin Yolanda" />
          <p>Una marca que vive en cada ciudad: Guadalajara y Texas.</p>
        </div>
        <div>
          <strong>Explora</strong>
          <a href="la-cantina.html">La Cantina</a>
          <a href="catering.html">Catering</a>
          <a href="eventos.html">Eventos</a>
          <a href="locations.html">Ubicaciones</a>
          <a href="el-paso.html">El Paso</a>
        </div>
        <div>
          <strong>Sucursales abiertas</strong>
          <a href="san-ignacio.html">Sin Yolanda Guadalajara · Av. San Ignacio 78, Zapopan, Jal.</a>
          <a href="san-antonio.html">San Antonio · 415 E Commerce St, TX</a>
          <a href="the-woodlands.html">The Woodlands · 1400 Research Forest Dr, Shenandoah, TX</a>
          <a href="houston.html">Houston · 4901 Washington Ave, TX</a>
        </div>
        <div>
          <strong>Próximamente</strong>
          <span>El Paso · 340 Vin Rambla Dr, TX</span>
          <span>Moreno Valley, CA</span>
          <span>San Diego, CA</span>
        </div>
        <div>
          <strong>Reservaciones</strong>
          <p>OpenTable en Texas · WhatsApp en Guadalajara.</p>
          <a class="footer-hub" href="aviso-de-privacidad.html">Aviso de privacidad</a>
        </div>
      </footer>`;
  }

  function locationCard(branch) {
    const isSoon = branch.status === "coming-soon";
    return `
      <article class="location-card" data-region="${branch.region}" data-status="${branch.status}">
        <div class="location-card-media">
          <img src="${branch.image}" alt="${branch.name}" />
          ${statusBadge(branch.statusLabel, isSoon ? "warning" : "success")}
        </div>
        <div class="location-card-body">
          <p>${branch.city} · ${branch.country}</p>
          <h3>${branch.name}</h3>
          <span>${branch.concept}</span>
          <div class="card-actions">
            ${isSoon
              ? `${branch.page !== "#" ? `<a class="button button-primary" href="${branch.page}">Ver sucursal</a>` : ""}${branch.socialUrl
                  ? `<a class="button button-primary" href="${branch.socialUrl}" target="_blank" rel="noopener">Seguir la apertura</a>`
                  : ""}`
              : `<a class="button button-primary" href="${branch.reserveChannel === "opentable" ? branch.reserveUrl : `https://wa.me/${branch.whatsapp}`}" target="_blank" rel="noopener">Reservar</a>
                 <a class="button button-ghost" href="${branch.page}">Ver sucursal</a>
                 <a class="text-button" href="${branch.mapsUrl}" target="_blank" rel="noopener">Cómo llegar</a>`}
          </div>
        </div>
      </article>`;
  }

  function venueShowcase() {
    const branches = data.branches.filter((branch) => ["active", "coming-soon"].includes(branch.status));
    return `
        <section class="section venue-showcase" id="ubicaciones" tabindex="-1" aria-labelledby="venue-heading">
          <div class="section-heading"><div><h2 id="venue-heading">Cuál te queda</h2></div><p>México y Estados Unidos</p></div>
          <div class="filter-chips" role="group" aria-label="Filtrar ubicaciones" data-venue-filters>
            <button class="filter active" type="button" data-venue-filter="all" aria-pressed="true">Todas</button>
            <button class="filter" type="button" data-venue-filter="mx" aria-pressed="false">México</button>
            <button class="filter" type="button" data-venue-filter="us" aria-pressed="false">Estados Unidos</button>
            <button class="filter" type="button" data-venue-filter="soon" aria-pressed="false">Próximamente</button>
          </div>
          <ul class="venue-gallery" data-venue-gallery>
            ${branches.map((branch, index) => {
              const hasPage = branch.page !== "#";
              const tag = hasPage ? "a" : "div";
              const name = branch.shortName;
              const hasOpeningDate = branch.status === "coming-soon" && branch.openingDate === "2026-10-09";
              const opening = hasOpeningDate ? "Abre el 9 de octubre" : "Próximamente";
              return `<li class="venue-item${index === 0 ? " is-open" : ""}" data-venue-item data-region="${branch.region}" data-status="${branch.status}">
              <${tag} class="venue-card${index === 0 ? " is-open" : ""}${branch.status === "coming-soon" ? " venue-card--soon" : ""}${branch.venuePhoto ? "" : " venue-card--announcement"}"${hasPage ? ` href="${branch.page}"` : ""} data-venue data-branch-id="${branch.id}">
                <span class="venue-frame" aria-hidden="true">${branch.venuePhoto ? `<img src="${branch.venuePhoto}" alt="" width="1400" height="1000" loading="lazy" decoding="async" style="object-position:${branch.venuePosition || "50% 50%"}" />` : `<span class="venue-announcement">Sin Yolanda<span>Próximamente</span></span>`}<span class="venue-shade"></span></span>
                <span class="venue-location" aria-hidden="true">${branch.country === "México" ? "Jalisco, México" : branch.city}</span>
                <span class="venue-collapsed" aria-hidden="true">${name}</span>
                ${hasOpeningDate ? `<span class="venue-opening-date" aria-hidden="true"><span>Abre</span>9 OCT</span>` : ""}
                <span class="venue-label">
                  ${branch.status === "coming-soon" ? `<span class="venue-badge${hasOpeningDate ? " venue-badge--opening" : ""}">${opening}</span>` : ""}
                  <strong>${name}</strong>
                  <span class="venue-city">${branch.venueCity || branch.city}</span>
                  ${hasPage ? `<span class="venue-invitation" aria-hidden="true">Ver sucursal <svg viewBox="0 0 20 20" fill="none"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.5"></path></svg></span>` : ""}
                </span>
              </${tag}>
              </li>`;
            }).join("")}
          </ul>
          <p class="venue-sr" data-venue-status aria-live="polite" aria-atomic="true"></p>
        </section>`;
  }

  function openingAnnouncement() {
    const branch = data.branches.find((item) => item.id === "el-paso");
    if (!branch || branch.status !== "coming-soon" || branch.openingDate !== "2026-10-09") return "";
    return `<aside class="opening-announcement" aria-label="Próxima apertura">
      <div class="opening-announcement-inner">
        <p class="opening-announcement-details"><span>Próxima apertura</span>
          <strong><a href="${branch.page}">El Paso</a></strong>
          <time datetime="${branch.openingDate}">9 de octubre</time></p>
        <a class="opening-announcement-link" href="${branch.page}">Conoce la sucursal
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5"/></svg></a>
      </div>
    </aside>`;
  }

  function homePage() {
    const plan = [
      ["Comida", "images/houston-entry-study/table-1600.webp", "Para el centro de la mesa. Se comparte o no se pide."],
      ["Tragos", "assets/media/cocktail.webp", "Coquetos. Sin lista de precios: pregunta y te contamos."],
      ["Música", "assets/media/hero-night.webp", "Canciones que te sabes completas.", "50% 22%"],
      ["Micrófono", "assets/media/karaoke.webp", "Pasa por las mesas. Nadie se lo niega a nadie.", "50% 42%"],
      ["La banda", "assets/media/interior.webp", "Trae a los cuatro. Aquí caben todos."],
      ["Celebraciones", "assets/media/hospitality.webp", "Cumpleaños, renuncias, quincenas. Cualquier pretexto.", "50% 12%"],
    ];
    const pretextos = [
      ["Cumpleaños", "Aquí se entera todo el lugar."],
      ["Quincena", "Cayó. Eso cuenta."],
      ["Renuncia", "Mañana vemos qué sigue. Hoy se arma."],
      ["Divorcio", "¿Ya firmaste? Pues eso se festeja."],
      ["Viernes", "¿Neta necesitas más pretexto?"],
      ["Porque sí", "El mejor de todos."],
    ];
    return `
      ${publicHeader()}
      <main>
        <section class="home-hero home-hero-cinema" id="inicio">
          <div class="hero-video-wrap" aria-hidden="true">
            <video
              class="hero-video"
              autoplay
              muted
              loop
              playsinline
              preload="metadata"
              poster="assets/media/hero-fiesta-real-poster.webp"
              data-hero-video>
              <source src="assets/media/hero-fiesta-real.mp4" type="video/mp4" />
            </video>
          </div>
          <div class="hero-overlay hero-overlay-cinema"></div>
          <div class="hero-copy hero-copy-cinema">
            <h1 class="hero-rotulo">
              <span class="rotulo-sr">No hay tiempo para llorar</span>
              <svg class="rotulo-art" viewBox="0 0 600 540" aria-hidden="true" focusable="false"><defs><path id="rotulo-arch" d="M85 109 Q300 42 515 109"></path><path id="rotulo-time-arch" d="M20 255 Q300 177 580 255"></path><path id="rotulo-last-arch" d="M25 427 Q300 507 575 427"></path><g id="rotulo-no-hay"><text class="rotulo-overture"><textPath href="#rotulo-arch" startOffset="50%" text-anchor="middle">NO HAY</textPath></text></g><g id="rotulo-tiempo"><text textLength="534" lengthAdjust="spacingAndGlyphs" class="rotulo-main-word"><textPath href="#rotulo-time-arch" startOffset="50%" text-anchor="middle">TIEMPO</textPath></text></g><g id="rotulo-llorar"><text textLength="534" lengthAdjust="spacingAndGlyphs" class="rotulo-last-word"><textPath href="#rotulo-last-arch" startOffset="50%" text-anchor="middle">LLORAR</textPath></text></g></defs><g class="rotulo-top"><use href="#rotulo-no-hay" class="rotulo-edge" transform="translate(3 4)"></use><use href="#rotulo-no-hay" class="rotulo-face"></use></g><g class="rotulo-center"><use href="#rotulo-tiempo" class="rotulo-depth" transform="translate(7 9.1)"></use><use href="#rotulo-tiempo" class="rotulo-depth" transform="translate(6 7.8)"></use><use href="#rotulo-tiempo" class="rotulo-depth" transform="translate(5 6.5)"></use><use href="#rotulo-tiempo" class="rotulo-depth" transform="translate(4 5.2)"></use><use href="#rotulo-tiempo" class="rotulo-depth" transform="translate(3 3.9)"></use><use href="#rotulo-tiempo" class="rotulo-depth" transform="translate(2 2.6)"></use><use href="#rotulo-tiempo" class="rotulo-depth" transform="translate(1 1.3)"></use><use href="#rotulo-tiempo" class="rotulo-outline"></use><use href="#rotulo-tiempo" class="rotulo-face"></use></g><g class="rotulo-bridge" fill="currentColor"><path d="M95 295 Q155 279 220 295 Q155 285 95 300Z"></path><text x="300" y="307" text-anchor="middle">para</text><path d="M505 295 Q445 279 380 295 Q445 285 505 300Z"></path></g><g class="rotulo-finale"><use href="#rotulo-llorar" class="rotulo-depth" transform="translate(7 9.1)"></use><use href="#rotulo-llorar" class="rotulo-depth" transform="translate(6 7.8)"></use><use href="#rotulo-llorar" class="rotulo-depth" transform="translate(5 6.5)"></use><use href="#rotulo-llorar" class="rotulo-depth" transform="translate(4 5.2)"></use><use href="#rotulo-llorar" class="rotulo-depth" transform="translate(3 3.9)"></use><use href="#rotulo-llorar" class="rotulo-depth" transform="translate(2 2.6)"></use><use href="#rotulo-llorar" class="rotulo-depth" transform="translate(1 1.3)"></use><use href="#rotulo-llorar" class="rotulo-outline"></use><use href="#rotulo-llorar" class="rotulo-face"></use><path class="rotulo-underline" d="M100 485 Q300 528 500 485 Q300 543 100 485Z"></path></g></svg>
            </h1>
            <p class="hero-sub">Comida que sí llena, tragos coquetos y canciones que se gritan completas.</p>
            <div class="hero-actions">
              <a class="button button-primary" href="#ubicaciones" data-select-location>Reserva tu mesa</a>
              <a class="button button-ghost-light" href="#ubicaciones" data-select-location>Encuentra tu Sin Yolanda</a>
            </div>
            <p class="hero-micro">México · Texas</p>
          </div>
        </section>

        ${openingAnnouncement()}


        <section class="section section-after-hero" id="plan">
          <div class="section-heading"><div><p class="eyebrow">El plan</p><h2 class="reveal">El plan ya está armado.</h2></div><p>Tú solo trae el pretexto.</p></div>
          <div class="event-grid">
            ${plan.map(([titulo, img, texto, position = "50% 50%"], i) => `<article class="reveal-scale" style="animation-delay:${0.08 * i}s"><img src="${img}" alt="${titulo}" loading="lazy" width="640" height="420" style="object-position:${position}" /><h3>${titulo}</h3><p>${texto}</p></article>`).join("")}
          </div>
        </section>

        <section class="section pretextos-section">
          <div class="section-heading"><div><p class="eyebrow">Los pretextos</p><h2 class="reveal">Se aceptan pretextos chiquitos.</h2></div></div>
          <div class="pretextos-grid">
            ${pretextos.map(([nombre, remate], i) => `<a class="pretexto-card reveal-scale" href="#ubicaciones" data-select-location style="animation-delay:${0.08 * i}s"><strong>${nombre}</strong><em>“${remate}”</em><small>Elegir sucursal</small></a>`).join("")}
          </div>
        </section>

        ${homeAgenda()}

        <section class="experience-section" id="experiencia">
          <div class="experience-media"><img src="assets/media/celebration.webp" alt="Ruleta de shots y bebidas sobre una mesa de Sin Yolanda" loading="lazy" width="1600" height="2000" /></div>
          <div class="experience-copy">
            <p class="eyebrow">La casa por dentro</p>
            <h2 class="reveal">Trae a los cuatro.</h2>
            <p>Mesas largas, brinde completo y el micrófono que no se le niega a nadie. Aquí no hay mesa reservada para influencers: la mejor foto la hace tu gente.</p>
            <div class="mini-menu"><span>Gastronomía mexicana contemporánea</span><span>Música y participación social</span><span>Celebraciones con intención</span><span>Hospitalidad local, visión corporativa</span></div>
          </div>
        </section>

        <section class="section botana-section" id="botaneo">
          <div class="section-heading"><div><p class="eyebrow">Comida + tragos</p><h2 class="reveal">Aquí se botanea en serio.</h2></div><p>Tragos coquetos y comida que sí llena.</p></div>
          <div class="event-grid">
            <article><h3>Para botanear</h3><p>Guacamole con chicharrón, queso fundido y quesabirria con consomé. El centro de la mesa se comparte.</p></article>
            <article><h3>Para echarse una</h3><p>Paloma de la casa, carajillo y más de 30 marcas de agave. Pregunta: aquí te contamos.</p></article>
            <article><h3>Para cantar</h3><p>El micrófono pasa por las mesas. La canción la eliges tú y el coro lo pone el lugar.</p></article>
          </div>
          <a class="button button-primary" href="la-cantina.html">Ver la carta</a>
        </section>

        <section class="section cumple-section" id="cumple">
          <div class="section-heading"><div><p class="eyebrow">Celebraciones</p><h2 class="reveal">¿Cumpleaños?</h2></div></div>
          <p class="cumple-copy">Tu gente, una mesa y un buen pretexto. Elige tu sucursal y consulta disponibilidad para celebrar.</p>
          <div class="hero-actions">
            <a class="button button-primary" href="#ubicaciones" data-select-location>Elegir sucursal</a>
          </div>
        </section>

        ${venueShowcase()}

        <section class="reserve-cta" id="reserve">
          <div><p class="eyebrow">¿Sin Yolanda? Si sabes, sabes.</p><h2 class="reveal">Ya quedó.</h2></div>
          <div><a class="button button-light" href="#ubicaciones">Reservar mesa</a></div>
        </section>
      </main>
      ${publicFooter()}`;
  }

  function hasAgendaProfile(branch) {
    // Reuse the registered location's own public profile, never a guessed account.
    return branch.status === "active" && /^https:\/\/www\.instagram\.com\/[a-z0-9._]+\/$/i.test(branch.socialUrl || "");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function validCalendarDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  }

  function calendarDay(timeZone, now = new Date()) {
    try {
      const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
      const part = type => parts.find(value => value.type === type).value;
      return `${part("year")}-${part("month")}-${part("day")}`;
    } catch (_) { return ""; }
  }

  function calendarLabel(date) {
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `<time datetime="${date}">${Number(date.slice(8))} <span>${months[Number(date.slice(5, 7)) - 1]}</span></time>`;
  }

  function homeCampaigns(now = new Date()) {
    const today = calendarDay("America/Chicago", now);
    if (!today) return [];
    return (data.events || []).filter(event => event.placement === "home" && event.status === "scheduled" &&
      validCalendarDate(event.visibleFrom) && event.visibleFrom <= today && Array.isArray(event.occurrences))
      .map(event => {
        const locations = event.occurrences.map(occurrence => ({ ...occurrence,
          branch: data.branches.find(branch => branch.id === occurrence.branchId) }))
          .filter(occurrence => validCalendarDate(occurrence.date) && occurrence.timeZone &&
            calendarDay(occurrence.timeZone, now) && occurrence.branch?.status === "active" &&
            /^[a-z0-9-]+\.html$/.test(occurrence.branch.page));
        // Home campaigns span locations; local-only promotions stay on their fichas.
        if (new Set(locations.map(occurrence => occurrence.branchId)).size < 2) return null;
        const occurrences = locations.filter(occurrence => occurrence.date >= calendarDay(occurrence.timeZone, now))
          .sort((a, b) => a.date.localeCompare(b.date) || a.branchId.localeCompare(b.branchId));
        return occurrences.length ? { ...event, occurrences } : null;
      }).filter(Boolean).sort((a, b) => a.occurrences[0].date.localeCompare(b.occurrences[0].date));
  }

  function homeAgenda(now = new Date()) {
    const campaigns = homeCampaigns(now);
    if (!campaigns.length) return "";
    return `<section class="section cartelera-section home-agenda" id="cartelera" aria-labelledby="agenda-heading">
      <div class="home-agenda-intro">
        <h2 id="agenda-heading">Lo que viene.</h2>
        <p>Hay fechas que se celebran en más de una cantina. Encuentra la tuya.</p>
      </div>
      <div class="home-campaigns">
        ${campaigns.map(event => {
          const first = event.occurrences[0].date, last = event.occurrences[event.occurrences.length - 1].date;
          return `<article class="home-campaign" data-campaign="${escapeHtml(event.id)}">
            <div class="campaign-dates">${calendarLabel(first)}${first === last ? "" : `<span aria-hidden="true">—</span>${calendarLabel(last)}`}</div>
            <div class="campaign-copy"><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.description)}</p></div>
            <ul class="campaign-locations" aria-label="Sucursales y fechas">
              ${event.occurrences.map(occurrence => `<li><a href="${occurrence.branch.page}" data-agenda-branch="${escapeHtml(occurrence.branchId)}"><span>${escapeHtml(occurrence.branch.shortName)}</span>${calendarLabel(occurrence.date)}<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 10h12M10 4l6 6-6 6"/></svg></a></li>`).join("")}
            </ul>
          </article>`;
        }).join("")}
      </div>
    </section>`;
  }

  function branchAgenda(branch) {
    if (!hasAgendaProfile(branch)) return "";
    return `<section class="section" id="cartelera">
      <div class="section-heading"><div><h2>Eventos y promociones</h2></div></div>
      <p>Consulta la programación de esta sucursal en su Instagram.</p>
      <a class="text-button" href="${branch.socialUrl}" target="_blank" rel="noopener noreferrer">Ver agenda en Instagram</a>
    </section>`;
  }

  function locationsPage() {
    return `
      ${publicHeader()}
      <main>
        <section class="page-hero compact-hero">
          <img src="assets/media/dining.webp" alt="Interior de Sin Yolanda" />
          <div class="hero-overlay"></div>
          <div><p class="eyebrow">Presencia multisucursal</p><h1>Encuentra tu Sin Yolanda.</h1><p>México y Estados Unidos conectados bajo una estructura clara, local y escalable.</p></div>
        </section>
        <section class="section">
          <div class="filter-row" aria-label="Filtrar ubicaciones">
            <button class="filter active" type="button" data-filter="all">Todas</button>
            <button class="filter" type="button" data-filter="mx">México</button>
            <button class="filter" type="button" data-filter="us">Estados Unidos</button>
            <button class="filter" type="button" data-filter="soon">Próximamente</button>
          </div>
          <div class="location-grid detailed">${data.branches.map(locationCard).join("")}</div>
          <p class="data-caveat">Direcciones, teléfonos y horarios verificados contra Google Business Profile el 24 de septiembre de 2026.</p>
        </section>
      </main>
      ${publicFooter()}
      ${modalMarkup()}`;
  }

  function reservationModule(branch) {
    const isOpentable = branch.reserveChannel === "opentable";
    const reserveHref = isOpentable
      ? branch.reserveUrl
      : `https://wa.me/${branch.whatsapp}?text=${encodeURIComponent("Hola, quiero reservar una mesa en " + branch.name + ".")}`;
    const reserveLabel = isOpentable ? "Reservar en OpenTable" : "Reservar por WhatsApp";
    const reserveMark = isOpentable ? "OpenTable" : "WhatsApp";
    const reserveSmall = isOpentable ? "Canal oficial de reservación" : "Canal oficial de la sucursal";
    return `
      <section class="reservation-module" id="branch-reservation" aria-labelledby="reservation-title">
        <div class="reservation-intro">
          <p class="eyebrow">Reservaciones</p>
          <h2 id="reservation-title" class="reveal">Reservar en ${branch.name}</h2>
          <p>Reserva tu mesa por el canal oficial de la sucursal o llámanos directamente. El equipo confirma disponibilidad durante el horario de operación.</p>
          <div class="reservation-benefits">
            <span><strong>01</strong> Canal oficial</span>
            <span><strong>02</strong> Confirmación del equipo</span>
            <span><strong>03</strong> Grupos y celebraciones</span>
          </div>
        </div>
        <div class="reservation-card">
          <div class="reservation-view-heading">
            <div><span class="channel-mark">${reserveMark}</span><small>${reserveSmall}</small></div>
            ${statusBadge("Activo", "success")}
          </div>
          <p><strong>Horarios:</strong> ${branch.hours}</p>
          <p><strong>Teléfono:</strong> <a href="tel:${branch.phoneIntl}">${branch.phone}</a></p>
          <p><strong>Dirección:</strong> ${branch.address}</p>
          <div class="reservation-actions">
            <a class="button reservation-submit" href="${reserveHref}" target="_blank" rel="noopener">${reserveLabel}</a>
            <a class="button button-ghost" href="tel:${branch.phoneIntl}">Llamar a la sucursal</a>
          </div>
          <p class="reservation-disclaimer">Las reservaciones se confirman por el canal oficial de la sucursal dentro del horario de operación.</p>
        </div>
      </section>`;
  }

  function quoteCards(branch) {
    if (branch.quotes && branch.quotes.length) {
      return branch.quotes.map((quote) => `<div class="quote-card reveal-scale" style="animation-delay:0.1s"><span>${"★".repeat(quote.stars)}${"☆".repeat(5 - quote.stars)}</span><blockquote>“${quote.text}”</blockquote><p>${quote.source}</p></div>`).join("");
    }
    return `<div class="quote-card"><span>${"★".repeat(Math.round(branch.rating))}${"☆".repeat(5 - Math.round(branch.rating))}</span><blockquote>Calificación ${branch.rating}★ con ${branch.reviewsTotal} reseñas en Google.</blockquote><p><a href="${branch.gbpUrl}" target="_blank" rel="noopener">Ver reseñas en Google Maps</a></p></div>`;
  }

  function branchPage() {
    const branch = branchById(branchId) || data.branches[0];
    return `
      ${publicHeader()}
      <main>
        <section class="branch-hero">
          <img src="${branch.image}" alt="${branch.name}" />
          <div class="hero-overlay"></div>
          <div class="branch-hero-copy">
            <nav class="breadcrumbs" aria-label="Ruta"><a href="index.html">Inicio</a><span>/</span><a href="locations.html">Ubicaciones</a><span>/</span><span>${branch.shortName}</span></nav>
            <p class="eyebrow">${branch.city} · ${branch.country}</p>
            <h1>${branch.name}</h1>
            <p>${branch.summary}</p>
            <div class="hero-actions">
              <button class="button button-primary" type="button" data-scroll-to="branch-reservation">Reservar</button>
              <a class="button button-light" href="tel:${branch.phoneIntl}">Llamar</a>
              <a class="button button-ghost-light" href="${branch.mapsUrl}" target="_blank" rel="noopener">Cómo llegar</a>
            </div>
          </div>
          <div class="branch-status">${statusBadge(branch.statusLabel, "success")}<span>Perfil verificado en Google</span></div>
        </section>

        <section class="section branch-practical">
          <div><p class="eyebrow">Información práctica</p><h2 class="reveal">Todo lo necesario antes de llegar.</h2><p class="data-caveat">NAP verificado contra Google Business Profile el 24 de septiembre de 2026.</p></div>
          <dl>
            <div><dt>Dirección</dt><dd><a href="${branch.mapsUrl}" target="_blank" rel="noopener">${branch.address}</a></dd></div>
            <div><dt>Horarios</dt><dd>${branch.hours}</dd></div>
            <div><dt>Teléfono</dt><dd><a href="tel:${branch.phoneIntl}">${branch.phone}</a></dd></div>
            <div><dt>Reservaciones</dt><dd>${branch.reserveChannel === "opentable" ? `<a href="${branch.reserveUrl}" target="_blank" rel="noopener">Reservar en OpenTable</a>` : `<a href="https://wa.me/${branch.whatsapp}" target="_blank" rel="noopener">WhatsApp ${branch.phone}</a>`}</dd></div>
            <div><dt>Estacionamiento</dt><dd>${branch.parking}</dd></div>
            <div><dt>Accesibilidad</dt><dd>${branch.accessibility}</dd></div>
          </dl>
        </section>

        ${reservationModule(branch)}

        <section class="menu-highlight">
          <div><img src="assets/media/cocktail.webp" alt="Coctel de Sin Yolanda" /></div>
          <div><p class="eyebrow">Menú de muestra</p><h2 class="reveal">Se botanea en serio.</h2><p>Una selección breve para demostrar cómo el menú puede adaptarse por ciudad, idioma y disponibilidad.</p><div class="mini-menu"><span>Coctelería de autor</span><span>Entradas para compartir</span><span>Cocina mexicana</span><span>Brunch seleccionado</span></div><a class="button button-primary" href="${branch.menuUrl}" target="_blank" rel="noopener">Ver menú</a></div>
        </section>

        ${branchAgenda(branch)}

        <section class="gallery-section"><div class="section-heading"><div><p class="eyebrow">Galería</p><h2 class="reveal">La atmósfera habla primero.</h2></div></div><div class="gallery-grid">${branch.gallery.map((image, index) => `<img src="${image}" alt="${branch.shortName}, fotografía de ambiente ${index + 1}" />`).join("")}</div></section>

        <section class="section split-section">
          <div>
            <p class="eyebrow">Reseñas destacadas</p><h2 class="reveal">Reseñas reales de la banda.</h2>
            ${quoteCards(branch)}
            <div class="owner-response"><strong>Respuesta de propietario</strong><p>Gracias por compartir tu experiencia. Esperamos recibirte nuevamente muy pronto.</p></div>
          </div>
          <div>
            <p class="eyebrow">Directorios preparados</p><h2>Consistencia en cada búsqueda.</h2>
            <div class="directory-grid">${["Google", "Apple Maps", "Bing", "Waze", "Tripadvisor", ...(branch.region === "us" ? ["Yelp"] : [])].map((directory) => directory === "Google" ? `<button type="button" onclick="window.open('${branch.gbpUrl}', '_blank', 'noopener')">Google<span>Verificado</span></button>` : `<button type="button" data-demo-action="El enlace oficial de ${directory} se completa con la verificación de listings.">${directory}<span>En proceso</span></button>`).join("")}</div>
          </div>
        </section>

        <section class="section faq-section"><p class="eyebrow">Preguntas frecuentes</p><h2 class="reveal">Antes de reservar.</h2>${["¿Cómo reservar?", "¿Aceptan grupos?", "¿Dónde estacionarse?", "¿Los horarios cambian durante eventos?", "¿Cómo confirmar una reservación?"].map((question) => `<details><summary>${question}</summary><p>El equipo de la sucursal confirma detalles de grupos, estacionamiento y eventos al reservar por WhatsApp, teléfono u OpenTable.</p></details>`).join("")}</section>
      </main>
      ${publicFooter()}
      ${modalMarkup()}`;
  }

  function modalMarkup() {
    return `<div class="modal" id="demo-modal" aria-hidden="true"><div class="modal-backdrop" data-close-modal></div><section role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" type="button" data-close-modal aria-label="Cerrar">×</button><p class="eyebrow">Próxima apertura</p><h2 id="modal-title">Recibe novedades.</h2><p>Déjanos tu correo y te avisamos cuando abramos en El Paso. Mientras tanto, sigue @sinyolandaelpaso en Instagram.</p><a class="button button-primary" href="https://www.instagram.com/sinyolandaelpaso/" target="_blank" rel="noopener">Seguir @sinyolandaelpaso</a><small>El boletín por correo se activará con la conexión del sistema.</small></section></div>`;
  }

  function toastMarkup() {
    return `<div class="toast" id="demo-toast" role="status" aria-live="polite"></div>`;
  }

  function bindCommon() {
    const menuToggle = document.querySelector(".menu-toggle");
    const publicNav = document.querySelector(".public-nav");
    if (menuToggle && publicNav) {
      menuToggle.addEventListener("click", () => {
        const expanded = menuToggle.getAttribute("aria-expanded") === "true";
        menuToggle.setAttribute("aria-expanded", String(!expanded));
        publicNav.classList.toggle("open", !expanded);
      });
    }

    document.querySelectorAll("[data-demo-action]").forEach((button) => {
      button.addEventListener("click", () => showToast(button.dataset.demoAction));
    });

    document.querySelectorAll("[data-scroll-to]").forEach((button) => {
      button.addEventListener("click", () => document.getElementById(button.dataset.scrollTo)?.scrollIntoView({ behavior: "smooth" }));
    });

    // A booking entry should not strand the visitor in the coming-soon filter.
    // Preserve native navigation and existing country choices; only clear "soon".
    document.querySelectorAll("[data-select-location]").forEach((link) => {
      link.addEventListener("click", (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (document.querySelector('[data-venue-filter="soon"][aria-pressed="true"]')) {
          document.querySelector('[data-venue-filter="all"]')?.click();
        }
      });
    });

  }

  function bindLocationFilters() {
    const filters = document.querySelectorAll("[data-filter]");
    const cards = document.querySelectorAll(".location-card");
    filters.forEach((filter) => {
      filter.addEventListener("click", () => {
        filters.forEach((item) => item.classList.toggle("active", item === filter));
        cards.forEach((card) => {
          card.hidden = filter.dataset.filter === "soon" ? card.dataset.status !== "coming-soon"
            : filter.dataset.filter !== "all" && card.dataset.region !== filter.dataset.filter;
        });
      });
    });
  }

  function bindModal() {
    const modal = document.getElementById("demo-modal");
    if (!modal) return;
    const close = () => {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    };
    document.querySelectorAll("[data-open-modal]").forEach((button) => button.addEventListener("click", () => {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      modal.querySelector("input")?.focus();
    }));
    modal.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", close));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }

  function bindReservationModules() {
    document.querySelectorAll(".reservation-module").forEach((module) => {
      const tabs = module.querySelectorAll("[data-reservation-tab]");
      const views = module.querySelectorAll("[data-reservation-view]");
      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          tabs.forEach((item) => {
            const selected = item === tab;
            item.classList.toggle("active", selected);
            item.setAttribute("aria-selected", String(selected));
          });
          views.forEach((view) => {
            const selected = view.dataset.reservationView === tab.dataset.reservationTab;
            view.classList.toggle("active", selected);
            view.hidden = !selected;
          });
        });
      });
      module.querySelectorAll("[data-reservation-form]").forEach((form) => {
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          showToast(`${form.dataset.reservationForm}: consulta simulada. No se enviaron ni almacenaron datos.`);
        });
      });
    });
  }

  function scrollToReveal() {
    const targets = document.querySelectorAll(".reveal, .reveal-scale");
    if (!targets.length || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("revealed"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    targets.forEach((el) => observer.observe(el));
  }

  function showToast(message) {
    const toast = document.getElementById("demo-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3600);
  }

  function cateringPage() {
    const cateringContact = "tel:+17262396779";
    const piezas = [
      ["La Cocina", "Taquiza, cortes, mariscos y botanas. Cocinado en sitio."],
      ["La Barra", "Barra móvil, cantineros, tequila y mezcal, cócteles de la casa."],
      ["El Micrófono", "Sonido, karaoke y un anfitrión que hace cantar a tu gente."],
    ];
    const eventosList = ["Bodas", "Quinceañeras", "Graduaciones", "Corporativos", "Cumpleaños", "Fiestas en casa"];
    const cobertura = [
      ["Houston", "Washington Ave"],
      ["The Woodlands", "Shenandoah"],
      ["San Antonio", "River Walk"],
      ["El Paso", "Ya disponible"],
      ["Moreno Valley", "Próximamente"],
      ["San Diego", "Próximamente"],
    ];
    return `
      ${publicHeader()}
      <main>
        <section class="page-hero">
          <img src="assets/media/celebration.webp" alt="Catering Sin Yolanda montado en una fiesta" />
          <div class="hero-overlay"></div>
          <div class="hero-copy">
            <p class="eyebrow">SIN YOLANDA® CATERING · ESTADOS UNIDOS</p>
            <h1>Llevamos el micrófono a tu fiesta</h1>
            <p>Cocina, barra y karaoke en Texas y California. La cantina completa, montada donde tú digas.</p>
            <div class="hero-actions">
              <a class="button button-primary" href="${cateringContact}">Arma tu fiesta</a>
              <a class="button button-ghost-light" href="locations.html">Ver ubicaciones</a>
            </div>
          </div>
        </section>
        <section class="section">
          <div class="section-heading"><div><p class="eyebrow">Se arma por piezas</p><h2 class="reveal">Contrata uno, dos o los tres.</h2></div></div>
          <div class="event-grid">${piezas.map(([titulo, texto], i) => `<article class="reveal-scale" style="animation-delay:${0.12 * i}s"><h3>${titulo}</h3><p>${texto}</p></article>`).join("")}</div>
          <div class="mini-menu" style="margin-top:1.4rem">${eventosList.map((e) => `<span>${e}</span>`).join("")}</div>
        </section>
        <section class="section split-section">
          <div>
            <p class="eyebrow">Cómo funciona</p><h2 class="reveal">Cinco pasos, cero dramas.</h2>
            <ol class="steps-list"><li>Nos cuentas tu fiesta</li><li>Te cotizamos</li><li>Afinamos el menú</li><li>Llegamos y armamos</li><li>Tu gente canta</li></ol>
          </div>
          <div>
            <p class="eyebrow">Cobertura · Estados Unidos</p><h2 class="reveal">Salimos a carretera.</h2>
            <dl>${cobertura.map(([ciudad, detalle]) => `<div><dt>${ciudad}</dt><dd>${detalle}</dd></div>`).join("")}</dl>
            <p class="data-caveat">¿Tu ciudad no aparece? Escríbenos.</p>
            <a class="button button-primary" href="${cateringContact}" target="_blank" rel="noopener">Llamar al catering</a>
          </div>
        </section>
        <section class="reserve-cta">
          <div><p class="eyebrow">Aquí no se llora, aquí se canta</p><h2 class="reveal">Trae el pretexto que sea. Nosotros ponemos la mesa.</h2></div>
          <div><a class="button button-light" href="${cateringContact}" target="_blank" rel="noopener">Arma tu fiesta</a></div>
        </section>
      </main>
      ${publicFooter()}
      ${modalMarkup()}`;
  }

  function laCantinaPage() {
    const agaves = ["Tequilas blancos, reposados y añejos", "Mezcal espadín, tobalá y ensambles", "Raicilla y bacanora", "Cata de tres agaves"];
    const cocteles = ["Paloma de la casa", "Margarita de tamarindo", "Cantarito de barro", "Carajillo Sin Yolanda", "Michelada clásica y con clamato", "Cerveza nacional de barril"];
    const botanas = ["Guacamole con chicharrón", "Queso fundido con chorizo", "Tostadas de atún", "Esquites con tuétano", "Tacos de arrachera", "Tacos de cochinita", "Quesabirria con consomé"];
    const fuertes = ["Arrachera al carbón", "Rib eye para dos", "Costilla en salsa de chile morita", "Aguachile verde", "Ceviche de la casa", "Camarones al mojo de ajo", "Pulpo a las brasas"];
    const lista = (arr) => arr.map((item) => `<li>${item}</li>`).join("");
    return `
      ${publicHeader()}
      <main>
        <section class="page-hero compact-hero">
          <img src="assets/media/dining.webp" alt="Mesas largas de la cantina Sin Yolanda" />
          <div class="hero-overlay"></div>
          <div><p class="eyebrow">La cantina</p><h1>Como una boda mexicana, todas las noches</h1><p>Mesas largas, gente que no se conocía y a las dos de la mañana se abraza cantando. Eso es la casa.</p></div>
        </section>
        <section class="section split-section">
          <div>
            <p class="eyebrow">La barra</p><h2 class="reveal">Más de 30 marcas de agave.</h2>
            <ul class="menu-list">${lista(agaves)}</ul>
            <p class="eyebrow" style="margin-top:1.6rem">Cócteles de la casa</p>
            <ul class="menu-list">${lista(cocteles)}</ul>
          </div>
          <div>
            <p class="eyebrow">La cocina</p><h2 class="reveal">Todo para el centro de la mesa.</h2>
            <p class="eyebrow" style="margin-top:0.8rem">Botanas · Tacos</p>
            <ul class="menu-list">${lista(botanas)}</ul>
            <p class="eyebrow" style="margin-top:1.6rem">Cortes · Mariscos</p>
            <ul class="menu-list">${lista(fuertes)}</ul>
          </div>
        </section>
        <section class="reserve-cta">
          <div><p class="eyebrow">La carta completa</p><h2 class="reveal">Se comparte en cada sucursal.</h2></div>
          <div><a class="button button-light" href="locations.html">Elegir sucursal</a></div>
        </section>
      </main>
      ${publicFooter()}
      ${modalMarkup()}`;
  }

  function eventosPage() {
    const formas = [
      ["Cumpleaños", "Mesa larga, pastel y una canción que nadie te va a dejar cantar solo."],
      ["Despedidas", "Soltera, soltero o de trabajo. Aquí se despide cantando."],
      ["Corporativos", "Fin de año, cierre de trimestre o el equipo entero. El micrófono rompe el hielo."],
    ];
    return `
      ${publicHeader()}
      <main>
        <section class="page-hero compact-hero">
          <img src="assets/media/interior.webp" alt="Celebración privada en la cantina Sin Yolanda" />
          <div class="hero-overlay"></div>
          <div><p class="eyebrow">Eventos en la cantina</p><h1>Privatiza la cantina</h1><p>Cierra la casa para los tuyos. Cocina, barra y micrófono, sin nadie más adentro.</p></div>
        </section>
        <section class="section">
          <div class="section-heading"><div><p class="eyebrow">Tres formas de hacerlo</p><h2 class="reveal">Elige el motivo.</h2></div></div>
          <div class="event-grid">${formas.map(([titulo, texto], i) => `<article class="reveal-scale" style="animation-delay:${0.12 * i}s"><h3>${titulo}</h3><p>${texto}</p></article>`).join("")}</div>
        </section>
        <section class="reserve-cta">
          <div><p class="eyebrow">Cuéntanos de tu evento</p><h2 class="reveal">Te pasa directo con la sucursal.</h2></div>
          <div>
            <a class="button button-light" href="https://wa.me/523310186159?text=${encodeURIComponent("Hola, quiero privatizar la cantina Sin Yolanda para un evento.")}" target="_blank" rel="noopener">WhatsApp Guadalajara</a>
            <a class="button button-ghost-light" href="locations.html">Sucursales en Texas</a>
          </div>
        </section>
        <section class="section"><p class="data-caveat">¿Prefieres que vayamos nosotros? <a href="catering.html">Conoce Sin Yolanda Catering.</a></p></section>
      </main>
      ${publicFooter()}
      ${modalMarkup()}`;
  }

  function tiendaPage() {
    const items = [
      ["Sombrero de la casa", "Fieltro negro con cinta bordada a mano."],
      ["Playera «Aquí no se llora»", "Algodón pesado, tipografía en amarillo."],
      ["Tarro de cerámica", "Barro vidriado de Tonalá. Cada uno distinto."],
      ["Micrófono de recuerdo", "Réplica miniatura del micrófono de la casa."],
    ];
    return `
      ${publicHeader()}
      <main>
        <section class="page-hero compact-hero">
          <img src="assets/media/interior.webp" alt="Mercancía oficial Sin Yolanda" />
          <div class="hero-overlay"></div>
          <div><p class="eyebrow">Tienda</p><h1>Para llevarte la casa puesta</h1><p>Venta en línea muy pronto. Mientras tanto, todo se compra en la barra, mirando a los ojos.</p></div>
        </section>
        <section class="section">
          <div class="section-heading"><div><p class="eyebrow">Disponible en la cantina</p><h2 class="reveal">Lo de siempre, puesto.</h2></div></div>
          <div class="event-grid">${items.map(([nombre, detalle], i) => `<article class="reveal-scale" style="animation-delay:${0.12 * i}s"><h3>${nombre}</h3><p>${detalle}</p></article>`).join("")}</div>
        </section>
      </main>
      ${publicFooter()}
      ${modalMarkup()}`;
  }

  function elPasoPage() {
    const ruta = [
      ["Guadalajara", "2023 · La casa original"],
      ["San Antonio", "2025 · El River Walk"],
      ["Houston", "2026 · Washington Ave"],
      ["The Woodlands", "2026 · El norte"],
      ["El Paso", "Próxima parada · El Chuco"],
    ];
    return `
      ${publicHeader()}
      <main>
        <section class="page-hero">
          <img src="assets/media/celebration.webp" alt="Próxima apertura de Sin Yolanda en El Paso" />
          <div class="hero-overlay"></div>
          <div class="hero-copy">
            <p class="eyebrow">El Paso, Texas</p>
            <h1>El Chuco ya trae el plan</h1>
            <p>La cantina va en camino y el catering ya está listo.</p>
            <div class="hero-actions">
              <a class="button button-primary" href="catering.html">Catering en El Paso</a>
              <a class="button button-ghost-light" href="https://www.instagram.com/sinyolandaelpaso/" target="_blank" rel="noopener">Avísame cuando abra</a>
            </div>
          </div>
        </section>
        <section class="section">
          <div class="section-heading"><div><p class="eyebrow">Ya operando</p><h2 class="reveal">Tu fiesta, con micrófono, desde hoy.</h2></div><p>Nuestro catering mexicano ya trabaja en El Paso y alrededores: cocina en sitio, barra completa y micrófono abierto.</p></div>
          <div class="event-grid">
            <article class="reveal-scale"><h3>Cocinamos en sitio</h3><p>Taquiza, cortes, mariscos y botanas montadas en tu casa o salón.</p></article>
            <article class="reveal-scale" style="animation-delay:0.12s"><h3>Barra completa</h3><p>Tequila, mezcal y cócteles de la casa con cantineros.</p></article>
            <article class="reveal-scale" style="animation-delay:0.24s"><h3>El micrófono</h3><p>Sonido, karaoke y un anfitrión que hace cantar a tu gente.</p></article>
          </div>
        </section>
        <section class="section split-section">
          <div>
            <p class="eyebrow">Próximamente</p><h2 class="reveal">Estamos por abrir en El Paso.</h2>
            <p>Sin Yolanda es una cantina de micrófono abierto nacida en Guadalajara: tequila, canciones que todos se saben y noches que se recuerdan. La próxima mesa larga será en 340 Vin Rambla Dr.</p>
            <a class="button button-primary" href="https://www.instagram.com/sinyolandaelpaso/" target="_blank" rel="noopener">Seguir @sinyolandaelpaso</a>
          </div>
          <div>
            <p class="eyebrow">La ruta</p><h2 class="reveal">De Guadalajara a El Paso.</h2>
            <dl>${ruta.map(([ciudad, nota]) => `<div><dt>${ciudad}</dt><dd>${nota}</dd></div>`).join("")}</dl>
          </div>
        </section>
        <section class="reserve-cta">
          <div><p class="eyebrow">Nos vemos pronto, El Paso</p><h2 class="reveal">El catering no espera.</h2></div>
          <div><a class="button button-light" href="catering.html">Catering en El Paso</a></div>
        </section>
      </main>
      ${publicFooter()}
      ${modalMarkup()}`;
  }

  function initHeroCinema() {
    const hero = document.querySelector(".home-hero-cinema");
    if (!hero) return;
    const video = hero.querySelector("[data-hero-video]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (reduced || !fine || !video) return;

    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = hero.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Move the background gently, never fade the title/actions after a pixel
      // of scrolling or use a negative divisor on a short viewport.
      const p = Math.min(Math.max(-rect.top / Math.max(rect.height, vh, 1), 0), 1);
      video.style.transform = `translateY(${-3 * p}%) scale(${1 + 0.05 * p})`;
    };
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  const renderers = {
    home: homePage,
    locations: locationsPage,
    branch: branchPage,
    catering: cateringPage,
    "la-cantina": laCantinaPage,
    eventos: eventosPage,
    tienda: tiendaPage,
    "el-paso": elPasoPage,
  };

  root.innerHTML = `${(renderers[page] || homePage)()}${toastMarkup()}`;
  bindCommon();
  initHeroCinema();
  bindLocationFilters();
  bindModal();
  bindReservationModules();
  scrollToReveal();
})();
