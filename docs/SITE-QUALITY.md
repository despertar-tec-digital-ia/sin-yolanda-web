# Calidad incremental de sin-yolanda.com

Estado: diagnóstico y candidatas locales. Base: `9590028` (19 de noviembre de 2026).
Este plan no autoriza publicación, cambios de GBP ni activación de nuevos servicios.

## Alcance y límites

Mejorar el sitio existente por componentes y recorridos; no sustituir su diseño, arquitectura
de información o identidad. Conservar fotografías, tipografías, paletas por sede, cartas y
canales de reservas. Guadalajara conserva su tratamiento propio y recibe ajustes visuales
puntuales, además de las verificaciones técnicas comunes. El hero del inicio sigue reservado
a su responsable; auditarlo no autoriza modificarlo.

Producción, una candidata local y una prueba pública son estados distintos. `/reservar` sigue
en una rama de prueba independiente: este plan no lo incorpora ni reemplaza OpenTable.

## Fases y entregables

| Fase | Entregable verificable | Criterio para continuar |
| --- | --- | --- |
| 0. Línea base | Commit, inventario de rutas/idiomas, fuentes editables, componentes y medios | Construcción reproducible; distinguir HTML fuente de la proyección servida |
| 1. Diagnóstico completo | Matriz de las 27 páginas publicables, capturas móvil/escritorio, hallazgos y cobertura SEO/GBP | Separar error reproducido, recomendación de diseño y dato pendiente |
| 2. Primer lote local | Transición menú–agenda, ritmo de tarjetas Texas; correcciones SEO y horarios GBP comprobados | Antes/después; mantener contenido y comportamiento; pruebas en 320–1440px |
| 3. Consistencia de recorridos | Inicio, ubicaciones, fichas, Catering, eventos y páginas informativas | Resolver hallazgos por prioridad; completar secciones sólo cuando hay contenido/destino confirmado |
| 4. Cartas y Guadalajara | Legibilidad, navegación, fotos, accesibilidad y SEO de las cartas existentes y páginas GDL | No cartas nuevas; preservar diseño original, precios, orden, moneda y excepciones de GDL |
| 5. Prevención de deriva | Controles de rutas/SEO/datos en artefacto final; propuesta de importación GBP y reporte de cambios | Pruebas negativas; distinguir preparación, ejecución real y aprobación; sin secretos en CI público |
| 6. Aceptación y release | Revisión del lote exacto, aprobación de Luis, CI, artefacto/hash y rollback | Autorización explícita antes de merge/publicación; smoke posterior y registro de límites |

Cada hallazgo tendrá ruta/componente, reproducción, prioridad, evidencia, solución propuesta,
prueba de aceptación y estado. No convertir una recomendación estética en un error factual.
Cerrar primero contenido engañoso, navegación rota y datos comprobados; después jerarquía,
legibilidad, accesibilidad y consistencia; finalmente detalles de movimiento y decoración.

## Fuentes y cobertura

La lista publicable pertenece a `scripts/public-manifest.json`; el mapa de URL e idiomas, a
`docs/ROUTES.md` y los contratos SEO existentes. Auditar el artefacto producido por
`package-public.mjs`: los proyectores añaden secciones, horarios, agenda y metadatos que no
aparecen en los HTML originales. No diagnosticar una sección faltante sólo a partir del raw.

La matriz cubre inicio, ubicaciones, La Cantina, Catering ES/EN, eventos, tienda, privacidad,
las cinco fichas abiertas, Ciudad Juárez, las cartas existentes, las variantes EN y las dos
páginas de Guadalajara de concurso/posadas. Una 404 real se comprueba como exclusión correcta,
no como página que deba indexarse. San Diego y Moreno Valley no se convierten en sedes abiertas.

## Criterios visuales sobre la base actual

- Mantener Bebas Neue y Roboto Slab en fichas y sus valores de marca. No imponer al inicio o
  a la carta de Guadalajara una nueva familia, paleta o estructura por uniformidad.
- Definir el papel de cada superficie: fotografía/portada, lectura, agenda, servicio y visita.
  Dos secciones consecutivas necesitan una frontera reconocible por composición, espacio,
  tono o recurso de marca; cambiar de color no es obligatorio en todas las transiciones.
- Conservar jerarquía H1/H2/H3 y escalar títulos por componente. Texto largo debe envolver sin
  cortar ni forzar saltos manuales distintos por sede. No reducir una sola tarjeta para ocultar
  que la fila tiene alturas dispares.
- Alinear las tarjetas equivalentes de una misma fila. Separar planes recurrentes breves de
  carteles, fechas y promociones; no recortar un cartel para igualarlo a una tarjeta de texto.
- Usar sólo recursos reales catalogados: por ejemplo, la banda ilustrada de Catering y las
  ilustraciones existentes. La decoración acompaña al contenido, no cubre texto ni agrega
  símbolos ajenos. Evitar repetir la misma ilustración en cada cuadro.
- Mantener la secuencia de cada ficha y sus anclas. Catering debe estar disponible con el
  formato Houston en las cuatro sedes Texas, una sola vez y con destino ES/EN correcto.
  No copiar contactos, cobertura, precios o capacidad de Houston a otra sede.
- Movimiento discreto al interactuar, con alternativa de movimiento reducido; no ocultar
  contenido detrás de una animación de entrada ni añadir reproducción con sonido.

## QA de cada lote

Revisar 390 y 1440px en todas las rutas afectadas; 320, 768 y 1024px para el componente
compartido. Comprobar foco/teclado, anclas bajo la cabecera, texto largo/inglés, contraste,
imágenes decodificadas, formularios sin envío, ausencia de desbordamiento y estado sin JS cuando
exista alternativa. Usar Brave instalado con contextos aislados; nunca Chrome for Testing.

Las capturas muestran el contexto de la sección anterior y siguiente. Comparar con la misma
fecha/zona del calendario: contenido que caduca no es una regresión visual. Registrar qué se
probó realmente; no afirmar rendimiento móvil real, compatibilidad Safari/iOS o accesibilidad
completa sólo por una captura de Chromium.

Para componentes con caducidad, comprobar también el estado posterior: HTML recién construido
sin la pieza y HTML anterior que el navegador oculta al vencer. El contenido retirado no debe
reservar columnas, altura o accesos vacíos. Una captura con fecha fija anterior al vencimiento
no verifica esos estados.

El lote local debe demostrar que los archivos fuera del alcance conservan sus bytes, que
hero/cartas/reservas no cambian y que el paquete normal sigue usando sólo aprobaciones vigentes.
`noindex` protege la revisión local; no sustituye autenticación para datos privados.

## SEO, medición y datos

- Validar URL canónica, idioma, title/description, H1, robots, sitemap, enlaces internos y
  recursos JSON-LD contra el **artefacto final**. El mapa de sucursales y los catálogos de
  descubrimiento deben concordar con las fichas vigentes; evitar listas de sedes paralelas.
- Una ruta nueva debe declarar su propósito, publicación, idioma, canonical, estado de sede,
  entrada en sitemap/descubrimiento, schema aplicable y enlaces de acceso en el mismo lote.
  No indexar previews, filtros/UTM duplicados, rutas retiradas ni 404.
- Sitemap y páginas técnicamente indexables no prueban indexación efectiva. Search Console
  requiere propiedad/permisos y lectura real. Un 403 de la API no significa desindexación.
- UTM para campañas y referencias externas donde aportan atribución; eventos para navegación
  interna. Conservar parámetros oficiales de OpenTable y teléfonos/destinos aprobados. No
  poner UTM en todos los enlaces internos ni incluirlas en canonicals.
- GBP es la referencia actual de horarios indicada por Luis. Comparar horario regular,
  excepciones fechadas, cierres, medianoche y zona de cada sede; una hora de partido o evento
  no equivale al horario de apertura. Diferencias de teléfono o URL requieren revisión propia.
- Reutilizar los colectores y proyectores de horarios existentes. Importar un snapshot
  sanitizado, producir un diff revisable y verificar HTML/schema/cliente con el mismo dato.
  Fallar ante falta de sede, formato inválido, antigüedad o cambio inesperado; no sobrescribir
  con una respuesta parcial. La automatización de lectura/propuesta no autoriza autodeploy.

## Registro inicial

El inventario confirma 27 HTML publicables y 26 URL canónicas en sitemap. Catering ya se
proyecta en las ocho fichas Texas ES/EN: revisar presencia/destinos, no añadir duplicados.
Se han reproducido continuidad de fondo menú–agenda y alturas semanales desiguales. Los
resultados detallados, límites de acceso y propuestas se consolidan al cerrar el diagnóstico.

## Corte de diagnóstico y primera candidata

Fases 0 y 1 completadas sobre la línea base. Se observaron las 27 rutas a390/1440px y se
comprobó el ancho a320px, sin desbordamiento ni errores JS reproducidos. Las 26 canónicas
responden200 y tienen metadata/canonical/H1; la indexación efectiva no está certificada.

| Hallazgo | Estado del primer lote local | Siguiente decisión |
| --- | --- | --- |
| Frontera menú–agenda débil y tarjetas semanales con alturas distintas | Piloto Texas ES/EN, sin tocar hero/carta/reservas | Revisar la adaptación en contexto antes de promoverla |
| Afiche dominical domina la composición | Proporción contenida; afiche íntegro y enlace de ampliación conservados | Verificar con y sin afiche al caducar |
| Directorio JSON-LD obsoleto y logos inexistentes en dos páginas | Proyección SEO opt-in derivada de las fichas y logo vigentes | Promover sólo después de aprobación; no reescribir aprobaciones anteriores |
| Auxiliares Catering describen un alcance distinto del Service proyectado | Misma proyección local; no inventar cobertura | Revisar también catálogos de descubrimiento al tocar un servicio |
| Horarios Texas y excepciones GBP difieren del sitio | Aplicados en la candidata local a HTML/schema/discovery/datos/cliente; cinco sedes coinciden | Conservar fuente revisada y comprobar reloj/zonas antes de promover |
| Aliases internos y UTM de campañas sin catálogo admitido | Veinte enlaces nativos normalizados a sus canónicas; parámetros y proveedores conservados | Definir catálogo de campañas aprobado antes de activar atribución |
| Fechas y enlaces pequeños en fichas/cartas | Jerarquía de fechas Texas; áreas táctiles de siete cartas/privacidad, sin alterar contenido | Mantener el display responsive y revisar cada ancho; el inicio conserva composición |

`npm run build:quality-review -- .artifacts/<nombre-nuevo>` genera el lote sobre el
artefacto actual, con `publicationEnabled:false`: una hoja acotada a fichas/controles, dos
módulos compartidos de horarios y el controlador de estado/idioma. Son 405 archivos frente a 401 de la construcción ordinaria,
que conserva sus aprobaciones. Los tests protegen contenido, hero, cartas, contactos y reservas;
sólo se normalizan enlaces internos conocidos y se aplican los deltas declarados.

`npm run audit:quality -- .artifacts/<nombre>/public` valida el paquete y observa el cierre de
entidades, catálogos y recursos JSON-LD finales, title/description/H1, idioma, canonical,
sitemap, reciprocidad hreflang y pertenencia de las rutas al mapa de medición. `--hours <snapshot-sanitizado>` añade la
comparación GBP; `--fail-on-findings` permite exigir fallo explícito. Sin snapshot no se
presume que GBP esté actualizado. El comparador rechaza fuentes parciales, viejas o identidades
desconocidas; no hace llamadas de red, modifica datos ni concede permisos.

El mapa de identidades GBP es explícito para evitar reactivar sedes retiradas u omitir nuevas.
Una alta futura debe reconciliar ese mapa con el inventario canónico; fallar ante una identidad
desconocida es preferible a omitirla. Unificar ese registro y conectar la lectura periódica al
colector existente queda en fase5; no se activó ningún cron, secreto o job remoto nuevo.


## Segundo lote local · horarios y prevención

La fuente revisada pública es `scripts/site-quality/reviewed-hours-20261119.json`, procedente
de la vista de consumidor GBP leída el 19 de noviembre. No contiene IDs de cuenta, tokens ni
contactos. Un solo modelo genera las ocho fichas USA ES/EN, Restaurant/discovery y resúmenes
públicos; el módulo del navegador reemplaza al controlador anterior en esta candidata.
Guadalajara y Posadas conservan su horario y sus excepciones ya coincidentes con GBP.

En las cuatro sedes Texas: 25 de noviembre16:00–02:00 del día26 y día26 cerrado. Cada aviso
vence según Chicago o Denver; el dato semanal revisado permanece después de48h: la frescura
se audita, no se usa para restaurar horarios viejos. Las excepciones sólo se retiran al terminar
su ventana local. Se verifican también idioma, visibilidad y retorno a una pestaña abierta.

La caducidad editorial de los eventos usa el mismo horario revisado como límite de visibilidad.
Esto conserva los anuncios del25 de Woodlands y El Paso hasta02:00, sin afirmar que sus eventos
terminen a esa hora ni cambiar copy, carteles o promociones con vigencia propia. El renderer
normal mantiene su contrato histórico; el proveedor de horas sólo se utiliza en la candidata.

La hoja conserva el comportamiento responsive de cabeceras: ampliar áreas táctiles no debe
hacer visibles controles que la carta oculta en móvil. Se probaron las siete rutas de controles
a320px, además de las ocho fichas Texas a390/1440 y el componente a320/768/1024. El horario
estático también funciona sin JS. La revisión de inicio no justifica eliminar bloques aprobados:
su longitud procede del contenido y no se presenta como un error de funcionamiento.

CI añade la construcción e inspección de la candidata en PR/push y ejecución manual, separada del artefacto
normal que se conserva para publicación. El reporte local bloquea referencias/rutas/idiomas/
metadata incoherentes; las pruebas negativas cubren esas regresiones. Sin snapshot fresco ni
permisos Google, CI no certifica horarios GBP actuales ni indexación. No crea cron ni publica.

Antes de promover este lote hay que revisar su aspecto con Luis e integrar explícitamente los
proyectores aceptados en construcción/scheduler y los controles finales en el artefacto normal.
Un PR verde del piloto no realiza esa integración ni autoriza producción. Quedan decisiones de
campañas, acceso Search Console, consolidación www y datos comerciales observados; ninguna se
resuelve con valores inventados o cambios remotos silenciosos.


Verificación del segundo lote: fuente `6343eff`,553pruebas y CI
[44649427416](https://github.com/despertar-tec-digital-ia/sin-yolanda-web/actions/runs/44649427416)
correctos, incluido «Inspect the incremental quality candidate». Paquete limpio404 y auditoría
local:5sedes coincidentes con snapshot fresco,0diferencias;410referencias schema,26rutas sitemap/
medición y39alternativas. Brave final también comprueba320/768/1024 y horario sin JS. No acredita
Safari/iOS físico, accesibilidad completa o indexación real; producción sigue sin autorización.


## Tercer lote local · continuidad y propuestas de GBP

Se ajusta sólo el espacio vertical de los bloques cortos del inicio («Pretextos», «Botaneo» y
«Cumpleaños»). Paleta, familias, contenido, orden, fotografías y portada se conservan. El cambio
no intenta acortar el sitio eliminando sedes o argumentos. Comparar en390/1440 y probar768/1024.

Se corrige un estado reproducido: tras filtrar sedes en español y cambiar a inglés, el contador
seguía en español. El controlador adicional calcula la cantidad visible y mantiene las dos
variantes explícitas para el traductor existente. Conservar el filtro al alternar idioma y
recuperar opciones abiertas al entrar a reservar desde «Nuevas y próximas».

La página404 conserva su composición, HTTP404 y noindex. Título, explicación y salidas siguen
el idioma guardado; sin JS conserva su fallback español completo. No añadir otra ruta indexable.
El ajuste no modifica la navegación de las fichas ni crea destinos para próximas aperturas.

### Proceso de horarios repetible, sin escrituras remotas

`npm run prepare:gbp-hours -- <snapshot-publico.json> --out .artifacts/<propuesta-nueva>.json`
valida identidad de las cinco sedes, frescura48h, zona y lectura completa. Deriva regulares y
excepciones de los campos raw, sin confiar en resúmenes precalculados ni copiar account IDs,
contactos o credenciales. Usa los normalizadores del comparador; rechaza lecturas parciales,
solapamientos y fechas/horas no soportadas. Produce datos públicos, diff por sede y estado
`unchanged` o `review-required`; ambos conservan `publicationEnabled:false` y revisión requerida.

`npm run build:quality-review -- .artifacts/<salida-nueva> --hours-proposal .artifacts/<propuesta>.json`
permite comprobar una propuesta en la candidata. Valida digest, baseline, forma pública y
frescura antes de escribir el paquete. Un cambio GDL aparece en el diff y bloquea ese carril
Texas: hay que conciliar sus proyectores de horario/campañas, nunca omitirlo silenciosamente.
Ninguno de estos comandos cambia el JSON revisado, hace llamadas a Google, crea PR o publica.
La captura periódica autenticada sigue pendiente en el colector privado y no se activa aquí.

El inventario de Restaurant se contrasta con el mapa GBP por identidad estable, compartida por
sus idiomas. Una futura sede abierta añadida/retirada sin reconciliar ese mapa bloquea el build
de revisión. Altas y cierres necesitan ese cambio explícito; no se deducen de una ficha incompleta.

### QA repetible con Brave

`npm run qa:quality -- .artifacts/<paquete>/public .artifacts/<evidencia-nueva>` verifica el paquete
y crea su servidor efímero local. Requiere `SY_QA_PACKAGE_ROOT` apuntando al Playwright instalado
y Brave instalado; en otros sistemas, indicar `SY_QA_BROWSER_PATH`. No instala navegadores.
Los otros dos runners locales también usan ese resolvedor; se rechaza Chrome for Testing.

Recorre las27páginas en320/390/1440, estado HTTP, anchura, imágenes visibles y errores JS.
Comprueba filtros/idiomas repetidos, Escape/foco, reserva tras filtro de próximas,404 ES/EN,
fallback sinJS y captura los bloques adaptados en390/768/1024/1440. Usa fecha del artefacto,
contextos aislados y bloquea solicitudes externas/escrituras; por ello no certifica mapas,
OpenTable o WhatsApp externos, Safari/iOS físico o métricas de rendimiento. El servidor se cierra
al terminar incluso si falla una comprobación. Conservar el reporte de fallos, no sobrescribirlo.


Recibo del tercer lote: fuente `f4a9fed`,561pruebas y CI
[44653775873](https://github.com/despertar-tec-digital-ia/sin-yolanda-web/actions/runs/44653775873)
correctos. Paquete405 limpio, propuesta real `unchanged` (sin diferencias nuevas de horario),
comparador5sedes/0diferencias e inspector SEO sin hallazgos. QA local sobre ese paquete:81vistas,
40combinaciones filtro/idioma,179imágenes visibles cargadas,0errores JS/escrituras;404 ES/EN,
Escape/foco, reserva tras próximas y fallback sin JS correctos. Portada idéntica por geometría,
texto y encuadres en390/1440 frente a la candidata anterior. Evidencia única local conservada;
el commit no respalda por sí solo capturas ignoradas. No publicación ni integración productiva.


## Cuarto lote · lectura de GBP conectada e inspección de índice

El colector privado ya produce un snapshot público de las cinco fichas consumidoras y lo
conecta al generador de propuestas y al auditor local. Se probó con lecturas autenticadas
reales:5sedes completas, propuesta `unchanged`, candidata405 y auditor5coincidentes/0diferencias.
No se modifica la fuente revisada cuando no hay cambios ni se publica un snapshot sin validar.
El origen privado mantiene sus IDs/credenciales fuera del repo web y del paquete público.

La captura periódica se prepara separada de la publicación. El runner falla ante versiones,
fuentes o imágenes sin revisar; conserva el último éxito y evita builds repetidos cuando no
cambia el horario. Los archivos de programación están preparados, sin instalarlos o activarlos.
Antes de activación hay que provisionar runtime aislado compatible y checkout de herramientas,
verificar el contenedor y autorizar el cambio operativo. Esto no autoriza publicar el sitio.

La revisión HTTP del sitemap público del19nov comprobó26URL con respuesta200, canonical propio,
robots permitido y sin noindex. Esto es indexabilidad técnica, no prueba de inclusión en Google.
La consulta real de URL Inspection para Posadas devolvió403 en las propiedades dominio/prefijo;
esas URL quedan `unknown` hasta tener acceso. El nuevo inspector separa denegaciones, fallos,
resultados no indexados y canonical de Google; no solicita indexación o cambios de permisos.

El contrato del colector y sus recibos quedan en su repositorio privado y el plan operativo;
este repo conserva sólo el formato público, su validación y las herramientas de candidata.
Fuentes oficiales consultadas de forma acotadaN0:
[GBP consumidor](https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations/getGoogleUpdated) y
[URL Inspection](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect).


## Quinto lote20nov · corte inicial del índice

Inspección individual de las26URL canónicas del sitemap:23indexadas con canonical de Google
igual a la URL y3descubiertas, actualmente sin indexar. Las pendientes son las cartas de
San Antonio ES/EN y Guadalajara (`/san-ignacio/menu/`). Las tres responden200, permitenindexación,
están enlazadas en el HTML inicial de sus sucursales y pasan la prueba publicada de Google
(canonical propio y BreadcrumbList válido). No se hicieron solicitudes de indexación. La prueba
publicada acredita acceso actual, sin convertir una URL en indexada ni predecir cuándo ocurrirá.

Posadas sí está indexada: último rastreo17nov2026, obtención correcta, canonical propio y sitemap
conocido. Sitemap correcto, última lectura20nov y26páginas detectadas. El agregado de GSC se
actualizó15nov e incluye20exclusiones:9varianteswww canonicalizadas,8redirecciones y las3cartas.
Las17variantes comprobadas terminan en200/canonical correcto. No tratar20exclusiones como20
fallos del sitio. WWW→sinwww sigue como mejora de consolidación; no se modificó hosting/DNS.

No se detectan acciones manuales, problemas de seguridad ni solicitudes de retirada en los
últimos seis meses. El acceso UI de esta revisión no concede acceso al colector, cuya API sigue
403. La programación y publicación permanecen desactivadas. No hubo cambio de contenido,
estructura, menús, reservas, permisosGoogle o envío de sitemap.

Para futuras altas, usar el sitemap canónico como inventario; comparar inspección por URL y
fecha, y separar `not-indexed`, `unknown` por acceso y errores técnicos del artefacto. Las nuevas
páginas pueden esperar rastreo; no bloquear un release sólo por no estar aún indexadas ni cambiar
canonical/noindex sin diagnóstico. La CI valida el artefacto; el observador con permiso válido
registra el estado externo. No fijar23/26 como conteo permanente ni usar esta consulta manual
para adelantar el último éxito de un job que aún no está activo.

Verificación documentalN0: [reporte de indexación](https://support.google.com/webmasters/answer/7440203?hl=es)
y [inspección/prueba publicada](https://support.google.com/webmasters/answer/9012289?hl=es).


## Cierre20nov ·26/26 indexadas y observador probado sin programar

Una consulta posterior completa de URL Inspection API a las23:28 America/Mazatlan confirma
**26/26URL del sitemap indexadas,26canonical propios y0estados desconocidos**. Las tres cartas
antes pendientes ya están indexadas; Posadas continúa indexada. Las tres solicitudes previas
se aceptaron una sola vez con autorización expresa; esta consulta no reenvía solicitudes ni
sitemap. El corte23/26 y la denegación de acceso anteriores son históricos.

El acceso del colector fue autorizado, concedido y comprobado desde un entorno privado aislado
del VPS. Fuentes por SHA, imagen específica y Node22 aislado probados; horarios GBP de cinco
sedes producen propuesta `unchanged`, con excepciones25/26 coincidentes y sin build duplicado.
La guardia manual de frescura pasa para horarios e índice. No modifica la fuente revisada ni
el build normal; cron, promoción al release y publicación web siguen desactivados.
Contratos, permisos y recibos privados permanecen en su repositorio dueño; no copiarlos aquí.
La CI del sitio valida artefactos, sin sustituir esa observación externa fechada.

## Consolidaciónwww20nov · propuesta revisada, sin activar

Se conserva la propuesta existente en `scripts/central-www-redirect-proposal.json`: Bulk Redirect
301del host exactowww haciaapex, sin incluir subdominios adicionales y preservando ruta/query.
La guía de Pages vigente sigue ese mecanismo. El DNSwww ya es CNAMEproxied; no se propone
reemplazarlo. La inspección actual de reglas/listas devuelve403 con ambos accesos existentes;
no crear otra lista/regla raíz sin comprobar inventario, conflictos y rollback del estado previo.

Se prepararon el ítem de lista y156casos esperados (26rutas×3queries×HTTP/HTTPS, GET/HEAD) en
`.artifacts/www-consolidation-20261120/`. Son expectativas de aceptación, no una redirección
servida ni un ensayo del proveedor. La comprobación posterior debe validar saltos, destinos,
query, rutas desconocidas y ausencia de vuelta awww. HTTP puede tener un upgrade previo; no
inventar un único salto.301puede cambiar POSTaGET: revisar callbacks/formularios antes de activar.
Sin reglas, DNS, permisos, WordPress o producción modificados. ReferenciasN0:
[Pageswww](https://developers.cloudflare.com/pages/how-to/www-redirect/) y
[parámetros Bulk Redirects](https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/reference/parameters/).

## Agenda23nov · distribución al vencer un cartel

Se reprodujo una regresión local en la candidata anterior: el reloj ocultaba el contenedor del
cartel NFL vencido, pero la regla de distribución seguía detectando su imagen en el DOM.
En escritorio quedaba una columna vacía y el título de Recovery Brunch se estrechaba. La regla
ahora reserva dos columnas sólo para un cartel cuya ascendencia no esté oculta. Se mantienen
la actividad recurrente, sus textos, el cartel íntegro mientras esté vigente y el diseño existente.

Brave/CUA, con reloj real del23nov y un artefacto fechado antes del vencimiento: ocho fichas
Texas ES/EN a390/1440 y San Antonio a320,17vistas. Cartel oculto, una columna, texto al ancho
interior disponible y cero desbordamientos. Son comprobaciones adicionales; no una repetición
de toda la matriz anterior de81vistas. `npm run check`:561pruebas correctas.

El QA versionado añade la transición antes/después del vencimiento y una exigencia opcional
`--require-expiry-scenarios` de ocho casos. Requiere una candidata construida antes de caducar
el cartel; una candidata actual sin cartel no cuenta como transición ejercitada. Este nuevo
recorrido con reloj virtual sólo tiene comprobación sintáctica en esta sesión; no se ejecutó
el lanzador externo de Playwright. La evidencia ejecutada es la revisión CUA descrita arriba.
La corrección sigue opt-in; ni el paquete normal ni producción cambian.
