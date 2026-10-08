# Forma de trabajar y publicar

**Última actualización:** 2026-10-07 · **Responsables:** Luis, técnica; Karina, negocio/contenido y hero.
**Estado:** CI de PR verificado en GitHub (run `37689049591`, 7-oct), artefacto descargado y sus
77 hashes comprobados. La rama aún no está integrada a main. CD, protecciones y secretos no están
activados por este lote; no hay nuevo despliegue. La aprobación del documento no equivale a release.

## 1. Una casa por tipo de información

| Información | Fuente dentro del flujo |
|---|---|
| Instrucciones del asistente | `AGENTS.md`, corto y versionado |
| Acuerdos, proceso y acceso necesario | Este documento; decisiones en §6 |
| URLs, redirects y retirada de páginas | `ROUTES.md`; futuro manifiesto validado generará salidas |
| Código/release oficial | Este repositorio; commit + artefacto publicado identificados |
| Trabajo por hacer y conversación de revisión | Issue/PR correspondiente; no duplicar todo en chat |
| Contenido por sede | Registro de datos con procedencia/validación; hoy transición, ver §3 |
| Contraseñas, tokens, credenciales | Gestor privado; jamás este repo ni documentos públicos |

No depender de memoria del chatbot. Codex carga `AGENTS.md` cuando trabaja sobre el repositorio;
otros asistentes requieren comprobar su integración. Un chat sin checkout no hereda estas reglas
por tener simplemente un enlace. Los bloqueos efectivos viven en GitHub, no solo en instrucciones.

## 2. Flujo cotidiano propuesto

Solicitud breve → contexto del repo → rama/PR → pruebas → preview → revisión → publicación aprobada.

1. El asistente identifica área y criterio de aceptación; pregunta solo si falta una decisión material.
2. Una rama por tarea; la rama compartida `dev`, si se adopta conforme al estándar de agencia,
   integra únicamente cambios revisados. No activar despliegue de `dev` a producción. La política
   exacta de ramas se cierra al instalar protecciones; no crear ramas remotas por este documento.
3. Cambio pequeño y completo; pruebas y docs afectadas en el mismo PR. Karina trabaja el hero
   en su rama; el resto no sobrescribe ese bloque ni sus assets. Conflictos se revisan, no se fuerzan.
4. CI sin secretos ejecuta los checks portables. Preview solo desde código confiable revisado,
   bajo gate de publicación por enlace; noindex y protección adicional si el material lo necesita.
5. Un responsable revisa diseño/datos además de tests. Incorporar al commit aprobado los cambios
   requeridos; no arreglar a mano el servidor o el HTML desplegado.
6. El release usa commit y artefacto exactos con hash, rutas y versión donante; aprobación explícita
   mediante ambiente protegido antes del job de producción. Sin volver a compilar otro contenido.
7. Smoke del dominio y enlaces críticos; registrar deployment ID, resultado y destino de rollback.
   No reintentar indefinidamente si falla: detener, diagnosticar y proponer reversión controlada.

**Baseline remoto previo a este lote:** Actions habilitado, sin workflows, ambientes, secrets de repositorio,
rulesets ni protección clásica de `main`. Token de workflow por defecto de lectura; no puede
aprobar PR. Observación 7-oct; no se inspeccionaron secretos heredados de organización.
Estos controles aún no están activos y se revalidan antes de configurarlos.

## 3. Implementación del primer lote y límites

**Diagnóstico previo (corregido en este candidato, no en producción):**

- `scripts/package-public.mjs` seleccionaba todos los HTML/CSS/JS raíz y directorios amplios.
  Necesita allowlist pública y prueba negativa: no panel demo, documentación, mocks internos o
  secretos. `assets/js/mock-data.js` mezcla contenido público con demostraciones; separar con cuidado.
- `scripts/import-branches.mjs` y pruebas Houston dependen de `../sinyolanda-universal` y `dist`.
  Un clon de este repo no reproduce esa entrada; el helper de pruebas también presupone el nombre
  local `sinyolanda-karina-official` al resolver imports. No simular portabilidad con rutas del Mac.
- Suite existente, Node 22.17.0 local, 7-oct: **7 pasan / 1 falla**. El HTML Houston conserva el
  teléfono anterior frente al registro actualizado del donante. Comparar release/candidato/dato
  aprobado y corregir en el lote de datos; no modificar el test para validar el dato viejo.
- Ruta inmediata propuesta: contrato de entrada del donante fijado a commit y build con lockfile;
  tests del artefacto oficial autocontenidos, comparación contra donante en integración explícita.
  Alternativa de consolidar fuentes se evalúa sin imponer una migración de framework al hero.

**Solución implementada, 7-oct:** conservar el snapshot estático versionado como fuente del release
oficial. CI no compila ni necesita el repositorio donante privado. El importador ahora exige checkout
explícito limpio y SHA completo; su build fresco sigue siendo una integración supervisada, no parte
del CI. Esto no consolida todavía los dos proyectos ni demuestra reconstrucción histórica del donante.

- `npm ci --ignore-scripts`, `npm run check`, `npm run build`: Node de `.node-version`, sin dependencias npm.
- Allowlist exacta de 15 HTML y sus recursos; fuera del paquete demo/mocks/archivos incidentales.
- JS público sin renderizadores internos; datos públicos separados y enlaces al panel retirados.
- Teléfono Houston corregido al confirmado, sin reimportar diseño nuevo: excepción acotada de
  sincronización del snapshot, 3 representaciones (datos + ES + EN), todas probadas. Donante ya
  conserva el teléfono aprobado; no se alteran imagen, estilo, hero ni mapa.
- Manifest de release externo al sitio con commit, dirty y hashes; CI exige árbol limpio.
- Pruebas de clon aislado, assets/enlaces/sitemap y entradas maliciosas; no invocan reservas/pagos.

`npm run build` exige salida nueva; no sobreescribe ni borra versiones anteriores. Para otro destino:
`node scripts/package-public.mjs <directorio-nuevo>`. Validación local permite diagnóstico dirty,
pero Actions rechaza un artefacto dirty. No publicar un ZIP/release por haber pasado los tests.
Se conservan pendientes los controles remotos, CD, prueba de HTTP real y QA editorial del resto.

**QA de este lote:** 19 pruebas locales; 77 archivos permitidos, 15 HTML, 169 referencias locales.
Navegador: 45 recorridos (15 páginas × 390/768/1440 px), sin excepciones JS, imágenes rotas
detectadas ni desbordamiento horizontal. Hero renderizado comparado contra el commit previo,
idéntico; CSS y medios sin cambios. Capturas desktop/móvil inspeccionadas. Peticiones externas
bloqueadas en esta prueba: no certifica disponibilidad de Maps/OpenTable ni tipografía remota.
Persiste contenido ES mezclado en modo EN del home; es deuda editorial previa, fuera del hero reservado.
Retirada pública solo quedará completa al desplegar y comprobar las rutas directas en Pages.

## 4. Contrato de automatización y credenciales

| Elemento | Necesidad / restricción |
|---|---|
| GitHub para trabajo humano/asistente | Acceso al repo con su cuenta/conector; no compartir login. Acceso actual de Luis ADMIN verificado. Confirmar flujo de Karina |
| `GITHUB_TOKEN` en Actions | Lo emite GitHub por ejecución; lectura para checkout/QA. Permisos extra solo donde sean necesarios. No requiere PAT personal para CI de este repo |
| `CLOUDFLARE_API_TOKEN` | Credencial de publicación Pages, cuenta específica, permiso Pages Edit; sin DNS/pagos/Global API Key. Confirmar alcance real del proveedor: no afirmar restricción a un solo proyecto si el permiso es de cuenta |
| `CLOUDFLARE_ACCOUNT_ID` | Identificador de cuenta, no contraseña; variable de ambiente o secret según política |
| Proyecto y rama de destino | Config versionada: `sin-yolanda-web`, producción `main`; revalidar contra Pages antes de activar |
| Donante privado, si se mantiene externo | `GITHUB_TOKEN` de este repo no da acceso automático a otro. Preferir consolidación o GitHub App de lectura/repo acotado, solo si la arquitectura lo exige |
| Gestor privado | Doppler es dueño de secretos DDTIA; config dedicada al servicio. Actions consume por mecanismo acordado (réplica administrada o identidad federada compatible), no exportación manual repetida |
| SSH/VPS, Google, OpenAI | **No necesarios** para construir/publicar este sitio estático en Pages. Panel/mapas/ingesta son frentes aparte; no inyectar sus credenciales en el workflow web |

No se creó ni rotó ninguna llave. No asumir que el OAuth usado en una publicación manual sirve
como credencial durable de CI. Si falta autenticación, se solicita acceso una vez y se configura
el mecanismo seguro; no pedir al usuario que vuelva a pegar tokens en cada conversación.

Seguridad de workflows: actions fijadas a SHA revisado; runtime/dependencias fijados; permisos
mínimos; `pull_request` sin secretos; no ejecutar PR externos con `pull_request_target` privilegiado;
aprobación del ambiente y cambios sensibles de workflow por responsables. Aislar job que publica:
no ejecutar código arbitrario del PR mientras están disponibles credenciales de despliegue.
Un token Pages de cuenta no se vuelve exclusivo de preview por ponerle ese nombre; el aislamiento
real depende del alcance de credencial y permisos/entornos. Definir ese límite antes de automatizar previews.

`CODEOWNERS` y checks obligatorios se configuran con identidades verificadas y ruleset/protección;
el archivo solo no bloquea merges. Dos puertas separadas: aprobación del cambio y del despliegue.
Evitar excepciones amplias de administrador o bypass para bots. PR no equivale a aprobación comercial.

## 5. Qué verificará el sistema y qué revisará una persona

**Automático:** sintaxis/tests, checkout limpio, archivos/rutas publicables, enlaces locales/aliases,
canonicals/hreflang/schema, identidad de sede y CTA, assets/licencias, simulaciones/notas internas,
ausencia de secretos, presupuesto de imagen/bundles, humo de preview/producción y manifest de release.
No se presentan como implementados: son aceptación del futuro CI.

**Humano:** identidad visual, fotos y permisos, vigencia comercial, promesas/condiciones, encuadres
y experiencia móvil. QA visual reproducible con tamaños/capturas y comparación del hero reservado.
No sustituir aprobación de negocio con «el test pasa» o con una evaluación automática del asistente.

**Cambios temporales:** eventos/promos necesitan disparador por tiempo además de commits. Publicar
y retirar por zona horaria, con alerta de error y comprobación del HTML servido. No confundir
automatizar vigencia con aprobar contenido nuevo leído de Instagram. Sin agenda válida, no inventar.

## 6. Registro compacto de decisiones

| ID / fecha | Estado | Decisión y motivo | Consecuencia / comprobación |
|---|---|---|---|
| D01 · 7-oct | Confirmada Luis | Oficial de Karina como base; hero reservado a ella | Cambios modulares; no reemplazo integral ni regresión hero |
| D02 · 7-oct | Confirmada Luis | Reusar selector/fichas/cartas/Catering aprobados, datos propios por sede | Revisión conectada; no enlaces de todas las sedes a Houston |
| D03 · 7-oct | Propuesta técnica | Actions + Wrangler sobre Pages actual | Verificar cuenta/proyecto, token y pruebas; evitar migrar DNS por CI |
| D04 · 7-oct | Regla de trabajo | Instrucciones en repo + controles GitHub; estado no depende del chat | Verificar carga de AGENTS y ejecución remota/protecciones |
| D05 · 7-oct | Implementada en candidato | Release estático autocontenido, donante separado y explícito | Tests/build sin sibling; futura importación requiere build fresco verificado |
| D06 · 7-oct | Implementada en candidato | Lista pública explícita y JS/datos separados del panel demo | Pruebas negativas; falta despliegue autorizado para retirar el demo del dominio |
| D07 · 7-oct | Implementada en candidato | CI read-only sin secretos ni publicación | Validar run remoto; CD/credenciales/protecciones se activan aparte |
| D08 · 7-oct | Solicitada por Luis; candidata local | Franja naranja El Paso directamente después del hero, fecha 9-oct y enlace a su ficha | Anuncio independiente del hero; estado/fecha del registro público, no declarar apertura por el reloj |

Agregar una fila solo si cambia el contrato. Cambios de implementación → PR/commit; cambios de
ruta → ROUTES; no duplicar reseñas largas de sesión. Un release registra commit, sourceRef/hash,
artefacto, pruebas, aprobación y rollback. Archivar evidencia de QA sin datos privados ni secretos.

## 7. Activación por pasos

### Primer lote correctivo local · 7-oct, posterior a la auditoría

Rama `fix/live-source-selector`, sobre PR #7. **No publicado ni fusionado.** Se recuperaron los
cambios públicos del upload `766a7c6c` dentro del alcance: video/póster, home, rótulo/fotos y 180
líneas nuevas de CSS. Nueve fuentes auditadas revalidadas sin cambios; otras páginas cotejadas.
No trasladar demos, datos internos, scripts de despliegue ni ofuscación de email inyectada por
Cloudflare. El 404 conserva copy neutro, no ocho sucursales. No es respaldo integral de Pages.

Hero: HTML idéntico al publicado, SHA-256 `8ea0e9317329fcd214295f209aef25a06272fed997e7612bb4449ed18ada4e8e`;
video idéntico, ambos controlados por test. Video, póster, copy y comportamiento conservados;
nuevo CSS limitado al selector/rótulo/franja. Header/footer públicos sin enlace al panel.
Selector: `ul > li > a`, primer clic/Enter/tacto nativos, una preview y último hover/foco retenido.
Retícula móvil/tablet/tacto; acordeón desde 1100 px solo con puntero fino/hover. Filtros con
7/1/6/3 registros; futuras sedes sin página son anuncios no enlazados, sin fotos inventadas.
Más de siete tarjetas pasa a retícula. Guadalajara conserva ID/ruta y orientación Chapalita.
Rótulo conserva SVG; carga Alfa real, corrige altura de fotos y CTA. Licencia del patrón en
`licenses/react-bits.txt` (MIT + Commons Clause), no retirar al distribuir.

Fotos: Guadalajara/SA/Houston conservan motivos publicados en WebP local a resolución original.
El Paso conserva el recurso ilustrativo del upload, no afirmar foto propia. TW tenía hotlink roto:
candidata real del banco revisado `the-woodlands-hero-1600.webp`, sin generación IA. Sustitución y
permisos requieren revisión de release; QA no concede permiso comercial. Franja: ancho completo,
naranja cálido contrastado, El Paso/fecha `time`/CTA a ficha propia; ES/EN y apilado móvil. Confirmar
operación antes de cambiar El Paso a abierta o retirar el anuncio; no inventar fechas para otras.

Houston: paquete recupera ficha ES/EN + carta del corte 30-sep, OpenTable, teléfono confirmado y
mapa Google fijo. **No importado aún el Catering/cartelera posterior ni las otras fichas donantes.**
Metadatos del directorio usan Guadalajara/teléfono Houston confirmado; rutas/canonicals intactos.
`npm run check`: 24 tests; paquete 89 archivos/15 HTML, 173 referencias. `qa:selector`: ocho
combinaciones 320–1920 px, desktop táctil incluido, filtros/fotos pintadas/nombres/altura, último
hover, primer clic/Enter/toque, ES/EN, movimiento reducido y mapa/carta. Cinco rutas/archivos
excluidos responden 404 en servidor del artefacto. Capturas revisadas; evidencia local ignorada
`.artifacts/selector-qa-20261008-final/report.json`. Iteraciones detectaron y corrigieron capa que
tapaba fotos y fecha EN sin traducir, no solo overflow. Hero preservado, no rediseñado.

Repetir sobre artefacto fresco: `SY_QA_ORIGIN` local y `SY_QA_PACKAGE_ROOT` con Playwright instalado,
`npm run qa:selector`. Sonda GET-only/bloqueo de envíos/telemetría, evidencia fuera del paquete.
Gate local, **no cableado todavía a CI/CD**. No Safari/dispositivos reales/Lighthouse/backend.
Persisten HTML inicial/SEO, contenido simulado/notas heredadas de otros bloques, importaciones
restantes y controles remotos. No certificar el sitio entero ni publicar sin revisión/aprobación.

### Paso 1 revisado: producción, selector y rótulo · 7-oct

Auditoría de lectura sobre la publicación actual, cotejada contra `main`, rama `rediseno-elplan`
y candidato PR #7. Ninguna coincide con los nueve archivos de texto servidos auditados como conjunto;
la rama adicional es del 26-sep. Se preservaron esos archivos con SHA-256 en evidencia local ignorada.
Esta captura es un respaldo de las fuentes inspeccionadas, **no** una copia integral del release.
No se editaron páginas, permisos ni producción.

| Hallazgo comprobado | Ajuste y prueba de aceptación del siguiente lote |
|---|---|
| A 320/390 px las cinco tarjetas tienen altura 0 y no se pueden tocar | Retícula/lista visible con un toque hacia ficha propia; altura y nombres legibles en móvil, sin depender de hover |
| Hover mantiene dos tarjetas grandes; al salir vuelve a Guadalajara | Una sola preview, último hover/foco retenido; clic/Enter navegan a la primera, modificadores conservan acción nativa |
| Primer clic y primer Enter en Houston solo expanden | Separar preview y navegación; ninguna interceptación del enlace para abrirlo |
| Nombres/badge se recortan en 768–1920 px; anclas tienen `role=listitem` | Recuperar solución de nombres del selector aprobado y semántica `ul > li > a`; foco visible ya funciona y debe conservarse |
| Foto The Woodlands devuelve 400 | Medio propio conservado en banco, derivado optimizado y fallback; no depender del hotlink fallido |
| Rótulo usa Alfa Slab One sin cargarla; fotos calculan 1,050 px de alto | Cargar la fuente autorizada y definir tamaño/encuadre; comparar la adaptación, sin cambiar el hero reservado |
| Selector en EN conserva título/CTA en ES; próximas aperturas sin foto quedan omitidas | Textos por idioma; heading «Cuál te queda» aprobado; registro único con fallback sin inventar fotos/URLs |
| `/houston/menu/` y `/en/houston/`: URL habitual 200 antiguo, query fresca y deployment actual 404 | Recuperar ambas en el artefacto; smoke contra URL inmutable y alias con query fresca, no certificar por un 200 cacheado |
| Houston ES usa ficha genérica/teléfono anterior; Guadalajara tiene `tel:` enmascarados inválidos | Restaurar ficha aprobada y NAP confirmado en contenido/schema/CTA; no copiar Houston a otras sedes |
| `/dashboard`, archivos de desarrollo siguen 200 público | Reconciliar exclusión del PR #7 sobre la nueva fuente; verificar cada ruta/alias en HTTP, no solo ocultar enlaces |
| Sin JS, home no tiene contenido/enlaces/H1 | Planificar HTML inicial de contenido/enlaces esenciales, conservando presentación; no inferir desindexación sin GSC |

**Se conserva:** enlaces de las cinco tarjetas apuntan a su sede; Guadalajara y Zona Chapalita ya
figuran en el selector; Maricarmen/URL desconocida dan 404. Seis tamaños sin overflow horizontal ni
excepciones JS observadas. Preferencia de movimiento reducido elimina transiciones del selector;
no constituye certificación completa de vídeo/accesibilidad. Los filtros sí existen en `/locations`,
pero no en el nuevo selector del home. El título «Ocho formas» del directorio no refleja los siete
registros actuales. El Paso muestra «Próxima apertura», sin destacar aún 9-oct; Moreno Valley/San
Diego existen en datos pero no en la galería por depender de `venuePhoto`.

**Orden propuesto:** reconciliar fuente publicada y controles de paquete → corregir selector/
destinos/fotos/teléfonos → restaurar Houston/carta/EN → comparación del rótulo/idiomas → primer
preview conectado y aprobación concreta. Generación HTML inicial y demás bloques conservan su
lote; no activar un workflow que pueda reemplazar cambios fuera de Git por el candidato antiguo.

**Repetición:** `npm run audit:live` es diagnóstico GET-only, no gate de despliegue. Requiere
Playwright instalado indicado por `SY_QA_PACKAGE_ROOT`; no añade una dependencia al build del sitio.
`SY_AUDIT_ORIGIN` elige origen público y `SY_AUDIT_DEPLOYMENT` permite comprobar la URL inmutable de
Pages. Fuentes/reportes/capturas se guardan en `.artifacts/live-audit-<fecha>` fuera del paquete;
no imprimir el contenido de `mock-data.js`. Compara URL habitual/fresca, revisa fuentes estables,
fotos, seis viewports, hover/salida/clic/Enter/tacto/EN/sin-JS y movimiento reducido. Bloquea POST
y telemetría en navegador. Resultado 7-oct: seis viewports y seis escenarios completados; nueve
fuentes sin cambios entre principio/fin. No probado en dispositivos reales/Safari ni con Lighthouse.

### Mapa revalidado 7-oct: primero reconciliar producción

**No publicar el candidato actual directamente.** Durante la preparación de CD se comprobó que
Pages recibió nuevas publicaciones sin conexión Git, mientras `main` permanece en `463396d`
(1-oct). El despliegue observado `766a7c6c-f168-49d2-8d53-bbde1e492235` difiere del repositorio
en home, JS, CSS y Houston. El candidato no incorpora necesariamente esos cambios; que su CI
esté verde no demuestra que preserve el hero actualmente publicado.

| Etapa | Estado comprobado | Siguiente acción y aceptación |
|---|---|---|
| Fuente compartida | Repo público en organización; Luis/Karina ADMIN; PR #7 abierto y verde | Obtener fuente más reciente del publicador en rama/ZIP, comparar contra Pages y llevar cambios aprobados al repo; no sustituir carpetas ni atribuir un upload a un commit por su etiqueta |
| Calidad | CI funciona en PR; `main` sin protección, cero rulesets/ambientes | Integrar cambios revisados; proponer PR obligatorio, check `Public artifact checks`, revisión humana y resolución de conversaciones; workflows requieren revisión técnica |
| Preview | Pages `sin-yolanda-web`, sin conexión Git, producción `main` | Actions + Wrangler sobre el mismo proyecto; rama explícita `review-<sha>`, entorno `preview` aprobado, URL noindex y revisión del artefacto exacto |
| Release | Aún no hay CD | Promover el mismo artefacto comprobado mediante entorno `production` con aprobación humana; nunca publicar automáticamente cualquier push |
| Verificación | Falta smoke de release conectado | Comprobar rutas públicas, carta/idiomas, recursos y 404 reales de retiradas/archivos internos; registrar hashes, run y deployment ID |
| Recuperación | Hay historial de Pages, no rollback ensayado en este flujo | Identificar versión segura comprobada antes de liberar; un deployment anterior puede reintroducir demos y no cuenta automáticamente como respaldo seguro |

**Controles propuestos, no instalados:**

- Inicio simple con ramas de tarea + PR a `main`; no añadir `dev` si no hay necesidad real.
  El merge por sí solo no publica. Confirmar política de revisión/bypass antes de activarla.
- Un workflow manual de release desde código de control revisado en `main` seleccionará un run
  de CI exitoso de `main`, con repo/workflow/evento/SHA/digest comprobados. No aceptar como release
  artefactos arbitrarios de PR ni ejecutar su contenido con secretos.
- Preparación/validación sin token Cloudflare; jobs separados de subida reciben el secreto solo
  después del gate de ambiente. Ambas etapas usan exactamente los mismos archivos/hashes; no
  recompilar después de la aprobación. Rama/proyecto explícitos, sin defaults implícitos de Wrangler.
- Exclusión de despliegues concurrentes a producción, sin cancelar un deploy iniciado; comprobar
  deployment vigente contra el baseline aprobado justo antes de publicar. Esto no bloquea a un
  operador manual en Cloudflare: coordinar una ventana sin uploads fuera del flujo.
- Una aprobación de producción valida una versión concreta con su preview; no es una autorización
  perpetua. Karina revisa contenido/hero; Luis revisa controles técnicos. GitHub debe hacer cumplir
  los gates, sin aprobación automática del asistente.
- Token de cuenta con Cloudflare Pages Edit, sin DNS/pagos, en config Doppler específica por
  servicio/ambiente. Réplica de consumo en secreto de ambiente Actions: instalación/rotación
  administradas sin pegar valores al chat. Tokens separados no implican aislamiento por proyecto;
  ese permiso alcanza Pages de la cuenta y requiere protección del workflow y los colaboradores.
- No se necesita una API key de IA ni SSH al VPS para este flujo. El panel real y la demo VPS
  conservan sus pipelines separados. La preview Pages del oficial no reemplaza la demo de diseño.

**Acceso observado:** sesión de Cloudflare recuperada en Brave sin pedir contraseñas. No hay
secretos de repositorio Actions ni ambientes; no se inspeccionaron secretos heredados de la org.
Las configs Doppler relacionadas consultadas por nombres no contienen la credencial Pages de CI.
No se creó/rotó ningún token ni se cambió configuración remota durante este mapeo.

**Puerta inmediata:** fuente actual de Karina → reconciliación y QA → instalación de controles/
credencial autorizada → primer preview → aprobación de release → smoke/rollback. Los pasos
siguientes son el orden general; el PR previo no omite esta reconciliación.

**Aclaración del mismo 7-oct:** Luis confirma que acaba de subir cambios; Karina incorporó una
adaptación del selector y de «No hay tiempo para llorar». Añadir su revisión al paso 1, no tratar
el candidato anterior como versión vigente ni reemplazar automáticamente esos componentes.
Comprobar dónde quedó la fuente actual (Git/rama/artefacto) antes de solicitarla otra vez.
QA de ese paso completada en «Paso 1 revisado» arriba; quedan correcciones y su posterior
verificación, no una certificación del sitio completo. El hero sigue reservado a Karina.

1. Revisar/compartir este paquete de trabajo en PR, sin deploy. Confirmar herramienta de Karina.
2. Reparar portabilidad, empaquetado público y discrepancias bloqueantes con tests separados.
3. Añadir CI sin credenciales y demostrar éxito/fallo real de PR; instalar checks obligatorios.
4. Configurar ambientes y token limitado, verificar API en lectura, publicar preview autorizada.
5. Ensayar aprobación/release/rollback; habilitar CD controlado. No activar producción antes.

### Fuentes primarias consultadas

- [Codex: instrucciones AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
- [Cloudflare: Direct Upload con CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).
- [GitHub: seguridad de Actions](https://docs.github.com/en/actions/reference/security/secure-use).
- [GitHub: ambientes de despliegue](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
