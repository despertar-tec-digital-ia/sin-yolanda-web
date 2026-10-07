# Forma de trabajar y publicar

**Última actualización:** 2026-10-07 · **Responsables:** Luis, técnica; Karina, negocio/contenido y hero.
**Estado:** implementación de CI y separación pública en rama de trabajo. CD, protecciones y secretos
no se consideran activos por este documento; registrar ejecución remota antes de declarar CI verificado.

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

Agregar una fila solo si cambia el contrato. Cambios de implementación → PR/commit; cambios de
ruta → ROUTES; no duplicar reseñas largas de sesión. Un release registra commit, sourceRef/hash,
artefacto, pruebas, aprobación y rollback. Archivar evidencia de QA sin datos privados ni secretos.

## 7. Activación por pasos

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
