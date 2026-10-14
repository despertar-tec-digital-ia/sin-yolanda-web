import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { hours as usaHours } from './usa-hours.mjs';
import { restoreAgendaSource } from './agenda-source-contract.mjs';

export const origin = 'https://sin-yolanda.com';
const root = resolve(import.meta.dirname, '..');
export const read = file => readFileSync(resolve(root, file), 'utf8');
const write = (file, value) => writeFileSync(resolve(root, file), value);
export const decode = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
export const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
export const canonical = html => html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
export const schemas = html => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(([, value]) => JSON.parse(value));
export const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');

// Render the same public templates, without running their browser event handlers.
// This gives crawlers and visitors without JavaScript the approved HTML itself.
export function renderShell(html, now = new Date(), sourceRoot = root) {
  if (!html.includes('id="site-shell"')) return null;
  const dataset = { page: html.match(/data-page="([^"]+)"/)?.[1], branch: html.match(/data-branch="([^"]+)"/)?.[1] };
  const shell = { innerHTML: '' };
  class RenderDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  const context = { window: {}, document: { body: { dataset }, getElementById: id => id === 'site-shell' ? shell : null }, Date: RenderDate, Intl, URL };
  vm.runInNewContext(readFileSync(resolve(sourceRoot,'assets/js/public-data.js'),'utf8'), context, { timeout: 1000 });
  const source = readFileSync(resolve(sourceRoot,'assets/js/site.js'),'utf8');
  const stop = source.lastIndexOf('\n  bindCommon();');
  assert.ok(stop > source.lastIndexOf('root.innerHTML ='), 'Public render boundary changed; review before prerendering');
  vm.runInNewContext(source.slice(0, stop) + '\n})();', context, { timeout: 1000 });
  assert.ok(shell.innerHTML.includes('<main'), 'Public template must have a main landmark');
  const publicHref = href => href.replace(/^\/?index\.html(?=[?#]|$)/, '/').replace(/\.html(?=[?#]|$)/, '').replace(/\/index\.html(?=[?#]|$)/, '/');
  return shell.innerHTML.replace(/^[\t ]+$/gm, '').replace(/href="([^"]+)"/g, (tag, href) => /^[a-z]+:|^\/\/|^#/.test(href) ? tag : `href="${publicHref(href)}"`);
}

export function restoreSeoBaseline(file, html) {
  html = restoreAgendaSource(file,html);
  html = html.replaceAll('\r\n', '\n');
  const baseline = JSON.parse(read('scripts/seo-baseline.json'))[file];
  if (!baseline) return html;
  if (baseline.source !== undefined) return baseline.source;
  html = html.replace(/<head>[\s\S]*?<\/head>/i, baseline.head);
  if (baseline.shell !== undefined) html = html.replace(/<div id="site-shell" data-seo-prerendered="true">[\s\S]*?<\/div><!-- seo-shell-end -->/, baseline.shell);
  return html;
}

export function applySeo() {
  const manifest = JSON.parse(read('scripts/public-manifest.json'));
  const policy = JSON.parse(read('scripts/seo-indexation-policy.json'));
  const baseline = {};
  if (existsSync(resolve(root, 'scripts/seo-baseline.json'))) {
    const previous = JSON.parse(read('scripts/seo-baseline.json'));
    for (const file of ['robots.txt', 'sitemap.xml', 'san-ignacio.html']) if (previous[file]) baseline[file] = previous[file];
  }
  const pages = manifest.pages.filter(file => file !== '404.html');
  const urls = pages.map(file => canonical(read(file)));
  assert.ok(urls.every(url => url?.startsWith(origin + '/')));
  const locations = [];
  const hasBaseline = existsSync(resolve(root, 'scripts/seo-baseline.json'));
  const pairs = [
    ['houston.html', 'en/houston/index.html'], ['san-antonio.html', 'en/san-antonio/index.html'],
    ['the-woodlands.html', 'en/the-woodlands/index.html'], ['el-paso.html', 'en/el-paso/index.html'],
    ['catering.html', 'en/catering/index.html'], ['san-antonio/menu/index.html', 'en/san-antonio/menu/index.html'],
  ];
  for (const file of pages) {
    let html = hasBaseline ? restoreSeoBaseline(file, read(file)) : read(file);
    baseline[file] = { head: html.match(/<head>[\s\S]*?<\/head>/i)[0] };
    const url = canonical(html);
    const lang = html.match(/<html lang="([^"]+)"/)?.[1] ?? 'es';
    let title = decode(html.match(/<title>([^<]+)<\/title>/)[1]);
    let description = decode(html.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? '');
    if (file === 'catering.html') { title = 'Catering mexicano en Houston | Sin Yolanda'; description = 'Explora los menús de Sin Yolanda Catering para tu celebración en Houston: buffet mexicano, parrillada en vivo, carne asada y mar & fuego.'; }
    if (file === 'en/catering/index.html') { title = 'Mexican Catering in Houston | Sin Yolanda'; description = 'Explore Sin Yolanda Catering menus for your Houston celebration: Mexican buffet, live grill, carne asada, and seafood. Options agreed for each event.'; }
    html = html.replace(/<title>[^<]+<\/title>/, `<title>${escape(title)}</title>`).replace(/<meta name="description" content="[^"]+"\s*\/?>/, `<meta name="description" content="${escape(description)}">`);
    if (policy.pages.includes(file)) html = html.replace(/<meta name="robots" content="[^"]+"\s*\/?>/, '<meta name="robots" content="index,follow,max-image-preview:large">');
    const shell = renderShell(html);
    if (shell) {
      baseline[file].shell = '<div id="site-shell"></div>';
      assert.ok(html.includes(baseline[file].shell));
      html = html.replace(baseline[file].shell, `<div id="site-shell" data-seo-prerendered="true">${shell}</div><!-- seo-shell-end -->`);
    }
    // Replace duplicate/stale social tags while keeping every image and visible section.
    html = html.replace(/<meta (?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/g, '');
    const oldSchemas = schemas(html);
    const restaurant = oldSchemas.find(item => item['@type'] === 'Restaurant');
    const image = (Array.isArray(restaurant?.image) ? restaurant.image[0] : restaurant?.image) ?? (file.includes('catering') ? origin + '/images/catering-review/table-scene-desktop-1280.webp' : origin + '/assets/media/hero-night.webp');
    const page = { '@type': file === 'locations.html' ? 'CollectionPage' : 'WebPage', '@id': url + '#webpage', url, name: title, description, inLanguage: lang, isPartOf: { '@id': origin + '/#website' } };
    const graph = [page];
    if (file === 'index.html') graph.push({ '@type': 'WebSite', '@id': origin + '/#website', url: origin + '/', name: 'Sin Yolanda', alternateName: 'Sin Yolanda Cantina', inLanguage: ['es', 'en'], publisher: { '@id': origin + '/#organization' } }, { '@type': 'Organization', '@id': origin + '/#organization', name: 'Sin Yolanda', url: origin + '/', logo: origin + '/assets/media/brand-logo-gdl.png' });
    else {
      graph.push({ '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Sin Yolanda', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: title.split('|')[0].trim(), item: url }] });
      page.breadcrumb = { '@id': url + '#breadcrumb' };
    }
    if (restaurant) {
      page.mainEntity = { '@id': restaurant['@id'] };
      if (!file.startsWith('en/')) {
        const id = file === 'guadalajara.html' ? 'san-ignacio' : file.replace('.html', '');
        locations.push({ id, name: restaurant.name, url, address: restaurant.address, telephone: restaurant.telephone, menu: restaurant.hasMenu, reservation: restaurant.acceptsReservations, languages: pairs.find(pair => pair[0] === file)?.map(name => canonical(read(name))) ?? [url],
          ...(usaHours.zones[id] ? { openingHoursSpecification: restaurant.openingHoursSpecification, timeZone: usaHours.zones[id] } : {}) });
      }
    }
    const menu = oldSchemas.find(item => item['@type'] === 'Menu');
    if (menu) page.mainEntity = { '@type': 'Menu', name: menu.name, url, inLanguage: lang };
    html = html.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g, (tag, content) =>
      ['WebPage', 'CollectionPage', 'AboutPage'].includes(JSON.parse(content)['@type']) ? '' : tag);
    if (file.includes('catering')) {
      page.mainEntity = { '@id': origin + '/catering#service' };
      graph.push({ '@type': 'Service', '@id': origin + '/catering#service', name: 'Sin Yolanda Catering', serviceType: lang === 'en' ? 'Mexican catering' : 'Catering mexicano', url: origin + '/catering', description, areaServed: { '@type': 'City', name: 'Houston' }, provider: { '@id': origin + '/#organization' }, sameAs: 'https://www.instagram.com/sinyolandacatering/' });
    }
    const pair = pairs.find(items => items.includes(file));
    if (pair) {
      html = html.replace(/<link rel="alternate" hreflang="[^"]+"[^>]*>/g, '');
      html = html.replace('</head>', pair.map((name, i) => `<link rel="alternate" hreflang="${i ? 'en' : 'es'}" href="${canonical(read(name))}">`).join('') + `<link rel="alternate" hreflang="x-default" href="${canonical(read(pair[0]))}"></head>`);
    }
    if (file === 'index.html') html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '');
    const additions = `<meta property="og:type" content="website"><meta property="og:site_name" content="Sin Yolanda"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${escape(typeof image === 'string' ? image : origin + '/assets/media/hero-night.webp')}"><meta name="twitter:card" content="summary_large_image"><link rel="alternate" type="application/json" href="/discovery.json" title="Sin Yolanda public information"><script id="seo-page" type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': graph })}</script><script defer src="/assets/js/webmcp.js?v=20261012-seo-discovery"></script>`;
    const fallback = shell ? '<noscript><style>.reveal,.reveal-scale{opacity:1;transform:none;animation:none}</style></noscript>' : '';
    html = html.replace('</head>', additions + fallback + '</head>');
    html = html.replace(/<head>[\s\S]*?<\/head>/i, head => head.replace(/^[\t ]+$/gm, ''));
    write(file, html);
  }
  write('scripts/seo-baseline.json', JSON.stringify(baseline, null, 2) + '\n');
  manifest.reviewPages = manifest.reviewPages.filter(file => !policy.pages.includes(file));
  manifest.assets = [...new Set([...manifest.assets, 'assets/js/webmcp.js', 'discovery.json', 'llms.txt'])];
  write('scripts/public-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + pages.map(file => {
    const pair = pairs.find(items => items.includes(file));
    return '  <url><loc>' + canonical(read(file)) + '</loc>' + (pair ? pair.map((name, i) => `<xhtml:link rel="alternate" hreflang="${i ? 'en' : 'es'}" href="${canonical(read(name))}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${canonical(read(pair[0]))}"/>` : '') + '</url>';
  }).join('\n') + '\n</urlset>\n');
  write('robots.txt', 'User-agent: *\nAllow: /\n\n# Retired internal routes are absent from the public artifact (HTTP 404).\nDisallow: /dashboard\nDisallow: /listings\nDisallow: /reputation\nDisallow: /requests\nDisallow: /reports\nDisallow: /review-detail\nDisallow: /app.js\n\nSitemap: ' + origin + '/sitemap.xml\n');
  write('discovery.json', JSON.stringify({ version: 1, name: 'Sin Yolanda', url: origin + '/', sitemap: origin + '/sitemap.xml', locations, catering: { url: origin + '/catering', englishUrl: origin + '/en/catering/', areaServed: 'Houston', menus: ['Buffet mexicano', 'Parrillada en vivo', 'Carne asada', 'Mar & fuego'], contact: 'https://www.instagram.com/sinyolandacatering/', availability: 'Menu and availability must be agreed for each event.' } }, null, 2) + '\n');
  write('llms.txt', '# Sin Yolanda\n\n> Cantina y restaurante mexicano en Guadalajara y Texas. Consultar la ficha propia de cada sede para su dirección, carta y reservas.\n\n## Fuentes públicas\n\n- [Sucursales](' + origin + '/locations): fichas de cada sede.\n- [Datos públicos](' + origin + '/discovery.json): información estructurada publicada.\n- [Sitemap](' + origin + '/sitemap.xml): URLs canónicas indexables.\n' + locations.map(location => `- [${location.name}](${location.url})\n${location.menu ? `- [Carta de ${location.name}](${location.menu})\n` : ''}`).join('') + '\n## Catering\n\n- [Catering en Houston](' + origin + '/catering)\n- [Catering in English](' + origin + '/en/catering/)\n\nLa disponibilidad y el menú de cada evento se acuerdan con el equipo. No inferir precios, horarios, servicios ni cobertura adicionales.\n');
  console.log(JSON.stringify({ indexablePages: pages.length, promotedPages: policy.pages.length, prerendered: Object.values(baseline).filter(item => item.shell).length, locations: locations.length }));
}
if (process.argv[1]?.endsWith('seo.mjs') && process.argv[2] === '--apply') applySeo();
