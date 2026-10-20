import {
  contestPath,
  contestRecord,
  registrationWhatsapp,
  registrationPhone,
  registrationNumber,
  whatsappIcon,
  microphoneIcon,
} from './gdl-contest-config.mjs';

export { contestPath };

const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const poster = '/assets/review-gdl/canta-2026-poster.webp';

function registrationLink({ active, className = '', label = 'Inscribirme por WhatsApp' }) {
  return `<a class="cp-register ${className}" href="${escapeHtml(registrationWhatsapp)}" target="_blank" rel="noopener noreferrer" data-record="${escapeHtml(contestRecord)}" data-gdl-event-feature="active"${active ? '' : ' hidden'}>${whatsappIcon}<span>${label}<span class="cp-sr"> (abre WhatsApp en otra pestaña)</span></span></a>`;
}

const participantInformation = [
  ['Participantes', 'Mayores de 18 años. Cualquier género musical; individual o dueto.'],
  ['Inscripción', 'Registro gratuito y cupo limitado; producción confirma disponibilidad, fecha y hora.'],
  ['Dinámica', 'Pista instrumental o canto a capela, sin playback. Entrega tu pista 48 horas antes.'],
  ['Selección', 'El público participa en la selección. Confirma con producción el avance de ronda.'],
  ['Evaluación', 'Talento, afinación y conexión con el público.'],
  ['Premios', 'Efectivo para primero y segundo; consumo para tercero. Los premios no son transferibles.'],
  ['Imagen', 'Consulta los términos de grabación y difusión. Producción podría solicitar entrevistas.'],
  ['General', 'Conducta respetuosa. Aplican restricciones y ajustes del organizador.'],
];

export function renderContestPage({ active = true } = {}) {
  const activeHidden = active ? '' : ' hidden';
  const fallbackHidden = active ? ' hidden' : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>Canta por tu Cuenta 2026 · Sin Yolanda Guadalajara</title>
  <meta name="description" content="Conoce Canta por tu Cuenta, quinta edición en Sin Yolanda Guadalajara: premios, dinámica e información para inscribirte con producción por WhatsApp.">
  <link rel="canonical" href="https://sin-yolanda.com${contestPath}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Sin Yolanda">
  <meta property="og:title" content="Canta por tu Cuenta · 5.ª edición">
  <meta property="og:description" content="¿Tu voz vale $100,000? Conoce el concurso de canto de Sin Yolanda Guadalajara.">
  <meta property="og:url" content="https://sin-yolanda.com${contestPath}">
  <meta property="og:image" content="https://sin-yolanda.com${poster}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/images/sin-yolanda-logo.png">
  <link rel="preload" href="/fonts/bebas-neue-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/review-gdl/gdl-contest-page.css?v=20261019-contest-review">
  <link rel="stylesheet" href="/assets/css/ga4-consent.css?v=20261016-ga4-simple-choice">
  <script defer src="/assets/review-gdl/contest-measurement.js?v=20261019-contest-review"></script>
</head>
<body class="cp-page" data-branch="san-ignacio" data-language="es">
  <a class="cp-skip" href="#concurso">Saltar al concurso</a>
  <header class="cp-header">
    <div class="cp-header-inner">
      <a class="cp-brand" href="/guadalajara" aria-label="Volver a Sin Yolanda Guadalajara"><img src="/images/sin-yolanda-logo.png" width="220" height="66" alt="Sin Yolanda"></a>
      <nav class="cp-nav" aria-label="Concurso de canto">
        <a href="#premios">Premios</a><a href="#como-participar">Cómo participar</a><a href="#informacion">Información</a>
      </nav>
      ${registrationLink({ active, className: 'cp-register-header', label: 'Inscribirme' })}
    </div>
  </header>
  <main id="concurso" tabindex="-1">
    <section class="cp-hero" aria-labelledby="cp-title">
      <div class="cp-hero-copy">
        <p class="cp-location">Sin Yolanda Guadalajara <span>5.ª edición · 2026</span></p>
        <h1 id="cp-title">Canta <span class="cp-title-small">por tu</span> Cuenta</h1>
        <p class="cp-challenge">¿Tu voz vale <strong>$100,000?</strong></p>
        <p class="cp-hero-intro">Demuéstralo en Canta por tu Cuenta.</p>
        <p class="cp-hero-dates">Los miércoles, del <time datetime="2026-10-07">7 de octubre</time> al <time datetime="2026-12-02">2 de diciembre de 2026</time>.</p>
        <div class="cp-hero-actions">${registrationLink({ active })}<a class="cp-link" href="#como-participar">Conocer la dinámica ${microphoneIcon}</a></div>
        <p class="cp-registration-note" data-gdl-event-feature="active"${activeHidden}>Inscripción gratuita. Consulta disponibilidad con producción.</p>
        <div class="cp-expired" data-gdl-event-feature="fallback"${fallbackHidden}><p>Esta edición ha terminado.</p><a href="/guadalajara#programacion-san-ignacio">Ver la agenda de Guadalajara</a></div>
      </div>
      <figure class="cp-hero-art"><img src="${poster}" width="1080" height="1920" alt="Micrófono dorado de Sin Yolanda iluminado sobre una montaña de billetes." fetchpriority="high" decoding="async"></figure>
    </section>
    <div class="cp-details">
      <section class="cp-prizes" id="premios" aria-labelledby="cp-prizes-title">
        <h2 id="cp-prizes-title">Tu voz tiene premio.</h2>
        <ol class="cp-prize-list">
          <li><span class="cp-place">1<sup>er</sup> lugar</span><div><strong>$100,000</strong><span>en efectivo · MXN</span></div></li>
          <li><span class="cp-place">2<sup>do</sup> lugar</span><div><strong>$50,000</strong><span>en efectivo · MXN</span></div></li>
          <li><span class="cp-place">3<sup>er</sup> lugar</span><div><strong>$5,000</strong><span>en consumo</span></div></li>
        </ol>
        <p class="cp-prize-note">El premio de consumo se utiliza en Sin Yolanda en una misma fecha. Aplican restricciones.</p>
      </section>
      <section class="cp-how" id="como-participar" aria-labelledby="cp-how-title">
        <h2 id="cp-how-title">Súbete al concurso.</h2>
        <ol class="cp-steps">
          <li><span class="cp-step-icon">${whatsappIcon}</span><div><h3>Escríbele a producción</h3><p>Abre WhatsApp para consultar lugares y los pasos de inscripción.</p></div></li>
          <li><span class="cp-step-icon">${microphoneIcon}</span><div><h3>Prepara tu voz</h3><p>Ten listo el coro de una canción a capela y consulta cómo enviar tu video.</p></div></li>
          <li><span class="cp-step-number" aria-hidden="true">3</span><div><h3>Confirma tu participación</h3><p>Producción te indica la fecha y la hora para presentarte.</p></div></li>
        </ol>
        <p class="cp-rounds"><span><strong>7</strong> eliminatorias</span><span><strong>1</strong> semifinal</span><span><strong>1</strong> gran final</span></p>
        <dl class="cp-key-dates"><div><dt>Inicio</dt><dd><time datetime="2026-10-07">7 de octubre</time></dd></div><div><dt>Semifinal</dt><dd><time datetime="2026-11-25">25 de noviembre</time></dd></div><div><dt>Gran final</dt><dd><time datetime="2026-12-02">2 de diciembre</time></dd></div></dl>
      </section>
    </div>
    <section class="cp-information" id="informacion" aria-labelledby="cp-info-title">
      <div class="cp-info-heading"><h2 id="cp-info-title">Información para participar</h2><p>Lee los puntos principales y consulta las condiciones completas del organizador.</p></div>
      <ol class="cp-rules">${participantInformation.map(([title, copy]) => `<li><h3>${title}</h3><p>${copy}</p></li>`).join('')}</ol>
      <div class="cp-source-links"><a class="cp-link" href="https://sinyolandagdl.com/canta-cuenta/" target="_blank" rel="noopener noreferrer" data-record="${escapeHtml(contestRecord)}">Consultar bases del organizador<span class="cp-sr"> (abre otra pestaña)</span><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></a><a href="${poster}" target="_blank" rel="noopener noreferrer">Ver cartel completo<span class="cp-sr"> (abre otra pestaña)</span></a></div>
    </section>
    <section class="cp-contact" aria-labelledby="cp-contact-title" data-gdl-event-feature="active"${activeHidden}>
      <div><h2 id="cp-contact-title">Que se escuche tu voz.</h2><p>Inscríbete con producción de Canta por tu Cuenta.</p></div>
      <div class="cp-contact-actions">${registrationLink({ active })}<a class="cp-phone" href="${escapeHtml(registrationPhone)}" data-record="${escapeHtml(contestRecord)}">O llama al ${escapeHtml(registrationNumber)}</a></div>
    </section>
  </main>
  <footer class="cp-footer"><a href="/guadalajara">Volver a tu cantina en Guadalajara</a><a href="/aviso-de-privacidad">Privacidad</a></footer>
  <script defer src="/assets/review-gdl/contest-consent.js?v=20261019-contest-review"></script>
  <script defer src="/assets/review-gdl/gdl-focus.js?v=20261019-gdl-focus"></script>
</body>
</html>`;
}
