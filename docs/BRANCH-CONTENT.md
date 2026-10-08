# Conservación y conciliación del contenido por sucursal

**Corte:** 8-oct-2026 · **Alcance:** candidato local; no actualización de producción.

Antes de sustituir las fichas genéricas, se capturó el contenido público realmente servido en
`https://sin-yolanda.com`. Fuente durable, excluida del paquete público:
`archive/source-snapshots/karina-public-20261008-0924/manifest.json`.
Incluye cinco fichas, el registro de siete sedes/anuncios y huellas de siete fuentes estables
al comienzo y al final. No es un respaldo integral de Pages ni una certificación de los datos.

Cada JSON por sede conserva el texto renderizado, FAQ, información práctica, links, fotos
referenciadas y schema público; el registro preserva además parking/accesibilidad y canales.
No contiene colecciones administrativas, claves ni fuentes JS completas. No descargar originales
ni reemplazar fotos aprobadas por estar referenciadas en esta captura. Los snapshots son inmutables;
otra publicación se captura en una carpeta nueva mediante `scripts/snapshot-public-branches.mjs`.

## Pendientes para incorporar en los días siguientes

| Sede / snapshot | Qué cotejar antes de incorporar en nuestra ficha |
|---|---|
| Guadalajara · `san-ignacio.json` | Parking/valet, accesibilidad pendiente, formulación completa de dirección y canal WhatsApp. Conservar nombre Guadalajara y orientación Zona Chapalita, Zapopan; no cambiar el slug `san-ignacio` |
| San Antonio · `san-antonio.json` | Parking/accesibilidad, OpenTable profile frente a URL de restaurante, datos de Google/reseñas y carta vigente. No copiar brunch/agenda genérica por aparecer en la ficha |
| The Woodlands · `the-woodlands.json` | Parking/valet/accesibilidad y horarios; conservar Suite180 de la fuente propia hasta cotejo. Carta incompleta y conflictos no se resuelven por similitud con otras sedes |
| Houston · `houston.json` | Parking/accesibilidad/reseñas y equivalencia de OpenTable. El teléfono vivo antiguo `(713)485-4024` queda solo como antecedente: mantener el aprobado `(346)879-1675` en nuestra ficha |
| El Paso · `el-paso.json` | Contacto observado, alcance/condiciones de Catering y operación real antes de mostrarlos. La captura menciona Catering disponible, pero no confirma horarios, reservas ni carta; no declarar la cantina abierta por llegar el9-oct |
| Moreno Valley / San Diego · `public-registry.json` | Solo anuncios; sin ficha real, fecha o datos suficientes. No crear destinos ficticios ni enviarlos a Houston |

Las FAQ repetidas, agenda explícitamente de ejemplo, muestras de carta, ratings/reseñas y claims
de verificación/directorios son **contenido observado**, no hechos aprobados. Se preservan para
comparar; no se trasladan automáticamente. Maricarmen permanece retirada y no entra al importador.

## Proceso de conciliación

1. Elegir una sede y comparar snapshot, registro fuente de nuestras fichas y datos del negocio.
2. Por campo: conservar valor observado, procedencia/fecha, conflicto y responsable de confirmarlo.
3. Karina/operación valida los hechos; Luis integra solo los validados en la fuente propia y vuelve
   a importar el corte exacto. No editar manualmente el HTML generado para esconder un conflicto.
4. QA de ficha, carta, reserva, direcciones e idiomas sobre paquete nuevo. Aprobación de datos,
   fotos/arte y publicación son independientes de que los enlaces funcionen en local.

La planificación de tipografías, color, header y transiciones vive en el plan operativo privado
del cliente, «Ronda de coherencia visual solicitada ·8-oct». No está implementada por esta importación.
