# Pausa selectiva de redirecciones de cartas

Extensión aditiva v1.0.0 para el incidente del 8-oct-2026. No modifica las páginas,
el plugin anterior, sus opciones ni el mapa histórico. **Creada/probada localmente;
la instalación y activación remotas requieren autorización y comprobación propias.**

Cancela exclusivamente ocho redirecciones301 anónimas GET/HEAD de cartas:
TX `/menu/`, `/english/`, `/cocktails/`; USA `/houston/menu/`,
`/sinyolanda-sanantonio/menu-espanol/`, `/sinyolanda-sanantonio/english-menu/`,
`/sinyolanda-thewoodlands/menu-espanol/` y `/sinyolanda-thewoodlands/english-menu/`.
Apex/www y ausencia/presencia de un slash final tienen el mismo tratamiento.
Las raíces y fichas siguen bajo el plugin anterior; Guadalajara queda fuera.

El filtro `wp_redirect` devuelve `false` solamente si fuente y destino coinciden
con la regla exacta del resolver y JSON anterior. Así su callback no hace `exit`
y WordPress continúa con la plantilla original. Se conserva su política UTM y
sus exclusiones de formularios/administración/previews. Sin dependencia/configuración
válida, la extensión no cancela ningún redirect. No ofrece caché ni purga CDN.

`node --test tests/menu-redirect-pause.test.mjs` verifica el resolver y ambos
plugins juntos con stubs WordPress, sin acceso remoto ni credenciales.
`node scripts/legacy-redirects/sin-yolanda-menu-redirect-pause/package.mjs`
crea un ZIP nuevo y recibo SHA-256 ignorados en `.artifacts/legacy-redirects/`.
Solo entran los dos PHP; este README/helper nunca se instalan ni se publican en Pages.

Rollback: desactivar únicamente **Sin Yolanda Menu Redirect Pause** vuelve a dejar
operativas las reglas anteriores de cartas; no hacerlo sin aprobación por sucursal.
La extensión no puede invalidar301 antiguos guardados en navegadores. Tras activarla,
verificar anónimamente contenido WordPress de cada carta y que raíces/fichas mantengan
sus destinos previos; guardar recibos de instalación/estado/smoke por separado.
