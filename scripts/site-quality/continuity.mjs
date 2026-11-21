import assert from 'node:assert/strict';

export const continuityAssets = Object.freeze(['assets/js/site-quality-controls.js']);
export function projectQualityContinuity({pages}) {
  const files = new Map(), changes = [];
  const client = '<script type="module" src="/assets/js/site-quality-controls.js?v=20261119-continuity"></script>';
  for (const file of ['index.html', 'locations.html', '404.html']) {
    let html = pages.get(file);
    assert.ok(html && !html.includes('data-site-quality-continuity='), 'Expected an unmodified continuity page: ' + file);
    html = html.replace(/<body\b[^>]*>/, tag => tag.replace('>', ' data-site-quality-continuity="review">'));
    if (file === '404.html') {
      const replace = (from, to) => {
        assert.equal(html.split(from).length, 2, 'Expected one fallback label: ' + from);
        html = html.replace(from, to);
      };
      replace('<title>Página no encontrada | SIN YOLANDA®</title>', '<title data-quality-error-title data-i18n-es="Página no encontrada | SIN YOLANDA®" data-i18n-en="Page not found | SIN YOLANDA®">Página no encontrada | SIN YOLANDA®</title>');
      replace('>Esta mesa no existe.</h1>', ' data-i18n-es="Esta mesa no existe." data-i18n-en="This table does not exist.">Esta mesa no existe.</h1>');
      const text = 'La página que buscas no está disponible. Consulta nuestras ubicaciones para encontrar tu sucursal.';
      replace('>' + text + '</p>', ' data-i18n-es="' + text + '" data-i18n-en="The page you are looking for is unavailable. Explore our locations to find your cantina.">' + text + '</p>');
      replace('href="/">Ir al inicio</a>', 'href="/" data-i18n-es="Ir al inicio" data-i18n-en="Go to home">Ir al inicio</a>');
      replace('href="/locations">Ver ubicaciones</a>', 'href="/locations" data-i18n-es="Ver ubicaciones" data-i18n-en="See locations">Ver ubicaciones</a>');
    }
    html = html.replace('</body>', client + '</body>');
    if (file === 'index.html') html = html.replace('</head>', '<link rel="stylesheet" href="/assets/css/site-quality-pilot.css?v=20261119-continuity"></head>');
    files.set(file, html); changes.push({file, kind: 'existing-page-continuity'});
  }
  return {files, changes, metadata: {version: 1, pages: [...files.keys()], assets: [...continuityAssets], heroChanged: false}};
}
