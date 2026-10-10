# Registro de rutas y cambios

**Última actualización:** 2026-10-09 · **Dueño:** Luis, con aprobación de producto/contenido de Karina.
**Estado:** inventario de fuentes versionadas y destinos propuestos; no es un crawl HTTP completo.
No aplicar redirects ni crear páginas solo por figurar en esta tabla.

## QR de carta Guadalajara · encargo autorizado8-oct

Luis autoriza implementar/publicar `/q/gdl-menu` y `/q/gdl-menu/` como302 directo a
`https://sinyolandagdl.com/menu/?utm_source=qr&utm_medium=offline&utm_campaign=menu_guadalajara`.
Fuente ejecutable única: `_redirects`, validada por `scripts/qr-redirects.mjs` y permitida
explícitamente en el paquete. No hay landing intermedia, registro obligatorio, destino elegido
por query ni cambio al menú WordPress. Los aliases no entran al sitemap y el control no se sirve
como archivo. Estado de publicación y evidencia → WORKFLOW, «QR de carta Guadalajara».

El QR imprimible codifica solo `https://sin-yolanda.com/q/gdl-menu`; cambiar más adelante el
destino no cambia la imagen. Esa sustitución requiere aprobación operativa de Guadalajara
(Humberto) y su propio release. UTM queda preparado, **sin activar ni acreditar Analytics**.
No modificar redirects WordPress pausados, GA4, fichas ni rutas Guadalajara en este lote.
Los assets de impresión están en `print/qr-guadalajara-menu`, fuera de la allowlist pública.

## QR de registro El Paso · publicado9-oct

Aliases activos: `/q/el-paso-registro` y `/q/el-paso-registro/`, ambos302 al mismo
formulario nativo de El Paso. Form ID confirmado: `nN59k3I7TT6TOxDl4XET`.
URL exacta copiada de Share de GHL y abierta/renderizada por el operador:
`https://api.leadconnectorhq.com/widget/form/nN59k3I7TT6TOxDl4XET`.
`_redirects` añade atribución fija `utm_source=qr`, `utm_medium=offline`,
`utm_campaign=loyalty_el_paso`, `utm_content=registro_v1`; no acepta destino por parámetros.
Publicado y abierto desde la URL permanente; GET/HEAD302 exactos en ambos aliases. QR separado de la carta,
sin modificar `/q/gdl-menu` ni activar campañas. Nombre/email y consentimiento principal requeridos;
teléfono/cumpleaños opcionales y casilla email opcional sin premarcar. Workflows nativos cero,
notificaciones/envíos automáticos y sticky contact desactivados según la revisión del operador.
La prueba ficticia autorizada de captura nativa GHL pasó y conserva consentimiento/atribución.
Este destino es temporal: Luis pide una pantalla propia ES por defecto con botón English/Español
y backend protegido antes de sincronizar GHL. No cambiar el alias ni el QR al sustituir el destino.

El release debe conservar todos los archivos del baseline servido y cambiar exclusivamente
`_redirects`, añadiendo las dos líneas después de las reglas existentes. Pages reemplaza el
deployment completo: subir solo `_redirects` eliminaría el resto del sitio. Comparar hashes
calculados de ambos artefactos con `assertRegistrationRedirectPatch`, fijar deployment baseline,
commit/digest nuevos y aprobación exacta antes del upload; revalidar baseline justo antes.
`scripts/prepare-registration-release.mjs` compara las fuentes/bytes copiados contra el paquete
completo del8-oct y prepara una candidata local no aprobada; solo `--approval` explícito pasa
por el gate existente de Git limpio/digest/autorización humana. No publica ni genera aprobaciones.
Release9-oct: `8d176362-71a8-4267-b881-6b0d76da0377`, HEAD `3846955`, aprobación en
`releases/2026-10-09-el-paso-registration-qr.json`. Recibo ignorado:
`.artifacts/registration-production-20261009/postflight-site.json`; 185archivos conservados,
184servidos coincidentes y diez exclusiones404 por origen. Guadalajara permanece idéntico.
El helper por sí solo no acredita publicación; esta comprobación remota sí verifica los aliases.
Prueba física de una impresión pendiente antes del lote grande.

**Lote técnico posterior autorizado el 8-oct:** 12 destinos de fichas/cartas se preparan para
indexación antes de 16 reglas301 exactas WordPress; cuatro páginas El Paso/Catering conservan
noindex. Mapa ejecutable, excepciones y estado → [MIGRATION-AND-MEASUREMENT.md](MIGRATION-AND-MEASUREMENT.md).
La descripción del primer release siguiente es histórica, no la nueva política de indexación.

**Release limitado8-oct publicado:** nuestras fichas, cartas disponibles y Catering ya están en
el dominio mediante Pages `d149688f`, fuente `befc2a4` integrada por PR #9. Rutas/aliases/404
comprobados; las 16 páginas pendientes conservan noindex y exclusión del sitemap. Los párrafos
«local/no publicado» de abajo describen los cortes previos. Release y límites → WORKFLOW.

**Corte local8-oct:** las cinco fichas ya usan nuestras composiciones del donante fijado en
`branch-import-manifest.json`, conectadas a sus cartas disponibles. Se añadieron EN de SA/TW/El Paso,
cartas SA ES/EN y TW/GDL ES, y Catering EN. Es integración de revisión noindex, sin publicación;
estas rutas se excluyen temporalmente del sitemap del candidato. No eliminar rutas del dominio
en producción por este inventario. Datos públicos anteriores preservados en BRANCH-CONTENT.

**Candidata local posterior 7-oct:** franja a `el-paso.html` debajo del hero; selector con enlaces
nativos a la ficha propia. Moreno Valley/San Diego sin href hasta tener página real. Houston
ES/EN/carta 30-sep recuperados en paquete, no producción. Guadalajara mantiene `/san-ignacio`;
sin nueva ruta `/guadalajara`, redirects ni duplicados. Detalle y QA: `WORKFLOW.md` §7.
**Recorrido home posterior, solo local:** pretextos/cumpleaños enlazan `/#ubicaciones` mediante
anclas nativas; `/#cartelera` presenta campañas compartidas con fechas por sede y enlaces a las fichas.
No es una nueva página ni autoriza publicación. `#rotulo` se retira por D09: su arte vive en el H1
del hero `#inicio`, no en dos bloques. Sin rutas/redirects nuevos; no cambia el sitemap.

**Revalidación HTTP posterior 7-oct:** `/houston` sirve la ficha genérica nueva; `.html` y slash
final resuelven al canonical sin slash. Carta y EN responden 200 antiguo en URL habitual pero 404
con query fresca y en deployment `766a7c6c`; no considerarlas presentes en ese release. Maricarmen
y ruta inexistente dan 404 real. Panel demo/archivos de desarrollo siguen públicos. QA/plan dueño:
`WORKFLOW.md` §7, «Paso 1 revisado». No se cambiaron rutas ni redirecciones en esta revisión.

| Ruta | Fuente actual en repo | Tratamiento acordado/propuesto |
|---|---|---|
| `/` | `index.html` + `assets/js/site.js` | Conservar base/video; D09 autoriza rótulo dentro del hero; selector aprobado bajo `#ubicaciones` |
| `/locations` | `locations.html` | Directorio del mismo registro; no mantener sucursales en dos listas editables |
| `/houston` | `houston.html` | Ficha donante importada; actualizar por fuente aprobada, no retoques del HTML generado |
| `/en/houston/` | `en/houston/index.html` | Traducción correspondiente; navegación conserva sede |
| `/houston/menu/` | `houston/menu/index.html` | Carta propia EN autorizada; fallback explícito desde ES |
| `/san-antonio` | `san-antonio.html` | Sustituir ficha por candidata aprobada, conservar identidad/CTA locales |
| `/en/san-antonio/` | `en/san-antonio/index.html` | Ficha EN propia; candidata local de revisión |
| `/san-antonio/menu/` y `/en/san-antonio/menu/` | `san-antonio/menu/index.html` y `en/san-antonio/menu/index.html` | Cartas ES/EN propias, no aprobación de conflictos de precios/recetas |
| `/the-woodlands` | `the-woodlands.html` | Mismo contrato, carta/medios propios |
| `/en/the-woodlands/` | `en/the-woodlands/index.html` | Ficha EN; fallback a su carta ES, no inventar edición EN |
| `/the-woodlands/menu/` | `the-woodlands/menu/index.html` | Carta ES propia, faltan Entradas para aprobar edición completa |
| `/san-ignacio` | `san-ignacio.html` | Nombre público nuevo Guadalajara; orientación Zona Chapalita, Zapopan. Propuesta: conservar URL por ahora |
| `/san-ignacio/menu/` | `san-ignacio/menu/index.html` | Carta ES propia, conserva conflictos pendientes y nombre Guadalajara |
| `/guadalajara` | No existe fuente | Solo candidato a migración futura; no crear duplicado de `/san-ignacio` |
| `/el-paso` | `el-paso.html` | Ficha de preapertura propia, 9-oct; estado abierto requiere confirmación operativa |
| `/en/el-paso/` | `en/el-paso/index.html` | Misma preapertura en EN, sin carta/horarios/reserva fabricados |
| Moreno Valley / San Diego | Anuncios en datos del home, sin HTML propio | Próximamente USA, sin fechas. No inventar href hacia una ficha inexistente ni usar Houston |
| `/catering` | `catering.html` | Integrar página aprobada con cobertura/contacto reales |
| `/en/catering/` | `en/catering/index.html` | Composición Fiesta EN, misma cobertura y gates; candidata noindex |
| `/eventos` | `eventos.html` | Auditar propósito actual antes de confundir contratación privada con cartelera pública |
| `/la-cantina` | `la-cantina.html` | Página de experiencia, no sustituto de carta por sucursal |
| `/tienda` | `tienda.html` | Revisar operación real y CTA; no publicar compra simulada |
| `/aviso-de-privacidad` | `aviso-de-privacidad.html` | Comprobar adecuación al tratamiento de datos y proveedores reales |
| `/maricarmen` y aliases | Archivo retirado fuera de paquete | Mantener retirada; preservar historial privado, no redirigir indiscriminadamente al home |
| `/dashboard`, `/listings`, `/reputation`, `/requests`, `/reports`, `/review-detail` y `.html` | Antecedentes demo todavía en raíz, fuera de allowlist | Exclusión/enlaces/datos corregidos en candidato; falta desplegar y verificar 404/410 HTTP real |
| `/pruebas/*` | Solo donante | Nunca importar como páginas indexables del sitio oficial |

## Regla para cada cambio de URL

Registrar en el PR: ruta origen/destino, motivo, estado HTTP esperado, canonical/hreflang/sitemap,
enlaces/anclas afectados, analítica, rollback y comprobación de aliases `.html`, `/` final y host.
No fijar redirects sin comprobar primero comportamiento de Pages. No enviar todas las rutas
retiradas al home; no fabricar variantes EN sin contenido. Una ficha por sede; mapa/Visítanos
como sección. Dirección postal, nombre comercial e ID interno son campos diferentes.

Prueba de aceptación: origen resuelve exactamente según contrato, destino sin cadena/bucle,
enlaces públicos y sitemap usan URL canónica, no aparecen rutas de ensayo ni duplicados indexables.
El manifiesto ejecutable `scripts/public-manifest.json` es dueño de archivos publicables; esta tabla
es política/intención de migración, no segunda allowlist. El check contrasta sitemap, enlaces y rutas.
