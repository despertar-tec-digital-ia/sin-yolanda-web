# Migración de WordPress y medición · 8-oct-2026

**Estado vigente13-oct:** Luis aprueba la composición final y autoriza su publicación;
PUBLICADA por PR33/main `08027d9`, CI/CD/recibo verdes.
Proyección14unidades en ocho fichas USA ES/EN reconciliada sobre main publicado `b3040ef`,
con reloj editorial/caducidad y sin fotos A04. Doce unidades y dos botones Jorge retenidos.
Contrato, evidencia y estado remoto tienen dueño en «Agenda USA · publicación autorizada13-oct»
de [WORKFLOW](WORKFLOW.md). B05–B07 publicados por PR34/main `43c2c33` tras aprobación
expresa, con recepción de campos v2 comprobada. GA4 sigue pendiente.
Los bloques siguientes conservan la investigación y preparación previas, incluidas sus
restricciones anteriores de publicación. La fuente editorial sin confirmar no se promociona.

## Cierre secuencial · 16-oct · local, sin publicación

**Decisión posterior16-oct · GA4 autorizado para publicación:** Luis pide «así déjalo y sube».
Se publica el consentimiento revisado, rechazo soloGA4/Umami continúa, conservando los datos
administrativos actuales del aviso y añadiendo explicación técnica. No se publican marcadores
de revisión ni se inventan responsable/domicilio/canal. Esos datos siguen pendientes factuales,
sin convertir esta decisión en validación del buzón o certificación legal. Ajustes de cuenta
actuales conservados; reducción de retención/personalización y dimensiones no aplicadas.

Fuentes canónicas: `scripts/analytics/ga4-event-config.json` (`enabled:true`, `ga4-only`),
`ga4-consent-controller.js`, adaptador y contrato actual; `ga4-bundle.mjs` compila el único asset
servido `assets/js/ga4-consent.js`. `sync-ga4.mjs --check` y tests exigen bundle/cobertura/versiones
vigentes; `--write` regenera después de cambiar sus dueños.23páginas/404excluido, fuentes no
servidas bajo `scripts/`, ningún segundo emisor. Contrato `ga4-source-patches.json` restaura
bytes completos anteriores, incluida portada PR36/37, sin relajar las comprobaciones históricas.
Configuración apagada/alcance nulo continúan probados como estados que bloquean Google.

QA final:356tests verdes, sin skips, log `.artifacts/ga4-release-check-final.log` y paquete
`.artifacts/ga4-release-20261016-v2/public`; Brave320/390/768/1440 sin overflow, controles48px y
mismo tamaño. Cuenta no modificada. Recepción real Google y pruebas en el dominio tras CD,
evidencia/rollback en el bloque «GA4 · pase autorizado16-oct» de WORKFLOW.

**Nueva recopilación GDL solicitada16-oct:** Luis enviará enlaces de ofertas/eventos Instagram
Guadalajara. Comparar por tipo, vigencia, sede, condiciones y arte con Brujas/Solteras/agenda antes
de integrar. Sin enlaces nuevos recibidos ni autorización de publicación de ese lote. Pendiente
vivo en el PENDIENTES del cliente y en la continuación B del plan operativo.

Luis encarga avanzar uno por uno y mantener el goal activo. No es una nueva autorización de
publicación de eventos. Fuentes del primer paso revalidadas15-oct; cierre/QA16-oct. No reabrir las fotos
PR36/37, la medición PR34 ni el cron ya comprobado.

- **Guadalajara:** Brujas31-oct montada en la ficha actual solo en paquete local. Cartel propio
  completo/clicable; horario rotulado como **de la sucursal**, autorizado antes por Luis,
  19:00–03:00 día siguiente. Propuesta de ventana: desde aprobación hasta1-nov03:00 Ciudad de México,
  corte tomado del cierre de sucursal, sin presentarlo como horario propio confirmado del evento.
  No imponer una semana de anticipación. Solteras permanece retenida por vigencia/horario propio;
  se incluye en el ensayo con aviso de revisión. No heredar2x1 de USA.
- **Doce USA:** continúan retenidas. Luis respondió «no se» sobre vigencia de carteleras12-oct;
  no convertir los días impresos en recurrencias indefinidas. El reel SA `DeL2KKox_AL` aún dice
  Houston. Viernes Houston figura como Industry Night en la hoja y Ahogo en cartelera: posible
  convivencia, no identidad comprobada. Recovery Brunch El Paso ya tiene su pieza, no duplicarla.
- **Novedad Woodlands:** hoja modificada14-oct incorpora concurso21-oct y menú22-oct. Anuncio
  propio [Canta Sin Yolanda](https://www.instagram.com/sinyolandahouston/p/DefGFDdvkHr/)14-oct
  confirma miércoles21-oct–2-dic y las tres sedes Houston/SA/TW. Resuelve el periodo público,
  pero no todas las bases/horas ni la aprobación editorial. Menú22-oct sigue como plan interno;
  no enviar invitaciones por haber leído la instrucción de la hoja.

Fuente privada de la relectura: `clientes-assets/sin-yolanda/marketing-2026/drive-live-calendars-2026-10-15.json`.
Decisiones/deltas en `calendar-reconciliation-2026-10-13.json/recheck20261015` de esa misma carpeta.
No cambiar las fuentes bloqueadas por el digest de las14unidades aprobadas para registrar investigación.

**Candidata GDL reproducible:** `node scripts/build-gdl-event-review.mjs --asset-root <directorio-privado> <salida-nueva-en-.artifacts>`.
Reutiliza ficha/CSS de agenda y artes cotejados por SHA; solo escribe paquete de revisión.
Salida revisada `.artifacts/gdl-closeout-20261016-v3/public`; loopback8832/guadalajara#programacion-san-ignacio.
No modifica HTML público, manifiesto, aprobación, cartas, rutas, tracker ni hero. Pruebas317/317
verdes; Brave comprobado320/390/768/1440 sin overflow, dos carteles cargados y enlace de imagen
accesible por Tab. IAB no aplicó los anchos solicitados y esos intentos se descartaron. Evidencia
`.artifacts/gdl-closeout-20261016-v3/qa.json`; paquete público normal separado sigue excluyendo estos artes y la propuesta GDL.

### Recuperación del retiro ya autorizado · 16-oct

GET07:19UTC encontró Mes Hispano todavía en HTML ES/EN después del corte05:00UTC. Main y marca
pública seguían0aeb800; último cron04:22UTC verde, anterior al vencimiento. Sin ejecuciones posteriores
visibles. El cron nominal15min no garantizó el plazo en esta ocasión. No se cambió su configuración.

Se reejecutó únicamente el job de agenda ya autorizado38850291263, mismo main0aeb800, intento2:
check y317tests verdes. CD38866731805 completó prepare/preview/producción sin bypass. Pages
`866fd6d7-f052-4636-a321-0cc55c7c8a9f`, rollback `81a40f9b-9542-41b0-9fb6-f9aea0e755b6`.
Recibo `.artifacts/agenda-retirement-20261016/production-proof.json`:243archivos/47aliases/
10exclusiones, cero diferencias/fallos. GET posterior07:25UTC: cero ocurrencias Mes Hispano en
ambos idiomas, una agenda. Propuestas nuevas, fotos y GA4 no entraron al release. La eliminación
estaba en la ventana aprobada13-oct; no se amplió esa autorización.

La recuperación no resuelve el silencio del scheduler. Hallazgo localDDTIA-20261016-089;
próxima decisión: tolerancia de retiro HTML y vigilancia de frescura/disparador. GitHub documenta
[posibles retrasos o descarte](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
de schedule; no se aisló la causa exacta de esta brecha. Conservar controles de commit vivo, CI,
artefacto único y baseline. No alta de monitor, servicio, secreto ni publicador adicional en este pase.

### Jorge Guevara · destinos todavía retenidos

[Organizador Origin](https://www.eventbrite.com/o/origin-entertainment-group-121711802194)
verificado por navegador16-oct: enlaza ambas fichas. Houston13-nov20–23 en Sin Yolanda4901Washington;
San Antonio14-nov20–23:30 en **K.O.P.,314NolanStreet**, actividad externa. La ficha Houston muestra
«Get tickets»; no se abrió checkout ni se acreditaron existencias exactas/precios finales.
Ambos posts propios `DeaxjMhxieb`/`DeaxTe3hV7k` devolvieron «Post isn't available» en consulta pública;
esto no demuestra eliminación. Bio Houston sigue enlazando OpenTable. No apareció una cadena
sucursal→URL exacta de venta: conservar botones retenidos y obtener confirmación de Karina/organizador
por un canal autorizado. También revisar esos dos enlaces de anuncio antes del siguiente release;
no sustituirlos silenciosamente por Eventbrite. Evidencia en la reconciliación privada anterior.

### Campañas · enlaces propuestos, ninguno activado

Cinco candidatos derivados de anuncios reales, `utm_source=instagram`/`utm_medium=social`;
GET sin JavaScript confirma200 de sus fichas. Son códigos **nuevos propuestos**, no prueba de
campañas distribuidas ni de atribución ya recibida. El catálogo activo sigue vacío. Antes de uso:
aprobar ubicación externa/destino, registrar código+tupla, integrar contenido faltante, QA y publicar
el pase exacto. No enviar a marketing ni alterar enlaces internos por esta preparación.

| Código propuesto | URL externa preparada | Contenido |
|---|---|---|
| `pinta_houston_20261028` | [Propuesta houston](https://sin-yolanda.com/houston?utm_source=instagram&utm_medium=social&utm_campaign=pinta_houston_20261028) | agenda-content-already-approved |
| `brujas_guadalajara_20261031` | [Propuesta san-ignacio](https://sin-yolanda.com/guadalajara?utm_source=instagram&utm_medium=social&utm_campaign=brujas_guadalajara_20261031) | gdl-candidate-needs-publication-approval |
| `canta_sy_2026_houston` | [Propuesta houston](https://sin-yolanda.com/houston?utm_source=instagram&utm_medium=social&utm_campaign=canta_sy_2026_houston) | official-campaign-announcement-content-not-integrated |
| `canta_sy_2026_san_antonio` | [Propuesta san-antonio](https://sin-yolanda.com/san-antonio?utm_source=instagram&utm_medium=social&utm_campaign=canta_sy_2026_san_antonio) | official-campaign-announcement-content-not-integrated |
| `canta_sy_2026_the_woodlands` | [Propuesta the-woodlands](https://sin-yolanda.com/the-woodlands?utm_source=instagram&utm_medium=social&utm_campaign=canta_sy_2026_the_woodlands) | official-campaign-announcement-content-not-integrated |

Los QR reales conservan sus códigos existentes `menu_guadalajara` y `loyalty_el_paso`, con
`medium=offline` y destinos WordPress/GHL. Esos destinos no acreditan recepción en la analítica
del central; no renombrar códigos ni tocar QR/formularios para llenar su catálogo. Verificador y
respuestas en `.artifacts/campaign-links-20261016/proposals.json`.

### GA4 · propiedad existente revalidada, alcance elegido y candidata local

La cuenta **ya fue confirmada y el alta autorizada8-oct**: Karina. Flujo y propiedad existentes
revalidados16-oct por navegador autenticado; mismo ID público `G-PZQE63983T`, URL sin-yolanda.com,
medición mejorada OFF y sin recogida activa. No crear otra propiedad ni pedir otra vez su cuenta.
Recibo privado de esta lectura: `.artifacts/ga4-recheck-20261016/receipt.json`.

Ajustes actuales: eventos2meses, usuarios14meses/reinicio ON; Signals/datos proporcionados OFF;
granularidad ubicación/dispositivo ON y personalización permitida307/307regiones. Propuesta para
revisión: usuarios2meses/reinicio OFF y personalización OFF. No se modificaron controles.
La retención de eventos/usuarios y los informes agregados tienen alcances distintos según
[Google](https://support.google.com/analytics/answer/7667196); no prometer borrar todos los informes
al cumplir ese plazo.

La candidata histórica `b86f6cf` sigue apagada y fuera del paquete actual. **No sirve pegarla sin
adaptación:** escuchaba emisores anteriores; el sitio actual tiene un dueño nuevo en
`site-measurement.js`. El siguiente pase debe emitir una vez desde su decisión ya sanitizada,
consumir el catálogo vigente para IDs/destinos, conservar Guadalajara como `san-ignacio`, incluir
la ruta canónica y la carta El Paso y evitar replay al vaciar cola Umami. No reactivar listeners
anteriores para conseguir cobertura.

Luis responde16-oct «solo GA4 no?»: rechazo/revocación afectan **solo GA4**; Umami continúa bajo
sus controles existentes. Alcance registrado como `ga4-only`, sin permiso de activación.
Siguen sin confirmar identidad/domicilio del responsable y canal operativo de privacidad.
No hace falta inventar un buzón dedicado: puede utilizarse un canal existente que realmente atiendan.
Revisión primariaN0 del [texto vigente LFPDPPP](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf),
reforma14-nov2025: art15 exige identidad/domicilio y mecanismos para derechos ARCO; art29 exige
designar persona/departamento que tramite solicitudes. No establece que el canal deba ser un correo
nuevo exclusivo. No acredita cumplimiento de todas las jurisdicciones ni valida el buzón ya impreso.
Borrador factual del aviso: analítica opcional, proveedor Google y propósito visitas/clics, elección
aceptar/rechazar/cambiar, cookies propias y retención real; Umami/almacenamiento por pestaña/mapas
explicados según la decisión. Campos del responsable `{PENDIENTE}`. Sin certificación jurídica.

Aceptación técnica del próximo candidato: modo básico sin solicitudes Google antes de aceptar,
ningún clic retrospectivo, rechazo/revocación/expiración/DNT/GPC/fallo de almacenamiento, un clic
por proveedor permitido, sin texto libre/PII/URLs completas, ningún envío local/preview/404 y fallo
no bloqueante. Consentimiento según [documentación primaria](https://developers.google.com/tag-platform/security/guides/consent).
La aprobación de ajustes de cuenta y del release exacto se solicita al tener ese candidato probado;
no publicar esta preparación ni tomar las aprobaciones de fotos/medición anterior como permiso GA4.

### Adaptador de eventos GA4 · siguiente paso16-oct, solo candidato

Rama `feat/ga4-event-adapter-20261016`. Preparación inicial independiente de las respuestas:
`scripts/analytics/ga4-event-adapter.mjs` consume el contrato aprobado vigente, sin cargar Google,
guardar elecciones ni instalar otro listener de clics. Config dueña del ID ya verificado en
`ga4-event-config.json`: `enabled:false`, `consentScope:ga4-only` tras elección16-oct. Una política
vacía sigue bloqueando el adaptador aunque se habilitara accidentalmente el flag, cubierto en tests.

`project-ga4-event-bridge.mjs` produce una proyección local exacta del dueño actual. Observa una
vez la decisión sanitizada y no vuelve a observarla cuando Umami vacía su cola. Expone contexto
limitado del dueño, con caducidad30min; falla si el código fuente ya cambió. No se editó el JS
servido. Helper de pruebas compartido extraído sin cambiar las expectativas existentes.

Cobertura:332tests del repositorio verdes, incluidos los13nombres actuales,14registros aprobados
ES/EN, las rutas/aliases del manifiesto, GDL/ID histórico y carta El Paso. Prueba clic/auxclick,
carga tardía y reejecución, aceptación durante cola (sin replay previo), rechazo, DNT/GPC,
expiración por decisión del dueño y fallos de callbacks/contexto. Solo un pageview por instancia;
la integración futura debe conservar el guard de documento del controlador de consentimiento.
Sanitiza URL/referrer y valores permitidos; no datos personales, queries, texto libre ni
orígenes privados. Destinos Jorge/retenidos siguen rechazados. Un callback aceptado no certifica
entrega de red ni recepción de Google; no se enviaron mediciones reales.

Mapeo GA4: `entry_source/entry_medium/entry_campaign` para contexto, `editorial_campaign_id`
para cartelera. `campaign_source/campaign_medium/campaign_name` nativos solo en configuración
consentida y con tupla/código permitido; catálogo activo todavía vacío. Así no se usa la campaña
editorial como origen comercial. Referencia primaria revisadaN0:
[campos de configuración Google](https://developers.google.com/analytics/devguides/collection/ga4/reference/config).
La propiedad aún necesitará las dimensiones/eventos acordados y recepción real antes de prometer
informes completos; no se modificó su configuración.

Evidencia ignorada `.artifacts/ga4-event-adapter/report.json`, proyección y contrato regenerables,
log completo y paquete normal `ga4-event-adapter-public-proof`. Digest de las fuentes públicas
idéntico al de antes del adaptador; módulos candidatos fuera del artefacto publicable.
El control de consentimiento posterior se describe abajo; este adaptador por sí solo no carga Google
ni acredita recepción real. No es permiso de activación.

### Consentimiento GA4 · respuesta y candidata local16-oct

La auditoría previa dejó el goal bloqueado tras tres turnos sin las decisiones de privacidad.
La respuesta de Luis resuelve el alcance y permite continuar la preparación técnica. No repetir
preguntas de alcance/cuenta, altas ni curaduría de fotos; los ambiguos y botones Jorge siguen retenidos.

`ga4-consent-review.js` adapta el controlador histórico al adaptador y contrato actuales. Carga
básica tras aceptación explícita guardada y comprobada; antes de aceptar no se crea la etiqueta
ni la cola Google. Un pageview por documento; solo acciones posteriores, cola postaceptación de
máximo20, sin replay de la cola Umami. Rechazo/revocación no escribe `umami.disabled` ni instala
listeners históricos. La preferencia registra alcance, versión y caducidad180d; acepta únicamente
el alcance elegido. Revocación, vencimiento, almacenamiento fallido, pestañas, carga obsoleta,
DNT/GPC y fallos del proveedor cierran los envíos. Ads denegados; flags de Signals/personalización
apagados en la etiqueta, sin sustituir ajustes de cuenta pendientes.

UI ES/EN con aceptar/rechazar equivalentes, aviso y reapertura al pie. Explica explícitamente que
rechazar apaga GA4 y Umami continúa sin cookies de seguimiento, respetando señales del navegador.
Reapertura enfoca el control utilizable y devuelve foco al cerrarse. Rutas compiladas incluyen
Guadalajara/ID `san-ignacio` y carta El Paso; local/preview/404 no envían a Google.

Construcción: `node scripts/build-ga4-consent-review.mjs <salida-nueva-en-.artifacts>`.
Bundle y CSS fuera del manifiesto, páginas públicas intactas. Paquete revisado
`.artifacts/ga4-consent-review-20261016-v2/public`, servidor loopback8833. Aviso **solo borrador
local**: identidad/domicilio/canal `{PENDIENTE}`, reemplaza en el ensayo el buzón no corroborado y
refleja retención de la propiedad consultada, separada de la reducción propuesta. No publicarlo así.

QA:354tests verdes, sin skips; incluye22casos de consentimiento, además de15del adaptador.
Click real del dueño actual: Umami antes/durante/después de
rechazar, Google solo tras aceptar; sin listeners duplicados. Brave320/390/1440: anchos aplicados,
sin overflow, botones48px y mismo tamaño; ES/EN, rechazo/reapertura/foco comprobados. Portada,
GDL, carta El Paso y aviso también sin overflow/duplicación en viewport normal1503. Brave tenía
señal de opt-out: aceptación y ciclo de transporte se verificaron con fixtures VM, sin desactivar
la preferencia del navegador. No prueba Safari físico, recepción real Google ni toda la red de mapas.
Captura móvil automática inspeccionada, evidencia/limitaciones en `qa.json` junto al paquete;
log completo `.artifacts/ga4-consent-review-full-check-final.log`.

Paquete normal separado245archivos: digest de fuentes públicas idéntico a la base y ningún asset
candidato incluido. Sin push/PR/deploy, etiquetas activas, cambios de cuenta ni contacto a terceros.
Siguiente: confirmar datos del aviso, revisar/aprobar ajustes de cuenta y copia final, preparar
el release exacto con versiones/manifiesto/contrato y pedir autorización de activación. Recepción
Google y dimensiones/eventos de la propiedad se acreditan en el pase autorizado, no con callbacks VM.

## Medición B05–B07 · publicada13-oct

Solicitud de Luis después de publicar agenda: «ok con qué continuamos. dale». Rama propia
`feat/agenda-measurement-20261013` sobre main `08027d9`. Implementación con Umami
existente; sin nuevo proveedor, GA4, campañas activadas, cambios de mapas/QR/WP o dashboard.
Autorización posterior: «Publicar la medición y la aclaración del aviso». PR34, head revisado
`007108ac3f517db6cd4e4a9bbe97de163f42692f`, integrada como main
`43c2c33d8a7e1968bf18f81c81941170ea04576b`; CI/CD/recibo verdes. Esta sección sustituye
el estado de preparación del mapa anterior. La aprobación no activa GA4 ni amplía la agenda.

### Contrato y fuente única

`scripts/measurement-contract.mjs` compila rutas/IDs públicos desde manifiesto/datos actuales,
14registros aprobados y sus fuentes, etiquetas UTM del registro de redirects y hosts del resolver
vigente. Solo dos destinos de boletos Pinta corroborados; retenidos/PII nunca entran al cliente.
El catálogo compilado se valida en CI contra sus dueños. Códigos externos de campaña activos:
ninguno comprobado, catálogo vacío; una campaña editorial no demuestra una campaña de tráfico.

`site-measurement.js` es el único dueño de clics en páginas actuales. Los módulos de ficha
conservan solo preferencia de idioma; URLs inmutables anteriores siguen disponibles para páginas
ya abiertas. No se cargan ambos trackers en una página. La cola admite20clics/60s de espera;
falla o carga tardía del SDK no impide navegar. Captura antes de cambios de UI; conserva idioma
de origen y de destino en cambios de idioma, sin segundo evento de menú.

| Qué se registra | Evento / dimensión | Qué permite afirmar |
|---|---|---|
| Vista pública | pageview, ruta canónica; `page_branch/page_language` | Vista de esa página; sin certificar cliente o sumar únicos de dominios |
| Selector/filtro/ficha | `location_selector_open/location_select/location_filter_click/branch_click` | Intención de navegación; contexto y destino separados |
| Menú/reserva/mapa/teléfono | nombres históricos de click + destino simbólico | Interés; no consumo, venta, llamada atendida ni reserva completada |
| Agenda/publicación/boletos | `programming_action_click`; `event_id/event_kind`, o `series_id` en arte genérico Pinta | Interés en un registro o serie; boleto clicado no es boleto comprado |
| Cartelera home | mismo evento con `campaign_id` editorial | Interés en esa campaña/sede; no origen de adquisición |
| Catering/contacto | `catering_click/catering_contact_click` | Intención; WhatsApp de Catering, si está configurado, es contacto y no reserva |
| Idioma | `language_switch_click`, origen/destino | Elección de idioma; no dos clics por propagación |

Datos comunes: `schema_version=2`, branch destino/ID histórico, idioma, `page_branch`,
`page_language`, `link_location` (header/hero/selector/agenda/footer/content), destino simbólico.
Identificadores editoriales exactos, clases y valores permitidos; sin texto libre ni href completo.
Guadalajara continúa como `san-ignacio` en series; ruta pública `/guadalajara`.

### Adquisición y privacidad

UTM source/medium solo si el valor está registrado; códigos de campaña solo desde catálogo y
tupla coincidente. Duplicados, búsquedas, hashes, nombres, teléfonos, correos, URLs privadas,
gclid/fbclid y demás parámetros no se transmiten. El hook restituye solo etiquetas autorizadas
después de `data-exclude-search`; no modifica la dirección ni añade UTMs a enlaces internos.
Source/medium son etiquetas declaradas, no verificación independiente de la plataforma.

Entrada original por pestaña en sessionStorage, sin identificador de persona: solo ruta pública,
etiquetas permitidas y timestamp local no transmitido; vence con30min de inactividad. Navegación
interna conserva esa entrada; regreso externo empieza de nuevo. Nueva pestaña con noopener puede
carecer de este contexto: el clic de salida conserva el origen, sin prometer atribución entre
pestañas. Al revocar o vencer se descarta el origen previo, sin replay.
Referrer externo solo para grupos públicos conocidos; resto se clasifica como `other_external`,
sin registrar su URL. Vacío=`unknown`, no prometer diferenciar directo, mensajería o QR.
`legacy_hop` solo cuando document.referrer permite observar un host legado conocido: salto TX
no implica Instagram/QR y un301puede no conservar esa evidencia. Reglas legacy/QR intactas.

Respeta DNT, GPC y `umami.disabled`; excluye local, preview,404/rutas desconocidas. El aviso
recibe solo aclaración técnica de etiquetas y almacenamiento por pestaña. Responsable/canales
legales, retención de servidor y consentimiento/GA4 conservan sus pendientes; no certificar
cumplimiento por estas pruebas ni activar publicidad/Signals/identificación.

### Verificación y límites

313tests locales;20escenarios con el SDK real observado en producción, envíos interceptados:
cuatro sedes ES/EN, desktop/móvil, imagen/teclado/modificadores/middle click, menú/reserva/mapa/
teléfono, idioma/home/menú, fuente inicial,30min de inactividad, DNT/GPC, exclusiones, carga
tardía y error de proveedor. Un clic→un evento; llamadas impedidas solo por el fixture de QA.
En estas20pruebas todos los POST se interceptaron; cero envíos al proveedor ni contacto/checkout.
La primera sonda usó un header oculto por diseño y un WhatsApp inexistente en Catering;
corregida para el recorrido real, sin force-click ni cambios de diseño para satisfacerla.
El mapa de dependencias ahora sigue imports relativos/absolutos y exige dueño único.

Evidencia ignorada: `.artifacts/measurement-v1/`, paquete `measurement-candidate-v4`,
`.artifacts/measurement-browser-v4/`. Lectura autenticada de registro/stats/eventos de Umami
actual200, sin escribir telemetría; puede incluir QA histórica. Esa lectura previa no prueba
recepción de estos campos nuevos. Después de publicar, lectura autenticada agregada confirmó
`schema_version=2`, `event_id=houston-dontcry-weekly` y `link_location=agenda` del clic controlado
en la ficha real desde el navegador de Codex. Ventana interna de QA iniciada
`2026-10-14T04:57:53.887Z`, cerrada `2026-10-14T05:09:05.282Z`; consulta confirmatoria
`2026-10-14T05:03:43.191Z`.
Estas visitas/clics son pruebas internas, no actividad de clientes: excluir esta ventana de
cualquier primer KPI. No se compraron boletos ni se enviaron reservas/contactos; no atribuir
retrospectivamente dimensiones v2. Evidencia: `.artifacts/measurement-live/`.

La primera sonda HeadlessChrome obtuvo200 sin aceptación acreditada ni campos persistidos;
se conserva su resultado negativo. El endpoint `event-data/events` devolvió500; la recepción
se verificó con `event-data/values` y `event-data/fields`200, no usando ese endpoint fallido.
La prueba real acredita transporte/persistencia del esquema, no todos los recorridos en dispositivos
físicos. Fuente API N0: [eventos de Umami2](https://v2.umami.is/docs/api/events-api).
Home y ocho fichas coinciden byte por byte con la proyección del commit publicado; aviso
restaurado tras ofuscación de correo de Cloudflare coincide con fuente y párrafo aprobado.

Consulta N0: configuración/funciones [Umami](https://docs.umami.is/docs/tracker-configuration),
[SDK](https://docs.umami.is/docs/tracker-functions), contrastadas con script servido SHA
`be444c289ac019af8486b50fe2bbf2fdb2890812fb945dc78940b6781a68ac52`.
Scheduler de agenda: workflow activo/default main, sin ejecución programada observada todavía;
consulta read-only de frescura ya comprobada, sin convertir configuración en ejecución real.


## Frente B · preparación local13-oct · eventos y atribución

### Portadas y comprobación de boletos

Encargo posterior13-oct: fotos más presentes, Ladies/Don’tCry a toda altura y alineadas al
borde derecho del frame; quitar «Ver publicación» visible y dejar el clic en la foto.
Las dos portadas Houston pasan125px→36% del bloque en desktop,40% en móvil, sin padding
del lado fotográfico. Proporción9:16 íntegra con `contain`; el texto conserva su espacio.
Ofertas/participaciones externas pasan250→320px y ocupan el ancho disponible en móvil.
Imagen enlazada con nombre accesible/foco/otra pestaña, sin pie/botón duplicado. Registros
sin arte enlazan su título al post: no inventar ni copiar portadas entre sucursales.

Luis pregunta de dónde vienen los enlaces Eventbrite y si son oficiales. Revisión N0 de
fuentes primarias en navegador, sin checkout ni contacto:

- **Pinta:** publicación colaborativa `DdpUHLrH4mo` con GLOSSY CO. y `sinyolandahouston`,
  fechas14/28oct y leyenda «Tickets via pintaycanta.eventbrite.com». Bio de `glossyco.tx`
  enlaza ese alias; navegación13-oct lleva a ID2002912451058 (14oct), misma URL del candidato.
  El organizador enlazado `/o/78057432803` publica también ID2002912558379 (28oct).
  Cadena directa de promoción oficial→organizador→funciones: ambos botones corroborados.
  El dato2-oct del alias que llevaba a septiembre queda histórico, superado por esta relectura.
- **Jorge:** posts propios `DeaxjMhxieb` (Houston) y `DeaxTe3hV7k` (SA) anuncian venta en
  Eventbrite. Eso confirma la plataforma anunciada. Las URLs exactas del registro se
  encontraron en Eventbrite/Origin Entertainment Group; las bios de sede observadas enlazan
  OpenTable, sin enlace a esas funciones. Coincidencia de título/fecha/recinto no acredita
  por sí sola autoridad de la URL. Sus dos CTA de boletos quedan retenidos en el renderer;
  Houston enlaza la imagen a su post y SA el título al suyo. No afirmar que son falsos.

Fuentes y cadena en `front-b-sources.json/tickets[].linkVerification`, separando
`platformAnnouncedByBranch` de `exactDestinationConfirmed`; métodoHTTP corregido a «provider».
El renderer exige confirmación del destino exacto para emitir CTA de boletos y registra
`heldActions` fuera del paquete público. No cambia el candidato fuente ni certifica derechos,
compra/checkout, inventario disponible u operación. Ladies/Don’tCry no reciben CTA de boletos.

**Verificado:**296tests (nuevo caso negativo para URL no confirmada) y46escenarios locales
Chromium, mismos idiomas/sedes/anchos/noJS. Bounds de portadas coinciden con arriba/abajo/derecha
del frame y su ratio nativo; no recorte/letterbox, overflow, rótulos visibles ni recursos fallidos.
Capturas1440/390 inspeccionadas; el capturador global volvió a dar fondo vacío por fragmento,
descartado como prueba, recurrencia deduplicada en el ledgerDDTIA. QA válida en navegador y
`.artifacts/branch-event-photo-qa-v1/`. Fuente232archivos sigue igual aA;14unidades visibles,
12ambiguas y2acciones de boletos retenidas. Preview8820 sirve
`.artifacts/branch-event-photo-review-final/public`, con release/reconciliation/verification.
No publicación/push/PR, renderer productivo/reloj ni conexión analítica nueva.

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
descubiertos), cuatro fichas de proveedor en Eventbrite y contraste editorial. No hubo mensajes,
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
