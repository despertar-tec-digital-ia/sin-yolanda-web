# Forma de trabajar y publicar

**Última actualización:** 2026-10-10 · **Responsables:** Luis, técnica; Karina, negocio/contenido y hero.
**Estado:** candidato integrado en `main` y release limitado publicado el 8-oct; CI de PR y main
verificado, publicación Pages manual y smoke remoto comprobado. CD automático, protecciones y
secretos no están activados por este lote. Preparación, resultado y límites se registran abajo.
La aprobación de este release no equivale a autorizar otros releases.

### Demo gris autorizada10-oct · corte D18, no producción

Luis aclaró compartir **esta versión gris ya trabajada sobre Karina**, no el home H2 del
donante publicado antes por una interpretación equivocada de «nuestra versión».
Checkpoint `6f838a801264e5dd02e716a2157490216b4fb274`, paquete limpio
`.artifacts/interior-polish/committed/public`, digest
`e48e407d6e0fc061f0273c63020dfe34e71502adabf3a93a38bef8876e122988`.
Se conserva el corte sin reconstruir ni mezclar cartas posteriores. Rama visual respaldada
en GitHub, **sin merge al oficial ni despliegue a Pages**.

Publicación aislada en `demo-sin-yolanda.despertartdigital.cloud`: receptor
`sinyolanda-universal/visual-release/`, no su `dist` ni su home. Solo cambia `robots.txt` para
bloquear indexación;201archivos originales intactos. Perfil, QA/resultado servido, PR y rollback
tienen dueño único en `sites/sinyolanda-universal/DEPLOY-REVIEW.md` y manifiesto visual.
El receptor no activa los redirects de WordPress/QR/GHL del archivo Cloudflare. Oficial,
registro, Analytics y horarios futuros fuera del alcance. No sustituye gates comerciales de
fichas/cartas. El diseño H2 con scroll queda como respaldo local del donante.

Los bloques «revisión local» inferiores describen su desarrollo antes de esta autorización;
no implican publicación en el sitio oficial. CD sigue manual.

### Ubicaciones y piloto visual · revisión local10-oct

Rama aislada `fix/visual-locations-20261010`, checkout `sites/sinyolanda-visual-review`, sobre
la fuente publicada `3846955c325880077149f88edc0b52f6ff513b0a`. Antes de editar se comprobaron
contra el dominio servido home, renderer, registro público, CSS global y CSS del hero: paridad
byte a byte. Se conserva el release con los aliases QR ya activos; no basar un futuro paquete en
un `main` anterior que los retire. No mezclar la rama de registro propio ni el donante de cartas.

`locationsPage()` reutiliza `venueShowcase()`; se eliminan renderer/filtros de tarjetas anteriores.
Header/footer del shell y CTA de carta del home llevan al selector aprobado. Las fichas/cartas
importadas siguen llegando al selector del home. El footer deriva sedes del mismo `SY_DATA`:
no mantiene otra lista editable. Nombre visible Guadalajara, detalle Zona Chapalita, Zapopan;
ID `san-ignacio`, dirección, rutas y estados del registro conservados. El Paso no se abre por
inferencia de fecha. País, próximas aperturas, ES/EN y navegación nativa siguen disponibles.

**Dirección de arte posterior:** Luis rechaza el piloto inicial de coherencia (`19dd624`),
señalando color/header/tipografía sin encaje. Se comparan clara A y oscura B con el mismo
contenido; Luis elige **B · Oscura** para continuar. Es elección de dirección, no aprobación de
todos los bloques ni permiso de publicación. Se retira Roboto Slab del piloto: Bebas Neue ya
presente en el selector para títulos, Inter existente para lectura. Base `#20241f`, texto
`#fffaf0`, secundario `#bdc0b7`, superficies interiores `#2b3029`, acento `#ef8d64`.

| Bloque revisado | Candidata / siguiente decisión |
|---|---|
| Directorio y accesos | Componente aprobado único, mismo registro y filtros; entradas comprobadas |
| Home editorial | Dirección B; títulos condensados y fotografías con captions abiertos/anchos desiguales, sin cajas. Pretextos/botaneo/cumpleaños continúan esa gramática; sin cambiar ofertas/copy/hero |
| Header home/directorio | Una sola cabecera80px desktop/76px móvil, sin franja superior ni glow. Logo original, enlaces/CTA/idioma con foco y targets44px; cierre/teclado conservados |
| Transiciones | Se retiran entradas repetitivas de texto en los bloques del piloto; galería y hero conservados, reduced-motion comprobado |
| Fotos | Archivos intactos. Música usa la foto de canto ya servida en el selector; La banda reutiliza la foto humana antes usada en Música. En home son escenas generales de marca, sin atribuirlas a una sede diferente |
| Páginas secundarias | Revisión responsive de15páginas, sin réplica de la tipografía del piloto. La Cantina/Eventos/Tienda y fichas/Catering conservan familias distintas; revisar esa armonización después del juicio del piloto |

`visual-pilot.css` cargaba solo en home/directorio en ese primer piloto; D15 extiende la misma
hoja a La Cantina/Eventos/Tienda (ver «Pulido editorial y secundarios»). La versión global de assets se conserva;
`assetVersions` del manifiesto permite invalidar exclusivamente renderer/i18n/CSS del piloto.
El validador exige overrides JS/CSS del allowlist y versiones correctas en sus consumidores;
tests negativos rechazan caché antigua y overrides de archivos ajenos. No regenerar cartas o
instrumentación por una modificación visual.

**Verificación inicial (`19dd624`):** `npm run check`,179/179;24casos home/directorio ES/EN a320/390/768/1024/1440/1920,
45casos secundarios móvil/tablet/desktop y60accesos en22páginas. Sin overflow ni errores JS en
esas sondas; fotos cargadas, nombres/filtros/teclado/cierre/foco comprobados. DOM, geometría y
estilos computados del hero idénticos al baseline en los seis anchos. HTML de cartas, medios,
CSS del hero, datos públicos, `_redirects` y registro de lealtad sin cambios de este lote.
Solo Chromium emulado, GET/HEAD y telemetría bloqueada; no Safari ni dispositivos físicos.

**Verificación dirección B:**179/179 y nueva sonda24casos ES/EN,60accesos/22páginas, sin fallos.
Hero comparado con `19dd624`: mismo DOM, estilos y geometría **interna** en los seis anchos;
su posición absoluta sube al retirar la franja del header, cambio intencional de navegación.
Video/póster/rótulo, CSS global/hero/selector y registro sin modificaciones. Contrastes calculados
de los nuevos pares de lectura:15.14:1 principal,8.54:1 secundario,7.31:1 sobre superficie interior,
6.50:1 acento y4.89:1 etiqueta de reserva. No certificación integral WCAG. Capturas reales B a
390/768/1440 inspeccionadas; comparación y QA → `.artifacts/visual-direction-dark-qa/`.

Paquete de revisión187archivos, noindex, servido únicamente en `http://127.0.0.1:8811`.
Recibos ignorados: `.artifacts/visual-qa-final/report.json`, `qr-preservation.json`, capturas
`review-*`; revisión secundaria en `.artifacts/visual-qa/blocks-report.json`. Tras rebase al release
publicado, el único delta entre paquetes ensayados es `_redirects` ya publicado, comprobado remoto;
los recursos de render coinciden. `npm run build` productivo continúa rechazando las cuatro
páginas protegidas El Paso/Catering ES/EN. El paquete explícito de revisión pasa; no relajar gates.

Continuación encargada después por Luis: hero/header/prioridad de Ubicaciones, en el bloque
siguiente. Fichas/Catering conservan su flujo donante/importación, sin alterar cartas. Sin push,
preview público ni publicación por este lote.
Publicar requiere aprobación/release propios y revalidación del baseline vigente.

### Hero, blanco y prioridad de Ubicaciones · candidata local posterior10-oct

Luis encarga explícitamente revisar el hero, comparar video/fotos, arreglar todo su ES/EN,
mejorar la cabecera al scroll y subir el selector. Este encargo permite modificar ese bloque
reservado; no convierte D09 en autorización general de publicación. Conserva la dirección B,
pide recuperar blanco y botones sencillos, y acepta utilizar las fotos del banco local.

**Diagnóstico y propuesta aplicada:** el MP4 original contiene tres fotografías en10,4segundos,
1280×720, H.264 sin audio,1.552.011bytes. La candidata usa esas mismas escenas como imágenes
responsive y un fundido CSS de700ms cada6,5segundos, sin nueva dependencia ni parallax.
Primera foto prioritaria; las siguientes se solicitan cuando les toca. Pausa/reproducción con
etiqueta ES/EN, suspensión fuera del hero/con pestaña oculta; movimiento reducido o ahorro de
datos arrancan en pausa. Si falla la siguiente foto, se conserva la actual. Video/póster originales
intactos como referencia y rollback; no se descargan en el hero nuevo.

| Medio exportado | Fuente local cotejada / límite |
|---|---|
| `cantina-duo-{640,1280}.webp` | Banco Karina AMBIENTE#5, `1bUchRFVCko-BJuCvZ7zqo10MqEa5S_Fd.heic`; orientación EXIF corregida en derivado, original intacto |
| `cantina-selfie-{640,1280}.webp` | AMBIENTE#13, `1pOVmRJO2BUJiVl1IT2uPUurywd8-30Ob.jpg`; recorte inferior retira el control de audio de la captura |
| `cantina-canto-{640,1280}.webp` | Woodlands#137, `1YK5OHxYpMG8RALSEWYvVaJdPyxGJcvcx.png`; captura, sin ampliación ni inventar sede |

Fuente/procedencia general: banco editorial y `FOTOS-BANCO`; recibo de originales/hashes/
dimensiones/exportaciones en `.artifacts/hero-refinement/media-provenance.json`. Las tres escenas
representan experiencia general de marca. El nombre de una carpeta no acredita sede ni derechos
de publicación. No se reemplazaron originales. Primera variante99.666/310.834bytes según tamaño;
las tres variantes1280 suman712.884bytes. Es comparación de archivos, no una promesa de LCP ni
una medición de campo. Investigación N0 acotada a medios responsive/video/movimiento reducido:
[web.dev](https://web.dev/learn/performance/video-performance),
[MDN picture](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture),
[MDN reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).

**Composición y navegación, corrección posterior solicitada por Luis:** rechaza la separación
foto/texto y pide recuperar el rótulo sobre la fotografía, como en el hero anterior. La candidata
vigente vuelve a un fondo fotográfico de ancho/alto completos, con sombreado continuo y sin panel
separado. Rótulo a la derecha en desktop; hasta1100px, centrado hacia la parte inferior sobre la
misma foto. Se revisan las tres escenas: encuadre fijo de la segunda a1,35 en tablet/móvil para
subir el rostro principal por encima de las letras, sin zoom animado. `sizes=100vw` corresponde
al nuevo ancho real de las imágenes. Un H1 accesible, misma geometría SVG y fuente del rótulo.
Una acción principal blanca «Elige tu sucursal», secundaria textual «Ver el plan», destinos
distintos. Selector aprobado único inmediatamente después del hero/anuncio, antes del plan.
Registro, filtros, tarjetas y enlaces nativos conservados; no segunda lista.
Cabecera se esconde al bajar después de80px, vuelve al subir/al usar Tab y permanece disponible
con menú abierto/foco de teclado. Sin animación de cabecera/fotos en movimiento reducido.

Base oscura neutralizada a`#1d1d1b`, texto/blancos`#fff`; Experiencia y Cumpleaños recuperan
superficie blanca con texto oscuro. Botones planos, radio2px y sin glow/sombra en el piloto.
No se replica la dirección a fichas/cartas importadas.

**Idioma:** «México · Estados Unidos» / «Mexico · United States». El H1 accesible y las cuatro
partes del SVG cambian a «No time for tears» sin sustituir paths/capas. Frase de apoyo, CTA,
enlace secundario y pausa también cambian. Auditoría de texto visible descubre/corrige el título
de Botaneo, la franja de marca, detalle GDL del footer y descripciones generales de Tienda.
Nombres propios, títulos de productos/platos protegidos y `Halloween Night` no son huecos de
traducción. Corregido «brinde»→«brindis» en Experiencia, sin nuevas ofertas/datos comerciales.

**Verificación:**180/180 en `npm run check`. QA local24casos home/directorio ES/EN a
320/390/768/1024/1440/1920 y59accesos en22páginas; pruebas de pausa/reproducción real de las
tres escenas, reduced-motion, cabecera abajo/arriba/Tab/menú abierto, retorno ES/EN, filtros y
encuadres. Once combinaciones adicionales del hero en ambos idiomas (22casos, incluidas320×568
y touch desktop) comprueban geometría superpuesta, acciones contenidas y rótulo bajo la cabecera.
La candidata superpuesta repite esos controles sobre el paquete final; recibos/capturas
→ `.artifacts/hero-overlay/`. El control de contraste fotografía+sombreado añade36escenas/
idiomas/viewports y108regiones del texto pequeño blanco (países, subtítulo y enlace secundario):
mínimo5,314:1 en las áreas capturadas, calculado sin letras/sombra del texto y frente a4,5:1.
El primer ensayo detectó contraste insuficiente en países; se corrigió antes de mostrar.
Esto no certifica accesibilidad completa ni contraste de todos los píxeles del SVG.
Las dos corridas generales del home se detuvieron: una al ajustar sombreado y otra por repetir
bloques ajenos a este cambio. No usar esos recibos parciales como certificación. Usar
`hero-viewports.json`, `audit-final.log` y `contrast-report.json`. El QA general de bloques del
candidato anterior queda como antecedente, no como una nueva corrida completa de este lote.
El QA anterior del selector usó alcance explícito
`SY_QA_SCOPE=home`: el modo completo conserva su fallo en las fichas importadas que ya carecen
del `#cartelera` legado. No certificar agendas locales ni reconstruir fichas por esta corrección.
La ausencia es previa al lote (HTML de esas fichas idéntico al baseline), registrada para el
frente de secundarios. Solo Chromium emulado, GET/HEAD y telemetría bloqueada; Safari/dispositivos físicos
pendientes. Corrección nueva de idioma tiene regresión ejecutable de texto/SVG/control reversible,
además de comprobar `document.lang`.

Paquete explícito de revisión193archivos/noindex. Build productivo conserva el rechazo de las
cuatro páginas protegidas El Paso/Catering; no relajar ese gate para publicar una corrección visual.
Siguiente: Luis revisa esta candidata; después armonizar secundarios por bloques. Menús,
WordPress, QR, registro, horarios y producción no modificados. La aprobación de dirección B o
el uso del banco local no equivale a aprobar publicación.

### Pulido editorial y secundarios · candidata local10-oct

D15, petición posterior de Luis: conserva el hero fotográfico superpuesto, retira la etiqueta
visible «Pausar fotos», actualiza el anuncio de El Paso y evita repetir el selector como destino
para cada pretexto. No implica publicación, menús, WordPress, QR ni registro/lealtad.

- El control del hero es un icono de44px con nombre accesible ES/EN; permite pausar/reanudar,
  teclado y reduced-motion. La secuencia/rótulo/composición D14 se conservan.
- `SY_DATA` conserva estado `coming-soon`, fecha9-oct y canal de reserva `none` para El Paso;
  solo `statusLabel` pasa a «Nueva apertura», reutilizado por anuncio y tarjeta. Filtro/footer
  dicen «Nuevas y próximas» para evitar presentar esta novedad como una fecha futura. No se
  certifican apertura operativa, horarios ni reservas; la ficha importada mantiene su gate.
- «Se aceptan pretextos chiquitos» ya aparece en la fuente publicada anterior `3846955`;
  Git registra su introducción en `1df5822` (26-sep). Esto acredita presencia previa, no autoría
  individual de Karina. Se conservan los seis textos; pasan de enlaces repetidos a artículos,
  más compactos en móvil. El cumpleaños/carta/hero siguen usando el único selector aprobado.
- La experiencia enlaza La Cantina. El cierre conserva «Ya quedó» y enlaza Eventos/Catering:
  destinos existentes con propósito propio, sin nuevas páginas ni reserva/compra simuladas.
- «Lo que viene» integra una fotografía amplia junto a la cartelera blanca; una columna en
  móvil/tablet. Fechas/sedes siguen derivadas de `SY_DATA` y vencimientos por zona, sin promos
  inventadas ni atribuir la fotografía a esas noches. Fuente: banco Karina7-oct, Woodlands#147,
  `1alcX17sxFx3mb8A4c_RVTQ8Vf78sUv5b.png`, SHA256
  `78b3fba5e4f7d2b31de7af7e0e969b045c2cfa162c8754441a0c4570bb3772d4`.
  Derivados `agenda-canto-{640,1280}.webp`, solo resize,59,578/139,796bytes, lazy y srcset;
  recibo `.artifacts/visual-polish/media-provenance.json`. No acredita derechos para un release.
- La Cantina/Eventos/Tienda ya existían. Comparten ahora masthead, Bebas/Inter, blancos,
  contraste legible y acciones simples mediante el mismo `visual-pilot.css`. Contenido/listas
  heredadas intactas; el pulido no certifica surtido/servicios/precios de esas páginas.
  Fichas/Catering importados se corrigen por donante, no retocando HTML generado aquí.
- Header al scroll en las cinco páginas: teclado mantiene visible la cabecera incluso cuando
  el foco mueve la página; rueda/tacto/puntero restablecen el comportamiento de scroll.

**Verificación del paquete local:**195archivos, digest
`9aebc706730059d823685726904903f90ea2ac923b7e2d368b2aee826fe1ab9f`.
`npm run check`:180/180;60casos ES/EN ×320/390/768/1024/1440/1920 en home/directorio/
La Cantina/Eventos/Tienda, sin overflow/errores JS; geometría de títulos, foto/cartelera,
idiomas nuevos, menú táctil/Escape y header/Tab comprobados.16destinos locales con200 y
anclas existentes. Pausa con Space, reanudación, transición, reduced-motion y nombre accesible
EN comprobados.10casos adicionales de teclado/puntero/rueda confirman que el header mantiene
accesibilidad y recupera su scroll; delta del registro y20archivos protegidos comprobados byte
a byte. Recibos/capturas/scripts `.artifacts/visual-polish/`. Rollback local al checkpoint
`81caf8c` anterior; no ejecutar un rollback productivo por este encargo.
Chromium emulado, sin certificación Safari/dispositivos físicos ni lanzamiento integral.
`npm run build` sigue rechazando las cuatro páginas protegidas de revisión; se empaqueta
con audiencia `review`, sin relajar el gate. `_redirects`, cartas, HTML importado y archivos de
registro no cambiaron; la versión global de assets se conserva y se invalidan solo consumidores
públicos de JS/CSS modificados. Sin push/merge/preview público/deploy.

### Interiores Catering y Houston · candidata local10-oct

Recordatorio posterior de Luis: los headers persistentes deben ocultarse al bajar y volver
al subir. Regla guardada en AGENTS;16páginas ES/EN comprobadas en390/768/1440,48casos pasan.
Incluye home, directorio, secundarios, Catering y fichas. No se alteró código ni la candidata
por este recordatorio; recibo `.artifacts/header-consistency/report.json`. Cartas fuera del lote.

D18: Luis autoriza continuar primero Catering y después Houston. Pulido de presentación ES/EN,
sin ampliar oferta, cambiar hechos comerciales ni rehacer el hero del home.

- Catering: Bebas existente del hero se extiende a títulos interiores; negro/blanco para lectura
  y naranja del arte original como acento. Introducción sin la miniatura duplicada del hero;
  cuatro propuestas más compactas, arte/texto y apertura nativa conservados. Experiencia con
  fotos rectangulares alineadas y separación uniforme, sin máscaras circulares/arcos. Contacto
  agrupa emblema/título, incluidos tablet y EN; enlace Instagram y todos los textos intactos.
- Houston: header blanco con logo original y controller compartido ocultar/revelar; vino de
  identidad conservado. Lectura blanca en comida/visita, botón de indicaciones en vino/blanco,
  Catering oscuro con fundido continuo y enlace editorial. Fotos, hero, agenda, mapa, horarios,
  reservas y destinos existentes permanecen exactos. Otras sucursales fuera del lote.
- Fuente aislada `sites/sinyolanda-catering-visuals`: Catering `1e629895830d1ace93e7f32584d08efdce7f93b9`,
  presentación Houston `8335c9cd6cb0991d314edded76f137cf4dea95e5`; build105 rutas sin errores,
  32/32 pruebas relevantes. No usar las cartas posteriores del donante principal.
- Catering: importación selectiva habitual de dos rutas review. Houston: herramienta local
  `scripts/refresh-houston-presentation.mjs` sustituye solo referencias CSS/módulos de dos
  fichas después de exigir paridad del body y mismas identidades de recursos. Conserva head,
  Analytics, datos y snapshot/instante de programación previos. Ignora el nuevo instante de
  observación únicamente para comparar; no lo escribe. `presentationSourceRef` separado del
  `sourceRef` de contenido `cbffdc4`; no cambia indexation-policy ni importa la carta Houston.
  Requiere fuente explícita/HEAD limpio e informe local; `--dry-run` no escribe las páginas.

**Verificado:** `npm run check`,188/188;24casos (cuatro rutas ×320/390/768/1024/1440/1920),
ES/EN, fotos, tipografía, contacto, propuestas por clic/Space, idiomas y header por scroll/Tab/
rueda/reduced-motion, sin overflow ni errores JS/recursos locales. Dos pruebas móviles normales
con tacto, ocultación fuera de pantalla, targets≥44px y fallback sin JS pasan. Catering conserva
hero, todos los textos/propuestas/enlaces ES/EN frente a D17.196archivos públicos protegidos y
body/metadatos Houston exactos salvo referencias de presentación.135controles HTTP y220enlaces
internos en23páginas sin fallos; URLs/slashes conservados. Capturas390/768/1440 ES/EN inspeccionadas;
se repitió QA tras compactar contacto. Captura estándar `preview.py` raíz inspeccionada; la toma
con hash se descartó por captura incompleta del scroll. Recibos `.artifacts/interior-polish/`.

Paquete202archivos review/noindex, digest
`e48e407d6e0fc061f0273c63020dfe34e71502adabf3a93a38bef8876e122988`.
Gate productivo sigue rechazando cuatro páginas review. Rollback local D17 `3e75bac`.
Sin push/merge, preview público ni deploy. Chromium emulado no certifica Safari/iPhone físico,
proveedores externos ni negocio/medios. Siguiente: criterio visual de Luis, fichas restantes por
bloques y QA físico; hero, cartas, WordPress/QR y registro/GHL quedan fuera de este frente.

### Detalles de Catering, selector y fotografía · candidata local10-oct

D17, ajuste posterior de Luis sobre D16. Home hero, oferta/contacto, rutas y listas de sucursales
conservados. La prioridad de Catering permanece; cambia su presentación y cabecera nativa.

- Home: franja blanca más compacta, fotografía de bebidas sobre sarape a la izquierda,
  marca original del servicio y texto a la derecha; en móvil se apilan. Un enlace editorial
  lleva a la edición ES/EN correspondiente. Reutiliza fotos de Catering ya trazadas/importadas,
  sin nuevos derivados, retoque ni afirmaciones comerciales.
- «México y Estados Unidos» queda debajo de «Cuál te queda», con el mismo eje y junto a los
  filtros. Renderer/registro únicos y Guadalajara / Zona Chapalita, Zapopan intactos.
- «Trae a los cuatro» recupera `assets/media/celebration.webp` original, completa en proporción
  4:5, junto al texto sobre fondo oscuro; en móvil foto antes de texto. Agenda blanca anterior
  y experiencia oscura siguen un grupo con información independiente. Se retira una regla
  blanca heredada que dejaba invisible el H2 oscuro: detectado en capturas, corregido y repetido.
- Catering nativo ES/EN: cabecera blanca con el conjunto original `images/catering-review/logo.webp`.
  «Catering» es parte de ese arte, sin simular otra fuente. Oculta al bajar, revela al subir/Tab,
  permanece visible durante navegación por teclado y recupera scroll por rueda/tacto/puntero.
  Sin JavaScript permanece en la entrada; reduced-motion elimina la transición.
- Fuente aislada `sites/sinyolanda-catering-visuals`, branch `fix/catering-visual-details-20261010`,
  commit `76ecb028a7b6feeeab13a24a2e01e18509658922` desde `cbffdc4`. Build/check sin errores,
  22/22 pruebas de Catering/navegación. Primera suite general:252/255; dos fixtures del logo
  actualizados, fallo ajeno de mapa por configuración Google Maps ausente en el worktree.
  No reparar/importar ese mapa ni integrar las cartas posteriores del donante principal.
  Importación selectiva de solo dos páginas, sin conflictos de assets; loader Analytics
  reconciliado con helper existente, versión global conservada. Main nativo idéntico a D16.

**Verificación final:** `npm run check`,184/184.36casos home/directorio/Catering ES/EN
×320/390/768/1024/1440/1920; fotos cargadas, proporción original, H2 legible, ubicación del
país, filtros, idiomas/enlaces y cuatro menús nativos abren/cierran.12casos de header comprueban
ocultar/revelar, Tab, scroll inducido por foco, rueda y reduced-motion. Dos recorridos móviles
adicionales verifican transición normal180ms, header fuera del viewport al ocultarse, tacto,
targets visibles≥44px y entrada sin JavaScript. Flujo móvil Home EN→
Catering EN→ES pasa.135respuestas GET/HEAD/canonical/404 y220enlaces internos en23páginas
sin fallos/anclas ausentes. Cero overflow, errores JS o recursos locales observados.
Capturas390/768/1440 ES/EN y captura estándar `preview.py` inspeccionadas; se repitió QA tras
la corrección de contraste. Hero fuente y186archivos protegidos idénticos a D16, main Catering
ES/EN idéntico. Cartas, fichas, datos, QR y registro intactos. Recibos `.artifacts/visual-details/`.

Paquete200archivos/review/noindex, digest
`4e2cd207de5c1542ecdea5e5234f742143f61666195a52943b67edfcc569af29`.
Build productivo sigue rechazando las cuatro páginas de revisión; no relajar ese gate.
Rollback local: checkpoint `47a1aaf` anterior. Sin push/merge, preview público ni deploy.
QA Chromium emulado: no certifica Safari/dispositivos físicos, contenido comercial ni todo
el sitio. Pendientes: criterio visual de Luis, pulido por bloques de fichas y validación física;
negocio/medios/importados conservan sus gates separados.

### Catering prioritario y continuidad de bloques · candidata local10-oct

D16, encargo posterior de Luis: dar prioridad a Catering, conservar la información existente,
integrar «Lo que viene» con «Trae a los cuatro» y revisar URLs/slashes. Hero D15 intacto.

- Catering pasa al segundo acceso del header, después de Ubicaciones; cumpleaños conserva su
  sección/entrada en Eventos. Bloque propio inmediatamente después del selector aprobado y
  antes del plan: misma frase/intro de la página existente, una foto de servicio y un CTA.
  Header, bloque, cierre y footer enlazan `/catering` en ES y `/en/catering/` en EN.
- Cobertura publicada en esa página: **Houston**. Contacto: Instagram `sinyolandacatering`.
  No extender territorio, inventar teléfono/cotizador ni aprobar propuestas por darles prioridad.
  Catering nativo ES/EN, sus cuatro propuestas y condiciones se conservan byte a byte.
- Foto del bloque: banco Karina7-oct, Catering Brian#22,
  `1UVibZ_kpHTTvMhV-9jsWsMreTAWlcSSv.jpg`, SHA256
  `02b60c0c0080c3101a2255e4dc31d795735c390fd71d9ad50c403b14d78c8f7e`.
  Derivados `catering-servicio-{640,1280}.webp`,105.830/299.998bytes, resize sin retoque,
  srcset/lazy y encuadre CSS inspeccionado. Escena general de servicio, sin afirmar sede/plato.
  Recibo de procedencia `.artifacts/catering-flow/media-provenance.json`.
- Agenda y experiencia quedan en un grupo: una sola fotografía junto a la agenda blanca y
  continuación oscura tipográfica. Se retira la segunda pared de foto/blanco; contenido de
  experiencia conservado e independiente del vencimiento de campañas. Sin fechas vigentes,
  desaparece la agenda y permanece la invitación. No duplicar calendarios ni cambiar sus datos.
- Shell normaliza enlaces legacy `.html` a canonical, conservando query/ancla. El servidor
  local ahora reproduce los308 observados en Pages: HTML superior sin slash final, índices
  anidados con slash, `.html`→canonical. Solo aliases de páginas permitidas; desconocidos404.
  GET/HEAD y query preservados, QR302 tiene prioridad intacta. No son redirects nuevos de
  producción: el cambio está en enlaces del shell y herramienta local de revisión.

**Verificación:** `npm run check`,184/184;60casos shell ES/EN ×320/390/768/1024/1440/1920,
12casos Catering nativo ES/EN en los mismos anchos, fotos cargadas y cuatro menús nativos
abren/cierran. Flujo móvil Home EN→Catering EN→ES comprobado; anchors mediante enlaces
visibles (en móvil dos enlaces del header nativo se ocultan por su diseño y existen en footer).
Sin overflow ni errores JS/recursos en estas sondas.27casos adicionales de portada de fichas
ES/EN ×320/768/1440, sin overflow, títulos recortados ni errores observados; no QA completo
por sección de esas fichas.135respuestas locales GET/HEAD/canonical/404 y220enlaces internos
recorridos en23páginas: destinos y anclas resuelven, sin bucles.26GET al dominio real corroboran
contrato de aliases, incluyendo query fresca. No pruebas de envío/contacto/reserva/pagos.
Hero fuente y140archivos protegidos (importados, cartas, medios, fuentes, datos y `_redirects`)
idénticos a D15. Capturas a390/768/1440 inspeccionadas. Recibos/scripts `.artifacts/catering-flow/`.

Paquete197archivos/noindex, digest de fuentes
`877c9b192d46f6d65a784b026b7951c32977a529d7a3d7ca17796cc488b1826d`.
Build productivo sigue rechazando cuatro páginas protegidas; no relajar ese gate. Sin push,
merge, preview público ni publicación. Rollback local: checkpoint `1e12cba` anterior.

**Pendientes de este frente:** revisión visual de Luis; confirmar con negocio cobertura y canal
final de Catering si se quiere ampliar Houston/Instagram; aprobación de medios/contenido de
los importados según su manifiesto; revisión por bloques de fichas y Safari/dispositivos físicos.
`/guadalajara` sigue404 y `/san-ignacio` es la ruta vigente: migración de nombre/URL pertenece
a su lote separado. La sonda legada que exige `#cartelera` en cada ficha sigue fuera de contrato
actual; este crawl no encontró enlaces hacia anclas ausentes. No confundir ambos resultados.

### Registro El Paso v1 · candidata local9-oct

Luis autoriza preparar/publicar el QR de registro con destino nativo GHL confirmado por Share:
formulario `nN59k3I7TT6TOxDl4XET`, alias permanente `/q/el-paso-registro` y variante slash302.
Destino exacto y atribución fija → ROUTES y `_redirects`. Sin nuevo backend, SQL, campañas ni
automatizaciones. Los beneficios del programa siguen pendientes; no se prometen recompensas.

Nombre/email obligatorios; teléfono opcional; cumpleaños opcional guardado como texto día/mes.
Ese dato requiere normalización/validación antes de futuros workflows de cumpleaños. Consentimiento
principal obligatorio y email promocional opcional sin premarcar. El contacto de privacidad es
provisional, con Instagram como alternativa; su cierre operativo sigue pendiente. Esta v1 no
certifica cumplimiento legal ni autoriza activar campañas. Workflows nativos cero; notificaciones,
envíos automáticos y sticky contact desactivados según la revisión del operador.

**Captura controlada autorizada y comprobada por el operador:** un único contacto ficticio llega a
la ubicación correcta, con origen del formulario, consentimiento principal registrado y marketing
vacío. Se confirma atribución `loyalty_el_paso` / `qr` / `offline` / `registro_v1` y el ID del formulario.
Revisión móvil390×844 sin desbordamiento; recargar vuelve a dejar campos vacíos y casillas sin marcar.
No incluir identificadores del contacto ni su email de prueba en estos documentos públicos.
Es QA del formulario nativo, **no** prueba del alias público, todavía sin publicación.

Paquete local aislado186archivos:185preservados byte a byte, solo `_redirects` añade los dos aliases;
home, hero, horarios, footer, headers y QR Guadalajara intactos. Baseline esperado Pages
`32633a4f-b3ff-4d9c-9e78-8471d7773a66`; hashes revalidados contra su URL inmutable y dominio actual.
Solo las transformaciones Cloudflare ya declaradas: privacidad recupera el hash exacto tras retirar
exclusivamente obfuscación de email; noindex propio del home inmutable no afecta al dominio.
Recibos locales ignorados en `.artifacts/registration-preflight-20261009/`.

`prepare-registration-release.mjs` no publica ni aprueba: prepara candidata local y, con aprobación
humana específica, reutiliza el gate de HEAD limpio/commit/digest. No heredar la autorización8-oct.
Falta cerrar commit/aprobación exactos, revalidar baseline justo antes, publicar el artefacto completo
y comprobar GET/HEAD302/destino fijo y web/404 preservados. Los QR negro/naranja PNG/SVG entregados
para preparación codifican únicamente el alias permanente; no usar con clientes antes de activación.
No afirmar prueba física de impresión/iOS/Android ni medición de visitas por estos checks.

### QR de carta Guadalajara · publicado y comprobado8-oct

Luis autoriza la ruta corta `/q/gdl-menu` hacia la carta WordPress original, sin editar su
contenido/orden/diseño ni activar medición. Contrato de rutas → ROUTES. Única diferencia pública
frente al paquete servido `d6734c2` / Pages `7b5a7d5b`: `_redirects`, con dos variantes exactas302;
los185archivos previos permanecen byte a byte idénticos. Instrumentación/GHL/GA4 y CD quedan fuera.
El parámetro público de origen está preparado; no afirmar que ya se contabilizan visitas QR.

Se añade validación de reglas al empaquetado, emulación local GET/HEAD y omisión de controles
Pages en verificación HTTP, manteniendo exclusiones/404/noindex/gates. QA local168/168 pruebas;
PNG y captura renderizada del SVG decodificados a la URL exacta con Vision; ambos revisados.
`scripts/generate-menu-qr.swift` es helper macOS opcional, sin dependencia del build/CI web;
assets en `print/qr-guadalajara-menu`, no se despliega esa carpeta.

**Publicado:** PR #14 integrado, fuente limpia `b23e3135268e08f0e4cedbdb3247f3f0202296d7`;
CI PR `37882179079` y main `37882297526` pasan. Paquete limitado186archivos, digest
`83c60d93706069e1989c11dd541269a556be5a953b495ddeacc411fbee48b85b`; aprobación específica
en `releases/2026-10-08-gdl-menu-qr.json`. Baseline Pages comprobado justo antes del upload.
Publicación directa Pages `32633a4f-b3ff-4d9c-9e78-8471d7773a66`, URL inmutable
`https://32633a4f.sin-yolanda-web.pages.dev`; ruta viva `https://sin-yolanda.com/q/gdl-menu`.

QA remota del QR11/11: GET/HEAD, slash y query ajena conservan302 y destino fijo; WordPress
original y destino etiquetado200, mismas láminas; home idéntico, controles/print/ruta desconocida404.
El302 servido no trae `Cache-Control`: no afirmar `no-store` productivo por la emulación local.
Verificador completo:184archivos servidos,45aliases y diez exclusiones. Los184 coinciden en
la URL inmutable; en producción183 directamente y privacidad tras restaurar exclusivamente
la transformación de email de Cloudflare, con hash exacto en sus tres aliases. Pages inmutable
añade noindex al home; dominio oficial no. Informes crudos conservados, sin relajar sus checks
ni cambiar settings. Recibos → `.artifacts/qr-menu-production-20261008/`, incluido
`edge-transform-verification.json`. No instrumentación QR acreditada ni prueba física iOS/Android:
hacer un escaneo del impreso antes de producir el lote; medición requiere su encargo separado.

Rollback: paquete original verificado `7b5a7d5b-44fa-4d6a-8dc5-222acc134c4d` / `d6734c2`,
conservado en `.artifacts/migration-production-20261008/`; nunca volver al deployment histórico
que reintroduce demos. Este cierre documental no exige otro upload ni cambia la fuente publicada.

### Lote de migración y medición autorizado · 8-oct

Luis autoriza un segundo lote técnico: cobertura Umami, indexación de destinos existentes y
16 redirecciones exactas desde los tres WordPress, sin DNS/correo ni cambio de diseño. Contratos,
excepciones y reversión → [MIGRATION-AND-MEASUREMENT.md](MIGRATION-AND-MEASUREMENT.md).
La indexación explícita de 12 páginas sustituye su gate noindex previo, pero conserva procedencia
del donante y aprobaciones comerciales pendientes. El Paso/Catering ES/EN siguen protegidos.
Central publicado desde PR #11/main `d6734c2`, deployment
`7b5a7d5b-44fa-4d6a-8dc5-222acc134c4d`; después se instalaron y activaron los tres plugins.
GA4 queda separado hasta confirmar propiedad/cuenta. Este lote no instala CD automático.
Resultado: 22 páginas medibles + 404 excluido; 12 destinos indexables y cuatro protegidos.
Las 16 reglas GET/HEAD y variantes/exclusiones pasaron 69/69 comprobaciones remotas.
Evidencia y límites en el documento enlazado; no certifica datos comerciales ni todo el tráfico.

### Release limitado autorizado · 8-oct

Luis solicita publicar el candidato actual aunque queden mejoras. El contenido autorizado es
`ffb6be1b99cc73ce934dc43d468fb4d4e1ec73c9`, sin nuevos cambios visuales. La aprobación acotada
en `releases/2026-10-08-limited-approval.json` fija dominio y digest de todos los archivos públicos.
La envoltura técnica añade el modo `limited-production`: exige Git limpio, fuente existente/ancestro
y hash coincidente antes de crear salida. No cambia `publicationApproved:false`, no certifica
cartas/datos/derechos ni autoriza releases posteriores. Las 16 páginas pendientes conservan
noindex y exclusión del sitemap; el home mantiene su indexación. No publicar el paquete review
con su cabecera noindex global en el dominio oficial.

CI comprueba un artefacto explícito de revisión noindex, sin credenciales ni permiso de release.
Producción normal sigue bloqueada; esta publicación usa aprobación humana específica y carga
directa de Pages. No afirmar que CD esté automatizado. Tests locales: 103/103. QA visual previa:
42 casos + 10 recorridos del home; medios/maps externos no certificados por esas sondas.

Baseline Pages comprobado: `766a7c6c-f168-49d2-8d53-bbde1e492235`, fuentes públicas principales
sin cambios frente a la captura previa. Su `/dashboard` todavía responde 200: NO es un rollback
seguro automático porque reintroduciría el panel demo. Recuperación preferente: volver a publicar
el paquete limitado verificado; cualquier retorno histórico requiere revisar sus exclusiones.
No se cambia DNS, correo, panel operativo, facturación ni credenciales.

**Publicado y comprobado:** PR #9 integrado en `main` (`aeb66b1`); fuente del paquete `befc2a4`,
limpia, 184 archivos. CI remoto de PR `37825092644` y de main `37826866281` pasan. Upload directo
Pages producción: `d149688f-e3c9-46f0-a55f-f290b9f2dd7b`, URL inmutable
`https://d149688f.sin-yolanda-web.pages.dev`; dominio `https://sin-yolanda.com`.
GET-only: 183 archivos servidos, 45 aliases y 10 exclusiones; panel demo, mocks, scripts y
Maricarmen responden 404. Todos los archivos coinciden en la URL inmutable. En el dominio,
182 coinciden directamente; únicamente privacidad recibe la protección automática de email de
Cloudflare. Se restaura localmente esa transformación exacta en sus tres aliases y el hash vuelve
a coincidir, sin modificar sitio/settings ni eximir otras diferencias. La URL inmutable añade
noindex propio de Cloudflare; el home del dominio oficial NO lo recibe. Las 16 páginas pendientes
conservan su meta noindex. Recibos completos ignorados en `.artifacts/limited-production-20261008-befc2a4/`.
Smoke remoto: 13/13 casos pasan; enlaces home→ficha propia, menús, idiomas, Catering y tablet,
sin errores JS, recursos propios fallidos ni overflow. Recibo y capturas ignorados en
`.artifacts/production-smoke-20261008-d149688f-recovered/`. La sonda bloquea RPC POST de Google;
una revisión aparte en navegador normal comprueba teselas, ficha y pin de Houston visibles.
No es certificación comercial, carga, Safari ni CI/CD completo; pendientes conservados.

## 1. Una casa por tipo de información

| Información | Fuente dentro del flujo |
|---|---|
| Instrucciones del asistente | `AGENTS.md`, corto y versionado |
| Acuerdos, proceso y acceso necesario | Este documento; decisiones en §6 |
| URLs, redirects y retirada de páginas | `ROUTES.md`; futuro manifiesto validado generará salidas |
| Código/release oficial | Este repositorio; commit + artefacto publicado identificados |
| Trabajo por hacer y conversación de revisión | Issue/PR correspondiente; no duplicar todo en chat |
| Contenido por sede | Registro de datos con procedencia/validación; hoy transición, ver §3 |
| Contraseñas, tokens, credenciales | Gestor privado; jamás este repo ni documentos públicos |

No depender de memoria del chatbot. Codex carga `AGENTS.md` cuando trabaja sobre el repositorio;
otros asistentes requieren comprobar su integración. Un chat sin checkout no hereda estas reglas
por tener simplemente un enlace. Los bloqueos efectivos viven en GitHub, no solo en instrucciones.

## 2. Flujo cotidiano propuesto

Solicitud breve → contexto del repo → rama/PR → pruebas → preview → revisión → publicación aprobada.

1. El asistente identifica área y criterio de aceptación; pregunta solo si falta una decisión material.
2. Una rama por tarea; la rama compartida `dev`, si se adopta conforme al estándar de agencia,
   integra únicamente cambios revisados. No activar despliegue de `dev` a producción. La política
   exacta de ramas se cierra al instalar protecciones; no crear ramas remotas por este documento.
3. Cambio pequeño y completo; pruebas y docs afectadas en el mismo PR. Karina trabaja el hero
   en su rama; el resto no sobrescribe ese bloque ni sus assets. Conflictos se revisan, no se fuerzan.
4. CI sin secretos ejecuta los checks portables. Preview solo desde código confiable revisado,
   bajo gate de publicación por enlace; noindex y protección adicional si el material lo necesita.
5. Un responsable revisa diseño/datos además de tests. Incorporar al commit aprobado los cambios
   requeridos; no arreglar a mano el servidor o el HTML desplegado.
6. El release usa commit y artefacto exactos con hash, rutas y versión donante; aprobación explícita
   mediante ambiente protegido antes del job de producción. Sin volver a compilar otro contenido.
7. Smoke del dominio y enlaces críticos; registrar deployment ID, resultado y destino de rollback.
   No reintentar indefinidamente si falla: detener, diagnosticar y proponer reversión controlada.

**Baseline remoto previo a este lote:** Actions habilitado, sin workflows, ambientes, secrets de repositorio,
rulesets ni protección clásica de `main`. Token de workflow por defecto de lectura; no puede
aprobar PR. Observación 7-oct; no se inspeccionaron secretos heredados de organización.
Estos controles aún no están activos y se revalidan antes de configurarlos.

## 3. Implementación del primer lote y límites

Antecedente del 7-oct: los estados de este apartado describen ese lote, no sustituyen el release
publicado del 8-oct registrado arriba.

**Diagnóstico previo (corregido en este candidato, no en producción):**

- `scripts/package-public.mjs` seleccionaba todos los HTML/CSS/JS raíz y directorios amplios.
  Necesita allowlist pública y prueba negativa: no panel demo, documentación, mocks internos o
  secretos. `assets/js/mock-data.js` mezcla contenido público con demostraciones; separar con cuidado.
- `scripts/import-branches.mjs` y pruebas Houston dependen de `../sinyolanda-universal` y `dist`.
  Un clon de este repo no reproduce esa entrada; el helper de pruebas también presupone el nombre
  local `sinyolanda-karina-official` al resolver imports. No simular portabilidad con rutas del Mac.
- Suite existente, Node 22.17.0 local, 7-oct: **7 pasan / 1 falla**. El HTML Houston conserva el
  teléfono anterior frente al registro actualizado del donante. Comparar release/candidato/dato
  aprobado y corregir en el lote de datos; no modificar el test para validar el dato viejo.
- Ruta inmediata propuesta: contrato de entrada del donante fijado a commit y build con lockfile;
  tests del artefacto oficial autocontenidos, comparación contra donante en integración explícita.
  Alternativa de consolidar fuentes se evalúa sin imponer una migración de framework al hero.

**Solución implementada, 7-oct:** conservar el snapshot estático versionado como fuente del release
oficial. CI no compila ni necesita el repositorio donante privado. El importador ahora exige checkout
explícito limpio y SHA completo; su build fresco sigue siendo una integración supervisada, no parte
del CI. Esto no consolida todavía los dos proyectos ni demuestra reconstrucción histórica del donante.

- `npm ci --ignore-scripts`, `npm run check`, `npm run build`: Node de `.node-version`, sin dependencias npm.
- Allowlist exacta de 15 HTML y sus recursos; fuera del paquete demo/mocks/archivos incidentales.
- JS público sin renderizadores internos; datos públicos separados y enlaces al panel retirados.
- Teléfono Houston corregido al confirmado, sin reimportar diseño nuevo: excepción acotada de
  sincronización del snapshot, 3 representaciones (datos + ES + EN), todas probadas. Donante ya
  conserva el teléfono aprobado; no se alteran imagen, estilo, hero ni mapa.
- Manifest de release externo al sitio con commit, dirty y hashes; CI exige árbol limpio.
- Pruebas de clon aislado, assets/enlaces/sitemap y entradas maliciosas; no invocan reservas/pagos.

`npm run build` exige salida nueva; no sobreescribe ni borra versiones anteriores. Para otro destino:
`node scripts/package-public.mjs <directorio-nuevo>`. Validación local permite diagnóstico dirty,
pero Actions rechaza un artefacto dirty. No publicar un ZIP/release por haber pasado los tests.
Se conservan pendientes los controles remotos, CD, prueba de HTTP real y QA editorial del resto.

**QA de este lote:** 19 pruebas locales; 77 archivos permitidos, 15 HTML, 169 referencias locales.
Navegador: 45 recorridos (15 páginas × 390/768/1440 px), sin excepciones JS, imágenes rotas
detectadas ni desbordamiento horizontal. Hero renderizado comparado contra el commit previo,
idéntico; CSS y medios sin cambios. Capturas desktop/móvil inspeccionadas. Peticiones externas
bloqueadas en esta prueba: no certifica disponibilidad de Maps/OpenTable ni tipografía remota.
Persiste contenido ES mezclado en modo EN del home; es deuda editorial previa, fuera del hero reservado.
Retirada pública solo quedará completa al desplegar y comprobar las rutas directas en Pages.

## 4. Contrato de automatización y credenciales

| Elemento | Necesidad / restricción |
|---|---|
| GitHub para trabajo humano/asistente | Acceso al repo con su cuenta/conector; no compartir login. Acceso actual de Luis ADMIN verificado. Confirmar flujo de Karina |
| `GITHUB_TOKEN` en Actions | Lo emite GitHub por ejecución; lectura para checkout/QA. Permisos extra solo donde sean necesarios. No requiere PAT personal para CI de este repo |
| `CLOUDFLARE_API_TOKEN` | Credencial de publicación Pages, cuenta específica, permiso Pages Edit; sin DNS/pagos/Global API Key. Confirmar alcance real del proveedor: no afirmar restricción a un solo proyecto si el permiso es de cuenta |
| `CLOUDFLARE_ACCOUNT_ID` | Identificador de cuenta, no contraseña; variable de ambiente o secret según política |
| Proyecto y rama de destino | Config versionada: `sin-yolanda-web`, producción `main`; revalidar contra Pages antes de activar |
| Donante privado, si se mantiene externo | `GITHUB_TOKEN` de este repo no da acceso automático a otro. Preferir consolidación o GitHub App de lectura/repo acotado, solo si la arquitectura lo exige |
| Gestor privado | Doppler es dueño de secretos DDTIA; config dedicada al servicio. Actions consume por mecanismo acordado (réplica administrada o identidad federada compatible), no exportación manual repetida |
| SSH/VPS, Google, OpenAI | **No necesarios** para construir/publicar este sitio estático en Pages. Panel/mapas/ingesta son frentes aparte; no inyectar sus credenciales en el workflow web |

No se creó ni rotó ninguna llave. No asumir que el OAuth usado en una publicación manual sirve
como credencial durable de CI. Si falta autenticación, se solicita acceso una vez y se configura
el mecanismo seguro; no pedir al usuario que vuelva a pegar tokens en cada conversación.

Seguridad de workflows: actions fijadas a SHA revisado; runtime/dependencias fijados; permisos
mínimos; `pull_request` sin secretos; no ejecutar PR externos con `pull_request_target` privilegiado;
aprobación del ambiente y cambios sensibles de workflow por responsables. Aislar job que publica:
no ejecutar código arbitrario del PR mientras están disponibles credenciales de despliegue.
Un token Pages de cuenta no se vuelve exclusivo de preview por ponerle ese nombre; el aislamiento
real depende del alcance de credencial y permisos/entornos. Definir ese límite antes de automatizar previews.

`CODEOWNERS` y checks obligatorios se configuran con identidades verificadas y ruleset/protección;
el archivo solo no bloquea merges. Dos puertas separadas: aprobación del cambio y del despliegue.
Evitar excepciones amplias de administrador o bypass para bots. PR no equivale a aprobación comercial.

## 5. Qué verificará el sistema y qué revisará una persona

**Automático:** sintaxis/tests, checkout limpio, archivos/rutas publicables, enlaces locales/aliases,
canonicals/hreflang/schema, identidad de sede y CTA, assets/licencias, simulaciones/notas internas,
ausencia de secretos, presupuesto de imagen/bundles, humo de preview/producción y manifest de release.
No se presentan como implementados: son aceptación del futuro CI.

**Humano:** identidad visual, fotos y permisos, vigencia comercial, promesas/condiciones, encuadres
y experiencia móvil. QA visual reproducible con tamaños/capturas y comparación del hero reservado.
No sustituir aprobación de negocio con «el test pasa» o con una evaluación automática del asistente.

**Cambios temporales:** eventos/promos necesitan disparador por tiempo además de commits. Publicar
y retirar por zona horaria, con alerta de error y comprobación del HTML servido. No confundir
automatizar vigencia con aprobar contenido nuevo leído de Instagram. Sin agenda válida, no inventar.

## 6. Registro compacto de decisiones

| ID / fecha | Estado | Decisión y motivo | Consecuencia / comprobación |
|---|---|---|---|
| D01 · 7-oct | Confirmada Luis | Oficial de Karina como base; hero reservado a ella | Cambios modulares; no reemplazo integral ni regresión hero |
| D02 · 7-oct | Confirmada Luis | Reusar selector/fichas/cartas/Catering aprobados, datos propios por sede | Revisión conectada; no enlaces de todas las sedes a Houston |
| D03 · 7-oct | Propuesta técnica | Actions + Wrangler sobre Pages actual | Verificar cuenta/proyecto, token y pruebas; evitar migrar DNS por CI |
| D04 · 7-oct | Regla de trabajo | Instrucciones en repo + controles GitHub; estado no depende del chat | Verificar carga de AGENTS y ejecución remota/protecciones |
| D05 · 7-oct | Implementada en candidato | Release estático autocontenido, donante separado y explícito | Tests/build sin sibling; futura importación requiere build fresco verificado |
| D06 · 7-oct | Implementada en candidato | Lista pública explícita y JS/datos separados del panel demo | Pruebas negativas; falta despliegue autorizado para retirar el demo del dominio |
| D07 · 7-oct | Implementada en candidato | CI read-only sin secretos ni publicación | Validar run remoto; CD/credenciales/protecciones se activan aparte |
| D08 · 7-oct | Solicitada por Luis; candidata local | Franja naranja El Paso directamente después del hero, fecha 9-oct y enlace a su ficha | Anuncio independiente del hero; estado/fecha del registro público, no declarar apertura por el reloj |
| D09 · 7-oct | Encargada por Luis; candidata local | Rótulo existente como H1 sobre el video de Karina; quitar copy antiguo y bloque/fotos duplicados | Conservar SVG/fuente y hashes de video/póster; geometría móvil/desktop y texto visible al scroll. Sin publicación |
| D10 · 7-oct | Corrección solicitada por Luis; candidata local | Cartelera de campañas comunes desde calendarios vivos, crema/tinta/naranja; no Instagram ni granate | Halloween31-oct y Catrinas con fecha propia por sede. No extrapolar promos/horarios/beneficios ni considerar el PDF tentativo agenda confirmada |
| D11 · 8-oct | Solicitada Luis; solo candidato local | Preservar información de fichas vivas de Karina antes de sustituirlas por nuestras fichas/cartas | Snapshot público inmutable y conciliación por sede en BRANCH-CONTENT; lo observado no reemplaza datos ya confirmados |
| D12 · 8-oct; piloto10-oct | Piloto local, pendiente de juicio visual | Revisar identidad tipográfica, color por función/sede, header y transiciones después de la integración | Home/directorio preparados y QA local; revisión de Luis antes de réplica; fuente de resultado en bloque visual de este documento |
| D13 · 10-oct | Encargo explícito Luis; candidata local | Revisar hero/ES-EN, fotos frente a video, header al scroll, blanco y prioridad del selector | Fuente/resultado en «Hero, blanco y prioridad»; permite modificar hero en esta rama, no publicar ni tocar cartas/WordPress/QR/registro |
| D14 · 10-oct | Corrección explícita Luis; candidata local | Rechaza foto/texto separados; recuperar rótulo y acciones sobre la foto | Fondo fotográfico completo con sombreado continuo y encuadres responsive; conserva secuencia, idiomas y alcance D13, sin aprobación de publicación |
| D15 · 10-oct | Pulido posterior solicitado por Luis; candidata local | Icono de pausa, Nueva apertura El Paso, foto/cartelera y menos CTA repetidos; armonizar secundarios existentes | Resultado y QA en «Pulido editorial y secundarios»; no habilita operación de El Paso ni publicación |
| D16 · 10-oct | Solicitada por Luis; candidata local | Catering arriba, continuidad agenda/experiencia y revisión de URLs/slashes | Bloque «Catering prioritario y continuidad de bloques»; cobertura/contacto existentes, hero y archivos importados intactos, sin publicación |
| D17 · 10-oct | Solicitada por Luis; candidata local | Franja Catering, país junto al selector, fotografía original de experiencia y cabecera Catering con scroll/marca original | Bloque «Detalles de Catering, selector y fotografía»; QA responsive/idiomas/teclado, contenido nativo/hero/QR protegidos, sin publicación |
| D18 · 10-oct | Continuación autorizada Luis; candidata local | Pulir interiores Catering y Houston ES/EN, preservando contenido y hero del home | Bloque «Interiores Catering y Houston»; presentación separada de contenido/indexación, QA responsive y publicación con gates propios |

Agregar una fila solo si cambia el contrato. Cambios de implementación → PR/commit; cambios de
ruta → ROUTES; no duplicar reseñas largas de sesión. Un release registra commit, sourceRef/hash,
artefacto, pruebas, aprobación y rollback. Archivar evidencia de QA sin datos privados ni secretos.

## 7. Activación por pasos

### Importación conectada y conservación de contenido · 8-oct, revisión local

Antes del cambio se capturaron las cinco fichas públicas del dominio y su registro de siete
sedes/anuncios. Siete fuentes estables al inicio/final; solo campos públicos, sin mocks completos
ni colecciones administrativas. Fuente y conciliación → `BRANCH-CONTENT.md` y snapshot enlazado.
No se presenta como respaldo integral de Pages ni validación de horarios/reseñas/oferta.

Donante limpio `cbffdc4abd7b274d9de16f5059d079bb70e9877b`, build fresco Astro sin errores:
9 fichas (Houston/SA/TW/El Paso ES+EN, Guadalajara ES), 5 cartas (Houston EN, SA ES/EN,
TW/GDL ES) y Catering ES/EN. Importación selectiva, no copia de todo `dist`. Sin Maricarmen,
home donante, rutas de prueba ni fichas ficticias para futuras aperturas. Guadalajara cambia
solo presentación, no la dirección Avenida San Ignacio78 ni ID/slug. El Paso mantiene preapertura.

Home/selector/hero/CSS permanecen aceptados; únicamente se actualizan enlaces de cartas propias
y versión de caché `20261008-branch-review`. Logo/selector/vuelta desde fichas y Catering conectan
al home `/#ubicaciones`; idiomas conservan servicio/sede. Houston incorpora la composición
posterior de Catering y footer de carta. Datos nuevos del snapshot de Karina se concilian después,
no se copian sus bloques de agenda de ejemplo o FAQ repetidas. Teléfono confirmado Houston intacto.

**Dos audiencias explícitas:** `import-branches --audience review` retiene noindex/procedencia;
`publicationApproved:false` y bloqueos quedan en el manifiesto. `sync-review-imports` exige
captura completa/estable y reportes explícitos, conecta allowlist y excluye esas16páginas del sitemap.
El paquete de revisión tiene23HTML/184archivos y header global noindex; no expone archivo/docs/tests.
El empaquetado productivo por defecto **rechaza** las páginas review. `build:review` es independiente;
CI productivo previo no se cambió ni se ejecutó remoto, y no se simula verde su job de empaquetado.
Futuro flujo de preview/CI se adapta en su lote antes de promover esta rama.

Permisos/datos pendientes de cartas/otras sedes, medios nuevos de Catering/programación y vigencia
temporal no quedan aprobados por importar. El flag general de Houston cubre medios anteriores,
no cualquier subbloque añadido. El importador no lo toma como permiso global y producción permanece
bloqueada. Promos de Houston aún conservan el fallback de Instagram del donante: no es la ingesta
de contenido solicitada ni cierre del pendiente. Fuente/blockers → manifiesto y BRANCH-CONTENT.

`serve-review` sirve únicamente archivos hash-verificados de un paquete ignorado, en127.0.0.1,
GET/HEAD, no listado de carpetas. `/houston/` ya resuelve ficha aunque exista su carpeta de menú;
no se atribuye al hosting el listado del antiguo servidor Python. Capturas/journeys de integración
no equivalen a aprobación comercial o de producción.

**QA local final:** `npm run check` pasa96/96 pruebas. Chromium:42casos a320/390/768/1440
según tipo de página y10recorridos home→ficha a390/1440, sin fallos. Evidencia ignorada
`.artifacts/branch-integration-qa-20261008-capture-fixed/report.json`; capturas de ficha, carta,
Catering y footer inspeccionadas. Imágenes decodificadas después de volver de menú/idioma;
la primera captura del teaser quedó blanca por adelantar la captura a la imagen lazy recreada,
no por falta de CSS (ese componente usa estilo inline). La sonda ahora comprueba carga/pintado
del teaser y no fuerza estilos para fabricar una imagen correcta.

Servicios externos excluidos: Maps se verifica por proveedor/identidad del iframe, no por carga
remota; no reservas, formularios, pagos ni telemetría enviados. No Safari/dispositivo físico,
rendimiento/carga ni QA integral de todos los pendientes QV. Home markup idéntico al corte48acc98
salvo versión de caché; CSS/JS compartidos intactos salvo cuatro enlaces de cartas en public-data.
Paquete productivo rechazado antes de escribir salida, con destino fresco. No push, merge, deploy
ni cambio de credenciales/Cloudflare. CI/CD requiere su adaptación y aprobación separadas.

### Primer lote de correcciones de QA integral · 8-oct, solo local

Luis autoriza corregir QV01/02/04/06/12/13/17 sin rediseñar ni publicar. La clasificación completa
y los pendientes viven en el plan operativo privado del cliente, no se duplican aquí.

- Experiencia: `width:100%`/`min-width:0` hace que el marco llene la columna real, también en tablet;
  foto original, focal, `cover`, proporción apilada y límite de altura conservados.
- CTA final de reserva: comparte `data-select-location`; restaura Todas únicamente desde
  Próximamente, conserva país y navegación/modificadores nativos.
- H1 de fichas genéricas: ajuste local de escala hasta 420 px; Guadalajara/TW caben en320/390
  dentro de su columna, no solo del viewport. Houston importado no usa esa regla.
- Privacidad: escala local del H1 hasta 360 px, sin modificar texto legal.
- Cumpleaños: un solo eje para título/copy/CTA; mínimo de 32 px solo hasta 360 px evita invadir margen.
- Idioma: sincronización única de resaltado/aria-pressed al construir o actualizar el control,
  incluido ES inicial y reconstrucción por MutationObserver.
- Eventos: grupo de acciones `flex-wrap` con gap 16 px en ambas direcciones, destinos intactos.

Versión compartida `20261008-qv-batch1`; referencias HTML y prueba de cache actualizadas juntas.
Sin nuevas rutas, datos, recursos de marca, dependencias de build ni importaciones del donante.
Hero/video/póster, selector y cartelera aceptados conservados; fuente de Houston intacta.

**Verificación:** `npm run check` 42/42, 90 archivos/15 HTML/171 referencias. Siete regresiones VM
detectan los contratos de reserva/idioma antes del fix y pasan después. `qa:visual-refinement`
agrega 35 combinaciones Chromium320–1440, ES/EN según página, con medidas de columna/texto/ejes/gaps,
capturas recorridas y reporte que distingue ejecución incompleta/fatal de aprobación. Se fuerza
descubrimiento/carga de la fuente del H1 antes de medir: `fonts.ready` sin primer layout puede
capturar el fallback y ocultar un recorte. `qa:selector` conserva once viewports y recorridos previos,
añadiendo CTA final, ancho de columna, ES inicial y reconstrucción nativa del toggle en ES/EN.
Capturas finales inspeccionadas; evidencia ignorada `qa-first-batch-candidate-20261008-final` y
`qa-first-batch-selector-20261008-final` bajo `.artifacts/`; paquete final fresco separado.

Gate geométrico local, no automatización browser nueva en GitHub. Pruebas portables sí entran al
check existente; no se ejecutó CI remoto. Sin Safari/dispositivo físico/hosting ni certificación
comercial/SEO integral. Quedan doce hallazgos QV y las importaciones de fichas/Catering/cartas;
el sitio completo no está aprobado para lanzamiento. Sin push, merge, deploy ni credenciales.

### Primer lote correctivo local · 7-oct, posterior a la auditoría

Rama `fix/live-source-selector`, sobre PR #7. **No publicado ni fusionado.** Se recuperaron los
cambios públicos del upload `766a7c6c` dentro del alcance: video/póster, home, rótulo/fotos y 180
líneas nuevas de CSS. Nueve fuentes auditadas revalidadas sin cambios; otras páginas cotejadas.
No trasladar demos, datos internos, scripts de despliegue ni ofuscación de email inyectada por
Cloudflare. El 404 conserva copy neutro, no ocho sucursales. No es respaldo integral de Pages.

Hero: HTML idéntico al publicado, SHA-256 `8ea0e9317329fcd214295f209aef25a06272fed997e7612bb4449ed18ada4e8e`;
video idéntico, ambos controlados por test. Video, póster, copy y comportamiento conservados;
nuevo CSS limitado al selector/rótulo/franja. Header/footer públicos sin enlace al panel.
Selector: `ul > li > a`, primer clic/Enter/tacto nativos, una preview y último hover/foco retenido.
Retícula móvil/tablet/tacto; acordeón desde 1100 px solo con puntero fino/hover. Filtros con
7/1/6/3 registros; futuras sedes sin página son anuncios no enlazados, sin destinos inventados.
Más de siete tarjetas pasa a retícula. Guadalajara conserva ID/ruta y orientación Chapalita.
Rótulo conserva SVG y carga Alfa real. **Feedback posterior de Luis:** retener las ventanas
alargadas de Karina (230×1050 como proporción), no el recorte corto del primer candidato.
Se escalan ambas dimensiones juntas para móvil/tablet, sin cambiar originales/arte ni el hero.
El límite anterior de QA «foto <700px» se reemplaza por proporción 105/23, carga y contención
responsive: cambió la aceptación visual explícita, no se oculta un fallo. CTA bajo el rótulo.
Licencia del patrón en
`licenses/react-bits.txt` (MIT + Commons Clause), no retirar al distribuir.

Fotos: Guadalajara/SA/Houston conservan motivos publicados en WebP local a resolución original.
El Paso conserva el recurso ilustrativo del upload, no afirmar foto propia. TW tenía hotlink roto:
candidata real del banco revisado `the-woodlands-hero-1600.webp`, sin generación IA. Sustitución y
permisos requieren revisión de release; QA no concede permiso comercial. Franja: ancho completo,
naranja cálido contrastado, El Paso/fecha `time`/CTA a ficha propia; ES/EN y apilado móvil. Confirmar
operación antes de cambiar El Paso a abierta o retirar el anuncio; no inventar fechas para otras.

**Refinamiento de fotos/fecha, 7-oct:** Moreno Valley reutiliza `interior.webp`, San Diego
`karaoke.webp` (banco general, DSC04344); `venuePhotoKind: brand-illustrative` registra que
no son fotografías de esos futuros locales. Solo prueba local; revisión de derechos de release
sigue separada. No se crean fechas/páginas/reservas. El Paso tiene badge de 16px y «ABRE / 9 OCT»
en preview cerrada, claramente preapertura. No se cambia su estado al pasar el reloj.
«Trae a los cuatro»: el markup empleaba `experience-media`, pero CSS estilaba `experience-photo`;
la foto vertical quedaba a 640×420, deformada y con hueco debajo. Corrección solo en el home:
imagen a sangre con `object-fit: cover`, celda completa en desktop, proporción natural 4:5 apilada
en móvil. Alt de ruleta corregido y reversible ES/EN; sin alterar media original. Revisión de «El plan»:
Comida usa foto real de tacos ya incluida en el paquete, Micrófono muestra micrófonos, Música
ambiente de marca; Celebraciones cambia su focal para no cortar el rostro. No son datos de oferta.

Houston: paquete recupera ficha ES/EN + carta del corte 30-sep, OpenTable, teléfono confirmado y
mapa Google fijo. **No importado aún el Catering/cartelera posterior ni las otras fichas donantes.**
Metadatos del directorio usan Guadalajara/teléfono Houston confirmado; rutas/canonicals intactos.
`npm run check`: 26 tests; paquete 89 archivos/15 HTML, 173 referencias. `qa:selector`: diez
combinaciones 320–1920 px, desktop táctil y umbrales 900/1100 incluidos, filtros/fotos pintadas/
nombres/altura, último hover, primer clic/Enter/toque, ES/EN reversible/menú móvil, movimiento
reducido y mapa/carta. Nuevas relaciones de encuadre verifican foto/celda y orden apilado de
«Trae a los cuatro», proporción alta del rótulo, siete previews con foto y fecha legible. Cinco rutas/archivos
excluidos responden 404 en servidor del artefacto. Capturas revisadas; evidencia local ignorada
`.artifacts/visual-refinement-qa-20261008-final-walk/report.json`. Referencia previa y encuadres revisados
en `.artifacts/visual-refinement-before-20261008/`. Iteraciones detectaron y corrigieron capa que
tapaba fotos y fecha EN sin traducir, no solo overflow. Hero preservado, no rediseñado.
Las capturas por bloque recorren primero sus elementos como al hacer scroll: capturar directamente
una sección larga fuera de pantalla dejaba tarjetas aún sin revelar. Reproducido en móvil;
el scroll real sí las muestra. Se corrige la sonda, no se fuerza opacidad del sitio para esconderlo.

Repetir sobre artefacto fresco: `SY_QA_ORIGIN` local y `SY_QA_PACKAGE_ROOT` con Playwright instalado,
`npm run qa:selector`. Sonda GET-only/bloqueo de envíos/telemetría, evidencia fuera del paquete.
Gate local, **no cableado todavía a CI/CD**. No Safari/dispositivos reales/Lighthouse/backend.
Persisten HTML inicial/SEO, contenido simulado/notas heredadas de otros bloques, importaciones
restantes y controles remotos. No certificar el sitio entero ni publicar sin revisión/aprobación.

**Antecedente superado por D09/D10: cartelera y entradas de celebración · 7-oct:** los dos fallos anteriores
quedan corregidos en la candidata, no en el dominio. Cartelera ya no presenta notas internas ni
agenda compartida de prueba. Los registros Houston del donante siguen en revisión/bloqueados;
no se reclasifican como aprobados. Se usa un acceso neutro al Instagram ya registrado de cada
sede activa, solo si su URL es válida. Sin fechas, beneficios, boletos, extracción automática ni
promesa de disponibilidad. El módulo se omite sin perfiles elegibles. Las fichas genéricas de
Guadalajara/SA/TW reciben el mismo criterio por sede, sin repetir eventos ficticios; la ficha
estática Houston no se modifica. Los perfiles no se verificaron de nuevo contra Instagram en este lote.

Diseño home: lista tipográfica con separadores sobre el granate existente, sin duplicar las fotos
del selector. `home-actions.css` se carga solo en el home y entra en allowlist/versionado; el check
rechaza su versión obsoleta. Los seis pretextos y el CTA cumpleaños son enlaces nativos a
`#ubicaciones`, con foco de teclado y sin modal de novedades ni ciudad/reserva por defecto.
Si solo se muestran próximas aperturas, la entrada restaura «Todas»; conserva un filtro de país
ya elegido. Copy cumpleaños sin promesas de pastel/servicio no confirmadas. El home deja de
renderizar el modal heredado; los otros formularios conservan su lote separado.

`npm run check`: **32 tests**, 90 archivos/15 HTML, 173 referencias. `qa:selector` conserva las diez
combinaciones previas y añade agenda/pretextos/cumpleaños, destinos, filtro, foco/Enter/tacto y
ES/EN; seis recorridos adicionales verifican las agendas de tres fichas a 390/1440 px. Capturas
home/fichas revisadas; reporte local ignorado `.artifacts/home-actions-qa-release/report.json`.
No overflow de los bloques nuevos ni excepciones JS en esos recorridos. No es QA integral del
sitio, Safari, dispositivos reales, backend ni certificación de contenido comercial. HTML inicial/SEO,
importaciones Catering/fichas/cartas y aprobación/publicación automatizada por fechas siguen pendientes.
Hero/rótulo/selector/fotos preservados; rutas sin cambios, sin merge/deploy/settings/credenciales.

**Corrección de rumbo D09/D10 · 7-oct, solo candidata local:** Luis descarta la lista Instagram y
el fondo granate de cartelera, y encarga integrar «No hay tiempo para llorar» dentro del hero.
El SVG/fuente ya aceptados pasan a un H1 con texto accesible; video/póster siguen idénticos.
Se retira `#rotulo` con las dos fotos y CTA duplicado. La franja El Paso continúa entre hero y
`#plan`, sin solape. Arte dimensionado por ancho/altura disponible; CTAs en flujo. Corregido
divisor de parallax que desvanecía el copy con 1 px de scroll; ahora solo se mueve el video.

Fuentes recuperadas: calendarios vivos enlazados por el Doc de eventos/reservas de Karina. La
copia SA del 2-oct estaba superada por una edición del 7-oct: Catrinas es **1-nov**, no 24-oct.
Houston/Woodlands coinciden con sus cortes; el home usa Halloween **31-oct** en HOU/SA/TW y
Catrinas **24-oct Houston / 30-oct Woodlands / 1-nov SA**. Registro privado de fuentes/celdas:
ingesta marketing del cliente, bloque `liveCalendars`; ningún contacto privado cruza al paquete.
Estas actividades no se atribuyen a Guadalajara/El Paso/otras sedes sin registro. Thanksgiving
sigue pendiente en Woodlands. PDF estacional contiene propuestas; PDF de oportunidades contiene
actividades externas, no actuaciones en las cantinas. No son sustitutos de estas agendas propias.

El home presenta fechas/campañas comunes y enlaza la ficha real de cada sede. El registro público
no incluye precios, premios, participantes ni horarios sin revisión. `visibleFrom` es un control
editorial local, no una fecha de lanzamiento aportada por marketing. Cada ocurrencia se retira al
cambiar su día civil en `America/Chicago` (DST probado); se recalcula rango visible y se omite
todo el módulo si no quedan campañas. Se evalúa al cargar, sin importación de Instagram/Drive,
scheduler, actualización en una pestaña abierta ni Event schema inventado. Condiciones/promos
y artes específicos van en las fichas cuando se importe su lote. Las tres fichas genéricas aún
conservan su enlace neutro de agenda; Houston sigue en el corte 30-sep. No afirmar que estén completas.
El handle `sinyolandaelpaso` suministrado por Luis ya coincide con su registro; no cambia su estado.

Verificación: `npm run check` **35/35**, 90 archivos/15 HTML/171 referencias; sonda v4 con
**once** combinaciones, incluida 320×568, geometría del H1/arte/header/CTAs, permanencia tras10px,
campañas/fechas/destinos e idiomas, además de los recorridos previos de selector/fotos/entradas.
Dos rondas pasan; capturas inspeccionadas y reporte final:
`.artifacts/hero-calendar-qa-final/report.json`. El paquete de prueba es candidato dirty;
el release limpio se prepara después del commit y debe cotejar sus hashes. No es Safari, dispositivo
real ni QA/SEO integral. Sin producción, merge, DNS, credenciales ni cambios al donante.

### Paso 1 revisado: producción, selector y rótulo · 7-oct

Auditoría de lectura sobre la publicación actual, cotejada contra `main`, rama `rediseno-elplan`
y candidato PR #7. Ninguna coincide con los nueve archivos de texto servidos auditados como conjunto;
la rama adicional es del 26-sep. Se preservaron esos archivos con SHA-256 en evidencia local ignorada.
Esta captura es un respaldo de las fuentes inspeccionadas, **no** una copia integral del release.
No se editaron páginas, permisos ni producción.

| Hallazgo comprobado | Ajuste y prueba de aceptación del siguiente lote |
|---|---|
| A 320/390 px las cinco tarjetas tienen altura 0 y no se pueden tocar | Retícula/lista visible con un toque hacia ficha propia; altura y nombres legibles en móvil, sin depender de hover |
| Hover mantiene dos tarjetas grandes; al salir vuelve a Guadalajara | Una sola preview, último hover/foco retenido; clic/Enter navegan a la primera, modificadores conservan acción nativa |
| Primer clic y primer Enter en Houston solo expanden | Separar preview y navegación; ninguna interceptación del enlace para abrirlo |
| Nombres/badge se recortan en 768–1920 px; anclas tienen `role=listitem` | Recuperar solución de nombres del selector aprobado y semántica `ul > li > a`; foco visible ya funciona y debe conservarse |
| Foto The Woodlands devuelve 400 | Medio propio conservado en banco, derivado optimizado y fallback; no depender del hotlink fallido |
| Rótulo usa Alfa Slab One sin cargarla; fotos calculan 1,050 px de alto | Cargar la fuente autorizada y definir tamaño/encuadre; comparar la adaptación, sin cambiar el hero reservado |
| Selector en EN conserva título/CTA en ES; próximas aperturas sin foto quedan omitidas | Textos por idioma; heading «Cuál te queda» aprobado; registro único con fallback sin inventar fotos/URLs |
| `/houston/menu/` y `/en/houston/`: URL habitual 200 antiguo, query fresca y deployment actual 404 | Recuperar ambas en el artefacto; smoke contra URL inmutable y alias con query fresca, no certificar por un 200 cacheado |
| Houston ES usa ficha genérica/teléfono anterior; Guadalajara tiene `tel:` enmascarados inválidos | Restaurar ficha aprobada y NAP confirmado en contenido/schema/CTA; no copiar Houston a otras sedes |
| `/dashboard`, archivos de desarrollo siguen 200 público | Reconciliar exclusión del PR #7 sobre la nueva fuente; verificar cada ruta/alias en HTTP, no solo ocultar enlaces |
| Sin JS, home no tiene contenido/enlaces/H1 | Planificar HTML inicial de contenido/enlaces esenciales, conservando presentación; no inferir desindexación sin GSC |

**Se conserva:** enlaces de las cinco tarjetas apuntan a su sede; Guadalajara y Zona Chapalita ya
figuran en el selector; Maricarmen/URL desconocida dan 404. Seis tamaños sin overflow horizontal ni
excepciones JS observadas. Preferencia de movimiento reducido elimina transiciones del selector;
no constituye certificación completa de vídeo/accesibilidad. Los filtros sí existen en `/locations`,
pero no en el nuevo selector del home. El título «Ocho formas» del directorio no refleja los siete
registros actuales. El Paso muestra «Próxima apertura», sin destacar aún 9-oct; Moreno Valley/San
Diego existen en datos pero no en la galería por depender de `venuePhoto`.

**Orden propuesto:** reconciliar fuente publicada y controles de paquete → corregir selector/
destinos/fotos/teléfonos → restaurar Houston/carta/EN → comparación del rótulo/idiomas → primer
preview conectado y aprobación concreta. Generación HTML inicial y demás bloques conservan su
lote; no activar un workflow que pueda reemplazar cambios fuera de Git por el candidato antiguo.

**Repetición:** `npm run audit:live` es diagnóstico GET-only, no gate de despliegue. Requiere
Playwright instalado indicado por `SY_QA_PACKAGE_ROOT`; no añade una dependencia al build del sitio.
`SY_AUDIT_ORIGIN` elige origen público y `SY_AUDIT_DEPLOYMENT` permite comprobar la URL inmutable de
Pages. Fuentes/reportes/capturas se guardan en `.artifacts/live-audit-<fecha>` fuera del paquete;
no imprimir el contenido de `mock-data.js`. Compara URL habitual/fresca, revisa fuentes estables,
fotos, seis viewports, hover/salida/clic/Enter/tacto/EN/sin-JS y movimiento reducido. Bloquea POST
y telemetría en navegador. Resultado 7-oct: seis viewports y seis escenarios completados; nueve
fuentes sin cambios entre principio/fin. No probado en dispositivos reales/Safari ni con Lighthouse.

### Mapa revalidado 7-oct: primero reconciliar producción

**No publicar el candidato actual directamente.** Durante la preparación de CD se comprobó que
Pages recibió nuevas publicaciones sin conexión Git, mientras `main` permanece en `463396d`
(1-oct). El despliegue observado `766a7c6c-f168-49d2-8d53-bbde1e492235` difiere del repositorio
en home, JS, CSS y Houston. El candidato no incorpora necesariamente esos cambios; que su CI
esté verde no demuestra que preserve el hero actualmente publicado.

| Etapa | Estado comprobado | Siguiente acción y aceptación |
|---|---|---|
| Fuente compartida | Repo público en organización; Luis/Karina ADMIN; PR #7 abierto y verde | Obtener fuente más reciente del publicador en rama/ZIP, comparar contra Pages y llevar cambios aprobados al repo; no sustituir carpetas ni atribuir un upload a un commit por su etiqueta |
| Calidad | CI funciona en PR; `main` sin protección, cero rulesets/ambientes | Integrar cambios revisados; proponer PR obligatorio, check `Public artifact checks`, revisión humana y resolución de conversaciones; workflows requieren revisión técnica |
| Preview | Pages `sin-yolanda-web`, sin conexión Git, producción `main` | Actions + Wrangler sobre el mismo proyecto; rama explícita `review-<sha>`, entorno `preview` aprobado, URL noindex y revisión del artefacto exacto |
| Release | Aún no hay CD | Promover el mismo artefacto comprobado mediante entorno `production` con aprobación humana; nunca publicar automáticamente cualquier push |
| Verificación | Falta smoke de release conectado | Comprobar rutas públicas, carta/idiomas, recursos y 404 reales de retiradas/archivos internos; registrar hashes, run y deployment ID |
| Recuperación | Hay historial de Pages, no rollback ensayado en este flujo | Identificar versión segura comprobada antes de liberar; un deployment anterior puede reintroducir demos y no cuenta automáticamente como respaldo seguro |

**Controles propuestos, no instalados:**

- Inicio simple con ramas de tarea + PR a `main`; no añadir `dev` si no hay necesidad real.
  El merge por sí solo no publica. Confirmar política de revisión/bypass antes de activarla.
- Un workflow manual de release desde código de control revisado en `main` seleccionará un run
  de CI exitoso de `main`, con repo/workflow/evento/SHA/digest comprobados. No aceptar como release
  artefactos arbitrarios de PR ni ejecutar su contenido con secretos.
- Preparación/validación sin token Cloudflare; jobs separados de subida reciben el secreto solo
  después del gate de ambiente. Ambas etapas usan exactamente los mismos archivos/hashes; no
  recompilar después de la aprobación. Rama/proyecto explícitos, sin defaults implícitos de Wrangler.
- Exclusión de despliegues concurrentes a producción, sin cancelar un deploy iniciado; comprobar
  deployment vigente contra el baseline aprobado justo antes de publicar. Esto no bloquea a un
  operador manual en Cloudflare: coordinar una ventana sin uploads fuera del flujo.
- Una aprobación de producción valida una versión concreta con su preview; no es una autorización
  perpetua. Karina revisa contenido/hero; Luis revisa controles técnicos. GitHub debe hacer cumplir
  los gates, sin aprobación automática del asistente.
- Token de cuenta con Cloudflare Pages Edit, sin DNS/pagos, en config Doppler específica por
  servicio/ambiente. Réplica de consumo en secreto de ambiente Actions: instalación/rotación
  administradas sin pegar valores al chat. Tokens separados no implican aislamiento por proyecto;
  ese permiso alcanza Pages de la cuenta y requiere protección del workflow y los colaboradores.
- No se necesita una API key de IA ni SSH al VPS para este flujo. El panel real y la demo VPS
  conservan sus pipelines separados. La preview Pages del oficial no reemplaza la demo de diseño.

**Acceso observado:** sesión de Cloudflare recuperada en Brave sin pedir contraseñas. No hay
secretos de repositorio Actions ni ambientes; no se inspeccionaron secretos heredados de la org.
Las configs Doppler relacionadas consultadas por nombres no contienen la credencial Pages de CI.
No se creó/rotó ningún token ni se cambió configuración remota durante este mapeo.

**Puerta inmediata:** fuente actual de Karina → reconciliación y QA → instalación de controles/
credencial autorizada → primer preview → aprobación de release → smoke/rollback. Los pasos
siguientes son el orden general; el PR previo no omite esta reconciliación.

**Aclaración del mismo 7-oct:** Luis confirma que acaba de subir cambios; Karina incorporó una
adaptación del selector y de «No hay tiempo para llorar». Añadir su revisión al paso 1, no tratar
el candidato anterior como versión vigente ni reemplazar automáticamente esos componentes.
Comprobar dónde quedó la fuente actual (Git/rama/artefacto) antes de solicitarla otra vez.
QA de ese paso completada en «Paso 1 revisado» arriba; quedan correcciones y su posterior
verificación, no una certificación del sitio completo. El hero sigue reservado a Karina.

1. Revisar/compartir este paquete de trabajo en PR, sin deploy. Confirmar herramienta de Karina.
2. Reparar portabilidad, empaquetado público y discrepancias bloqueantes con tests separados.
3. Añadir CI sin credenciales y demostrar éxito/fallo real de PR; instalar checks obligatorios.
4. Configurar ambientes y token limitado, verificar API en lectura, publicar preview autorizada.
5. Ensayar aprobación/release/rollback; habilitar CD controlado. No activar producción antes.

### Fuentes primarias consultadas

- [Codex: instrucciones AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
- [Cloudflare: Direct Upload con CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).
- [GitHub: seguridad de Actions](https://docs.github.com/en/actions/reference/security/secure-use).
- [GitHub: ambientes de despliegue](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
