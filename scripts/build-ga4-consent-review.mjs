// Local-only consent review. The production manifest and source pages stay unchanged.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { packagePublic } from './package-public.mjs';
import { ga4ReviewBundle } from './analytics/ga4-review-bundle.mjs';
import { projectGa4EventBridge } from './analytics/project-ga4-event-bridge.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, process.argv[2] || '.artifacts/ga4-consent-review/public');
assert.ok(output.startsWith(resolve(root, '.artifacts') + sep));
const report = packagePublic({ root, destination: output, audience: 'review' });
const read = file => readFileSync(resolve(output, file), 'utf8');
const save = (file, data) => writeFileSync(resolve(output, file), data);
const files = new Set(Object.keys(report.hashes));
const config = JSON.parse(readFileSync(resolve(root, 'scripts/analytics/ga4-event-config.json')));
assert.equal(config.enabled, false, 'Local review never activates the tag.');
assert.equal(config.consentScope, 'ga4-only');
mkdirSync(resolve(output, 'assets/review-analytics'), {recursive: true});
const js = 'assets/review-analytics/ga4-consent.js', css = 'assets/review-analytics/ga4-consent.css';
save(js, ga4ReviewBundle(root));
copyFileSync(resolve(root, 'scripts/analytics/ga4-consent-review.css'), resolve(output, css));
files.add(js); files.add(css);
save('assets/js/site-measurement.js', projectGa4EventBridge(read('assets/js/site-measurement.js')));
const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/public-manifest.json')));
for (const page of manifest.pages.filter(page => page !== '404.html')) {
  const source = read(page);
  assert.ok(source.includes('</head>') && source.includes('</body>'));
  save(page, source.replace('</head>', `<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/${css}"></head>`)
    .replace('</body>', `<script src="/${js}" defer></script></body>`));
}
let notice = read('aviso-de-privacidad.html');
const replaceOnce = (before, after) => {
  assert.equal(notice.split(before).length, 2, 'Review the current privacy notice before projecting its draft.');
  notice = notice.replace(before, after);
};
replaceOnce('Última actualización: 8 de octubre de 2026.', 'Propuesta local de actualización · 16 de octubre de 2026. Pendiente de datos del responsable y aprobación.');
replaceOnce('<h2>1. Quiénes somos</h2>', '<h2>1. Quiénes somos</h2><p><strong>Responsable del tratamiento:</strong> {PENDIENTE: identidad de la persona física o razón social responsable}. <strong>Domicilio:</strong> {PENDIENTE: domicilio del responsable}.</p>');
replaceOnce('privacidad@sin-yolanda.com', '{PENDIENTE: canal confirmado para atender solicitudes de privacidad}');
replaceOnce('<strong>Navegación anónima:</strong> datos técnicos del sitio (tipo de dispositivo, páginas vistas) sin identificarte.', '<strong>Uso del sitio:</strong> páginas vistas y acciones como abrir menús o reservas. Umami mide sin cookies de seguimiento. Si aceptas GA4, Google utiliza cookies e identificadores de navegador para elaborar estadísticas; no enviamos a GA4 nombres, teléfonos, correos, mensajes ni texto libre.');
replaceOnce('<h2>4. Quién más los ve</h2>', `<h3>Google Analytics 4 · opcional</h3><p>Proponemos incorporar Google Analytics 4 (GA4), de Google, para conocer visitas y clics por página, idioma, sucursal y evento. La etiqueta de Google solo se cargaría después de aceptar. Rechazar desactiva GA4; Umami continúa con las condiciones descritas arriba. Puedes cambiar tu elección en «Preferencias de privacidad», al pie de la página. Las señales «No rastrear» y Global Privacy Control mantienen desactivada la medición.</p><p>La elección se guarda en este navegador por hasta 180 días; al caducar se solicita de nuevo. GA4 puede utilizar las cookies propias <code>_ga</code> y <code>_ga_PZQE63983T</code>, con duración máxima configurada de 180 días, sin renovación por actividad. Al retirar el permiso se detienen nuevos envíos y se intenta eliminar esas cookies. Si falla el almacenamiento, GA4 permanece apagado en la página; se intenta guardar un bloqueo funcional <code>sy_ga4_denied</code> para evitar reutilizar una aceptación anterior. Retirar el permiso no elimina automáticamente los datos ya enviados.</p><p>La propiedad consultada conserva datos de eventos durante 2 meses y datos de usuarios durante 14 meses, con reinicio del plazo de usuarios por nueva actividad. Estos plazos no eliminan por sí solos los informes agregados. Se propone reducir el plazo de usuarios y desactivar su reinicio antes de la activación, sujeto a aprobación y comprobación del ajuste.</p><p>En la propuesta se deniega el almacenamiento y uso de datos para anuncios y se desactivan Google Signals y las señales de personalización en la etiqueta. Los ajustes de personalización de la cuenta siguen pendientes de revisión; la integración está apagada. Google trata los datos que recibe conforme a su <a href="https://policies.google.com/privacy">política de privacidad</a>.</p><h2>4. Quién más los ve</h2>`);
save('aviso-de-privacidad.html', notice);
const hashes = Object.fromEntries([...files].sort().map(file => [file, createHash('sha256').update(readFileSync(resolve(output, file))).digest('hex')]));
writeFileSync(resolve(dirname(output), 'release.json'), JSON.stringify({...report, audience: 'local-ga4-consent-review', hashes,
  fileCount: files.size, ga4Enabled: false, consentScope: config.consentScope, publicationEnabled: false,
  pending: ['controller-identity-address-contact', 'account-settings-approval', 'final-copy-and-release-approval', 'live-google-receipt']}, null, 2) + '\n');
console.log(JSON.stringify({ output, ga4Enabled: false, consentScope: config.consentScope, publicationEnabled: false }));
