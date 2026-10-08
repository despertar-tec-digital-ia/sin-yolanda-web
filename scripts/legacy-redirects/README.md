# Redirecciones WordPress de Sin Yolanda

v1.0.0 instalado y activo en GDL/TX/USA el 8-oct-2026 por autorización de Luis; pruebas
anónimas posteriores: 69/69. Recibos, límites y reversión →
[`docs/MIGRATION-AND-MEASUREMENT.md`](../../docs/MIGRATION-AND-MEASUREMENT.md).
El mapa ejecutable único vive en
`sin-yolanda-legacy-redirects/redirects.json`; contiene 16 rutas: GDL 3, TX 4 y USA 9.
El plugin no entra en `scripts/public-manifest.json` ni en el sitio de Pages.

## Contrato

Solo GET/HEAD anónimos en los hosts exactos `sinyolandagdl.com`, `sinyolandatx.com`,
`sinyolandausa.com` y sus variantes `www`. Las rutas aprobadas aceptan presencia o ausencia de
un único slash final. El destino usa HTTPS y host `sin-yolanda.com`, con canonical de ficha sin
slash, carta con slash y `#cocktails` donde corresponde. Sin comodines ni parámetros de destino.

Se conservan en WordPress rutas desconocidas, POST/otros métodos, administración, login, REST,
AJAX, archivos/uploads, previews, usuarios autenticados y peticiones de formularios/acciones.
Una query ajena a UTM o identificadores publicitarios conocidos se deja en WordPress. Los IDs
`gclid`/`fbclid`/otros click IDs se descartan; no se almacenan ni se envían. No se registran queries.

UTM admite seis nombres estándar, con tokens exactos del registro público: solo fuentes/medios
conocidos están poblados. Campaña/id/término/contenido quedan vacíos hasta registrar sus etiquetas
aprobadas, sin nombres/contactos ni valores libres. Los valores desconocidos, correos, teléfonos,
URLs, controles, strings largos y claves duplicadas se descartan. No se agregan UTM internos.
Antes de ampliar el registro, revisar cada token; un slug arbitrario no demuestra ausencia de PII.

Exclusiones deliberadas: TX `/menu-english/`; USA `/sin-yolanda-catering-form/`,
`/sinyolanda-thewoodlands/special-menu/`, `/catering-experience/`; canciones, políticas, concursos,
mercancía y cualquier página sin equivalencia acreditada. Maricarmen queda fuera del lote.
Woodlands English Menu conserva el fallback ES acordado; no se fabrica una carta EN.

## Pruebas y ZIP

`node --test tests/legacy-redirects.test.mjs` ejecuta el motor PHP puro y el adaptador con stubs WP.
Detecta PHP en PATH o en XAMPP local; admite `SY_LEGACY_PHP_BIN` como ruta explícita. Si no hay
PHP informa pruebas omitidas: no equivale a verificar el runtime WordPress. Node comprueba
contrato, límites del artefacto y los hashes del ZIP con independencia del intérprete.

`node scripts/legacy-redirects/package.mjs` crea un ZIP nuevo y su recibo SHA-256 bajo
`.artifacts/legacy-redirects/`. Puede recibir otra ruta nueva bajo `.artifacts`; rechaza sobrescribir
artefactos y escribir dentro de una carpeta `public`. ZIP de tres archivos, sin credenciales ni
documentos privados, apto para el flujo estándar **Plugins → Añadir plugin → Subir plugin**.

## Instalación y reversión

Antes de activar: publicar y comprobar individualmente los destinos equivalentes/indexables,
canonical/hreflang/sitemap/fragmentos y autorización de datos, precios, idiomas y medios. Capturar
el estado previo y conservar las fuentes remotas originales y las reglas existentes. Revisar plugins de caché o
redirección existentes; ninguna otra regla debe interceptar antes al plugin. No alterar DNS/MX.

Con autorización de producción: subir el mismo ZIP en cada WordPress mediante el administrador,
instalar y activar. No incluye opciones remotas, creación de usuarios ni aplicación passwords.
Comprobar GET y HEAD en apex/www de cada ruta, respuesta 301 y Location exacto desde HTTPS;
separar un upgrade HTTP→HTTPS previo del proveedor de la regla del plugin.
comprobar también exclusiones/formularios/admin y destino 200 indexable. Las UTMs registradas
van antes del fragmento; los datos arbitrarios no cruzan. Mantener historial Umami separado.

Reversión estándar: **Plugins → Plugins instalados → Sin Yolanda Legacy Redirects → Desactivar**.
El plugin no escribe base de datos, `.htaccess`, DNS ni archivos existentes; desactivarlo retira su
hook y restaura las páginas originales. Purgar únicamente la caché HTTP/CDN correspondiente si
estaba cacheando las respuestas. Los 301 ya cacheados por navegadores no se pueden revocar desde
WordPress: ensayar primero en copia local y conservar el destino disponible durante la reversión.
Eliminar luego el plugin desde el administrador es opcional; conservar ZIP, recibo y respaldo.

## Operador HTTP preparado

`deploy-wordpress.mjs --site gdl|tx|usa` inspecciona por defecto. `--inspect`, `--install`,
`--activate` y `--deactivate` son acciones excluyentes; instalar deja el plugin **inactivo**.
`--zip <ruta>` selecciona un artefacto con recibo que debe coincidir exactamente con los hashes
de las tres fuentes actuales. No sustituye ni actualiza un plugin existente; no acepta FTP.

Lee únicamente `.secrets/sin-yolanda-wp.env` del workspace DDTIA. Hace login HTTP convencional,
una sola vez por ejecución, en el origen HTTPS exacto de cada sitio. Cookies y nonces permanecen
en memoria y no se imprimen ni se guardan. No sigue redirects que puedan reenviar la contraseña;
detiene el flujo ante captcha/2FA/challenge, fallos de acceso, formularios inesperados o instalación
fallida. No crea usuarios, credenciales ni aplicaciones passwords, y no cambia opciones de WP.

La instalación y activación exigen destinos 200 sin noindex/nofollow, canonical exacto y ancla
`cocktails` cuando se usa. Son sondas GET anónimas, sin JS ni eventos sintéticos. Esa comprobación
técnica no aprueba los precios, datos o derechos. La desactivación permite revertir aunque falle
la web central o el REST público, o se haya perdido el ZIP/recibo local; exige sesión y la acción
real del plugin en el administrador.

Cada operación guarda un snapshot local bajo `.artifacts/legacy-redirects/wordpress-backups/`,
directorio 0700 y JSON 0600. Incluye plugins/versión/estado, metadatos REST públicos e inventario
de páginas publicadas con SHA-256 de su contenido renderizado. **Es un snapshot parcial del
estado y huellas de fuentes, no conserva fuentes restaurables ni reemplaza un respaldo completo
de WordPress/BD.** No guarda HTML administrativo, usuarios, cookies, nonces o datos privados.
Para este lote aditivo, conservar las fuentes/páginas/plugins remotos originales, ese estado previo
y el ZIP exacto permite desactivar sin reemplazar contenido. No presentar el snapshot como full DB.
Tras instalar, el recibo `operation.json` vincula origen, ZIP/hashes, versión y estado inactivo al
snapshot anterior sin el plugin. `--activate --backup <operation.json>` exige ese recibo del mismo
sitio y comprueba además el estado actual; `--deactivate` permanece disponible sin ese argumento.
El hash acredita el artefacto enviado, no una lectura remota de todos los archivos PHP instalados.

Las pruebas de parser/sesión usan HTML y respuestas HTTP de fixture, sin acceso a credenciales
reales ni cambios remotos. Una inspección real acredita acceso/estructura actual; solo el recibo
y smoke posteriores a la operación autorizada acreditan instalación/activación y resultado servido.

## Verificación HTTP posterior a la activación

`verify-live.mjs --site gdl|tx|usa|all --output <directorio-nuevo-en-.artifacts>` comprueba las
16 equivalencias con GET/HEAD y casos representativos de www/slash/HTTP. Sigue hasta cuatro
saltos; separa el upgrade/canonical previo de proveedor del 301 atribuido a nuestro plugin.
No usa cookies, credenciales, JavaScript, POST ni envío de formularios. Su único dato de proyecto
es el JSON público del mapa; no necesita `.secrets` ni sesiones del operador.

Cada destino se consulta una vez por método/ruta y se reutiliza para comprobar 200, canonical,
robots y `#cocktails`. Se prueban UTM registradas, descarte de valores libres y conservación de
requests de formulario. También selector TX, formulario/special-menu/Catering USA, REST y una
imagen pública conocida por sitio obtenida del inventario anónimo de medios, sin guardar ese JSON.
El contrato es acotado: no explora combinaciones exhaustivas ni hace crawling general.

El JSON 0600 conserva estados, Location saneada, clasificación de saltos, hashes y metadatos;
no guarda cuerpos ni queries arbitrarias. Un destino/origen inesperado nunca se sigue. Una sonda
fallida o incompleta no acredita migración, y este verificador no demuestra funcionamiento de
POST/formularios, permisos comerciales, analítica JS o administración autenticada.

La query sintética `name` conserva su contrato propio: debe permanecer en WordPress sin
interceptarse por el plugin ni reenviarse al central, y puede recibir 200 o el 404 nativo provocado
por el routing de WordPress. El reporte guarda `nativeStatus` y una nota explícita de que esa
sonda **no certifica un formulario funcional**. Los formularios/páginas reales excluidos, el
selector de cartas, REST y el upload público conocido siguen exigiendo 200. Se conserva el
reporte anterior si cambia el contrato; nunca se reemplaza una sonda fallida por otro parámetro.
