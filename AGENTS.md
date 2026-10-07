# Sin Yolanda — instrucciones compartidas

Estas reglas acompañan al repositorio. No requieren acceso a conversaciones anteriores ni a
carpetas privadas de una computadora. Última actualización: 2026-10-07.

## Antes de trabajar

1. Lee `README.md` y `docs/WORKFLOW.md`. Si cambias enlaces/rutas, lee `docs/ROUTES.md`.
2. Comprueba rama, cambios locales y último commit. Conserva cambios ajenos. Resume objetivo,
   alcance y prueba de aceptación; no conviertas una petición de diagnóstico en implementación.
3. Usa una rama por tarea y PR; no escribas directamente en `main`. Cambios concurrentes de
   Karina y Luis se integran por Git, nunca sustituyendo carpetas con ZIPs.
4. Distingue requisito aprobado, propuesta, implementado, probado y publicado. No los equipares.

## Límites vigentes

- La web oficial de Karina es la base. **Hero del home reservado a Karina**: no modificar su video,
  copy, composición ni comportamiento sin un encargo explícito para ese bloque. Si el cambio de
  CSS/JS compartido puede afectarlo, comparar antes/después y pedir revisión a su responsable.
- Incorporar componentes aprobados no autoriza un rediseño completo ni sustituir otras páginas.
- Cada sede tiene datos, menú, moneda, idioma, medios, reservas y ofertas propios. No rellenar
  faltantes con Houston. No inventar promociones, fechas, horarios, reseñas ni beneficios.
- Datos públicos y panel operativo están separados. No agregar datos privados ni credenciales
  a este repo público, al JavaScript servido ni a los reportes de CI. Noindex no es autenticación.
- Conservar IDs históricos; cambios de nombre no implican cambiar URL/GBP o destruir historial.
- No publicar rutas de ensayo, panel demo o formularios que simulen capturar solicitudes.
- Preservar fotografía y detalle editorial aprobados; revisar móvil/tablet/desktop, accesibilidad,
  foco, movimiento reducido, contraste y encuadres al modificar UI.

## Validación y entrega

- Node en `.node-version`; ejecutar `npm ci --ignore-scripts`, `npm run check` y `npm run build`.
  El sitio estático y sus pruebas no requieren el donante. El build exige `.artifacts/public` nuevo;
  no borrar un release previo a ciegas. Para otra salida: `node scripts/package-public.mjs <ruta-nueva>`.
- Solo `scripts/public-manifest.json` determina archivos publicables. Agregar una página/asset exige
  revisión del manifiesto y pruebas. Nunca publicar el checkout ni directorios por extensión.
- No omitir, marcar como aprobada ni debilitar una prueba para ocultar una discrepancia. Explicar
  fallo, fuente, alcance y qué queda sin verificar. Pasar tests no certifica diseño ni datos.
- Por PR: alcance, evidencia, rutas/datos afectados, pruebas, revisión visual si aplica y rollback.
  Utiliza `.github/pull_request_template.md`; conserva comentarios y licencias de terceros.
- Documentar decisiones que cambian el contrato en `docs/WORKFLOW.md`, rutas en `docs/ROUTES.md`;
  commits/PR guardan el historial de ediciones. No crear un nuevo resumen largo por sesión.
- Código y commits en inglés; documentación en español. Respetar identidad Git configurada.

## Publicación y accesos

- Un PR o build correcto **no es autorización de producción**. No desplegar, cambiar DNS,
  permisos, credenciales ni contenido remoto sin la aprobación que corresponda.
- No copiar llaves al chat/Git. No crear PAT global si basta el token del workflow. Secretos
  limitados por entorno y accesibles solo en el job autorizado de publicación.
- Nunca afirmar «CI/CD activo» por existir documentos/YAML: verificar una ejecución remota,
  controles de rama/entorno, resultado servido y rollback. CI de PR comprobado; evidencia en
  `docs/WORKFLOW.md`. CD/credenciales/protecciones pendientes; no hay nuevo despliegue.

## Code Review Rules

Señalar cambios al hero fuera de alcance, cruces de sede, datos inventados, rutas duplicadas sin
canonical/redirect, dependencias de archivos externos no versionados, mocks publicables, pérdida
de autenticación, secretos y workflows privilegiados que ejecuten código de PR no confiable.
