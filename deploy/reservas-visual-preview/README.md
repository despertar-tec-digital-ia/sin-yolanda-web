# Sin Yolanda · preview visual de reservas

Autorización 16-nov-2026: Luis pide un enlace de prueba para mostrar a Karina la
entrada común de reservas destinada a las futuras cuentas sociales unificadas.
El preview no publica `/reservar` en `sin-yolanda.com`, no modifica cuentas sociales,
OpenTable, WhatsApp, DNS propio ni otros servicios. Host único:
`https://reservas-demo-sy.187.77.220.209.sslip.io/reservar`.

1. Desde la rama limpia y commiteada, con Node 22 y CI verde, ejecutar
   `node scripts/build-reservas-share.mjs reservas-share-<corte>`. El paquete
   incluye solo la página, sus recursos, robots y 404; retira analítica y schema
   del preview. Los canales de reserva reales siguen visibles y operativos.
2. Verificar `release.json`: commit exacto, 19 archivos regulares, SHA-256 completo,
   ausencia de archivos extra y `officialPublicationEnabled: false`.
3. Crear checkout separado en VPS `/app/sites/sy-reservas-demo-20261116` del mismo
   commit y transferir solo `.artifacts/<corte>/public` y `release.json`.
   Node 18 del VPS no reconstruye el paquete.
4. Registrar antes del arranque: ID/StartedAt de contenedores previos y HTTP de
   `https://sin-yolanda.com/`, `/houston` y `/reservar`.
5. Desde ese checkout validado, activar exclusivamente el nuevo servicio:

   `SY_PREVIEW_ARTIFACT=<corte> docker compose -p sy-reservas-demo-20261116 -f deploy/reservas-visual-preview/compose.yml up -d --no-deps sy-reservas-demo`

6. Verificar `nginx -t`, health, TLS válido, raíz → `/reservar`, cinco sedes,
   cuatro RIDs, WhatsApp, activos visuales, `robots.txt`, noindex/no-store,
   rutas internas 404 y método POST 405. Revisar 390/1280 px en navegador.
7. Instalar timer persistente a siete días que ejecute únicamente
   `docker stop sy-reservas-demo-20261116`; registrar la fecha UTC exacta.
   Confirmar que los contenedores anteriores y el sitio oficial no cambiaron.

Rollback/retiro: detener solo `sy-reservas-demo-20261116`. El artefacto y el
commit permiten reproducirlo sin usar el checkout oficial ni dejar un worktree
grande en la computadora de Luis.
