import {whatsappIcon} from './gdl-invitation-config.mjs';

// Branch contact links match the existing Guadalajara footer; signup remains above.
export function renderContestFooter(){
 return `<footer class="cp-footer cp-footer-full" id="pie-concurso">
 <div class="cp-footer-main">
  <div class="cp-footer-identity"><a class="cp-footer-brand" href="/guadalajara" aria-label="Sin Yolanda Guadalajara"><img src="/images/sin-yolanda-logo.png" width="300" height="75" alt="Sin Yolanda" loading="lazy"></a><p>Tu cantina en Guadalajara</p><span>Zona Chapalita, Zapopan</span></div>
  <div class="cp-footer-visit"><h2>Nos vemos en la cantina</h2><address>Avenida San Ignacio 78<br>Zapopan, Jal. 45040</address><a href="https://www.google.com/maps/dir/?api=1&amp;destination=Avenida+San+Ignacio+78%2C+Zapopan%2C+Jal.+45040&amp;destination_place_id=ChIJiZJ8IgCvKIQRJNyh6WMwRg4" target="_blank" rel="noopener noreferrer">Cómo llegar<span class="cp-sr"> (abre otra pestaña)</span></a><a class="cp-footer-reserve" href="https://wa.me/5213310186159" target="_blank" rel="noopener noreferrer">${whatsappIcon}Reservar mesa<span class="cp-sr"> por WhatsApp (abre otra pestaña)</span></a></div>
  <nav class="cp-footer-nav" aria-label="Explora Sin Yolanda"><a href="/guadalajara">Ver Guadalajara</a><a href="/san-ignacio/menu/">Ver menú</a><a href="/guadalajara#programacion-san-ignacio">Agenda de la cantina</a><a href="/#ubicaciones">Todas las sucursales</a><a href="https://www.instagram.com/sinyolandagdl/" target="_blank" rel="noopener noreferrer">Instagram<span class="cp-sr"> de Guadalajara (abre otra pestaña)</span></a></nav>
 </div>
 <div class="cp-footer-bottom"><span>Canta por tu Cuenta · 5.ª edición</span><a href="/aviso-de-privacidad">Aviso de privacidad</a></div>
 </footer>`;
}
