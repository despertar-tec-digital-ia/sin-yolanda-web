# Migración de WordPress y medición · 8-oct-2026

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
