// Explicit candidate transformation. The normal build does not import this module.
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';

const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const attribute = (attributes, name) => attributes.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
const hasType = (node, type) => node?.['@type'] === type || (Array.isArray(node?.['@type']) && node['@type'].includes(type));
const nodes = document => document['@graph'] ?? [document];
const scriptJson = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function schemaDocuments(html, file) {
  return [...html.matchAll(scriptPattern)].flatMap(([, attributes, source]) => {
    if (attribute(attributes, 'type') !== 'application/ld+json') return [];
    try {
      const document = JSON.parse(source);
      assert.ok(document && typeof document === 'object' && !Array.isArray(document));
      assert.ok(!document['@graph'] || Array.isArray(document['@graph']));
      return [document];
    } catch {
      throw new Error(`Invalid JSON-LD in ${file}`);
    }
  });
}

function canonical(html, file) {
  const links = [...html.matchAll(/<link\b([^>]*)>/gi)]
    .filter(([, attributes]) => attribute(attributes, 'rel') === 'canonical');
  assert.ok(links.length <= 1, `Multiple canonical links in ${file}`);
  return links.length ? attribute(links[0][1], 'href') : null;
}

function replaceSchemaNodes(html, file, transform) {
  return html.replace(scriptPattern, (tag, attributes, source) => {
    if (attribute(attributes, 'type') !== 'application/ld+json') return tag;
    const document = JSON.parse(source), before = JSON.stringify(document);
    for (const node of nodes(document)) transform(node);
    return JSON.stringify(document) === before ? tag : `<script${attributes}>${scriptJson(document)}</script>`;
  });
}

// Keep active JSON-LD, but discard comments and nested template contents before
// inspecting the document. Raw script/style contents cannot create HTML nodes.
function activeDocument(html) {
  const tokens = /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<\/?template\b[^>]*>/gi;
  let depth = 0, cursor = 0, active = '';
  for (const match of html.matchAll(tokens)) {
    if (!depth) active += html.slice(cursor, match.index);
    const token = match[0];
    if (/^<template\b/i.test(token)) depth++;
    else if (/^<\/template\b/i.test(token)) depth = Math.max(0, depth - 1);
    else if (!depth && !token.startsWith('<!--')) active += token;
    cursor = match.index + token.length;
  }
  if (!depth) active += html.slice(cursor);
  return active;
}

function decodedText(value) {
  const named = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '};
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, name) => {
    if (!name.startsWith('#')) return named[name.toLowerCase()];
    const code = /^#x/i.test(name) ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
}

const languageTag = value => typeof value === 'string' && /^[a-z]{2,8}(?:-[a-z\d]{1,8})*$/i.test(value);
const plainText = value => decodedText(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const normalizedRoute = path => path.replace(/\/index(?:\.html)?\/?$/, '/').replace(/\.html$/, '').replace(/\/+$/, '') || '/';

function pageMetadata(document) {
  const markup = document.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
  const head = markup.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1] ?? '';
  const descriptions = [...head.matchAll(/<meta\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/gi)]
    .filter(([, attributes]) => attribute(attributes, 'name')?.toLowerCase() === 'description')
    .map(([, attributes]) => decodedText(attribute(attributes, 'content') ?? '').trim());
  const alternateLinks = [...head.matchAll(/<link\b([^>]*)>/gi)]
    .filter(([, attributes]) => attribute(attributes, 'rel')?.toLowerCase().split(/\s+/).includes('alternate')
      && attribute(attributes, 'hreflang') !== undefined)
    .map(([, attributes]) => ({lang: attribute(attributes, 'hreflang').toLowerCase(), url: decodedText(attribute(attributes, 'href') ?? '')}));
  return {
    titles: [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)].map(([, text]) => plainText(text)),
    descriptions,
    headings: [...markup.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/gi)].map(([, text]) => plainText(text)),
    lang: attribute(markup.match(/<html\b([^>]*)>/i)?.[1] ?? '', 'lang')?.toLowerCase(),
    branch: attribute(markup.match(/<body\b([^>]*)>/i)?.[1] ?? '', 'data-branch'),
    alternateLinks,
  };
}

/**
 * Read final, already projected HTML and auxiliary assets from an isolated package.
 * Return changed files only. Neither the inputs nor the filesystem are mutated.
 */
export function projectQualitySeo({pages, read} = {}) {
  assert.ok(pages instanceof Map && pages.size, 'Provide the final HTML page map');
  assert.equal(typeof read, 'function', 'Provide a reader for final package files');
  const files = new Map(), changes = [];
  const current = file => files.get(file) ?? pages.get(file) ?? read(file);
  const save = (file, value, kind) => {
    if (value === current(file)) return;
    files.set(file, value);
    changes.push({file, kind});
  };
  const inventory = new Map(), byCanonical = new Map();
  for (const [file, html] of pages) {
    assert.ok(file.endsWith('.html') && typeof html === 'string', 'The page map must contain HTML files only');
    const url = canonical(html, file), documents = schemaDocuments(html, file);
    const item = {file, html, url, nodes: documents.flatMap(nodes)};
    inventory.set(file, item);
    if (!url) continue; // The intentional 404 has no canonical.
    assert.ok(!byCanonical.has(url), `Duplicate published canonical: ${url}`);
    byCanonical.set(url, item);
  }
  const home = inventory.get('index.html');
  assert.ok(home?.url, 'The published home must identify the site origin');
  const origin = new URL(home.url).origin;
  assert.equal(home.url, origin + '/', 'The home canonical must be the HTTPS site root');
  assert.equal(new URL(origin).protocol, 'https:');
  for (const url of byCanonical.keys()) {
    const parsed = new URL(url);
    assert.ok(parsed.origin === origin && !parsed.search && !parsed.hash && !parsed.username && !parsed.password,
      'Published canonicals must belong to the same public origin');
  }

  const organizations = home.nodes.filter(node => hasType(node, 'Organization'));
  assert.equal(organizations.length, 1, 'The home must provide one approved Organization');
  const approvedLogo = organizations[0].logo;
  assert.equal(typeof approvedLogo, 'string', 'The home must provide an explicit approved logo URL');
  const assetExists = value => {
    if (typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      if (url.origin !== origin || url.search || url.hash) return false;
      const path = decodeURIComponent(url.pathname.slice(1));
      if (!path || path.split('/').some(part => !part || part === '.' || part === '..')) return false;
      const contents = current(path);
      return contents !== undefined && contents !== null && contents.length > 0;
    } catch { return false; }
  };
  assert.ok(assetExists(approvedLogo), 'The approved Organization logo is missing from the final package');

  // Only full entities on their published profiles count. References nested in a
  // directory or a coming-soon Organization never create an operating location.
  const restaurants = new Map();
  const factualFields = ['name', 'address', 'telephone', 'geo', 'openingHoursSpecification',
    'specialOpeningHoursSpecification', 'acceptsReservations', 'parentOrganization'];
  for (const page of inventory.values()) for (const restaurant of page.nodes.filter(node => hasType(node, 'Restaurant'))) {
    assert.ok(byCanonical.has(restaurant.url), 'Restaurant URL is not a published canonical');
    assert.equal(restaurant.url, page.url, 'A Restaurant must belong to its own published profile');
    assert.equal(typeof restaurant['@id'], 'string', 'A Restaurant must have a stable public identity');
    const identity = new URL(restaurant['@id']);
    assert.ok(identity.origin === origin && identity.hash, 'Restaurant identity must use the public origin and a fragment');
    const primaryUrl = restaurant['@id'].split('#')[0];
    assert.ok(byCanonical.has(primaryUrl), 'Restaurant identity must resolve to a published profile');
    const previous = restaurants.get(restaurant['@id']);
    if (previous) for (const field of factualFields) {
      assert.ok(isDeepStrictEqual(previous[field], restaurant[field]), `Restaurant editions disagree on ${field}`);
    }
    if (!previous || restaurant.url === primaryUrl) restaurants.set(restaurant['@id'], restaurant);
  }
  assert.ok(restaurants.size, 'No published Restaurant profiles found');
  for (const restaurant of restaurants.values()) {
    assert.equal(restaurant.url, restaurant['@id'].split('#')[0], 'The primary Restaurant edition must be published');
  }
  const entries = [...restaurants.values()].map((restaurant, index) => ({
    '@type': 'ListItem', position: index + 1,
    item: {'@type': 'Restaurant', '@id': restaurant['@id'], name: restaurant.name, url: restaurant.url},
  }));
  let directories = 0;
  for (const page of inventory.values()) {
    const directory = page.nodes.some(node => hasType(node, 'CollectionPage'));
    let directoryChanged = false, logoChanged = false;
    const html = replaceSchemaNodes(page.html, page.file, node => {
      if (directory && hasType(node, 'ItemList') && node.itemListElement?.some(item =>
        hasType(item, 'Restaurant') || hasType(item.item, 'Restaurant'))) {
        directories++;
        if (!isDeepStrictEqual(node.itemListElement, entries)) {
          node.itemListElement = entries;
          directoryChanged = true;
        }
      }
      if (hasType(node, 'Organization') && node.logo && typeof node.logo === 'string'
          && new URL(node.logo, origin).origin === origin && !assetExists(node.logo)) {
        node.logo = approvedLogo;
        logoChanged = true;
      }
    });
    if (directoryChanged) save(page.file, html, 'canonical-location-directory');
    if (logoChanged) save(page.file, html, 'published-organization-logo');
  }
  assert.equal(directories, 1, 'Expected one published location directory');

  const discovery = JSON.parse(current('discovery.json'));
  assert.ok(discovery.version === 1 && discovery.url === home.url && discovery.catering,
    'Use the existing public discovery contract');
  const catering = discovery.catering;
  assert.ok(byCanonical.has(catering.url), 'Catering must reference a published canonical');
  const services = [...inventory.values()].flatMap(page => page.nodes)
    .filter(node => hasType(node, 'Service') && node.url === catering.url);
  assert.ok(services.length, 'The published Catering Service must define its scope');
  const service = services[0];
  for (const edition of services) {
    for (const field of ['@id', 'name', 'url', 'areaServed', 'provider', 'sameAs']) {
      assert.ok(isDeepStrictEqual(service[field], edition[field]), `Catering editions disagree on ${field}`);
    }
  }
  const previousArea = typeof catering.areaServed === 'string' ? catering.areaServed : catering.areaServed?.name;
  if (service.areaServed === undefined) {
    if (Object.hasOwn(catering, 'areaServed')) {
      delete catering.areaServed;
      save('discovery.json', JSON.stringify(discovery, null, 2) + '\n', 'projected-catering-scope');
    }
    // Remove only the obsolete geographic qualifier. Availability, menus,
    // providers, contact destinations and the read-only tool remain unchanged.
    const llms = current('llms.txt');
    const scopedLink = new RegExp(`^(\\s*- \\[)[^\\]\\n]*(\\]\\(${escapePattern(catering.url)}\\))$`, 'm');
    assert.ok(scopedLink.test(llms), 'The Catering source must remain linked in llms.txt');
    save('llms.txt', llms.replace(scopedLink, '$1Catering$2'), 'projected-catering-scope');
    const webmcp = current('assets/js/webmcp.js');
    const description = /(name:\s*['"]get_sin_yolanda_catering['"],\s*description:\s*')([^']*)(')/;
    assert.ok(description.test(webmcp), 'The existing read-only Catering tool must remain present');
    const updated = webmcp.replace(description, (tag, prefix, copy, suffix) => {
      if (previousArea) copy = copy.replace(new RegExp(`\\b${escapePattern(previousArea)}\\s+(?=catering\\b)`, 'i'), '');
      assert.ok(copy.startsWith('Read the published catering menus,'), 'Review changed Catering tool copy before projecting it');
      return prefix + copy + suffix;
    });
    save('assets/js/webmcp.js', updated, 'projected-catering-scope');
  } else {
    // An explicitly scoped Service is already authoritative. Do not infer a new
    // region or silently change the shape of the version-1 discovery contract.
    const publishedArea = typeof service.areaServed === 'string' ? service.areaServed : service.areaServed?.name;
    assert.ok(publishedArea && previousArea === publishedArea, 'Review a changed explicit Catering area before projecting it');
  }
  return {files, changes, metadata: {version: 1, restaurantCount: restaurants.size,
    restaurantIds: [...restaurants.keys()], approvedLogo, cateringUrl: catering.url,
    cateringAreaServed: service.areaServed ?? null, changedFiles: files.size}};
}

/** Inspect the final artifact by invariants, including URLs inside JSON-LD. */
export function inspectProjectedSeo({pages, read, publicFiles, reviewFiles = []} = {}) {
  assert.ok(pages instanceof Map && pages.size, 'Provide the final HTML page map');
  assert.equal(typeof read, 'function', 'Provide a reader for final package files');
  assert.ok(Array.isArray(publicFiles) || publicFiles instanceof Set, 'Provide the final public file inventory');
  assert.ok(Array.isArray(reviewFiles) || reviewFiles instanceof Set, 'Review files must be an array or set');
  const allowed = new Set(publicFiles), errors = [], inventory = [], canonicals = new Map();
  const review = new Set(reviewFiles);
  const problem = (code, file, message, details = {}) => errors.push({code, file, message, ...details});
  for (const file of review) if (!allowed.has(file) || !file.endsWith('.html')) {
    problem('review-page-outside-artifact', file, 'Review exclusions must identify HTML files in this artifact');
  }
  for (const file of allowed) if (file.endsWith('.html') && !pages.has(file)) {
    problem('public-page-not-inspected', file, 'The public HTML file is missing from the inspected page map');
  }
  for (const [file, html] of pages) {
    if (!allowed.has(file)) problem('page-outside-artifact', file, 'The inspected page is absent from the public inventory');
    try {
      const document = activeDocument(html), metadata = pageMetadata(document);
      const url = canonical(document.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' '), file);
      const schema = schemaDocuments(document, file).flatMap(nodes);
      inventory.push({file, url, nodes: schema, ...metadata});
      for (const [values, code, label] of [
        [metadata.titles, 'title-missing-or-ambiguous', 'title'],
        [metadata.descriptions, 'description-missing-or-ambiguous', 'meta description'],
        [metadata.headings, 'active-h1-missing-or-ambiguous', 'active H1'],
      ]) {
        if (file === '404.html' && code === 'description-missing-or-ambiguous') continue;
        if (values.length !== 1 || !values[0]) problem(code, file, `The final document must contain one non-empty ${label}`);
      }
      if (!languageTag(metadata.lang)) problem('html-language-invalid', file, 'The final HTML must declare its document language');
      if (url) {
        if (canonicals.has(url)) problem('duplicate-canonical', file, 'Two pages declare the same canonical', {url});
        canonicals.set(url, file);
      } else if (file !== '404.html' && !review.has(file)) problem('canonical-missing', file, 'A public destination lacks its canonical');
    } catch (error) { problem('invalid-seo-document', file, error.message); }
  }
  const home = inventory.find(page => page.file === 'index.html');
  let origin;
  try {
    const url = new URL(home?.url);
    assert.ok(url.protocol === 'https:' && url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password && !url.port);
    origin = url.origin;
  } catch { problem('public-origin-missing', 'index.html', 'The home must identify the HTTPS public origin'); }
  if (!origin) return {passed: false, errors, summary: {pages: pages.size, canonicals: canonicals.size, checkedSchemaReferences: 0}};
  for (const [url, file] of canonicals) {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== origin || parsed.hash || parsed.search || parsed.username || parsed.password || parsed.port) {
        problem('canonical-outside-site', file, 'The canonical must use this public origin without query or fragment', {url});
      }
      const expectedPath = file === 'index.html' ? '/' : '/' + file.replace(/index\.html$/, '').replace(/\.html$/, '');
      if (parsed.pathname !== expectedPath) problem('canonical-route-mismatch', file, 'The canonical must identify the route served by this artifact file', {url});
    } catch { problem('canonical-invalid', file, 'The canonical is not a valid URL', {url}); }
  }
  // Preview headers intentionally prevent indexing. This is a contract check of
  // the release's intended canonical inventory, never proof of Google indexing.
  const sitemap = inspectSitemap({read, inventory, review, origin, problem});
  const alternateLinks = inspectAlternateLinks({inventory, review, origin, problem});
  const measurement = inspectMeasurement({read, allowed, inventory, review, problem});

  let checkedSchemaReferences = 0;
  const linkFields = new Set(['@id', 'logo', 'image', 'url', 'hasMenu', 'menu', 'item', 'contentUrl', 'thumbnailUrl']);
  function inspectLinks(value, page, path = '', field) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => inspectLinks(item, page, `${path}[${index}]`, field));
    } else if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) inspectLinks(item, page, path ? path + '.' + key : key, key);
    } else if (typeof value === 'string' && linkFields.has(field) && /^(?:https?:\/\/|\/|#)/i.test(value)) {
      try {
        const url = new URL(value, page.url || origin);
        if (url.origin !== origin) return; // External providers require their own verification.
        checkedSchemaReferences++;
        const reference = url.origin + url.pathname;
        const file = decodeURIComponent(url.pathname.slice(1));
        if (!canonicals.has(reference) && !allowed.has(file)) {
          problem('schema-reference-outside-artifact', page.file,
            'The local structured-data reference is absent from the artifact inventory; it may be a retired alias', {path, url: value});
        }
      } catch { problem('schema-reference-invalid', page.file, 'The structured-data reference is not a valid public URL', {path, url: value}); }
    }
  }
  for (const page of inventory) page.nodes.forEach((node, index) => inspectLinks(node, page, `schema[${index}]`));

  const restaurants = new Map();
  for (const page of inventory) for (const restaurant of page.nodes.filter(node => hasType(node, 'Restaurant'))) {
    if (!canonicals.has(restaurant.url) || restaurant.url !== page.url) {
      problem('restaurant-profile-unpublished', page.file, 'The Restaurant must identify its own published profile', {url: restaurant.url});
      continue;
    }
    const identity = restaurant['@id'];
    if (typeof identity !== 'string' || !identity.includes('#') || !canonicals.has(identity.split('#')[0])) {
      problem('restaurant-identity-invalid', page.file, 'The Restaurant identity must resolve to a published primary profile');
      continue;
    }
    if (!restaurants.has(identity) || restaurant.url === identity.split('#')[0]) restaurants.set(identity, restaurant);
  }
  let directories = 0;
  for (const page of inventory.filter(page => page.nodes.some(node => hasType(node, 'CollectionPage')))) {
    for (const list of page.nodes.filter(node => hasType(node, 'ItemList'))) {
      if (!list.itemListElement?.some(item => hasType(item, 'Restaurant') || hasType(item.item, 'Restaurant'))) continue;
      directories++;
      const actual = list.itemListElement.map(item => item.item ?? item);
      const expected = [...restaurants.values()];
      const actualUrls = actual.map(item => item.url).sort(), expectedUrls = expected.map(item => item.url).sort();
      if (!isDeepStrictEqual(actualUrls, expectedUrls)) {
        problem('directory-restaurant-mismatch', page.file,
          'The directory must contain exactly the canonical URLs of the published Restaurant profiles');
      }
      for (const item of actual) {
        const own = expected.find(restaurant => restaurant.url === item.url);
        if (!own || own['@id'] !== item['@id'] || own.name !== item.name) {
          problem('directory-identity-mismatch', page.file, 'Directory entries must reference the authoritative Restaurant identity', {url: item.url});
        }
      }
    }
  }
  if (directories !== 1) problem('location-directory-missing-or-ambiguous', home.file, 'Expected one published location directory');
  try {
    const discovery = JSON.parse(read('discovery.json'));
    const services = inventory.flatMap(page => page.nodes).filter(node => hasType(node, 'Service') && node.url === discovery.catering?.url);
    if (!services.length) problem('catering-service-missing', 'discovery.json', 'Discovery must reference the published Catering Service');
    else {
      const area = services[0].areaServed;
      const areaName = value => typeof value === 'string' ? value : value?.name;
      if (!isDeepStrictEqual(areaName(area), areaName(discovery.catering.areaServed))) {
        problem('catering-scope-mismatch', 'discovery.json', 'Discovery must use the same confirmed scope as the final Catering Service');
      }
      if (services.some(service => !isDeepStrictEqual(service.areaServed, area))) {
        problem('catering-language-scope-mismatch', 'discovery.json', 'Translated Catering Services disagree on geographic scope');
      }
      if (area === undefined) {
        const llms = read('llms.txt');
        const link = llms.match(new RegExp(`^- \\[([^\\]]+)\\]\\(${escapePattern(discovery.catering.url)}\\)$`, 'm'));
        if (!link || link[1] !== 'Catering') problem('catering-auxiliary-scope-mismatch', 'llms.txt', 'The Catering source must not retain an unconfirmed geographic qualifier');
        if (!/name:\s*['"]get_sin_yolanda_catering['"],\s*description:\s*'Read the published catering menus,/.test(read('assets/js/webmcp.js'))) {
          problem('catering-auxiliary-scope-mismatch', 'assets/js/webmcp.js', 'The read-only Catering tool must not retain an unconfirmed geographic qualifier');
        }
      }
    }
  } catch { problem('catering-discovery-invalid', 'discovery.json', 'The Catering auxiliary contract is missing or invalid'); }
  return {passed: errors.length === 0, errors,
    summary: {pages: pages.size, canonicals: canonicals.size, restaurants: restaurants.size, checkedSchemaReferences,
      sitemap, alternateLinks, measurement}};
}

function inspectSitemap({read, inventory, review, origin, problem}) {
  const expected = new Set(inventory.filter(page => page.url && page.file !== '404.html' && !review.has(page.file)).map(page => page.url));
  const actual = new Set();
  try {
    const xml = read('sitemap.xml');
    assert.equal(typeof xml, 'string');
    assert.ok(!/<!DOCTYPE|<!ENTITY/i.test(xml), 'External declarations are not part of the public sitemap contract');
    assert.match(xml, /<urlset\b[^>]*>[\s\S]*<\/urlset\s*>/i);
    const entries = [...xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url\s*>/gi)];
    const locations = [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc\s*>/gi)];
    assert.equal(entries.length, locations.length, 'Each sitemap URL must provide exactly one loc');
    for (const [, entry] of entries) {
      const values = [...entry.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc\s*>/gi)];
      assert.equal(values.length, 1, 'Each sitemap URL must provide exactly one loc');
      const value = decodedText(values[0][1].trim());
      const url = new URL(value);
      assert.ok(url.origin === origin && !url.search && !url.hash && !url.username && !url.password && !url.port);
      if (actual.has(value)) problem('sitemap-duplicate-url', 'sitemap.xml', 'A canonical must appear only once in the sitemap', {url: value});
      actual.add(value);
      if (!expected.has(value)) problem('sitemap-unexpected-url', 'sitemap.xml', 'The sitemap must exclude aliases, 404, review files and unpublished destinations', {url: value});
    }
  } catch { problem('sitemap-invalid-or-missing', 'sitemap.xml', 'The final artifact must provide its valid canonical URL sitemap'); }
  for (const url of expected) if (!actual.has(url)) problem('sitemap-canonical-missing', 'sitemap.xml', 'The public canonical is absent from the final sitemap', {url});
  return {expectedCanonicals: expected.size, listedCanonicals: actual.size, excludedReviewFiles: review.size};
}

function inspectAlternateLinks({inventory, review, origin, problem}) {
  const published = new Map(inventory.filter(page => page.url && page.file !== '404.html' && !review.has(page.file)).map(page => [page.url, page]));
  let checked = 0;
  for (const page of published.values()) {
    if (!page.alternateLinks.length) continue;
    const languages = new Set();
    if (!page.alternateLinks.some(link => link.url === page.url && link.lang !== 'x-default')) {
      problem('hreflang-self-missing', page.file, 'An alternate-language cluster must include its own edition');
    }
    for (const link of page.alternateLinks) {
      checked++;
      if (languages.has(link.lang)) problem('hreflang-duplicate-language', page.file, 'A language must identify one edition in a cluster', {url: link.url});
      languages.add(link.lang);
      if (link.lang !== 'x-default' && !languageTag(link.lang)) {
        problem('hreflang-language-invalid', page.file, 'The alternate edition must use a valid language tag', {url: link.url});
      }
      let target;
      try {
        const url = new URL(link.url);
        if (url.origin === origin && !url.search && !url.hash && !url.username && !url.password) target = published.get(link.url);
      } catch { /* The structured failure below includes relative/malformed targets. */ }
      if (!target) {
        problem('hreflang-target-unpublished', page.file, 'An alternate edition must resolve to a real public canonical outside review exclusions', {url: link.url});
        continue;
      }
      if (link.lang !== 'x-default' && link.lang.split('-')[0] !== target.lang?.split('-')[0]) {
        problem('hreflang-language-mismatch', page.file, 'The alternate language must agree with the destination HTML language', {url: link.url});
      }
      if (!target.alternateLinks.some(back => back.url === page.url && back.lang !== 'x-default'
          && back.lang.split('-')[0] === page.lang?.split('-')[0])) {
        problem('hreflang-return-link-missing', page.file, 'The alternate edition must link back to this language edition', {url: link.url});
      }
    }
  }
  return {checked};
}

function inspectMeasurement({read, allowed, inventory, review, problem}) {
  const file = 'assets/js/site-measurement.js';
  if (!allowed.has(file)) return {status: 'not-present', checkedRoutes: 0};
  const start = '/* BEGIN GENERATED MEASUREMENT CONTRACT */', end = '/* END GENERATED MEASUREMENT CONTRACT */';
  let source;
  try { source = read(file); assert.equal(typeof source, 'string'); }
  catch {
    problem('measurement-contract-unavailable', file, 'The public measurement source cannot be read from the final artifact');
    return {status: 'unavailable', checkedRoutes: 0};
  }
  if (!source.includes(start) && !source.includes(end)) return {status: 'not-extractable', checkedRoutes: 0};
  let contract;
  try {
    assert.equal(source.split(start).length, 2); assert.equal(source.split(end).length, 2);
    const first = source.indexOf(start) + start.length, last = source.indexOf(end);
    assert.ok(last > first);
    contract = JSON.parse(source.slice(first, last).trim());
    assert.ok(contract.version === 2 && contract.routes && typeof contract.routes === 'object' && !Array.isArray(contract.routes));
    assert.ok(Array.isArray(contract.branches) && contract.branches.every(branch => typeof branch === 'string' && branch));
  } catch {
    problem('measurement-contract-invalid', file, 'The embedded public contract must be one valid JSON object; scripts are never evaluated');
    return {status: 'invalid', checkedRoutes: 0};
  }
  let checkedRoutes = 0;
  for (const page of inventory) {
    if (!page.url || page.file === '404.html' || review.has(page.file)) continue;
    let route;
    try { route = normalizedRoute(new URL(page.url).pathname); } catch { continue; }
    checkedRoutes++;
    if (!Object.hasOwn(contract.routes, route)) {
      problem('measurement-route-unmapped', page.file, 'The canonical route is missing from the compiled public measurement contract', {url: page.url});
      continue;
    }
    const identity = contract.routes[route];
    if (typeof identity !== 'string' || !contract.branches.includes(identity)) {
      problem('measurement-identity-unknown', page.file, 'The compiled route must identify a registered measurement branch', {url: page.url});
    }
    if (page.branch && page.branch !== identity) {
      problem('measurement-identity-mismatch', page.file, 'The compiled route must retain the explicit branch identity of the final document', {url: page.url});
    }
    if (page.branch && !contract.branches.includes(page.branch)) {
      problem('measurement-page-identity-unknown', page.file, 'The document branch must be registered in the compiled contract', {url: page.url});
    }
  }
  return {status: 'checked', checkedRoutes};
}
