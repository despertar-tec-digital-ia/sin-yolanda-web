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
| 2. Primer lote local | Transición menú–agenda, ritmo de tarjetas Texas; correcciones SEO y propuesta de horarios comprobados | Antes/después; mantener contenido y comportamiento; pruebas en 320–1440px |
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
| Horarios Texas y excepciones GBP difieren del sitio | Comparador readonly, informe por sede/superficie; datos aún sin aplicar | Migrar la misma fuente a HTML/schema/cliente con pruebas antes de publicación |
| UTM de campañas sin catálogo admitido y aliases internos | Diagnosticados; no cambiar la atribución a ciegas | Definir campañas/sedes/canales públicos y probar contrato/consentimiento |
| Consistencia del resto del sitio | Auditoría completa; sin rediseño ni cambios masivos | Lotes siguientes de lectura/ritmo/áreas táctiles sobre bloques existentes |

`npm run build:quality-review -- .artifacts/<nombre-nuevo>` genera el primer lote sobre el
artefacto actual, con `publicationEnabled:false` y una sola hoja adicional acotada a las fichas
Texas. La construcción ordinaria conserva sus archivos y aprobaciones. Los tests comprueban
que inicio, Guadalajara, cartas, proveedores y secciones fuera del lote no cambian.

`npm run audit:quality -- .artifacts/<nombre>/public` valida el paquete y observa el cierre de
entidades, catálogos y recursos JSON-LD finales. `--hours <snapshot-sanitizado>` añade la
comparación GBP; `--fail-on-findings` permite exigir fallo explícito. Sin snapshot no se
presume que GBP esté actualizado. El comparador rechaza fuentes parciales, viejas o identidades
desconocidas; no hace llamadas de red, modifica datos ni concede permisos.

El mapa de identidades GBP es explícito para evitar reactivar sedes retiradas u omitir nuevas.
Una alta futura debe reconciliar ese mapa con el inventario canónico; fallar ante una identidad
desconocida es preferible a omitirla. Unificar ese registro y conectar la lectura periódica al
colector existente queda en fase5; no se activó ningún cron, secreto o job remoto nuevo.
