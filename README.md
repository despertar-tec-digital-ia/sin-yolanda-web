# SIN YOLANDA® — Sitio oficial (sin-yolanda.com)

Sitio estático multi-página de la cadena de cantinas con micrófono abierto
(Guadalajara + Texas: San Antonio, The Woodlands, Houston; El Paso próximamente).

## Cómo trabajar aquí

Leer [AGENTS.md](AGENTS.md) y [el flujo compartido](docs/WORKFLOW.md) antes de modificar el sitio.
Las decisiones, responsabilidades, requisitos de CI/accesos y bloqueos están en ese flujo;
[rutas y migraciones](docs/ROUTES.md) tiene su contrato propio. Usar la plantilla de PR del repo.
**7-oct: CI de PR y paquete público verificados; sin nuevo despliegue ni CD activo.** El hero del home
queda bajo responsabilidad de Karina. Las instrucciones no sustituyen protecciones de GitHub.
**Candidata local posterior:** fuente reciente reconciliada dentro del primer lote, selector
responsive, franja El Paso y Houston ES/EN/carta recuperados. Excepción D09: rótulo como H1 sobre
el video original y retirada del bloque duplicado. Cartelera con campañas fechadas de los calendarios
vivos de Karina, sin directorio Instagram. QA: 35 tests y once combinaciones de navegador;
pretextos/cumpleaños conectados al selector. Alcance/evidencia/límites en
`docs/WORKFLOW.md` §7. Sin merge ni despliegue.

## Stack
- HTML/CSS/JS vanilla; validación/empaquetado determinista con Node, sin dependencias npm.
- `npm ci --ignore-scripts` → `npm run check` → `npm run build` (salida nueva `.artifacts/public`).
- Hosting: **Cloudflare Pages**. La actualización visual del donante es un proceso aparte.
- Proyecto Pages: `sin-yolanda-web` → https://sin-yolanda-web.pages.dev
- Dominio activo: `sin-yolanda.com` (Cloudflare Pages, HTTPS verificado)

## Estructura
- 15 archivos HTML publicables: home, locations, la-cantina, catering, eventos, tienda,
  el-paso, y 4 sucursales (san-ignacio, san-antonio, the-woodlands, houston), más privacidad,
  Houston EN, carta Houston y fallback 404. Maricarmen está archivada, fuera del artefacto público.
- Panel demo y `mock-data.js`: antecedentes conservados en Git, excluidos del paquete publicable;
  navegación/JS público ya no incluyen el panel. Retirada en dominio pendiente de despliegue.
- Datos públicos: `assets/js/public-data.js`; sucursales y dos campañas compartidas con fechas/sedes
  explícitas, sin métricas internas. La cartelera enlaza las fichas locales y retira fechas vencidas
  al renderizar según la zona del evento. Promos/condiciones locales no se generalizan.
  El contenido comercial heredado no queda certificado por pasar CI.
- SEO: JSON-LD Restaurant por sucursal (con horarios + geo reales), canonicals,
  sitemap.xml (12 URLs), robots.txt, OG tags

## Deploy
Pages no está conectado al release automático todavía. CI de calidad no equivale a CD. No desplegar el checkout completo ni cambios dirty:
preparar un artefacto público desde el commit remoto aprobado, sin documentación/scripts/pruebas/
secretos; desplegar ese directorio con Wrangler al proyecto `sin-yolanda-web`, rama `main`, indicando
hash del commit. `node scripts/package-public.mjs <directorio-nuevo>` crea ese artefacto;
usa la allowlist `scripts/public-manifest.json` y rechaza rutas demo, enlaces hacia ellas y symlinks.
El reporte `release.json` queda fuera de la carpeta pública: commit, estado dirty y SHA-256 por archivo.
CI no publica; conserva el artefacto para revisión. Requiere autorización explícita
y rollback; verificar dominio después de publicar.

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
1. Integrar CI a main e instalar controles remotos; configurar después CD aprobado (sin desplegar por este lote)
2. Alta en Google Search Console
3. Campo "web" en los 6 perfiles GBP apuntando a sin-yolanda.com
