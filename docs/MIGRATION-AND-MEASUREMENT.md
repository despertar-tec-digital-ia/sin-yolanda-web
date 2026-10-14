# Migración de WordPress y medición · 8-oct-2026

## Frente B · preparación local13-oct · eventos y atribución

### Integración local en las fichas USA

Luis solicita integrar la propuesta para verla dentro de cada ficha, revisar concordancia y
evitar repeticiones; mantener ambiguos en revisión y no publicar. Se integra el corte A
`5b96451` por merge local `db24149`, sin editar su worktree ni incorporar cartas de otros frentes.
El builder de revisión usa el manifiesto aprobado y compone ocho fichas ES/EN dentro de una
salida nueva en `.artifacts`; el repositorio conserva los232archivos publicables de A idénticos.

`scripts/editorial/branch-agenda.mjs` proyecta el mismo registro de26unidades:14visibles,
12retenidas por caption conflictivo o vigencia/recurrencia sin confirmar. No duplica el intake
de21borradores ni convierte el calendario completo en oferta aprobada. Todos conservan
`publicationEnabled:false` y sus aprobaciones nulas. GDL/Solteras continúa en el intake, fuera
del alcance de este pase USA. La proyección está congelada a `observedOn`,13-oct; filtra fechas
anteriores a ese corte en el builder, sin reloj dinámico ni renovación operativa automática.

- **Una agenda por ficha:** queda después de comida/bebidas y antes de Catering Houston o
  ubicación en las otras tres. Header añade un acceso Agenda/Events al mismo anchor. No crea
  otro H1 ni repite reservas, carta, dirección o horarios dentro de los registros.
- **Pinta:** un arte genérico, un título y dos funciones con fecha, detalles, check-in y enlace
  propios;14y28oct no se confunden con una recurrencia. No duplica imagen/publicación/boletos.
- **Houston:** sustituye toda la antigua envolturaBPD, incluyendo cartelJorge, snapshot8-oct,
  enlace genérico de promociones y listener inline. Queda una aparición del concierto y un
  enlace a sus boletos. Los helpers analíticos comunes quedan intactos; el nuevo bloque no
  emite eventos de medición todavía.
- **Clasificación:** noches semanales corroboradas tienen su bloque; HappyHourWoodlands es
  combo anunciado con bebida elegible y franja16–21; RecoveryEP conserva domingo desde10,
  sin duplicar esa hora en descripción ni asignar fin/sábado/NFLespecífico.
- **Externos:** JorgeSA muestra K.O.P./314NolanStreet y su Eventbrite. Se omite el cartel de
  preventa que vence antes del concierto, conservándolo en el registro para revisión.
  Jets&Cars muestra Conroe, patrocinio y solo invitación, sin compra/reserva inventada.
- **Datos no resueltos:** Don’tCrySA/TW y slots de cartelera no se presentan como agenda
  permanente. JorgeEP mantiene fecha/post propio sin afirmar hora, gratuidad ni boletos.
  Pelucas conserva17oct, sin beneficio de shot no conciliado. Oferta/derechos/ventanas de
  todas las propuestas siguen pendientes antes de su activación comercial.
- **Concordancia al navegar:** el teaser existente del home local usa Houston1nov,
  Woodlands30oct y SA1nov, rango30oct–1nov. La corrección se aplica también a SY_DATA,
  conservando horarios/medios/heroes y otras campañas; no revive24oct al regenerar con JS.
  La navegación Houston al hacer scroll conserva color claro sobre fondo oscuro mediante
  una regla específica de esta revisión, tras detectar que un override anterior oscurecía el texto.

`node scripts/build-branch-event-review.mjs --asset-root <marketing-2026-explícito> <salida-nueva>`
genera241archivos permitidos/hash, ochoJPEG verificadas y CSS acotado; fuentes editoriales,
notas privadas y reconciliación quedan fuera del directorio servido. `serve-review.mjs` conserva
loopback127.0.0.1 y allowlist explícita. Preview vigente `http://127.0.0.1:8820/houston#programacion-houston`.
El manifiesto productivo no se amplía y el build normal no incluye estos carteles ni la agenda.

**Verificado:** npmci/check295/295, contrato de integración5/5;46escenarios Chromium
(cuatro sedes×dos idiomas×cinco anchos320/390/768/1024/1440; cuatro noJS; home con/sinJS).
Sin overflow, erroresJS ni recursos locales fallidos. Cada ID/agenda único; enlaces propios
de sede con nueva pestaña/foco, boletos distinguidos también en su nombre accesible; imágenes
cargadas y enteras. Horarios del corteA y menú/reservas/contacto/Catering/footer preservados.
Capturas desktop/móvil de las cuatro sedes inspeccionadas; comparación por secciones comprueba
el resto de las fichas. Fuente publicable232/232 igual a A; el artefacto cambia solo ocho fichas,
teaserHTML y datos de esa campaña, además de los nueve assets nuevos de revisión.

Artefacto definitivo: `.artifacts/branch-event-context-final/public`.
Recibos: `.artifacts/branch-event-context-v3/` (check/parity), release/reconciliation del definitivo y
`.artifacts/branch-event-context-final-qa/` (report/capturas). No certifica Safari/iPhone físico,
checkout externo, nuevos eventos Umami/GA4 ni scheduler. Servicios externos bloqueados en QA.
Sin publicación/push/PR ni cambios en WP, QR, DNS, CRM o cuenta analítica. Antes de producir:
aceptación visual, permisos/vigencias/condiciones pendientes, integración del reloj/hash existente
y pase separado del contrato analítico; no promover directamente este artefacto congelado.

### Revisión posterior de publicaciones USA y propuesta de agenda

Luis aporta 14 URLs y una captura de Houston. Pide comparar los documentos, distinguir los
tipos de actividad y comprobar boletos de Jorge Guevara antes de diseñar. Se revisaron las
fuentes con investigación N1 acotada: 16 posts visibles (14 recibidos y dos propios de Houston
descubiertos), cuatro funciones oficiales en Eventbrite y contraste editorial. No hubo mensajes,
checkout, compras ni cambios remotos.

Fuentes y discrepancias observadas: `scripts/editorial/front-b-sources.json`. La proyección
para revisar el diseño vive en `front-b-review.json`: 26 unidades, incluidos slots y brunch;
no son 26 conciertos ni otro catálogo aprobado. El intake anterior conserva sus 21 borradores.
El preflight enlaza esta revisión y ya no repite la solicitud obsoleta de seis enlaces.
`ingesta.json` corrige el bloqueo horario de Pinta superado por la apertura confirmada de
miércoles, 16:00–23:00. Eso no aprueba oferta, derechos ni operación.

| Fuente / tipo | Cotejo y consecuencia editorial |
|---|---|
| Cuatro carteleras | Son compilaciones por días. No agregan un evento redundante ni prueban que toda actividad se repita indefinidamente. Mes Hispano, Pelucas y Jorge El Paso conservan sus fechas propias. Los slots sin fecha no reciben fechas inventadas. |
| Pinta Houston | Funciones del 14 y 28 de octubre, 19:00–22:00, check-in 18:30 y boletos específicos. No todos los miércoles. Ambos Eventbrite usan el mismo arte genérico, sin fecha ni precio; no es un cartel exclusivo de Halloween. El alias antiguo no sustituye estos enlaces. |
| Ladies y Don’t Cry | La portada Houston confirma miércoles, 2×1 en cócteles, open mic y ronda de shots para ellas; no trasladar beneficios a otras sedes. Don’t Cry Houston confirma jueves, DJ e inglés/español. Los captions de SA y Woodlands nombran Houston: discrepancia conservada, sin aprobarla desde la cuenta que publicó. La franja de noviembre en Woodlands no se transfiere a octubre. |
| Happy Hour Woodlands | Oferta de jueves, 16:00–21:00: Pepito + una bebida por USD 27. Bebida elegible: tequila, whisky, ron o brandy. No todos los cócteles ni oferta de otras sedes. Vigencia y términos adicionales pendientes. La franja Houston 14:00–19:00 de la hoja choca con apertura a las 16:00 y se omite. |
| Recovery Brunch El Paso | Fuente propia: domingos desde las 10:00, fin desconocido. La cartelera también menciona sábado; no extenderle el horario del domingo. Brunch y NFL no certifica rivales, partidos, derechos de transmisión o descuentos. |
| Jets & Cars | Colaboración del 14 de noviembre, 11:00–13:00, en una instalación privada de aviación en Conroe; solo por invitación. Sin Yolanda participa como patrocinador. Va en actividad externa, sin reservar mesa ni inventar boletos. El NAP del pie del cartel no determina el recinto ni sustituye la ficha. |
| Jorge Houston | 13 de noviembre, 20:00–23:00, en la cantina de 4901 Washington Ave; invitada Mariana Ochoa. Eventbrite declara venta disponible, sin comprobar cantidades ni checkout. Se usa arte del proveedor sin precio para revisar el concierto. La preventa de USD 25 del post vence el 15 de octubre a las 20:00 y debe tener caducidad separada. |
| Jorge San Antonio | 14 de noviembre, 20:00–23:30, en K.O.P./King of Padel, 314 Nolan Street; no en la cantina. Post y boletos coinciden. Recinto externo y boleto propio. Arte de preventa hasta el 15 de octubre sin hora exacta: `artworkSafeBefore` es un corte conservador de revisión, no un término comercial confirmado. |
| Jorge El Paso / Woodlands | El Paso anuncia palomazo del 16 de octubre en 340 Vin Rambla, sin horario, precio o enlace de compra comprobado. Ver post; no afirmar entrada gratis ni usar boleto Houston. No se verificó una fecha propia para Woodlands en esta búsqueda; no trasladar el concierto vecino. |

**Arte:** 14 JPEG publicados guardados en `marketing-2026/`, con hashes, dimensiones y
procedencia en `usa-post-artwork-2026-10-13.json`: cuatro carteleras de 2000×2500, publicaciones
particulares y dos imágenes de Eventbrite. Portadas de Ladies y Don’t Cry Houston recuperadas
a 720×1280 e inspeccionadas; no se afirman originales HD ni se amplían artificialmente.
La captura de Luis se conserva como respaldo. El registro no guarda URLs CDN firmadas ni
comentarios personales. Los permisos siguen en `review-only`.

**Diseño para revisión:** se conserva la identidad existente y se propone una agenda dentro
de cada ficha: próximas fechas iguales y cronológicas, noches de la semana, comida/ofertas y
participaciones externas. Se comparó un tratamiento único de cartel/datos con una agenda por
intención; se elige esta última para que una promoción tenga su propio nivel de lectura.
Se respeta el brief §21: ningún protagonista arbitrario con fechas secundarias. Cero registros
omite sección; uno no deja una columna vacía; varios forman filas adaptables. La cartelera
compilada aparece como fuente desplegable. Arte con `contain`, datos legibles en HTML y CTA
según intención: publicación, función exacta, recinto externo o acceso por invitación.
`/eventos` sigue siendo contratación privada. No cambia HTML/CSS, home, hero ni medios de A.

**Prototipo aislado:** `build-event-review.mjs --asset-root <directorio-explícito>` genera un
paquete con allowlist y hashes, 18 archivos, en `.artifacts/event-design-review-final/public`.
Servidor existente limitado a `127.0.0.1`, puerto 8819, con cuatro selectores de sede. Sin
tracker, almacenamiento, embed Instagram, escritura de producción ni scheduler. Es una
propuesta ES del corte 13 de octubre; no una agenda comercial aprobada ni un publicador temporal.
Recurrencias, ventanas, derechos y caducidad del arte deben adaptarse al modelo/hash existente.
No se certifican todavía ES/EN completo, reloj, retiro noJS ni scheduler.

**QA:** seis pruebas del contrato semántico verifican recinto externo y boletos por sede,
productos/franjas, fuentes, recurrencias no inventadas y restricciones de arte. La primera
corrida seleccionaba el primer brunch (sábado Houston) para comprobar el domingo de El Paso;
se corrigió el selector por ID, sin modificar el dato ni omitir la prueba. La corrida final
pasó 286/286. Los 217 archivos públicos mantienen sus bytes y el digest productivo
`78146976243c1a6359a40d912180010cb09642fed3643a3857b70db1f43dc36f`.

Capturas desktop 1440 y móvil 390/320 generadas con `preview.py` e inspeccionadas. Se ajustaron
el registro único, arte ausente, última fila impar, orden sábado/domingo y disposición de
actividad externa. En navegador: una sede visible, enlaces sin destinos vacíos, sin overflow
ni errores JS; imágenes dentro del viewport cargadas con `contain`. Las imágenes lazy fuera
de pantalla no se consideran fallidas por no cargar. Recibos en
`.artifacts/front-b-source-review-20261013/`. No se confirma transporte Umami/GA4 por este QA.

Encargo vigente: bloque B01–B07 del plan operativo del vault. Rama propia
`feat/events-measurement-b-20261013`, base `origin/main` `f9c13a0`. Este corte prepara datos,
contrato y diagnóstico; no modifica HTML/CSS, `public-data.js`, tracker, rutas, WP, QR,
campañas, propiedad GA4 ni workflows. Integración con A será una sola revisión posterior.

### Registro y fuentes

`scripts/editorial/front-b-events.json` conserva21candidatos: Houston10, SA6, Woodlands3,
Guadalajara2. Todos borradores, con bloqueos explícitos y sin autorización de publicación.
Es un intake incompleto para adaptar al modelo existente `BranchEvent`/`branch-programming.ts`,
no otro motor de reloj ni un catálogo servido al navegador. Los datos desconocidos quedan `null`.
El preflight `node scripts/audit-front-b.mjs` solo valida procedencia/aislamiento y enumera
pendientes/lista corta; no resuelve ventanas, convierte datos a aprobados ni llama APIs.

Originales del Doc OPEN TABLE/EVENTOS releídos13-oct: Houston/Woodlands `Sheet1!A1:E65`,
SA lectura completa legible del XLSX, sin conversión ni descarga binaria en esta sesión.
Snapshot completo/reconciliación privados en `clientes-assets/sin-yolanda/marketing-2026/`.
Cotejo de columnas nombre/fecha, no paridad comercial/binaria. Woodlands coincide en ese cotejo.
Houston: Catrinas desaparece de fila20/24-oct y pasa a fila29/1-nov. SA conserva Terror9-oct,
Celebridad24-oct y Catrinas1-nov frente a la copia2-oct; hay desplazamientos de filas posteriores.
El home actual todavía declara Houston Catrinas24-oct: corrección pendiente de integración,
sin alterar por este corte el archivo de datos compartido con A.

Post Guadalajara `DeIbppdgMu3`: Noche de Brujas31-oct, sede/dirección y cartel coinciden.
Post `Dd7fzQkg_wG`: Jueves de Solteras, sede/dirección confirmadas; sin horario/periodo.
JPEG publicados1440×1920 descargados y revisados, hash/procedencia en
`gdl-post-artwork-2026-10-13.json`. No se conservan URLs CDN efímeras ni comentarios personales.
Arte `review-only`; link de cada imagen será el post específico con nombre accesible.
Luis13-oct pide usar horario de la sucursal: GDL19:00–03:00 del día siguiente, cotejado
visible/JSON-LD. Brujas: ventana de referencia31-oct19:00→1-nov03:00 `America/Mexico_City`.
Rotular **horario de la sucursal**, no horario confirmado del evento. Solteras: jueves,
mismo horario de referencia, inicio/fin de recurrencia pendientes. No inventar una vigencia.

Primera solicitud acotada de post/arte: Houston Pinta y Canta14-oct y Lotería/Karaoke15-oct;
SA Pelucas17-oct y Don Omar22-oct; Woodlands Mes Hispano15-oct y Catrinas30-oct.
El calendario no aprueba condiciones, entradas, premios ni la realización de un afterparty.
NFL/partidos, patrocinio externo, miércoles sin fechas y Thanksgiving por confirmar permanecen
separados; El Paso no tiene calendario. Fuentes secundarias Houston/Eventbrite del intake anterior
siguen en `ingesta.json`; sus links no sustituyen los posts ni autorizan condiciones comerciales.

### Contrato editorial propuesto, todavía sin scheduler

Usar el evaluador existente del programa: IDs estables por sede/ocurrencia, revisión/digest,
fuente/celda, título localizado, tipo, inicio/fin con offset e IANA, recurrencia/excepciones,
ventana de publicación/retiro, arte/hash/alt/derechos, post/acción y aprobación de revisión exacta.
Estados editoriales: borrador→confirmado→listo; estado de entrega separado publicado/vencido.
Mapear confirmado/listo al `status:approved` existente únicamente con aprobación/hash íntegros;
una publicación Instagram acredita fuente, no aprobación universal. Si faltan arte/post,
conservar revisión según B03; no rellenar con imagen/perfil ajenos. Horas fallback rotuladas.

Luis no elige anticipación global y considera corta una semana. Propuesta: mostrar desde revisión
completa hasta cierre, con ventana editable por evento; `publishFrom/expiresAt` siguen pendientes
en el intake. No fabricar medianoche de apertura ni días de anticipación. Cierre03:00 pertenece
al día siguiente. Caducidad cliente y HTML inicial deben coincidir; JS solo no retira HTML noJS.
Antes de activar: probar límites exactos antes/al aparecer/al vencer, medianoche/DST por zona,
recurrencias,0/1/2/4/5eventos, ausencia de arte y móvil/desktop. Esas pruebas de integración y
visuales **no se ejecutaron por este corte sin UI**. Scheduler: derivar próxima transición del
modelo existente, comparar digest y construir/publicar solo con cambio; alertar fallos/atrasos.
Intervalo, responsable y activación pendientes; no nuevo cron ni automatización remota.

### Auditoría analítica real y mapa para cablear después

Fuente auditada `assets/js/site-analytics.js`:23páginas cargan loader único y404se excluye.
HTTPS/hosts/rutas permitidos, DNT/desactivación, cola acotada y navegación no bloqueada existen.
La sanitización deja únicamente `action/branch/language`; borra queries y `event/kind` editorial.
Sin dimensiones de ubicación/destino ni catálogo de campañas. `branchFromPath` omite
`/guadalajara`: contexto sin atributo puede caer en `group`, pendiente de mapear a `san-ignacio`.
El GET público del tracker coincide con la fuente auditada; home/aviso no cargan GA4. Son GET sin
ejecutar JS ni emitir eventos, **no verificación de transporte**. Recibos en `.artifacts/front-b-20261013/`.

| Intención | Emisor actual | Nombre y extensión propuesta |
|---|---|---|
| Llegada/página/entrada | auto pageview Umami + hook común | URL pública canónica + UTM permitida; referrer reducido; landing separado de adquisición |
| Abrir selector/elegir sede/filtro | click delegado común | `location_selector_open`, `location_select`, `location_filter_click` |
| Ir a ficha o carta | común; carta también emisor de ficha importada | `branch_click`, `menu_click`; `branch` destino y `page_branch` contexto separados |
| OpenTable/WhatsApp/teléfono/mapa | emisor propio de ficha; común donde falta | `reservation_click`, `phone_click`, `directions_click`; WhatsApp Catering se clasificará contacto Catering, no reserva por arrastre |
| Catering/contacto | común para enlaces/clases actuales | `catering_click`, `catering_contact_click`; no lead confirmado |
| Campaña en cartelera/evento/post | home hoy enlaza ficha; agenda importada emite directo | preservar evento único, añadir `event_id` allowlist y destino simbólico; link imagen+texto no duplica al propagar click |
| Idioma | común + control propio según página | `language_switch_click`; excluir `menu_click` accidental de controles de idioma |

El común omite elementos cuyo emisor importado ya cuenta. Agenda dispatcha `sy:branch-action`
y llama Umami: no añadir un segundo listener Umami al custom event. Si se incorpora GA4,
crear un único adaptador al mismo evento normalizado. Los emisores importados no comparten todos
los filtros `isTrusted`/cola del común: verificar teclado/new-tab y carga tardía en navegador.
No certificar unicidad solo contando funciones en el grafo.

Dimensiones propuestas, pendientes de implementación: `schema_version`, `branch` (destino),
`page_branch`, `language`, `action`, `link_location` (header/hero/selector/content/agenda/footer),
`destination` (branch/menu/reservation/maps/phone/catering/instagram_post), `event_id` del registro,
`landing_path` allowlist y `legacy_hop` verificado. GDL usa siempre ID histórico `san-ignacio`
con ruta pública `/guadalajara`. Sin texto libre, href completo, título personal, búsquedas,
formularios, nombre/email/teléfono, URL privada, `gclid/fbclid` ni IDs de contacto.

UTM solo en entrada externa controlada, nunca en enlaces internos. Catálogo versionado por
campaña con source/medium/campaign permitidos: instagram/organic_social para posts,
qr/offline para QR creado para esa campaña, google/cpc solo campaña Ads comprobada.
No aceptar solo un regex: códigos deben existir en el catálogo; sin coincidencia, descartar.
No generar enlaces externos nuevos por este corte. Referrer disponible es evidencia limitada:
vacío=desconocido/directo no distinguibles; saltoTX/USA no demuestra Instagram ni QR.
Separar `legacy_hop` de source; capturar solo si referrer/marcador controlado lo acredita.
Preservar UTMs permitidas en redirects; no migrar QR antiguos para inventar atribución.
Propuesta de URL Umami: ruta permitida + solo UTM catalogada después del hook; comprobar
recepción real y reporte de campaña porque hoy `data-exclude-search` elimina toda la query.
Session attribution primero por sesión/pestaña si se decide persistir, sin IDs de persona,
sin sustituir la fuente por navegación interna ni reproducir visitas anteriores al consentimiento.

### GA4, privacidad y aceptación pendiente

El alta8-oct no debe repetirse. Preparación recuperable en Git `b86f6cf` sobre `6b5d339`,
rama `feat/ga4-basic-consent`: config `enabled:false`, consentimiento/QA y borrador del aviso.
La base oficial actual no contiene esos assets ni la UI; no cherry-pick completo sobre páginas
de A, ni declarar consentimiento implementado por una memoria histórica. Recuperar/adaptar
selectivamente cuando corresponda, conservando ID público y decisiones de cuenta pendientes.
Modo básico: no carga/envía GA4 antes de aceptar; rechazar/revocar con facilidad equivalente,
cero replay previo, DNT/GPC/exclusiones, errores no bloqueantes, Signals/ads denegados.
Aviso actual describe Umami/mapas; responsable/canal y retención/personalización pendientes.
Rechazo GA4 no equivale hoy a apagar Umami; explicarlo y decidir política antes de cablear.

QA requerida B07: un click→un evento por proveedor; teclado/ctrl/nueva pestaña, UTMs/referrer y
series GDL; aceptar/rechazar/revocar/expirar y almacenamiento fallido; ausencia PII; excluir
local/demo/pruebas; fallo proveedor permite navegar. Transporte real Umami/GA4 requiere pase
autorizado por dominio/consentimiento y recibo, distinto de VM o presencia de script.
KPIs: visitas/fichas, menú/reserva/contacto/eventos/campañas por sede/idioma/entrada. Clic≠reserva,
consumo, venta o lead recibido; no sumar visitantes únicos de dominios ni prometer retrospectiva.
Base técnica consultada N0: [Umami](https://docs.umami.is/docs/tracker-configuration) y
[Google consent](https://developers.google.com/tag-platform/security/guides/consent).

## Ampliación12-oct · cuatro raíces y canonical Guadalajara

Luis ratifica destinos generales y añade Maricarmen/GDL: TX/USA/Maricarmen →
`https://sin-yolanda.com/locations`; GDL → `https://sin-yolanda.com/guadalajara`.
Consulta fresca inicial: TX/USA ya301 al selector, GDL/Maricarmen aún200 WordPress;
`/guadalajara`404. No atribuir el resultado observado por Luis a caché sin comprobar su cliente.
Los301 antiguos pueden persistir en navegadores y no se revocan cambiando el servidor.

Plugin independiente `sin-yolanda-root-routing`1.0.0, prioridad anterior al legacy:
solo raíz exacta GET/HEAD anónima y cuatro hosts/apex/www. Reutiliza el validador de atribución
en namespace aislado, sin activar reglas de carta. `Cache-Control: no-store,max-age=0,must-revalidate`
para nuevas respuestas. Admin/REST/POST/formularios/previews/queries desconocidas quedan intactos.
El operador `deploy-root-routing.mjs` valida destinos, ZIP/hashes, respaldo y paridad de páginas/
plugins. Secretos solo referencias `.secrets/sin-yolanda-wp.env`; login Maricarmen oculto verificado.

TX/USA/Maricarmen instalados/activos y verificados, páginas/estados ajenos intactos. Recibos:
`.artifacts/legacy-redirects/wordpress-backups/{tx-SvqdlQ,usa-DnaRgT,maricarmen-NQK1wd}/`.
ZIP final SHA `3c1157a314ff9d702bbe091526706ecec58a42cce60cead44b5964ceba3b8634`.
Guadalajara preparada con el mismo contenido, alias antiguos301, canonical/hreflang/schema/sitemap
actualizados y ID `san-ignacio` conservado; no modificar el nombre postal de la avenida.
La activación GDL exige primero200/canonical/indexación del nuevo destino tras el release central.

254 pruebas locales verdes. Paridad de diseño por hashes completos tras revertir únicamente
links aprobados y versiones de caché; cartas centrales sin cambios de contenido/navegación,
solo el token de versión del tracker. Cartas WordPress/QR/correo/DNS/GHL sin cambios.
Estado de release/sondas posteriores debe anotarse al verificarse, no inferirse del CI.
Rollback: desactivar solo root-routing en GDL antes de volver a un release sin `/guadalajara`;
en otros dominios, desactivar ese plugin recupera su estado previo. No desactivar pausas de cartas.

Futuro solicitado por Luis: cada historia destacada de Instagram debe enlazar la carta propia
solo después de aprobación operativa por sucursal; este lote no cambia esos enlaces ni cartas.

## Corrección publicada12-oct · raíces multisucursal

Por encargo explícito de Luis, TX y USA raíz/apex/www →301 a
`https://sin-yolanda.com/locations`, directorio existente con ES/EN. Ya no van a San Antonio ni
The Woodlands. Solo estas raíces se corrigen, mediante plugin aditivo `sin-yolanda-root-directory`
v1.0.0; pausa de cartas/original/DNS/WordPress/QR/Guadalajara/páginas sin cambios. ZIP SHA
`1dbce205b7b084560a3186f530afc623ef87bd9e6a21a98de937457e743c9fea`.

Operación HTTP autenticada, respaldo previo y comparación de estado; TX activa y conserva
todas las huellas. USA se activó, pero la paridad de HTML renderizado detuvo el cierre por un
captcha aritmético Divi variable. No se reintentó la instalación: inspección posterior confirmó
plugin activo/estados ajenos intactos y14páginas sin cambios;13hashes exactos, la14 recupera
paridad al normalizar únicamente la pregunta y sus dos atributos numéricos de captcha.
Fechas `modified_gmt` iguales; otros cambios siguen fallando. Regresión añadida.

Pruebas:250tests verdes;44sondas GET/HEAD en raíces/www/UTM, fichas USA, cartas TX/USA y GDL,
cero fallos. El selector responde200/canonical correcto/indexable; no se crean aliases404 ni
cartas EN ficticias. Recibos privados ignorados: `.artifacts/legacy-redirects/root-directory-smoke-20261012.json`,
`wordpress-backups/tx-OJijWB/`, `usa-JtbQT9/` (detención original) y `usa-qkhHHC/` (inspección).
Rollback exclusivo: desactivar ese plugin, no la pausa de cartas ni las reglas anteriores.
El mapa JSON inferior y sus destinos de raíz son históricos, sustituidos por este override.

Luis autoriza el lote técnico: corregir medición/SEO de destinos públicos aprobados y después
activar redirecciones exactas recuperables. No autoriza cambiar DNS/MX, borrar WordPress,
publicar Maricarmen, crear GA4 en una cuenta no confirmada ni certificar datos comerciales.
Diseño, hero, cartas y fuentes de negocio se conservan.

## Fuentes ejecutables y gates

- Rutas301: `scripts/legacy-redirects/sin-yolanda-legacy-redirects/redirects.json`.
  16reglas (GDL3/TX4/USA9), sin catchall. Canonical de ficha sin slash, carta con slash.
- Indexación: `scripts/indexation-policy.json`,12páginas del donante fijado. Las cuatro
  páginas El Paso/Catering ES/EN siguen noindex y fuera del sitemap. Indexar las demás permite
  la migración de sus URLs ya públicas; no cambia `publicationApproved:false` ni resuelve
  conflictos editoriales/precios/permisos de medios.
- Reimportación: dry-run disponible; reemplazar una ruta promovida o resincronizar la revisión
  requiere nueva decisión explícita de fuente/indexación. No restituir noindex silenciosamente.
- `apply-migration-batch.mjs --apply` es una transformación mecánica local del lote autorizado;
  no importa una fuente nueva, publica, modifica aprobaciones comerciales ni contacta servicios.
- Paquete: nueva aprobación limitada ligada a commit/digest; no reutilizar la del primer release.
  La subida actual sigue manual: CI de calidad sí existe, CD automático no.

## Mediciones

22páginas cargan un único loader versionado;404 se excluye explícitamente. La misma cuenta
Umami mide páginas vistas y clics útiles con sucursal, idioma y acción permitidos. Los emisores
existentes de las fichas se conservan; el módulo compartido no cuenta otra vez sus clics.
Selector mide clic/tacto, no hover; los clics a OpenTable no son reservas completadas.

Solo HTTPS y hosts oficiales; no se envían eventos desde localhost, Pages preview ni rutas
internas/desconocidas. Respeta DNT y `umami.disabled`; no transmite búsqueda/hash/query,
texto libre, contacto, destino completo o nombre del visitante. Referrer externo se reduce
al origen; el interno se limita a rutas públicas. La captura de campañas UTM **no** está
habilitada: quedan fuera del payload aunque la redirección conserve tokens públicos registrados.
Los contadores históricos de los tres WordPress permanecen separados; no fusionar visitantes
ni atribuir todo el tráfico a conversiones. Collector actual soporta before-send/DNT/exclusión.

GA4 pendiente de propiedad/cuenta confirmada: sin G-ID ficticio ni etiqueta activa. Al conectarlo,
definir consentimiento, eventos mínimos, retención y aviso aplicable; sin Signals/remarketing,
replays ni datos personales por defecto. El aviso existente recibió una descripción técnica
de Umami/mapas; responsable legal, correo ARCO y prácticas de retención aún requieren validación.

## Excepciones y reversión

TX `/menu-english/` sigue siendo selector de tres cartas; USA mantiene formulario Catering,
`special-menu`, Catering Experience y demás rutas sin equivalente. POST, admin/login/REST,
uploads, usuarios autenticados y queries de formularios no se interceptan. No inventar carta EN
de Woodlands: su antiguo slug English Menu ya contiene ES y usa el fallback ES.

Plugin aditivo sin escritura de contenido/BD/.htaccess: fuente versionada, ZIP/recibo local,
snapshot de fuentes públicas y estado de plugins antes de instalar. Ese snapshot **no es** un
backup completo de base de datos. Las páginas originales permanecen intactas. Desactivar el
plugin retira sus reglas;301 guardados por navegadores pueden persistir. Conservar destinos.
Rollback central seguro: deployment `d149688f-e3c9-46f0-a55f-f290b9f2dd7b` y paquete local
`.artifacts/limited-production-20261008-befc2a4/`, no un upload histórico sin auditar.

## Verificación antes/después

`npm run check` incluye cobertura/PII/DNT, identidad/canonical/idiomas, allowlist indexable,
exclusiones,404anidado, motor PHP real, GET/HEAD/apex/www y entradas maliciosas. Publicar primero
el central y comprobar destinos200indexables; luego instalar/activar por WordPress, probar cada
301/Location y excepciones en vivo. Verificar además http/slash y cadenas reales: una redirección
HTTPS previa del proveedor no equivale a un loop. No declarar todo migrado si un lote falla.
Revisiones operativas recomendadas a24–48h y7d; no hay monitor programado por este documento.

## Ejecución comprobada

Central publicado manualmente desde `d6734c2574994d2d9b9cdeec3ffce203ff5370d2` (PR #11),
CI PR `37849350802` y main `37849445960` verdes. Aprobación nueva:
`docs/releases/2026-10-08-migration-approval.json`; digest público
`8373d84a324511cdab405ef977bff7ec86b5a3a13faea1c7450379f35c644118`.
Deployment: `7b5a7d5b-44fa-4d6a-8dc5-222acc134c4d`.
Paquete/recibos privados locales: `.artifacts/migration-production-20261008/`.

Verificados los 184 archivos servibles y 45 aliases; diez exclusiones404. La URL inmutable
coincide en todos los hashes; Pages añade allí su propio noindex. En el dominio oficial,
183 hashes directos y privacidad restaurada exactamente tras retirar solo la ofuscación de correo
del edge; no se cambió la configuración Cloudflare. Los 12 destinos autorizados están200,
indexables, con canonical/sitemap correctos; las cuatro páginas protegidas conservan noindex.
Pruebas de fuente publicada:138/138, sin skips. Un fallo previo de CI por carpeta temporal ausente
se corrigió y verificó en el checkout remoto limpio; no se omitieron pruebas.

Houston público: un loader/un tracker, sin overflow. API Umami a las `2026-10-08T21:58:50Z`:
registro/stats/path200, tres vistas recientes en `/houston`, compatibles con QA; no atribuirlas
a clientes. Sin eventos sintéticos ni modificación de históricos. Eso acredita llegada de
telemetría, no recepción individual de todos los clics ni reservas completadas.

WordPress: plugin v1.0.0 instalado primero inactivo y luego activado en GDL/TX/USA. ZIP exacto:
`.artifacts/legacy-redirects/sin-yolanda-legacy-redirects-1.0.0.zip`, SHA-256
`b1cf129cd88b229df5cdcff02d7ff3dc34ba999e08144e2f20fff2ea8d1fe5f9`.
Recibos de instalación: `wordpress-backups/gdl-V2bj2F/operation.json`,
`tx-Lrc67Z/operation.json` y `usa-2YQ73b/operation.json`, bajo `.artifacts/legacy-redirects/`.
Snapshots inmediatamente anteriores a la activación: `gdl-RESJC1`, `tx-pX40Po`, `usa-VhqHlE`.
GDL se instaló correctamente, pero el parser rechazó el enlace relativo del admin antes de guardar
recibo. Se corrigió la resolución contra `/wp-admin/`, manteniendo checks de origen/ruta/plugin;
se verificó la versión exacta inactiva y se recuperó el recibo con nota explícita antes de activar.
No se reinstaló ni sustituyó otro plugin. Fixtures reproducen el caso y rechazan claves duplicadas.

Verificador público sin cookies/JS/POST: GDL17/17, TX20/20, USA32/32; **69/69, sin fallos**,
105 peticiones. Las 16 reglas suman 32 casos primarios GET/HEAD:301 del plugin, Location exacto,
destino200/indexable/canonical y anclas correctas. Variantes www/slash y UTM aprobadas pasan.
HTTP muestra en los tres un upgrade301 del proveedor a HTTPS antiguo y después nuestro301;
no es un loop. Selector TX, formulario/Catering/special-menu USA, REST y uploads siguen200.
La sonda `name` devuelve404 nativo en los tres, sin interceptarse ni ir al central: acredita
preservación del routing, **no funcionamiento del formulario**. Se conservó el primer reporte
GDL que trataba erróneamente esa query como una página200 y se corrigió el contrato con fixtures.
Reportes finales: `.artifacts/legacy-redirects/live-gdl-20261008-r2/report.json`,
`live-tx-20261008/report.json`, `live-usa-20261008/report.json`.

Robots de los tres WordPress200, sin bloqueo global; NS/MX iguales al estado previo. No se tocó
DNS/correo, contenido, bases de datos, históricos Umami ni credenciales. La reversión del lote
WordPress es desactivar el plugin en cada sitio; el central conserva el rollback señalado arriba.
Pruebas del cierre de operador/verificador:153/153, sin fallos ni skips. Este cierre no añade un
artefacto público ni requiere redeploy del central; su fuente publicada sigue siendo `d6734c2`.
