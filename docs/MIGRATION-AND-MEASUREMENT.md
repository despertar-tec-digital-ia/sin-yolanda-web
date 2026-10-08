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

Estado de ejecución y evidencias finales se registran tras la publicación, no por escribir el plan.
