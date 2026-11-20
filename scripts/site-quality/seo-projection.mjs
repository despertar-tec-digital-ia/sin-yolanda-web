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
export function inspectProjectedSeo({pages, read, publicFiles} = {}) {
  assert.ok(pages instanceof Map && pages.size, 'Provide the final HTML page map');
  assert.equal(typeof read, 'function', 'Provide a reader for final package files');
  assert.ok(Array.isArray(publicFiles) || publicFiles instanceof Set, 'Provide the final public file inventory');
  const allowed = new Set(publicFiles), errors = [], inventory = [], canonicals = new Map();
  const problem = (code, file, message, details = {}) => errors.push({code, file, message, ...details});
  for (const file of allowed) if (file.endsWith('.html') && !pages.has(file)) {
    problem('public-page-not-inspected', file, 'The public HTML file is missing from the inspected page map');
  }
  for (const [file, html] of pages) {
    if (!allowed.has(file)) problem('page-outside-artifact', file, 'The inspected page is absent from the public inventory');
    try {
      const url = canonical(html, file), schema = schemaDocuments(html, file).flatMap(nodes);
      inventory.push({file, url, nodes: schema});
      if (url) {
        if (canonicals.has(url)) problem('duplicate-canonical', file, 'Two pages declare the same canonical', {url});
        canonicals.set(url, file);
      } else if (file !== '404.html') problem('canonical-missing', file, 'A public destination lacks its canonical');
    } catch (error) { problem('invalid-seo-document', file, error.message); }
  }
  const home = inventory.find(page => page.file === 'index.html');
  let origin;
  try {
    const url = new URL(home?.url);
    assert.ok(url.protocol === 'https:' && url.pathname === '/' && !url.search && !url.hash);
    origin = url.origin;
  } catch { problem('public-origin-missing', 'index.html', 'The home must identify the HTTPS public origin'); }
  if (!origin) return {passed: false, errors, summary: {pages: pages.size, canonicals: canonicals.size, checkedSchemaReferences: 0}};
  for (const [url, file] of canonicals) {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== origin || parsed.hash || parsed.search) {
        problem('canonical-outside-site', file, 'The canonical must use this public origin without query or fragment', {url});
      }
    } catch { problem('canonical-invalid', file, 'The canonical is not a valid URL', {url}); }
  }

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
    summary: {pages: pages.size, canonicals: canonicals.size, restaurants: restaurants.size, checkedSchemaReferences}};
}
