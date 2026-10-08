// Preserve observed public branch content only. Never publishes or submits forms.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const publicBranchRoutes = Object.freeze({
  'san-ignacio': '/san-ignacio',
  'san-antonio': '/san-antonio',
  'the-woodlands': '/the-woodlands',
  houston: '/houston',
  'el-paso': '/el-paso',
});
const textFields = ['id', 'page', 'name', 'shortName', 'city', 'country', 'region', 'status',
  'statusLabel', 'concept', 'address', 'hours', 'phone', 'phoneIntl', 'whatsapp', 'reserveChannel',
  'parking', 'accessibility', 'summary', 'tagline', 'venueCity', 'venuePosition', 'venuePhotoKind', 'openingDate'];
const urlFields = ['socialUrl', 'menuUrl', 'mapsUrl', 'website', 'reserveUrl', 'gbpUrl', 'image', 'venuePhoto'];
const internalPath = /(?:^|\/)(?:dashboard|admin|panel|api|\.env|\.git)(?:\/|\.|$)/i;
const secretPattern = /AIza[\w-]{35}|(?:gh[pousr]_[\w]{20,}|github_pat_[\w]{20,})|Bearer\s+[\w.+\/-]{12,}|\b(?:password|contraseña|api[_-]?key|access[_-]?token|secret)\s*[:=]\s*[^\s,;]+/gi;
const secretParam = /^(?:key|api[_-]?key|token|access[_-]?token|secret|password|authorization|credential|signature)$/i;
export const sha256 = value => createHash('sha256').update(value).digest('hex');

export function publicText(value, limit = 4000) {
  if (typeof value !== 'string') return null;
  return value.replace(secretPattern, '[redacted]').replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function publicUrl(value, origin) {
  if (typeof value !== 'string' || !value.trim()) return null;
  let url;
  try { url = new URL(value, origin); } catch { return null; }
  if (url.username || url.password || !['https:', 'http:', 'tel:', 'mailto:'].includes(url.protocol)) return null;
  if (internalPath.test(url.pathname)) return null;
  for (const name of [...url.searchParams.keys()]) {
    if (secretParam.test(name)) url.searchParams.delete(name);
  }
  // Fragments can carry OAuth credentials; retain only a simple section identifier.
  if (url.hash && !/^#[a-z0-9_-]+$/i.test(url.hash)) url.hash = '';
  const result = publicText(url.href, 3000);
  return result?.includes('[redacted]') ? null : result;
}

export function normalizePublicBranch(record, origin) {
  assert.ok(record && typeof record === 'object' && !Array.isArray(record), 'Missing public branch record');
  const result = {};
  for (const field of textFields) {
    const text = publicText(record[field]);
    if (text !== null) result[field] = text;
  }
  for (const field of urlFields) {
    const url = publicUrl(record[field], origin);
    if (url) result[field] = url;
  }
  result.gallery = Array.isArray(record.gallery) ? record.gallery.slice(0, 100).map(value => publicUrl(value, origin)).filter(Boolean) : [];
  for (const field of ['rating', 'reviewsTotal']) {
    if (Number.isFinite(record[field]) && record[field] >= 0) result[field] = record[field];
  }
  result.quotes = Array.isArray(record.quotes) ? record.quotes.slice(0, 30).map(quote => ({
    text: publicText(quote?.text), source: publicText(quote?.source),
    stars: Number.isFinite(quote?.stars) && quote.stars >= 0 && quote.stars <= 5 ? quote.stars : null,
  })).filter(quote => quote.text) : [];
  return result;
}

function schemaPublic(schema, origin) {
  if (!schema || typeof schema !== 'object') return [];
  const nodes = Array.isArray(schema) ? schema : schema['@graph'] || [schema];
  return nodes.filter(node => [node?.['@type']].flat().includes('Restaurant')).map(node => {
    const result = { '@type': 'Restaurant' };
    for (const field of ['name', 'description', 'telephone', 'slogan', 'priceRange', 'servesCuisine']) {
      const text = publicText(node[field]);
      if (text !== null) result[field] = text;
    }
    for (const field of ['@id', 'url', 'menu', 'hasMenu']) {
      const url = publicUrl(node[field], origin);
      if (url) result[field] = url;
    }
    for (const field of ['image', 'sameAs']) {
      result[field] = [node[field]].flat().map(value => publicUrl(value, origin)).filter(Boolean);
    }
    if (node.address && typeof node.address === 'object') {
      result.address = {};
      for (const field of ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode', 'addressCountry']) {
        const text = publicText(node.address[field]);
        if (text !== null) result.address[field] = text;
      }
    }
    if (node.geo && typeof node.geo === 'object') {
      result.geo = {};
      for (const field of ['latitude', 'longitude']) if (Number.isFinite(Number(node.geo[field]))) result.geo[field] = Number(node.geo[field]);
    }
    result.openingHoursSpecification = [node.openingHoursSpecification || []].flat().slice(0, 30).map(hours => ({
      dayOfWeek: [hours.dayOfWeek || []].flat().map(value => publicText(value)).filter(Boolean),
      opens: publicText(hours.opens), closes: publicText(hours.closes),
      validFrom: publicText(hours.validFrom), validThrough: publicText(hours.validThrough),
    }));
    return result;
  });
}

export function normalizeRenderedPage(record, origin) {
  return {
    title: publicText(record?.title), language: publicText(record?.language, 40),
    branchIdentity: publicText(record?.branchIdentity, 100),
    description: publicText(record?.description), canonical: publicUrl(record?.canonical, origin),
    text: publicText(record?.text, 100000),
    headings: (record?.headings || []).slice(0, 200).map(item => ({ level: publicText(item.level, 10), text: publicText(item.text) })),
    practicalRows: (record?.practicalRows || []).slice(0, 100).map(item => ({ label: publicText(item.label), text: publicText(item.text) })),
    faqs: (record?.faqs || []).slice(0, 100).map(item => ({ question: publicText(item.question), answer: publicText(item.answer) })),
    links: (record?.links || []).slice(0, 1000).map(item => ({ text: publicText(item.text), url: publicUrl(item.url, origin) })).filter(item => item.url),
    images: (record?.images || []).slice(0, 300).map(item => ({ alt: publicText(item.alt), url: publicUrl(item.url, origin) })).filter(item => item.url),
    schemas: (record?.schemas || []).flatMap(schema => schemaPublic(schema, origin)),
  };
}

export function validateOrigin(value) {
  const origin = new URL(value);
  assert.ok(['http:', 'https:'].includes(origin.protocol) && !origin.username && !origin.password &&
    !origin.search && !origin.hash && origin.pathname === '/', 'Use a public origin without path, credentials, query or fragment');
  return origin;
}

export function parseArguments(args) {
  const options = { sourceOrigin: 'https://sin-yolanda.com/', branches: Object.keys(publicBranchRoutes) };
  const names = new Set(['--source-origin', '--output-dir', '--branches']);
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index], value = args[index + 1];
    assert.ok(names.has(name) && value && !value.startsWith('--'), `Invalid argument: ${name}`);
    if (name === '--source-origin') options.sourceOrigin = value;
    else if (name === '--output-dir') options.outputDir = value;
    else options.branches = value.split(',');
  }
  validateOrigin(options.sourceOrigin);
  assert.ok(options.outputDir, 'Provide --output-dir with a new directory');
  assert.ok(options.branches.length && new Set(options.branches).size === options.branches.length &&
    options.branches.every(id => Object.hasOwn(publicBranchRoutes, id)), 'Use unique explicit public branch IDs; retired/unknown routes are not allowed');
  return options;
}

export function createSnapshotDirectory(outputDir) {
  const output = resolve(outputDir);
  assert.ok(!existsSync(output), 'Refusing to overwrite an existing snapshot directory');
  for (let path = dirname(output); path !== dirname(path); path = dirname(path)) {
    if (existsSync(path)) assert.ok(!lstatSync(path).isSymbolicLink(), 'Snapshot parent must not be a symlink');
  }
  mkdirSync(output, { recursive: true });
  return output;
}

export function writeSnapshotFile(outputDir, filename, value) {
  assert.ok(/^[a-z0-9-]+\.json$/.test(filename), 'Unsafe snapshot filename');
  writeFileSync(resolve(outputDir, filename), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}

export async function capturePublicBranches({ sourceOrigin, outputDir, branches, chromium, fetchImpl = fetch }) {
  const origin = validateOrigin(sourceOrigin);
  assert.ok(branches?.length && new Set(branches).size === branches.length && branches.every(id => Object.hasOwn(publicBranchRoutes, id)), 'Invalid public branch IDs');
  const output = createSnapshotDirectory(outputDir);
  const capturedAt = new Date().toISOString();
  const report = { version: 1, capturedAt, origin: origin.origin,
    scope: 'Observed public branch content; not business verification or a complete site backup.',
    rawSourcesStored: false, complete: false, branches: [], sources: [], errors: [] };
  async function getSource(path) {
    const url = new URL(path, origin);
    assert.equal(url.origin, origin.origin, 'Source must remain on the selected origin');
    const response = await fetchImpl(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20000) });
    assert.ok(response.ok, `Public source returned ${response.status}: ${url.pathname}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.ok(bytes.length <= 8 * 1024 * 1024, 'Public source exceeds capture limit');
    return { path: url.pathname, url: url.href, status: response.status, bytes: bytes.length, sha256: sha256(bytes) };
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (!['GET', 'HEAD'].includes(request.method()) || url.origin !== origin.origin || internalPath.test(url.pathname) ||
        /umami|analytics|\/collect(?:\/|$)/i.test(url.pathname)) return route.abort();
      return route.continue();
    });
    await context.addInitScript(() => { try { localStorage.setItem('sy-lang', 'es'); localStorage.setItem('sy-language', 'es'); } catch {} });
    const page = await context.newPage();
    const homeSource = await getSource('/');
    report.sources.push(homeSource);
    await page.goto(origin.href, { waitUntil: 'load', timeout: 30000 });
    const registry = await page.evaluate(() => {
      const fields = ['id', 'page', 'name', 'shortName', 'city', 'country', 'region', 'status', 'statusLabel',
        'concept', 'address', 'hours', 'phone', 'phoneIntl', 'whatsapp', 'reserveChannel', 'parking', 'accessibility',
        'summary', 'tagline', 'venueCity', 'venuePosition', 'venuePhotoKind', 'openingDate', 'socialUrl', 'menuUrl',
        'mapsUrl', 'website', 'reserveUrl', 'gbpUrl', 'image', 'venuePhoto', 'gallery', 'rating', 'reviewsTotal'];
      return (window.SY_DATA?.branches || []).map(branch => {
        const result = Object.fromEntries(fields.filter(field => Object.hasOwn(branch, field)).map(field => [field, branch[field]]));
        result.quotes = (branch.quotes || []).map(quote => ({ text: quote.text, source: quote.source, stars: quote.stars }));
        return result;
      });
    });
    const registryPaths = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => new URL(node.src).pathname)
      .filter(path => /^\/assets\/js\/(?:public-data|mock-data)\.js$/.test(path)));
    for (const path of [...new Set(registryPaths)]) report.sources.push(await getSource(path));
    assert.ok(registry.length, 'Home did not expose the public branch registry; do not treat an empty snapshot as complete');
    const knownIds = new Set([...Object.keys(publicBranchRoutes), 'moreno-valley', 'san-diego']);
    const publicRegistry = registry.filter(branch => knownIds.has(branch.id)).map(branch => normalizePublicBranch(branch, origin));
    assert.equal(new Set(publicRegistry.map(branch => branch.id)).size, publicRegistry.length, 'Duplicate public branch identity in registry');
    writeSnapshotFile(output, 'public-registry.json', { version: 1, capturedAt, sourceUrl: origin.href,
      businessConfirmation: 'unverified-observed-source', branches: publicRegistry });
    report.registry = { file: 'public-registry.json', records: publicRegistry.length,
      announcementsWithoutPage: publicRegistry.filter(branch => !Object.hasOwn(publicBranchRoutes, branch.id)).map(branch => branch.id) };
    for (const id of branches) {
      try {
        const registryRecord = registry.find(branch => branch.id === id);
        assert.ok(registryRecord, `Missing public registry record: ${id}`);
        const source = await getSource(publicBranchRoutes[id]);
        report.sources.push(source);
        await page.goto(source.url, { waitUntil: 'load', timeout: 30000 });
        await page.locator('main').waitFor({ timeout: 10000 });
        const rendered = await page.evaluate(() => {
          const main = document.querySelector('main');
          return { title: document.title, language: document.documentElement.lang,
            branchIdentity: document.body.dataset.branch || document.querySelector('[data-branch]')?.dataset.branch || null,
            description: document.querySelector('meta[name="description"]')?.content,
            canonical: document.querySelector('link[rel="canonical"]')?.href,
            text: main.innerText,
            headings: [...main.querySelectorAll('h1,h2,h3,h4')].map(node => ({ level: node.tagName.toLowerCase(), text: node.innerText })),
            practicalRows: [...main.querySelectorAll('dl > div')].map(node => ({ label: node.querySelector('dt')?.innerText, text: node.querySelector('dd')?.innerText })),
            faqs: [...main.querySelectorAll('details')].map(node => ({ question: node.querySelector('summary')?.innerText,
              answer: [...node.querySelectorAll('p')].map(p => p.textContent).join(' ') })),
            links: [...document.querySelectorAll('main a[href],footer a[href]')].map(node => ({ text: node.innerText || node.getAttribute('aria-label'), url: node.href })),
            images: [...main.querySelectorAll('img')].map(node => ({ alt: node.alt, url: node.currentSrc || node.src })),
            schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(node => { try { return [JSON.parse(node.textContent)]; } catch { return []; } }),
          };
        });
        const identityMatches = rendered.branchIdentity ? rendered.branchIdentity === id : rendered.canonical &&
          new URL(rendered.canonical).pathname.replace(/\/$/, '').replace(/\.html$/, '') === publicBranchRoutes[id];
        assert.ok(identityMatches, `Wrong public page identity: ${id}`);
        assert.ok(rendered.text?.trim() && rendered.headings.some(heading => heading.level === 'h1'), `Missing rendered public branch content: ${id}`);
        const snapshot = { version: 1, branchId: id, capturedAt, businessConfirmation: 'unverified-observed-source',
          provenance: source, registry: normalizePublicBranch(registryRecord, origin), rendered: normalizeRenderedPage(rendered, origin) };
        const filename = `${id}.json`;
        writeSnapshotFile(output, filename, snapshot);
        report.branches.push({ id, file: filename, renderedHeadings: snapshot.rendered.headings.length,
          publicLinks: snapshot.rendered.links.length, sourceSha256: source.sha256 });
      } catch (error) { report.errors.push({ branchId: id, message: publicText(error.message) }); }
    }
    for (const source of report.sources) {
      try { source.stable = source.sha256 === (await getSource(source.path)).sha256; }
      catch (error) { source.stable = false; report.errors.push({ path: source.path, message: publicText(error.message) }); }
    }
    report.complete = report.branches.length === branches.length && !report.errors.length && report.sources.every(source => source.stable);
    await context.close();
  } catch (error) { report.errors.push({ message: publicText(error.message) }); }
  finally { await browser.close(); writeSnapshotFile(output, 'manifest.json', report); }
  return { output, ...report };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArguments(process.argv.slice(2));
  const output = resolve(projectRoot, options.outputDir);
  assert.ok(['.artifacts', 'archive/source-snapshots'].some(parent => {
    const path = relative(resolve(projectRoot, parent), output);
    return path && !path.startsWith(`..${sep}`) && path !== '..' && !path.startsWith(sep);
  }), 'Keep snapshots outside the public package, under .artifacts or archive/source-snapshots');
  assert.ok(process.env.SY_QA_PACKAGE_ROOT, 'Set SY_QA_PACKAGE_ROOT to the installed Playwright package directory');
  const require = createRequire(resolve(process.env.SY_QA_PACKAGE_ROOT, '../package.json'));
  const { chromium } = require('playwright');
  const report = await capturePublicBranches({ ...options, outputDir: output, chromium });
  console.log(JSON.stringify({ output: report.output, complete: report.complete, branches: report.branches.length,
    sources: report.sources.length, errors: report.errors }));
  if (!report.complete) process.exitCode = 1;
}
