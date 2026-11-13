# Posadas Guadalajara — preview aislado

Autorización: Luis solicita una URL de prueba para Karina. Este flujo no publica en Pages ni
modifica el sitio oficial. Host único: `posadas-sy.187.77.220.209.sslip.io`.

1. Revisar diseño móvil/escritorio y pasar `npm run check`. La proyección no forma parte del
   manifiesto público. El canal de cotización permanece inactivo.
2. Commit/push de la rama de revisión y PR draft; esperar CI verde. No integrar a `main`.
3. Desde fuente limpia con Node22, ejecutar `node scripts/build-gdl-posadas-share.mjs posadas-share-<corte>`.
   El builder excluye notas, otras páginas HTML, analítica y rutas de descubrimiento. No tiene bypass dirty.
4. Crear checkout independiente `/app/sites/sy-posadas-review-20261112` de ese mismo commit. Transferir
   solo `.artifacts/<nombre>/public` y su `release.json`; rechazar symlinks, archivos extra, faltantes,
   hashes distintos o commit del recibo diferente al checkout. No reconstruir con Node18 del VPS.
5. Guardar estado previo de contenedores y huellas HTTP del oficial. Desde el checkout validado:

```sh
SY_PREVIEW_ARTIFACT=<nombre> docker compose -p sy-posadas-review-20261112 -f deploy/posadas-review/compose.yml up -d --no-deps sy-posadas-review
```

6. Verificar `nginx -t`, health, HTTPS sin ignorar certificados, bytes de HTML/CSS/fotos/fuentes,
   robots/noindex/no-store, raíz → Guadalajara#posadas, internos 403/404 y POST405. Revisar en navegador.
7. Instalar retiro persistente siete días después del despliegue, apuntando exclusivamente a
   `docker stop sy-posadas-review-20261112`. Registrar fecha exacta y unidades en el recibo operativo.
8. Confirmar que los contenedores previos no cambiaron ID/StartedAt y que las huellas oficiales
   siguen iguales. Conservar recibo/capturas en la documentación privada del cliente.

Rollback/retiro: detener únicamente `sy-posadas-review-20261112`. No hay versión anterior de este
servicio que sobrescribir. La rama, receta y artefacto inmutable permiten reproducirlo; no tocar
los previews de reservas/Instagram, GHL, DNS de los dominios ni servicios productivos.
