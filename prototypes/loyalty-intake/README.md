# Registro propio · captura local de prueba

Interfaz para Sin Yolanda El Paso. **Captura ficticia local comprobada; no publicada.**
Queda fuera de `scripts/public-manifest.json`; no cambia el QR temporal activo ni su destino GHL.

- Español predeterminado y botón único English/Español. Cambia texto, etiquetas, errores y título.
- Nombre/correo obligatorios; teléfono y cumpleaños DD/MM opcionales. Sin año de nacimiento.
- Consentimiento de registro obligatorio; email promocional opcional y sin premarcar.
- Aviso desplegable: resumen provisional basado en el formulario temporal vigente, con contacto
  Instagram confirmado. No sustituye el aviso específico del futuro backend propio; el responsable,
  contacto de privacidad y custodia propia deben verificarse antes de publicar.
- Por defecto, botón deshabilitado y enviar/Enter bloqueados. `--with-intake` habilita únicamente
  la captura local cifrada; el aviso/CTA indican que se deben usar datos ficticios. Sin GHL ni tracker.
- Logo actual, crema/blanco/tinta y naranja; Bebas Neue y Roboto Slab ya versionados, sin fuentes
  externas. Sin granate; naranja de acción `#B8440B` sobre blanco.

Archivos: `index.html`, `styles.css`, `intake.js`. `serve-local.mjs` abre únicamente el prototipo
y los recursos de identidad y dos fotografías explícitas, con allowlist y escucha en127.0.0.1.
Para revisión visual: `node prototypes/loyalty-intake/serve-local.mjs 8798` desde el repo.
Para probar captura: iniciar `services/loyalty-intake/run_local.py` con su entorno bloqueado
en `uv.lock`, y ejecutar el servidor con `8798 --with-intake`. API en127.0.0.1:8801; ambos servidores
son exclusivamente locales. Procedimiento, persistencia y gates → README del servicio.
No usar el checkout completo ni exponer este servidor mediante túneles o interfaces públicas.

Éxito solo después de respuesta confirmada del backend, con recibo opaco y datos limpiados.
Fallos conservan el intento y sus datos; reintentar el mismo contenido usa la misma clave,
cambiar contenido genera otra. Idioma, errores y confirmación ES/EN; sin persistencia en navegador.
La escritura real en GHL, aviso legal final y beneficios del programa siguen pendientes.

## Captura comprobada ·9-oct

Operador comprobó una alta ficticia ES y otra EN desde la pantalla, y registros cifrados en disco,
cola pendiente y snapshot consistente. CUA: móvil390/320/tablet768/escritorio1502, sin desbordamiento;
reload limpia datos/opt-ins. Tests nativos del frontend/proxy:11 casos sin navegador adicional.
API/almacenamiento/worker simulado/backup tienen su suite independiente en el servicio.
Estas pruebas no crean contactos reales, envían mensajes ni sustituyen el formulario QR vigente.

La configuración local es explícita `captureEnabled`+`qaOnly`+`mode`+versión de consentimiento exacta.
POST limitado a8192bytes, origen loopback y proxy fijo; no cookies/auth/URLs arbitrarias. CSP
`connect-src 'self'`, `form-action 'none'`. Por defecto no hay POST ni captura; la versión de QA
no se puede publicar como formulario real.

**Candidata Turnstile posterior9-oct:** `mode:'production'` exige captura habilitada, `qaOnly:false`
y sitekey pública `0x…` válida; otra combinación deshabilita y no carga Cloudflare. Script oficial
directo en modo explícito, action `loyalty_register`, tema claro/flexible (compact si columna<300px).
Token fresco requerido; expiración295s, error/timeout/unsupported cierran el envío. Cambio ES/EN o
tamaño invalida callbacks antiguos y reconstruye el widget sin perder datos. Fallo HTTP/red reinicia
verificación conservando contenido/clave; token se excluye de la firma de idempotencia. Éxito limpia
datos y retira widget. No enviar PII en cData/URLs ni usar storage browser/tracker.
19pruebas nativas pasaron en ese corte con proveedor simulado; no acreditan widget/CSP/antibot reales.
Node solo sirve `disabled` o `local-qa`, jamás configuración productiva. En esa ronda todavía no
existía widget real; su alta privada posterior está documentada en el README del servicio.
Guía primaria N0: [renderizado Cloudflare](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/).
Revisión visual posterior móvil390/ES/EN y escritorio1502 conserva foto/composición; no overflow.
La captura fullPage de escritorio omitió la foto pese a estar decodificada; screenshot viewport
confirmó imagen visible. No cambiar imagen/CSS por ese artefacto del capturador.

**Conexión privada candidata posterior9-oct:** config y POST relativos conservan autenticación
solo mismo-origen. Respuestas401/403/redirección/HTML de login cierran captura sin perder datos
ni mostrar éxito. Suite UI actual21casos; proveedor simulado, no challenge real. Paquete separado
sin foto review-only y con aviso ES/EN de datos ficticios conserva identidad aprobada; no modifica
esta composición original. Gateway, empaquetado y gates → README del servicio, «Ingreso de revisión
candidato». QR y página pública siguen en la captura temporal; no publicar por pasar estos tests.

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

## Verificación visual previa a conectar captura ·9-oct

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
