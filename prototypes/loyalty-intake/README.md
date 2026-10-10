# Registro propio · propuesta visual local

Propuesta de interfaz para Sin Yolanda El Paso. **No publicada, no funcional como alta.**
Queda fuera de `scripts/public-manifest.json`; no cambia el QR temporal activo ni su destino GHL.

- Español predeterminado y botón único English/Español. Cambia texto, etiquetas, errores y título.
- Nombre/correo obligatorios; teléfono y cumpleaños DD/MM opcionales. Sin año de nacimiento.
- Consentimiento de registro obligatorio; email promocional opcional y sin premarcar.
- Aviso desplegable: resumen provisional basado en el formulario temporal vigente, con contacto
  Instagram confirmado. No sustituye el aviso específico del futuro backend propio; el responsable,
  contacto de privacidad y custodia propia deben verificarse antes de publicar.
- Botón deshabilitado; enviar/Enter bloqueados. No endpoint, GHL, cookies, almacenamiento ni tracker.
- Logo actual, crema/blanco/tinta y naranja; Bebas Neue y Roboto Slab ya versionados, sin fuentes
  externas. Sin granate; naranja de acción `#B8440B` sobre blanco.

Archivos: `index.html`, `styles.css`, `intake.js`. `serve-local.mjs` abre únicamente el prototipo
y los recursos de identidad y dos fotografías explícitas, con allowlist y escucha en127.0.0.1.
Para revisión local: `node prototypes/loyalty-intake/serve-local.mjs 8798` desde el repo.
No usar el checkout completo ni exponer este servidor mediante túneles o interfaces públicas.

La conexión posterior a un backend propio y la escritura en GHL son trabajo separado; este
prototipo no define persistencia, consentimiento legal final ni beneficios del programa.

## Fotografía local de revisión ·9-oct

Dirección A: fotografía sin marco en la columna izquierda y formulario integrado en el fondo;
bienvenida fuera de la foto y fundido corto exclusivamente al pie. En móvil se usa un retrato
compacto junto a la bienvenida para dar paso a los campos. Copy de propósito: programa de lealtad,
sin puntos, recompensas ni descuentos prometidos.

Fuente seleccionada para el prototipo: banco editorial interno, revisión «Drive El Paso», selección#30;
derivado existente `selected-30-1440.webp` (1440×2160). Referencia original Drive:
`1F909QMEVjK49Ea9IRcOCuR4VoAPoM1vR`. Esa procedencia no acredita ubicación física, identidad
de la persona ni autorización comercial. Alt literal: persona con sombrero y micrófono en una terraza.

Derechos **review-only**: los dos derivados WebP de1200/600px y las capturas que los contienen
viven en `media/` y `qa-photo/`, ambas ignoradas por `.gitignore` local del prototipo. No subir
ningún binario ni captura a GitHub, ni incorporar a un paquete publicable. No hay ampliación de
resolución, medios remotos ni copia de la fotografía a las carpetas públicas del sitio.
Un clon no tendrá la imagen: la falta intencional de binarios conserva este gate de derechos.

## Verificación con fotografía actual ·9-oct

Diez combinaciones locales ES/EN:320/390/768/1440px y1502×772. Sin desbordamiento; fotografía
decodificada, alt traducido y bienvenida sin superponerse a la imagen. Sombrero, sonrisa y
micrófono comprobados visualmente en la composición de escritorio y el recorte móvil.
En1502×772, el saludo completo en dos líneas termina en y758, dentro del primer viewport.

Encuadres finales, siempre sobre el derivado original completo:

- Escritorio: altura460px, `object-position:50%41%`, fundido de14px exclusivamente al pie.
  Saludo60px en dos líneas. Tablet768px conserva proporción0.8:1, altura observada410px.
- Móvil: retrato lateral210px (205px a320), `object-position:53%43%`, acercamiento CSS1.22
  con origen53%42%; fundido inferior26px. Primer campo y534 a390 y y552 a320.
- Exportación local WebP, calidad82: `singer-600.webp`,600×900, **61,946bytes**;
  `singer-1200.webp`,1200×1800, **157,714bytes**. Ambos reducen el original1440×2160 sin upscaling.

Validación y estados comprobados tras integrar la foto: errores de email y fecha,29/02 sin año,
normalización9/10→09/10, cambio de idioma conservando lo tecleado, aviso desplegable traducido,
recarga limpia y consentimiento opcional desmarcado. Botón deshabilitado y `requestSubmit()`
bloqueado; sin cookies, almacenamiento, envío del formulario ni peticiones externas. CSP conserva
`connect-src 'none'` y `form-action 'none'`. Servidor solo GET/HEAD, POST405; dos medios exactos200,
otros medios/QA/API/QR/documentación404. El manifiesto público excluye el prototipo.

Evidencia actual en `qa-photo/`, ignorada: ocho capturas ES/EN de los anchos originales más
dos panoramas y dos capturas de viewport1502×772. Vista final revisada:
`qa-photo/es-1502x772-viewport.png`; móvil:`qa-photo/es-390.png`. El directorio `qa/` conserva
las capturas del diseño anterior sin foto y continúa ignorado. No se probaron dispositivos físicos.

## Verificación local anterior ·9-oct, sin fotografía

Chromium local:320/390/768/1440px, ES/EN, sin desbordamiento ni errores JavaScript. Cambio de
idioma completo conserva lo tecleado y traduce errores; recargar vuelve a ES, campos vacíos y
ambas casillas desmarcadas. Se comprobaron campos obligatorios, email inválido, teléfono opcional,
fechas DD/MM válidas/imposibles y normalización9/10→09/10;29/02 válido sin inferir un año.
Enviar permanece bloqueado incluso por `requestSubmit()`: solo se muestran errores locales.
Sin cookies, localStorage/sessionStorage, POST del formulario ni peticiones externas.

Servidor: POST405, rutas API/QR/documentación fuera de allowlist404. Manifest público sin el
prototipo. Contraste naranja/blanco5.43:1; texto secundario/crema5.51:1. Capturas finales en
`qa/`, revisadas en ES escritorio y EN móvil; no equivalen a pruebas en dispositivos físicos.
