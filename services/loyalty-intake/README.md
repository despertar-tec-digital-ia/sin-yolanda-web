# Registro propio Sin Yolanda · candidata privada

**Estado9-oct2026:** API, almacenamiento cifrado y frontend de QA integrados localmente;
backend candidato desplegado exclusivamente en staging privado. Sin contacto real, credenciales
GHL, transporte GHL real ni campañas. El QR público sigue
capturando en el formulario temporal vigente; nada de esta carpeta forma parte del paquete Pages.

## Contrato y límites

Un POST `/api/registrations` específico para El Paso valida nombre/email, teléfono opcional E.164
con código de país, cumpleaños opcional DD/MM sin año, consentimiento principal e idioma ES/EN.
Marketing por email separado, estricto booleano y sin premarcar; no autoriza SMS/WhatsApp ni
promete puntos o regalos. Versión de consentimiento fija y atribución QR fijada en servidor.
No se aceptan location IDs, URLs, sedes o atribuciones suministrados por el visitante.

Antes de responder `received`, SQLite confirma atómicamente registro, evidencia de envío y outbox.
Datos/consentimientos y el eventual ID del proveedor se cifran con Fernet; índices email+sede,
idempotencia e IP son HMAC separados por propósito. Directorio700/archivos600, WAL, FULL y
transacciones con límite de espera. No hay listado/exportación/contactos/admin en HTTP ni docs
interactivas. Respuestas/logs no contienen PII, valores enviados, tokens o excepciones del proveedor.

Reintentar misma clave UUIDv4 y payload normalizado devuelve el mismo recibo; cambiar payload
con la misma clave falla409. Mismo email+sede bajo otra clave conserva el primer registro y
recibo, añade evidencia cifrada del nuevo envío y no crea otra outbox. Los nuevos consentimientos
**no sobrescriben ni se sincronizan automáticamente** sobre el primero: futura conciliación
operativa debe revisar esa evidencia. No se fusionan personas por teléfono. La respuesta pública
no revela existencia previa ni IDs CRM; `pending` no acredita sincronización con GHL.

La cola tiene claim atómico, lease recuperable, reintento acotado/backoff, errores de código fijo
y revisión manual tras conflictos o máximo8intentos. `worker.run_once` no arranca un loop ni red
al importar. No ejecutar worker hasta contar con transporte autorizado: el conector por defecto
está desactivado. `ghl.py` solo prepara documentos semánticos para un transporte futuro inyectado:
no HTTP/PIT/env reales. Tests cubren API→Store→worker→proveedor ficticio, incluyendo caída y retry.
No afirmar que GHL escribe o deduplica por pasar pruebas con ese proveedor.

## Protección

Origen exacto, JSON limitado8192bytes antes de ampliar buffer, honeypot, tasa durable y verificación
server-side. IP solo del peer; headers reenviados no se confían. Runner local desactiva
`proxy_headers` y rechaza symlinks/hardlinks de la llave antes de leer/cambiar permisos.
QA explícita solo `http://127.0.0.1:8798`+peer loopback+token local. Producción no se activa al faltar
un secreto ni admite esa configuración. Verificación Turnstile exige éxito, hostname/action
`loyalty_register`, timeout y error fail-closed. El frontend incluye contrato de widget explícito
productivo, probado con mocks. Ya existe widget Managed dedicado para `sin-yolanda.com`, sin
pre-clearance; su secreto real es reconocido por Cloudflare y rechaza tokens inválidos. Todavía
no se ha probado un challenge válido desde navegador ni una captura API con ese challenge.

Tasa por IP inicial configurable en código: revisar para WiFi compartido/aforo antes de publicar.
Ingress productivo debe imponer tamaño/tiempos, TLS y origen; definir confianza de proxy exacta
antes de usar IP reenviada. No exponer8801/SQLite directamente a Internet.
En verificación server-side, `remoteip` es opcional: se omite si el peer no es una IP global,
incluido el proxy privado, sin confiar `Forwarded` ni `X-Forwarded-For`. La tasa sigue agrupada
por el peer real; este ajuste no constituye un contrato de IP del visitante para producción.

## Desarrollo reproducible

Python3.12; dependencias versionadas en `uv.lock`. Desde esta carpeta:

```sh
uv sync --frozen --group dev
uv run --frozen pytest -q
uv run --frozen python run_local.py
```

Después, desde raíz del repo: `node prototypes/loyalty-intake/serve-local.mjs 8798 --with-intake`.
Sin flag es solo vista visual deshabilitada. La llave aleatoria de QA se genera automáticamente en
`var/local-qa/encryption.key`; DB y snapshot locales ignorados. Conservar llave+DB para reinicios;
no usar datos personales reales ni compartir ese directorio. No usar túneles públicos.
No copiar una llave de QA al futuro entorno productivo. CI ejecuta pruebas sintéticas separadas,
sin secretos/artefactos de DB ni publicación. Primera ejecución remota comprobada para fuente
`7e5ea24`: [run38019422260](https://github.com/despertar-tec-digital-ia/sin-yolanda-web/actions/runs/38019422260),
job de captura y job del artefacto público pasan. No autoriza deploy ni habilita CD.

`Store.backup(destination)` usa snapshot SQLite consistente y exige un destino nuevo. Restaurar
copia cifrada con la llave correcta se prueba en la suite; llave incorrecta se rechaza. Un backup
sin llave no es recuperable. Custodia de llave separada del backup, retención/borrado, restauración,
acceso del operador y alertas/revisión manual deben quedar operativos antes de capturar en servidor.

## Runtime candidato y recuperación privada ·9-oct

`run_production.py` valida configuración y almacenamiento **antes de escuchar**, exige contenedor
y producción, rechaza modo/tokens de QA y secretos de prueba. No genera llave ni arranca worker.
Uvicorn sin access logs, cabeceras de proxy, reload ni varios procesos; códigos de log fijos,
concurrencia64, cuerpo con plazo10s, keepalive5s y apagado ordenado15s. `/health` acredita arranque/
liveness, **no** salud continua de disco, backup vigente ni conexión GHL.

Dockerfile fija el digest multi-arquitectura de Python3.12 y `uv.lock`; UID/GID10001, directorios
privados y copia exclusiva de runtime, sin QA, fotos, DB o secretos. `compose.candidate.yml`
añade filesystem read-only, límites de recursos, capacidades eliminadas y volúmenes externos
dedicados. Puerto **solo127.0.0.1:8841**: no Traefik, DNS ni publicación. No usarlo como ingress
definitivo: falta revisar proxy/IP confiable y transporte mismo-origen desde Pages.

La config productiva propuesta `ddtia/prd_sinyolanda-intake` **todavía no existe**. La prueba privada
autorizada9-oct usa exclusivamente `ddtia/stg_sinyolanda-intake`, llave nueva independiente de QA,
volúmenes dedicados y token de servicio read-only acotado a esa config con duración7días.
No reutilizar `prd_mcp-server`, llaves de QA ni volúmenes de otros clientes. Además de los secretos
anteriores, el contrato de Compose pide `SY_INTAKE_IMAGE_TAG`, `SY_INTAKE_ORIGINS`,
`SY_INTAKE_TURNSTILE_HOSTNAME`, `SY_INTAKE_DATA_VOLUME` y `SY_INTAKE_BACKUP_VOLUME` explícitos.
Nunca imprimir `compose config`, `docker inspect` de entorno o descarga Doppler con valores.

Herramienta privada, con Settings explícitos y llave correcta:

```sh
python -m sy_intake.operations status
python -m sy_intake.operations backup --destination-dir /backups/lote-nuevo
python -m sy_intake.operations verify --snapshot /backups/lote-nuevo/intake.sqlite3
python -m sy_intake.operations restore --snapshot /backups/lote-nuevo/intake.sqlite3 --destination-dir /backups/restauracion-nueva
```

Salida solo conteos, sin contactos/IDs/PII. Verificación de schema, integridad, relaciones,
autenticación del cifrado y correspondencia de payloads/índices. Padres deben existir; destino
totalmente nuevo700, archivo600; enlaces y sobrescrituras rechazados. Restore nunca cambia la DB
activa: para promover una copia, detener exclusivamente este servicio, verificar copia/llave,
respaldar el estado vigente, cambiar ruta bajo aprobación operativa y volver a verificar.
Fallo de I/O puede dejar copia privada incompleta; no usarla sin verify exitoso ni reusar su carpeta.
Volumen backup en el mismo host **no** protege de pérdida del VPS: copia externa/custodia separada
y política de retención todavía pendientes. No borrar por antigüedad sin decisión explícita.

Drill reproducible local/CI: construir imagen candidata y ejecutar `uv run --frozen python
container_smoke.py --image sinyolanda-loyalty-intake:<tag-explicito>`. Crea y limpia exclusivamente
contenedor/volumen UUID de pruebas ficticias: arranque sin secretos rechazado, API privada,
UID10001, escritura cifrada, backup, reinicio, status y restore. No valida Turnstile real ni hace
POST de alta pública/GHL; fixture se escribe directamente en Store para probar persistencia.
Drill local y CI remoto [`38021007420`](https://github.com/despertar-tec-digital-ia/sin-yolanda-web/actions/runs/38021007420)
pasaron, incluyendo build y recuperación sintética. No son prueba de integración pública.

**Staging privado comprobado9-oct:** snapshot Git pusheado `e16fdf51ede6f021d25c5c647e83ad88816e0c68`,
imagen `staging-feb1c84-20261009`, proyecto Compose dedicado. `/health`200 y bind loopback8841,
UID10001 y raíz read-only; los37servicios previos permanecieron sin recreación/reinicio.
API con token inválido→400 `verification_failed`, sin insertar registros. Una única fixture
ficticia escrita directamente en Store probó cifrado, persistencia tras reinicio, backup/verify,
restore a copia nueva y rechazo de llave incorrecta; queda pendiente, no sincronizada.
Copia cifrada externa manual verificada; no equivale a backup programado, alertas o retención.
Sin ingress público, DNS, Traefik, publicación Pages, merge ni cambios al QR. Operación y rollback
privados tienen dueño en el runbook DEPLOY del vault; no copiar credenciales ni datos a este repo.

## Ingreso de revisión privado ·9-oct

`preview-gateway/` prepara un Nginx dedicado, imagen por digest y UID101, raíz read-only,
capacidades eliminadas y autenticación obligatoria en **todas** las rutas. El fichero de hashes
de acceso se monta solo en runtime; no se copia a la imagen, entorno, repo ni paquete público.
Solo el gateway une red staging y proxy; el backend sigue aislado. Compose exige nombres
explícitos de red/resolver y un fichero existente, no publica puertos del backend ni monta Docker.

Destino **activado y verificado, exclusivamente para datos ficticios**:
`https://registro-sy-prueba.despertartdigital.cloud/`. Luis autorizó el ingreso privado; DNS/TLS,
hostname del widget y origen del backend coinciden. Se respaldó/recreó solo staging y se agregó
el gateway dedicado; los servicios ajenos permanecieron intactos.
No reutilizar el QR público ni promover llave/DB de QA o staging. GHL real permanece apagado.

`scripts/package-intake-preview.mjs` crea un destino nuevo, sin sobrescrituras/enlaces, con
ocho recursos frontend exactos y cuatro archivos gateway; manifiesto/hashes fuera del web root.
Excluye foto review-only, QA, documentos, secretos, DB, mapas de fuente y el resto del sitio.
Requiere explícitamente la **sitekey pública** en `SY_INTAKE_TURNSTILE_SITE_KEY`; no obtiene secretos
ni declara aprobación de publicación. Conserva logo/fuentes/paleta e incorpora aviso ES/EN
de datos ficticios/sin GHL, únicamente en ese paquete aislado.

El frontend usa credenciales `same-origin` para config/POST relativos: permite el acceso privado
sin enviarlas a Cloudflare. El gateway no reenvía Authorization, Cookie ni headers de proxy.
Tras autenticar, restringe método/origen/JSON/ruta sin query y8192bytes; transmite el cuerpo sin
buffer previo para conservar el deadline del backend. Sin access/error logs de solicitudes,
sin caché; noindex y CSP sin código inline ni scripts de analíticas.
Fallos de acceso/proveedor no inventan éxito, conservan datos/clave y requieren verificación nueva.

Pruebas fuente y mocks no acreditan HTTPS/challenge reales. QA de pantalla independiente:
`scripts/qa-intake-preview.mjs`, solo gateway loopback y auth sintética en `.artifacts`; bloquea
proveedores externos y todo POST. No usarlo para resolver un challenge ni registrar personas.
El smoke Docker `scripts/smoke-intake-preview.mjs` requiere una imagen backend explícita en
`SY_INTAKE_SMOKE_BACKEND_IMAGE` (o la candidata local nombrada en el script). No omite el deadline
si falta esa imagen. Crea y limpia solo contenedores/redes UUID de pruebas; auth/config ficticias,
backend sin red externa, transporte loopback y ningún challenge de proveedor. Valida autenticación,
rutas/headers/tamaño fijo y chunked, silencio de logs y plazo absoluto del backend. CI ejecuta
el mismo drill después de construir el backend; no sube credenciales/evidencias privadas al artifact.
`--keep-running` se reserva para revisión local y exige limpiar después sus recursos exactos.
Publicar y sustituir el QR conserva los gates siguientes. El servidor Node del prototipo nunca
sirve configuración productiva ni se expone.

**Comprobado localmente9-oct:** smoke8/8 con Nginx real y backend candidato; peticiones sin acceso
devuelven401 incluso sobre métodos/origen/rutas/cuerpos inválidos.8192bytes conservados fijo/chunked,
8193 rechazados, headers sensibles no reenviados, logs vacíos y deadline del backend408 a10036ms
con bytes cada1800ms. UI8casos ES/EN/320–1502px, proveedor externo deliberadamente bloqueado:
conserva identidad, no overflow, no alta/POST, cookies o storage, no éxito ficticio.133Python
(+43subcasos) y207Node pasan. Recibos y límites del corte → WORKFLOW, «Ingreso privado preparado».
Estas pruebas aisladas **por sí solas no** acreditan HTTPS, widget real ni captura pública.

**Prueba HTTPS real completada posteriormente9-oct (10-oct UTC):** fuente `e54c3e8`, CI remoto
`38024972898` verde; backend y gateway privados construidos desde esa fuente/paquete exactos.
Navegador autenticado: Managed verificó automáticamente; cambio EN→ES conservó los campos y
un registro ficticio guardó con marketing desmarcado. No se resolvió un CAPTCHA interactivo,
no se usó un token simulado ni se creó un contacto GHL. La UI solo declaró éxito tras respuesta
válida del API. Conteos cifrados: dos registros/envíos/pendientes (fixture previa + alta HTTPS),
cero sincronizados/revisión. Backup, verificación, restauración a copia nueva y persistencia
tras reiniciar exclusivamente backend/gateway comprobados; copia externa manual cifrada validada.
Once sondas del HTTPS verificaron acceso401, formulario/script200, origen403, método405,
query/archivo privado404, límite8193→413 y payload/token real inválidos400 sin altas.
Noindex/no-store/CSP presentes; credenciales/headers no reenviados y gateway sin logs de solicitudes.
Runbook, imágenes, custodia de acceso y rollback → DEPLOY del vault; no guardar claves en Git.
PR#16 sigue sin merge. Pages y QR302 temporal conservados: **no es el formulario público final**.

## Gate de publicación y siguiente lote

1. Aprobar foto para uso público y cerrar responsable/canal/aviso de privacidad y retención.
2. El ingreso HTTPS privado ya está verificado. Cerrar la operación productiva:
   volumen durable, secreto en Doppler
   (`SY_INTAKE_ENCRYPTION_KEY`, `SY_INTAKE_TURNSTILE_SECRET`, nunca valores en repo), backup/restore
   protegido, monitoreo sin PII y procedimientos privados de consulta/baja/exportación.
3. Integrar el widget real al frontend final y repetir la captura autorizada en el release productivo
   y su hostname/origen/action exactos; quitar copy exclusivo de revisión. La prueba privada ya
   acreditó el transporte real, pero no autoriza personas reales. No promover la DB/llave de staging
   ni cambiar la ruta del QR aún.
4. Para GHL: verificar scopes/version/auth del lookup y creación/campos, representación real de
   checkbox, duplicados y garantías tras timeout. Snapshot desconocido/conflicto va a revisión;
   no upsert ciego ni overwrite de cumpleaños/consentimientos, DND, source o tags.
   Verificación de lookup v3 documentado OAuth-only no equivale a soporte del PIT actual.
5. Pedir aprobación del release exacto. Sustituir destino temporal manteniendo el alias/QR, con
   rollback al formulario activo. No mezclar home, hero, menús, WordPress, Analytics o mensajes.

Fuentes N0 revisadas9-oct: [Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[lookup GHL](https://marketplace.gohighlevel.com/docs/ghl/contacts/lookup-contact/index.html),
[upsert GHL](https://marketplace.gohighlevel.com/docs/ghl/contacts/upsert-contact/).
Son contratos externos por revalidar al conectar, no autorización ni transporte implementado.
