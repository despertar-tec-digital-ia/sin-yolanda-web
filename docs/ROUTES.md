# Registro de rutas y cambios

**Última actualización:** 2026-10-07 · **Dueño:** Luis, con aprobación de producto/contenido de Karina.
**Estado:** inventario de fuentes versionadas y destinos propuestos; no es un crawl HTTP completo.
No aplicar redirects ni crear páginas solo por figurar en esta tabla.

**Candidata local posterior 7-oct:** franja a `el-paso.html` debajo del hero; selector con enlaces
nativos a la ficha propia. Moreno Valley/San Diego sin href hasta tener página real. Houston
ES/EN/carta 30-sep recuperados en paquete, no producción. Guadalajara mantiene `/san-ignacio`;
sin nueva ruta `/guadalajara`, redirects ni duplicados. Detalle y QA: `WORKFLOW.md` §7.

**Revalidación HTTP posterior 7-oct:** `/houston` sirve la ficha genérica nueva; `.html` y slash
final resuelven al canonical sin slash. Carta y EN responden 200 antiguo en URL habitual pero 404
con query fresca y en deployment `766a7c6c`; no considerarlas presentes en ese release. Maricarmen
y ruta inexistente dan 404 real. Panel demo/archivos de desarrollo siguen públicos. QA/plan dueño:
`WORKFLOW.md` §7, «Paso 1 revisado». No se cambiaron rutas ni redirecciones en esta revisión.

| Ruta | Fuente actual en repo | Tratamiento acordado/propuesto |
|---|---|---|
| `/` | `index.html` + `assets/js/site.js` | Conservar base/hero; integrar selector aprobado bajo `#ubicaciones` |
| `/locations` | `locations.html` | Directorio del mismo registro; no mantener sucursales en dos listas editables |
| `/houston` | `houston.html` | Ficha donante importada; actualizar por fuente aprobada, no retoques del HTML generado |
| `/en/houston/` | `en/houston/index.html` | Traducción correspondiente; navegación conserva sede |
| `/houston/menu/` | `houston/menu/index.html` | Carta propia EN autorizada; fallback explícito desde ES |
| `/san-antonio` | `san-antonio.html` | Sustituir ficha por candidata aprobada, conservar identidad/CTA locales |
| `/the-woodlands` | `the-woodlands.html` | Mismo contrato, carta/medios propios |
| `/san-ignacio` | `san-ignacio.html` | Nombre público nuevo Guadalajara; orientación Zona Chapalita, Zapopan. Propuesta: conservar URL por ahora |
| `/guadalajara` | No existe fuente | Solo candidato a migración futura; no crear duplicado de `/san-ignacio` |
| `/el-paso` | `el-paso.html` | Ficha de preapertura propia, 9-oct; estado abierto requiere confirmación operativa |
| Moreno Valley / San Diego | Anuncios en datos del home, sin HTML propio | Próximamente USA, sin fechas. No inventar href hacia una ficha inexistente ni usar Houston |
| `/catering` | `catering.html` | Integrar página aprobada con cobertura/contacto reales |
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
