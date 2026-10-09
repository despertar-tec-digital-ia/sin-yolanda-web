# QR del menú Guadalajara

Contenido fijo de ambos archivos: `https://sin-yolanda.com/q/gdl-menu`.

- `guadalajara-menu.svg`: vector para impresión.
- `guadalajara-menu.png`:1248×1248px, blanco/negro, escala entera sin suavizado, corrección M
  y margen blanco de al menos cuatro módulos. No insertar un logo ni recortar el margen.
- Fuente: `scripts/generate-menu-qr.swift` (helper macOS opcional). Regenerar únicamente en una
  carpeta nueva. No es una dependencia del sitio ni de CI.

PNG y SVG rasterizado se decodificaron con Vision al enlace exacto. Comparación de módulos:
misma orientación y contenido, sin reflexión. Esta validación no sustituye escanear una prueba
física al tamaño/material de impresión antes de repartirla en mesas.
Comprobar que la ruta esté publicada antes de imprimir; estado y recibo en `docs/WORKFLOW.md`.

El destino actual es la carta original WordPress. Un cambio de destino requiere aprobación
operativa/release; no modificar la imagen cuando solo cambie el destino. Contrato dueño:
`docs/ROUTES.md`. Estos archivos son entregables de impresión, no assets del sitio público.
Las etiquetas de origen están preparadas; no se ha activado ni acreditado analítica del QR.
