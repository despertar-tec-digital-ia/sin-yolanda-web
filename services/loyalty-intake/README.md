# Registro propio Sin Yolanda · servicio local

**Estado9-oct2026:** API, almacenamiento cifrado y frontend de QA integrados localmente.
Sin deploy, contacto real, credenciales GHL, transporte GHL real ni campañas. El QR público sigue
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
`loyalty_register`, timeout y error fail-closed. Frontend actual no incluye widget productivo.

Tasa por IP inicial configurable en código: revisar para WiFi compartido/aforo antes de publicar.
Ingress productivo debe imponer tamaño/tiempos, TLS y origen; definir confianza de proxy exacta
antes de usar IP reenviada. No exponer8801/SQLite directamente a Internet.

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
sin secretos/artefactos de DB ni publicación; ejecución remota todavía por verificar.

`Store.backup(destination)` usa snapshot SQLite consistente y exige un destino nuevo. Restaurar
copia cifrada con la llave correcta se prueba en la suite; llave incorrecta se rechaza. Un backup
sin llave no es recuperable. Custodia de llave separada del backup, retención/borrado, restauración,
acceso del operador y alertas/revisión manual deben quedar operativos antes de capturar en servidor.

## Gate de publicación y siguiente lote

1. Aprobar foto para uso público y cerrar responsable/canal/aviso de privacidad y retención.
2. Preparar servicio dedicado del cliente en VPS/ingress con volumen durable, secreto en Doppler
   (`SY_INTAKE_ENCRYPTION_KEY`, `SY_INTAKE_TURNSTILE_SECRET`, nunca valores en repo), backup/restore
   protegido, monitoreo sin PII y procedimientos privados de consulta/baja/exportación.
3. Integrar widget Turnstile real, hostname/origen/ruta final y quitar copy/token exclusivos QA;
   probar caída, reinicio y captura autorizada en candidato. No cambiar ruta del QR aún.
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
