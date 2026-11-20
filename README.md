# SIN YOLANDA® — Sitio oficial (sin-yolanda.com)

Sitio estático multi-página de la cadena de cantinas con micrófono abierto
(Guadalajara + Texas: San Antonio, The Woodlands, Houston y El Paso; próxima apertura en Ciudad Juárez).

## Cómo trabajar aquí

Leer [AGENTS.md](AGENTS.md) y [el flujo compartido](docs/WORKFLOW.md) antes de modificar el sitio.
Las decisiones, responsabilidades, requisitos de CI/accesos y bloqueos están en ese flujo;
[rutas y migraciones](docs/ROUTES.md) tiene su contrato propio. Usar la plantilla de PR del repo.
Estado y recibos de publicación vigentes → `docs/WORKFLOW.md`; operación → runbooks de cada
destino. Los antecedentes fechados de ese archivo no sustituyen comprobar la rama y lo servido.

La mejora incremental de diseño/QA, SEO y datos sigue `docs/SITE-QUALITY.md`. La candidata de
calidad es local y opt-in: `npm run build:quality-review -- .artifacts/<nombre-nuevo>`. No cambia
el build normal ni autoriza publicación. El auditor offline `npm run audit:quality -- .artifacts/<nombre>/public` observa el artefacto; `--hours <snapshot-sanitizado>` añade comparación
GBP y `--fail-on-findings` convierte hallazgos en fallo explícito. No pide indexación ni hace
llamadas a Google. Los permisos y la consulta real de Search Console se verifican por separado.

## Stack
- HTML/CSS/JS vanilla; validación/empaquetado determinista con Node, sin dependencias npm.
- `npm ci --ignore-scripts` → `npm run check` → `npm run build` (salida nueva `.artifacts/public`).
- Hosting: **Cloudflare Pages**. La actualización visual del donante es un proceso aparte.
- Proyecto Pages: `sin-yolanda-web` → https://sin-yolanda-web.pages.dev
- Dominio activo: `sin-yolanda.com` (Cloudflare Pages, HTTPS verificado)

## Estructura
- Inventario publicable y exclusiones: `scripts/public-manifest.json`; `npm run check` informa
  el conteo actual. Incluye páginas generales, fichas, idiomas/cartas disponibles, campañas y
  fallback404. Maricarmen está retirada; no agregarla desde catálogos históricos.
- Panel demo y `mock-data.js`: antecedentes conservados en Git, excluidos del paquete publicable;
  navegación/JS público ya no incluyen el panel. Retirada en dominio pendiente de despliegue.
- Datos públicos: `assets/js/public-data.js`; sucursales y dos campañas compartidas con fechas/sedes
  explícitas, sin métricas internas. La cartelera enlaza las fichas locales y retira fechas vencidas
  al renderizar según la zona del evento. Promos/condiciones locales no se generalizan.
  El contenido comercial heredado no queda certificado por pasar CI.
- SEO: JSON-LD por tipo de página, canonicals, pares de idioma, sitemap/robots y catálogos de
  descubrimiento. El mapa exacto y su coherencia se verifican con los contratos del repo; no
  mantener conteos manuales de URLs en esta guía. La indexación efectiva requiere Search Console.

## Deploy
Con alcance autorizado: `npm run release:approved -- --pr <N> --head <SHA-revisado> --publish`.
La entrada única sigue PR→CI→CD→recibo, sin dashboard ni reconstrucción local. Sin `--publish`
es de solo lectura. Uso, pruebas, recuperación y límites en «Publicación rápida» de WORKFLOW.

**12-oct, política nueva solicitada por Luis:** se retiran aprobaciones humanas obligatorias;
CI obligatorio de main → preview con comprobación de hashes/rutas → producción del mismo paquete.
Workflow `Verified Pages release`, disparado por `workflow_run` de `Public site quality` exitoso
en push main. No publica desde PRs ni desde CI fallido. Una cola única, baseline productivo,
frescura de main y secretos por ambiente permanecen. Dispatch manual sirve para preview/recuperación.
Estado comprobado y límites en WORKFLOW; no afirmar una ejecución automática hasta verificarla.

Procedimiento histórico manual: no desplegar el checkout completo ni cambios dirty:
preparar un artefacto público desde el commit remoto aprobado, sin documentación/scripts/pruebas/
secretos; desplegar ese directorio con Wrangler al proyecto `sin-yolanda-web`, rama `main`, indicando
hash del commit. `node scripts/package-public.mjs <directorio-nuevo>` crea ese artefacto;
usa la allowlist `scripts/public-manifest.json` y rechaza rutas demo, enlaces hacia ellas y symlinks.
El reporte `release.json` queda fuera de la carpeta pública: commit, estado dirty y SHA-256 por archivo.

**Corte histórico, integración local8-oct:** contenido público anterior guardado y nuestras fichas/cartas conectadas;
ver `docs/BRANCH-CONTENT.md` y `docs/WORKFLOW.md` §7. Las16rutas importadas son de revisión,
noindex y excluidas del sitemap hasta aprobar datos/medios. `npm run build` bloquea un paquete
productivo con esas páginas; `npm run build:review` genera solo el candidato de revisión en un
directorio nuevo. No cambia producción ni CI/CD remoto. Preview local mediante `serve-review.mjs`
sobre paquete/hash explícitos, no servir la raíz del checkout ni el `dist` entero del donante.
CI no publica; conserva el artefacto para revisión. Requiere autorización explícita
y rollback; verificar dominio después de publicar.

**Lote técnico posterior autorizado8-oct:** [migración y medición](docs/MIGRATION-AND-MEASUREMENT.md)
prepara 12 destinos indexables, mantiene cuatro gates de revisión y centraliza Umami en 22 páginas
con 404 excluido. Este permiso no certifica precios/medios ni habilita CD; un release limitado exige
su aprobación exacta por commit/digest, distinta del corte histórico anterior.

### Houston (cierre publicado 30-sep-2026)

`houston.html` y `en/houston/index.html` son el corte estático de la ficha Astro
del proyecto donante, ya versionado aquí y validable sin acceso al donante.
Para una futura importación se exige `--source-root <checkout-limpio> --source-ref <SHA-completo>`;
construir y comprobar el donante por separado. No usar su `dist` residual ni reimportar todo por CI. El importador copia solo las dependencias
de las páginas autorizadas y conserva el resto del sitio de Karina. Los enlaces
actuales del home/directorio ya llevan a `houston.html`, que Cloudflare Pages
resuelve como `/houston`. El mapa es el iframe oficial de la ficha de Google
Maps de Houston, sin clave de Cloud; la personalización Simple & Light queda
para una decisión posterior. Cualquier actualización visual se hace primero
en el proyecto Astro y luego se vuelve a importar, probar y publicar.

El cierre publicado usa `BranchLanding.astro` y presentación parametrizada en
`src/data/branch-landing.ts`. El importador conserva su comando, pero delega en `import-branches.mjs`
con `branch-import-manifest.json` explícito por sede/idioma. Comprueba identidad/mapa/schema y permisos
de medios renderizados; copia solo dependencias y rechaza sobrescribir assets compartidos distintos.
Houston EN agregado al sitemap; iframe fijo con lazy, privacidad y preferencia `sy-lang`.
Carta HO_ING existente autorizada por Luis e integrada en `/houston/menu/`, EN como fallback para
Houston ES/EN, HTML/schema/búsqueda sin notas internas. Tres páginas empaquetadas; imports relativos
recorridos para incluir módulos comunes. Medición conectada al registro Umami propio de
`sin-yolanda.com`, alta autorizada el 30-sep y recolector verificado con evento QA etiquetado.
Allowlist dominio/www, Do Not Track y URL sin query/hash; localhost/demo excluidos.
No usar el tracker de otro WordPress. QA desde el dominio confirmó páginas ES/EN/carta y
`menu_click`; esos accesos de prueba no acreditan visitas o reservas comerciales.
El Paso no está
en el manifiesto: permanece local hasta su revisión propia. No desplegar automáticamente el árbol
dirty. Evidencia/gates → `../../vault/clientes/sin-yolanda/multisucursal/AUDITORIA-HOUSTON-BASE-SUCURSALES-2026-09-30.md`.

Rollback de esta publicación: desplegar el commit anterior del proyecto
Cloudflare Pages; el Houston previo permanece recuperable en Git. No borrar
los archivos compartidos ni modificar otras fichas para deshacer este cambio.
Release: PR #2, merge `4e33d2213a0800ad5d16f1d526a8fff159942233`, deploy
`27ba4101-5ab0-40ed-81ec-eeee289566ff`; rollback al deploy anterior
`d6197211-ec7a-4500-ac55-d5a3e411810e`. Home y otras fichas de Karina conservados.
Las próximas sedes se preparan localmente con identidad/datos propios y aprobación individual;
continuación canónica en el plan operativo del vault, no en este artefacto.

## Reservas (canales oficiales)
- Texas: OpenTable (perf 1484191 SA / 1503490 TW / 1524058 HOU)
- Guadalajara: WhatsApp (San Ignacio +52 33 1018 6159)

## Pendientes externos

QR dinámico de carta Guadalajara: contrato y estado en `docs/ROUTES.md` y
`docs/WORKFLOW.md` (QR de carta Guadalajara). Imprimibles SVG/PNG en
`print/qr-guadalajara-menu`; helper macOS `scripts/generate-menu-qr.swift` opcional,
fuera del build web. QR de carta separado de registro/GHL; el menú WordPress sigue operativo.

1. Integrar CI a main e instalar controles remotos; configurar después CD aprobado (sin desplegar por este lote)
2. Alta en Google Search Console
3. Campo "web" en los 6 perfiles GBP apuntando a sin-yolanda.com
