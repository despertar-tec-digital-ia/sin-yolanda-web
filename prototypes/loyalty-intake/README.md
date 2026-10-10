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
y los cuatro recursos de identidad necesarios, con una allowlist y escucha en127.0.0.1.
Para revisión local: `node prototypes/loyalty-intake/serve-local.mjs 8798` desde el repo.
No usar el checkout completo ni exponer este servidor mediante túneles o interfaces públicas.

La conexión posterior a un backend propio y la escritura en GHL son trabajo separado; este
prototipo no define persistencia, consentimiento legal final ni beneficios del programa.

## Verificación local ·9-oct

Chromium local:320/390/768/1440px, ES/EN, sin desbordamiento ni errores JavaScript. Cambio de
idioma completo conserva lo tecleado y traduce errores; recargar vuelve a ES, campos vacíos y
ambas casillas desmarcadas. Se comprobaron campos obligatorios, email inválido, teléfono opcional,
fechas DD/MM válidas/imposibles y normalización9/10→09/10;29/02 válido sin inferir un año.
Enviar permanece bloqueado incluso por `requestSubmit()`: solo se muestran errores locales.
Sin cookies, localStorage/sessionStorage, POST del formulario ni peticiones externas.

Servidor: POST405, rutas API/QR/documentación fuera de allowlist404. Manifest público sin el
prototipo. Contraste naranja/blanco5.43:1; texto secundario/crema5.51:1. Capturas finales en
`qa/`, revisadas en ES escritorio y EN móvil; no equivalen a pruebas en dispositivos físicos.
