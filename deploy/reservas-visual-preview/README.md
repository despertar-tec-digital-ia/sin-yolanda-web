# Sin Yolanda · preview visual de reservas

Autorización 16-nov-2026: Luis pide un enlace de prueba para mostrar a Karina la
entrada común de reservas destinada a las futuras cuentas sociales unificadas.
El preview no publica `/reservar` en `sin-yolanda.com`, no modifica cuentas sociales,
OpenTable, WhatsApp, DNS propio ni otros servicios. Host único:
`https://reservas-demo-sy.187.77.220.209.sslip.io/reservar`.

**Estado vigente · base oscura recuperada, 19-nov-2026:** Luis aprueba el header y footer,
pero pide partir del diseño anterior para el contenido. Fuente
`a9983789333b656fb042c54f119d7f03b86c90ed`, paquete26archivos
`reservas-share-dark-final-20261119`. CSS del contenido recuperado del corte2349455:
fondo#1c1c1b, tarjetas redondeadas, CTA naranja y subrayado animado de país. Se conserva la
tipografía Roboto Slab/Bebas; el subrayado respeta movimiento reducido también en pseudoelementos.
La ficha vuelve a su composición de foto y título unidos, con contorno18px, foto más amplia y
mayor altura móvil para evitar el recorte anterior. El cambio de sucursal conserva el país.
Header/footer tienen marcado idéntico al corteef3d8ba y sus estilos compartidos no cambian;
se mantiene el mismo fondo de cabecera independientemente del nuevo fondo del contenido.
JS, cuatro RIDs, WhatsApp/SVG, fotos futuras, «Reserva ya», sin portada y ordenUS/MX/Todas intactos.

496pruebas/build401 y [CI44638660613](https://github.com/despertar-tec-digital-ia/sin-yolanda-web/actions/runs/44638660613)
correctos. Brave aislado local320/390/768/1024/1440 y público390/1440, fondos computados,
ES/EN, filtros, subrayado animado/movimiento reducido, vuelta aMX y enlaces sinJS comprobados.
Houston `embedded` y calendario278px dentro de320px; sin reserva enviada.
Preflight con Nginx real aislado:25hashesHTTP200 antes de activar. No se repitió la prueba
negativa de rutas ya acreditada en el corteef3d8ba: configuración y preflight sin cambios.
Después,26hashesHTTPS, healthy/Nginx/TLS/noindex/no-store/POST405 correctos;49otrosIDs y timer
24-nov01:39:24UTC intactos. Tres respuestas oficiales403idénticas desde VPS: sin contenido
revalidado ni release al dominio oficial.

Respaldo `.artifacts/before-dark-refinement.bak-20261119T233447Z/`, con antes/después,
Compose/configuración anteriores y preflight. Rollback inmediato `reservas-share-production-current-20261119`
(ef3d8ba) comprobado íntegro antes de activar. Evidencia/paquetes con manifiesto en
`clientes-assets/sin-yolanda/reservas-dark-refinement-2026-11-19/` del workspace DDTIA.
PR69 sigue borrador en conflicto con main; conciliar antes de promover al dominio oficial.

**Antecedente · identidad de producción, 19-nov-2026:** Luis pide rehacer la entrada
con el diseño de las páginas actuales de sucursal, incluido header y footer. Fuente
`ef3d8ba28bd9488edc8df9bfa9e7759800210b37`, artefacto
`reservas-share-production-current-20261119` (26 archivos). Se reutilizan sin modificar el
CSS de `hh-header` y `BranchFooter`, las fuentes Roboto Slab/Bebas Neue, el logo y la
ilustración de manos de producción; siete recursos cotejados byte por byte con el sitio vivo.
La página adopta vino/crema, botones rectangulares y navegación compartida. El footer común
se adapta al grupo, sin copiar dirección, teléfono o redes de Houston. El ajuste final evita
que la ilustración se cruce con el rótulo del footer en móvil.

Se conservan tarjetas con fotos, «Reserva ya»/«Book now», entrada sin portada, países
Estados Unidos/México/Todas, cuatro canales OpenTable y WhatsApp/SVG Guadalajara. Próximas
aperturas siguen sin habilitar reservas. No se enviaron reservas ni se cambiaron proveedores.

Validación: 496 pruebas y build productivo de 401 archivos; [CI44607063079](https://github.com/despertar-tec-digital-ia/sin-yolanda-web/actions/runs/44607063079)
verde en el commit exacto. QA local de la implementación a320/390/768/1024/1440px y del ajuste
final a320/390/1440px, con Brave instalado y contextos aislados: sin desbordamiento, ES/EN,
filtros, vuelta al país elegido y WhatsApp correctos. OpenTable Houston `embedded` y calendario
contenido dentro de320px. QA final en HTTPS390/1440px, fuentes y fotografías cargadas.

El primer ensayo con estos recursos detectó `/_astro/` bloqueado por Nginx pese a estar
presente en disco: se restauró el preview anterior de21archivos. La fuente3bf07d9 permite
ese prefijo y añade `preflight.py`: mismo Nginx fijado, UID/configuración/montajes de solo
lectura, rednone y sin puertos públicos. La configuración anterior debe fallar y la nueva
cotejar25recursos200 por HTTP antes de exponer el paquete. Ambas pruebas pasaron también
antes de activar este corte. El smoke público posterior cotejó los26hashes, incluido el404.

Servicio healthy; Nginx, TLS, redirección inicial, noindex/no-store y POST405 correctos.
Los otros49IDs y el timer24-nov01:39:24UTC permanecen iguales. Las respuestas oficiales
`/`, `/houston` y `/reservar` conservan status/bytes desde el VPS, pero allí devuelven403;
esto no revalida su contenido. No hubo publicación al dominio oficial.

Respaldo de esta activación: `.artifacts/before-production-current.bak-20261119T202125Z/`,
con configuración real anterior, before/after, fixture negativo y recibo del preflight.
Rollback inmediato `reservas-share-production-verified-20261119` (3bf07d9), íntegro antes de
activar; usa ya la configuración corregida. Respaldo del corte3bf:
`.artifacts/before-production-verified.bak-20261119T201407Z/`. No usar el artefacto del primer
ensayo como rollback sin la configuración corregida.

Evidencia y paquetes conservados con manifiesto SHA-256 en
`clientes-assets/sin-yolanda/reservas-production-shell-2026-11-19/` del workspace DDTIA.
PR69 sigue borrador y en conflicto con main; conciliar antes de promover al sitio oficial.

**Estado verificado 17-nov-2026:** servicio `sy-reservas-demo-20261116`
actualizado desde el commit `e8d7c2df5226af6b46131353180584d3fc4cddc6`
con el artefacto `reservas-share-e8d7c2d` (22 archivos, todos cotejados por
SHA-256). HTTPS 200; 21 recursos públicos idénticos al manifiesto; OpenTable
Houston en estado `embedded`, WhatsApp Guadalajara, `noindex` y `no-store`.
El artefacto previo `reservas-share-c7a4edc` (19 archivos) permanece verificado
para rollback. El timer detiene este contenedor el 24-nov-2026 01:39:24 UTC;
los otros 45 contenedores y el sitio oficial se verificaron sin cambios.

**Antecedente · restauración19-nov-2026:** Luis descarta la lista con fotografía lateral y
solicita volver al diseño anterior conservando los demás ajustes. Fuente
`2349455dcaf9ab4feaa536d74471d61719c0a135`, paquete `reservas-share-restored-20261119`.
CSS idéntico al corte18-nov `e5e5cf0`; HTML/JS restaurados de ese corte con CTA «Reserva ya»
(EN «Book now»), orden de controles Estados Unidos/México/Todas y versiones de caché nuevas.
Conservar entrada sin portada ni foto inicial, cinco canales reales, fotos de próximas
aperturas, WhatsApp/SVG, navegación y texto de solicitud GDL. AraVe no cambia en este pase.

496 pruebas/build/CI44589368487 correctos.21 hashes públicos, salud,49 otros IDs y timer
24-nov01:39:24UTC cotejados. Respuestas oficiales403 idénticas desde VPS; no revalida contenido.
QA móvil390/escritorio1440 con Brave instalado aislado: tarjetas, CTA, filtros y WA correctos,
sin reserva enviada. Respaldo `.artifacts/before-restore.bak-20261119T183620Z/`, con antes/después
 y Compose anterior; rollback inmediato `reservas-share-design-final-20261119`, íntegro antes
 de activar. Evidencia local: `clientes-assets/sin-yolanda/reservas-restored-2026-11-19/`.
PR69 sigue borrador en conflicto con main; no hubo release oficial.

**Diseño descartado 19-nov-2026 (antecedente):** fuente `a8104c6319a346e644362595f897bb5e6c39e362`,
paquete `reservas-share-design-final-20261119` de 21 archivos. CTA «Reserva ya», lista de sedes
con fotografías y una imagen contextual amplia en escritorio que sigue hover/foco. En móvil,
filas completas con foto y CTA; países en orden Estados Unidos, México, Todas. El recorrido
país → sede → reserva toma como referencia el módulo real de Sala de Despecho y conserva
los canales reales de Sin Yolanda, la cabecera, tipografía, naranja y fotos existentes.
La reserva elegida tiene cabecera compacta y formulario de OpenTable con estilos propios;
Guadalajara mantiene WhatsApp/SVG y texto de solicitud, sin simular confirmación.

496 pruebas, build y [CI44586084987](https://github.com/despertar-tec-digital-ia/sin-yolanda-web/actions/runs/44586084987)
correctos. QA local320/390/768/1440, ES/EN, teclado/foco, filtros, vuelta al país elegido,
calendario móvil y acceso directo a los cinco canales sin JavaScript comprobados. No se envió
reserva. HTTPS: 21 hashes iguales al manifiesto, health/Nginx/noindex/no-store correctos;
QA público390/1440 en navegador integrado, sin Chrome for Testing.
Los otros49 IDs de contenedores se conservan. Las tres respuestas oficiales mantienen
status/bytes, pero este corte recibió403 en las tres desde el VPS: esa comparación no demuestra
el contenido ni permite revalidar su404 anterior. No hubo release al dominio oficial.

Respaldo `.artifacts/before-design.bak-20261119T182215Z/` con antes/después y Compose anterior.
Rollback inmediato `reservas-share-direct-20261118`, cotejado íntegro antes de activar; artefactos
anteriores conservados. Timer24-nov01:39:24UTC intacto. Evidencia local conservada en
`clientes-assets/sin-yolanda/reservas-design-2026-11-19/` con manifiesto SHA-256; fuentes y
recibos versionados en PR69. Sigue en conflicto con main; conciliar antes de promover.

**Antecedente 18-nov-2026:** fuente `e5e5cf045edfea2379205039cc894942e47592d3`,
paquete `reservas-share-direct-20261118` de 21 archivos. Se retiró la portada con su frase
y fotografía: la entrada empieza directamente en «Elige tu sucursal». Estados Unidos aparece
antes de México en filtros, sedes y próximas aperturas; Todas conserva la vista completa.
Se retiró la foto de portada del paquete y se usa el logo existente como imagen social.
Jerarquía de títulos y selección de nombre de sucursal ajustadas conjuntamente.

496 pruebas, build y CI manual `44466602804` correctos. Se utilizó workflow_dispatch porque
PR69 está en conflicto con main y no generaba CI al actualizarse; no se integró main ni se
publicó la ruta oficial. Antes de promover a producción hay que conciliar ese PR.
Los 21 hashes coinciden en HTTPS; salud, Nginx, noindex y no-store correctos. Revisión móvil390
y escritorio1280, filtros US/MX, cambio de sucursal, Guadalajara/WhatsApp y Houston `embedded`
comprobados sin enviar una reserva. Los otros 49 IDs de contenedores y los bytes/status de
home, Houston y `/reservar` oficiales permanecen idénticos; `/reservar` oficial sigue404.

Respaldo de esta actualización:
`.artifacts/before-direct.bak-20261119T054141Z/`, con IDs, hashes/status oficiales y Compose
anterior. Rollback inmediato `reservas-share-e8d7c2d`, íntegro por SHA-256 antes de activar;
se conservan los artefactos previos. El timer existente del24-nov01:39:24UTC no cambió.

1. Desde la rama limpia y commiteada, con Node 22 y CI verde, ejecutar
   `node scripts/build-reservas-share.mjs reservas-share-<corte>`. El paquete
   incluye solo la página, sus recursos, robots y 404; retira analítica y schema
   del preview. Los canales de reserva reales siguen visibles y operativos.
2. Verificar `release.json`: commit exacto, lista cerrada de archivos regulares,
   SHA-256 completo para cada uno,
   ausencia de archivos extra y `officialPublicationEnabled: false`.
3. Usar el checkout aislado en VPS `/app/sites/sy-reservas-demo-20261116` en el
   mismo commit y transferir solo `.artifacts/<corte>/public` y `release.json`.
   Node 18 del VPS no reconstruye el paquete.
4. Registrar antes del arranque: ID/StartedAt de contenedores previos y HTTP de
   `https://sin-yolanda.com/`, `/houston` y `/reservar`.
5. Antes de activar, ejecutar `python3 deploy/reservas-visual-preview/preflight.py .artifacts/<corte>`
   en el VPS. Debe verificar los25recursos200 en un contenedor aislado sin red ni puertos,
   con el Nginx/configuración/artefacto reales. Conservar el JSON y retirar solo ese contenedor.
   Para comprobar la regresión de rutas, usar `--config <fixture-anterior>` y exigir fallo.
6. Desde ese checkout validado, activar exclusivamente el nuevo servicio:

   `SY_PREVIEW_ARTIFACT=<corte> docker compose -p sy-reservas-demo-20261116 -f deploy/reservas-visual-preview/compose.yml up -d --no-deps sy-reservas-demo`

7. Verificar `nginx -t`, health, TLS válido, raíz → `/reservar`, cinco sedes,
   cuatro RIDs, WhatsApp, activos visuales, `robots.txt`, noindex/no-store,
   rutas internas 404 y método POST 405. Revisar 390/1280 px en navegador.
8. Mantener el timer persistente ya instalado que ejecuta únicamente
   `docker stop sy-reservas-demo-20261116` el 24-nov-2026 01:39:24 UTC.
   Confirmar que los contenedores anteriores y el sitio oficial no cambiaron.

Rollback de una actualización: conservar el artefacto previo y recrear solo
`sy-reservas-demo` con `SY_PREVIEW_ARTIFACT=<corte-anterior>`; comprobar sus
hashes y salud. Retiro definitivo: detener solo `sy-reservas-demo-20261116`.
El artefacto y el commit permiten reproducirlo sin usar el checkout oficial ni
dejar un worktree grande en la computadora de Luis.
