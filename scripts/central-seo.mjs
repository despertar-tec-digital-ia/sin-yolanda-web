// Approved central-site SEO. It deliberately does not change home content, navigation or menus.
export const centralSeoCopy = Object.freeze({
  homeTitle: 'Sin Yolanda | Cantinas en México y Estados Unidos',
  homeDescription: 'Encuentra tu cantina Sin Yolanda en México y Estados Unidos. Consulta las sucursales, sus menús, agenda y opciones para reservar.',
  gdlTitle: 'Sin Yolanda Guadalajara | Cantina y bar en Zapopan',
  gdlDescription: 'Sin Yolanda Guadalajara: cantina y bar en la zona de Chapalita, Zapopan. Comida, cócteles y micrófono abierto en Avenida San Ignacio 78.',
  gdlIntro: 'Sin Yolanda Guadalajara es una cantina y bar en la zona de Chapalita, Zapopan. Comida, cócteles y noches de micrófono abierto en Avenida San Ignacio 78. Consulta la agenda y el menú para armar tu visita.',
});
const organizationId = 'https://sin-yolanda.com/#organization';
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

export function centralBranchReferences(pages) {
  return pages.filter(([file]) => !file.startsWith('en/')).flatMap(([, html]) =>
    [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .map(([, source]) => JSON.parse(source)).filter(node => node['@type'] === 'Restaurant')
      .map(node => ({ '@id': node['@id'], '@type': 'Restaurant', name: node.name, url: node.url })));
}

export function applyCentralSeoHtml(file, html, branches, record = () => {}) {
  // Record exact bounded replacements so historical integrity checks still reject unrelated edits.
  const replace = (pattern, fn) => { html = html.replace(pattern, (...args) => {
    const before = args[0], after = fn(...args);
    if (after !== before) record({ before, after });
    return after;
  }); };
  const content = file === 'index.html' ? [centralSeoCopy.homeTitle, centralSeoCopy.homeDescription]
    : file === 'guadalajara.html' ? [centralSeoCopy.gdlTitle, centralSeoCopy.gdlDescription] : null;
  if (content) {
    const [title, description] = content;
    replace(/<title>[^<]+<\/title>/, () => `<title>${escape(title)}</title>`);
    replace(/(<meta name="description" content=")[^"]+/, (_, prefix) => prefix + escape(description));
    replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]+/g, (_, prefix) => prefix + escape(title));
    replace(/(<meta (?:property="og:description"|name="twitter:description") content=")[^"]+/g, (_, prefix) => prefix + escape(description));
  }
  if (file === 'guadalajara.html') replace(
    /Una cantina para cantar, brindar y compartir la mesa\. Explora el menú de Guadalajara\./,
    () => centralSeoCopy.gdlIntro);
  replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (_, start, source, end) => {
    const data = JSON.parse(source);
    const previous = JSON.stringify(data);
    for (const node of data['@graph'] ?? [data]) {
      if (node['@type'] === 'Restaurant') node.parentOrganization = { '@id': organizationId };
      if (node['@type'] === 'Organization' && node['@id'] === organizationId) {
        node.description = 'Marca de cantinas mexicanas en México y Estados Unidos.';
        node.subOrganization = branches;
      }
      if (content && ['WebPage', 'CollectionPage'].includes(node['@type'])) {
        node.name = content[0]; node.description = content[1];
        if (file === 'index.html') node.mainEntity = { '@id': organizationId };
      }
    }
    const current = JSON.stringify(data);
    return current === previous ? _ : start + current.replaceAll('<', '\\u003c') + end;
  });
  return html;
}
