import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The versioned public map is the only project input; no operator session or secrets.
export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const configurationPath = join(projectRoot, 'scripts/legacy-redirects/sin-yolanda-legacy-redirects/redirects.json');
export const siteHosts = { gdl: 'sinyolandagdl.com', tx: 'sinyolandatx.com', usa: 'sinyolandausa.com' };
const exclusions = { gdl: [], tx: ['/menu-english/'], usa: ['/sin-yolanda-catering-form/', '/sinyolanda-thewoodlands/special-menu/', '/catering-experience/'] };
const sha256 = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(message); };
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const MAX_REQUESTS = 128;
const MAX_HOPS = 4;

export function loadConfiguration() {
  const config = JSON.parse(readFileSync(configurationPath, 'utf8'));
  if (config.targetOrigin !== 'https://sin-yolanda.com' || config.status !== 301
    || Object.keys(config.sites ?? {}).sort().join(',') !== Object.values(siteHosts).sort().join(',')) fail('Unexpected public redirect configuration');
  return config;
}
function decode(value) {
  return value.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
}
function attributes(text) {
  return Object.fromEntries([...text.matchAll(/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)]
    .map(match => [match[1].toLowerCase(), decode(match[2] ?? match[3] ?? match[4] ?? '')]));
}
function parseLocation(value, current) {
  let url; try { url = new URL(value, current); } catch { fail('Invalid redirect location'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port || /[\r\n\0]/.test(value)) fail('Unsafe redirect location');
  return url;
}
function isLegacy(url, host) {
  return ['http:', 'https:'].includes(url.protocol) && [host, 'www.' + host].includes(url.hostname) && !url.port;
}
function routePath(path) { return path === '/' ? '/' : path.replace(/\/$/, ''); }
function safeUrl(value, config, knownPaths = []) {
  let url; try { url = new URL(value); } catch { return '[invalid-location]'; }
  const recognized = url.origin === config.targetOrigin || Object.values(siteHosts).some(host => isLegacy(url, host));
  if (!recognized || url.username || url.password) return '[unapproved-origin]';
  const path = knownPaths.includes(url.pathname) || url.pathname === '/' || url.pathname.startsWith('/wp-content/uploads/')
    ? url.pathname : '[unexpected-path]';
  const query = new URLSearchParams();
  for (const [key, values] of Object.entries(config.utmValues ?? {})) {
    const incoming = url.searchParams.getAll(key);
    if (incoming.length === 1 && Array.isArray(values) && values.includes(incoming[0])) query.set(key, incoming[0]);
  }
  return url.origin + path + (query.size ? '?' + query.toString() : '') + (url.hash === '#cocktails' ? '#cocktails' : '');
}
export function buildCases(site, config) {
  const host = siteHosts[site], routes = config.sites[host];
  if (!host || !routes) fail('Unknown legacy site');
  const cases = [];
  const add = (label, method, url, destination = null, kind = 'mapped') => cases.push({ label, site, host, method, url, destination, kind });
  for (const [source, target] of Object.entries(routes)) for (const method of ['GET', 'HEAD']) {
    add('exact-route', method, `https://${host}${source}`, config.targetOrigin + target);
  }
  const [representative, target] = Object.entries(routes).find(([path]) => path !== '/');
  const alternate = representative.replace(/\/$/, '');
  for (const method of ['GET', 'HEAD']) add('www-and-alternate-slash', method, `https://www.${host}${alternate}`, config.targetOrigin + target);
  add('apex-alternate-slash', 'GET', `https://${host}${alternate}`, config.targetOrigin + target);
  for (const method of ['GET', 'HEAD']) add('http-upgrade', method, `http://${host}/`, config.targetOrigin + routes['/']);
  add('http-www-upgrade', 'GET', `http://www.${host}/`, config.targetOrigin + routes['/']);
  const measured = Object.entries(routes).find(([, value]) => value.includes('#cocktails')) ?? [representative, target];
  const [path, fragment] = measured[1].split('#');
  add('registered-utm', 'GET', `https://${host}${measured[0]}?utm_medium=social&utm_source=instagram`,
    `${config.targetOrigin}${path}?utm_source=instagram&utm_medium=social${fragment ? '#' + fragment : ''}`);
  add('unregistered-utm-dropped', 'GET', `https://${host}${measured[0]}?utm_source=person%40example.invalid&utm_content=private-free-value&fbclid=discarded-fixture-id`, config.targetOrigin + measured[1]);
  add('form-query-preserved', 'GET', `https://${host}${representative}?name=not-stored-fixture`, null, 'native-query');
  for (const path of exclusions[site]) add('excluded-page', 'GET', `https://${host}${path}`, null, 'preserved');
  add('public-rest-preserved', 'GET', `https://${host}/wp-json/`, null, 'preserved');
  return cases;
}

export function createVerifier(config, fetcher = fetch) {
  let requests = 0;
  const targetCache = new Map();
  const paths = [...new Set(Object.values(config.sites).flatMap(routes => [...Object.keys(routes), ...Object.values(routes).map(value => value.split('#')[0])]))];
  paths.push(...Object.values(exclusions).flat(), '/wp-json/');
  async function request(url, method) {
    if (!['GET', 'HEAD'].includes(method)) fail('Only anonymous GET and HEAD are permitted');
    const parsed = parseLocation(url, url);
    if (parsed.origin !== config.targetOrigin && !Object.values(siteHosts).some(host => isLegacy(parsed, host))) fail('Request origin is outside the public verification scope');
    if (++requests > MAX_REQUESTS) fail('Bounded request budget exhausted; verification is incomplete');
    let response;
    try { response = await fetcher(parsed.href, { method, redirect: 'manual', credentials: 'omit',
      headers: { Accept: 'text/html,application/json,*/*;q=0.1', 'Cache-Control': 'no-cache', Pragma: 'no-cache', 'User-Agent': 'SinYolanda-Legacy-Verification/1.0' }, signal: AbortSignal.timeout(15000) }); }
    catch { fail('Anonymous request failed'); }
    return response;
  }
  async function body(response) {
    if (Number(response.headers.get('content-length') ?? 0) > 4 * 1024 * 1024) fail('Public body exceeds the verification limit');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 4 * 1024 * 1024) fail('Public body exceeds the verification limit');
    return bytes;
  }
  async function targetMetadata(path, method) {
    const key = method + ':' + path;
    if (targetCache.has(key)) return targetCache.get(key);
    const response = await request(config.targetOrigin + path, method);
    if (response.status !== 200) fail('Canonical destination does not return 200 directly');
    const robots = response.headers.get('x-robots-tag') ?? '';
    const metadata = { method, path, status: response.status, headerIndexable: !/noindex|nofollow/i.test(robots) };
    if (method === 'GET') {
      const bytes = await body(response), html = bytes.toString('utf8');
      const links = [...html.matchAll(/<link\b([^>]*)>/gi)].map(match => attributes(match[1]));
      const metas = [...html.matchAll(/<meta\b([^>]*)>/gi)].map(match => attributes(match[1]));
      const canonical = links.find(link => (link.rel ?? '').split(/\s+/).includes('canonical'))?.href;
      metadata.canonicalMatches = canonical === config.targetOrigin + path;
      metadata.metaIndexable = !metas.some(meta => ['robots', 'googlebot'].includes((meta.name ?? '').toLowerCase()) && /noindex|nofollow/i.test(meta.content ?? ''));
      metadata.cocktailsAnchor = [...html.matchAll(/\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].some(match => (match[1] ?? match[2]) === 'cocktails');
      metadata.bodySha256 = sha256(bytes);
    }
    targetCache.set(key, metadata);
    return metadata;
  }
  async function verifyCase(item) {
    const record = { label: item.label, site: item.site, method: item.method, source: safeUrl(item.url, config, paths), kind: item.kind, hops: [], passed: false };
    let current = new URL(item.url), seen = new Set();
    try {
      for (let hop = 0; hop < MAX_HOPS; hop++) {
        if (seen.has(current.href)) fail('Redirect loop detected');
        seen.add(current.href);
        const response = await request(current.href, item.method), rawLocation = response.headers.get('location');
        const pluginHeader = response.headers.get('x-redirect-by') === 'Sin Yolanda Legacy Redirects';
        const entry = { status: response.status, stage: 'legacy', redirectBy: pluginHeader ? 'plugin' : 'other-or-none' };
        if (redirectStatuses.has(response.status)) {
          if (!rawLocation) fail('Redirect lacks a location');
          const next = parseLocation(rawLocation, current.href);
          entry.location = safeUrl(next.href, config, paths); record.hops.push(entry);
          if (isLegacy(next, item.host)) {
            if (pluginHeader || (current.protocol === 'https:' && next.protocol !== 'https:')
              || routePath(next.pathname) !== routePath(current.pathname) || next.search !== current.search || next.hash) fail('Unexpected redirect within the legacy site');
            entry.stage = 'provider-or-legacy-canonical-before-plugin';
            entry.upgradeToHttps = current.protocol === 'http:' && next.protocol === 'https:';
            entry.legacyHostChanged = current.hostname !== next.hostname;
            entry.legacySlashChanged = current.pathname !== next.pathname;
            current = next; continue;
          }
          if (item.kind !== 'mapped') fail('Excluded legacy request was redirected out of its source site');
          if (next.origin !== config.targetOrigin || next.href !== item.destination) fail('Redirect does not match the exact approved HTTPS destination');
          if (response.status !== 301 || !pluginHeader) fail('Exact plugin 301 and X-Redirect-By were not observed');
          entry.stage = 'plugin-301';
          const destination = new URL(item.destination), meta = await targetMetadata(destination.pathname, item.method);
          const getMeta = await targetMetadata(destination.pathname, 'GET');
          const headMeta = await targetMetadata(destination.pathname, 'HEAD');
          if (!meta.headerIndexable || !getMeta.headerIndexable || !headMeta.headerIndexable || !getMeta.canonicalMatches || !getMeta.metaIndexable
            || (destination.hash === '#cocktails' && !getMeta.cocktailsAnchor)) fail('Destination canonical, robots or requested anchor failed');
          record.target = { location: safeUrl(item.destination, config, paths), status: meta.status };
          record.passed = true; return record;
        }
        record.hops.push(entry);
        if (item.kind === 'mapped') fail('Approved legacy route did not issue its plugin redirect');
        if (pluginHeader) fail('Preserved legacy request was intercepted by the plugin');
        if (item.kind === 'native-query') {
          if (![200, 404].includes(response.status)) fail('Native query returned an unexpected WordPress status');
          record.nativeStatus = response.status;
          record.preservationNote = 'Native WordPress response retained; this probe does not certify a functional form or submission';
        } else if (response.status !== 200) fail('Excluded legacy resource did not remain available');
        if (item.method === 'GET') record.bodySha256 = sha256(await body(response));
        record.passed = true; return record;
      }
      fail('Redirect hop limit exceeded');
    } catch (error) { record.failure = error.message; return record; }
  }
  async function uploadCase(site) {
    const host = siteHosts[site], url = `https://${host}/wp-json/wp/v2/media?per_page=1&_fields=source_url,media_details`;
    try {
      const response = await request(url, 'GET');
      if (response.status !== 200) fail('Public upload inventory unavailable');
      let media; try { media = JSON.parse((await body(response)).toString('utf8')); } catch { fail('Public upload inventory is not JSON'); }
      const candidate = media[0]?.media_details?.sizes?.thumbnail?.source_url ?? media[0]?.source_url;
      if (typeof candidate !== 'string') fail('No known public upload returned');
      const target = parseLocation(candidate, `https://${host}`);
      if (!isLegacy(target, host) || !target.pathname.startsWith('/wp-content/uploads/') || target.search || target.hash) fail('Public upload points outside the exact legacy scope');
      target.protocol = 'https:';
      return verifyCase({ label: 'known-upload-preserved', site, host, method: 'GET', url: target.href, kind: 'preserved', destination: null });
    } catch (error) { return { label: 'known-upload-preserved', site, method: 'GET', kind: 'preserved', passed: false, failure: error.message }; }
  }
  return { verifyCase, uploadCase, getRequests: () => requests, targetResults: () => [...targetCache.values()] };
}

export function parseArguments(args) {
  const output = {};
  for (let i = 0; i < args.length; i++) {
    if (!['--site', '--output'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) fail('Use --site gdl|tx|usa|all --output <new ignored directory>');
    const key = args[i].slice(2); if (output[key]) fail('Duplicate verification argument'); output[key] = args[++i];
  }
  if (!['gdl', 'tx', 'usa', 'all'].includes(output.site) || !output.output) fail('Site and new output directory are required');
  return output;
}
export function outputDirectory(path) {
  const output = resolve(path), artifacts = join(projectRoot, '.artifacts'), local = relative(artifacts, output);
  if (!local || local.startsWith('..') || isAbsolute(local) || local.split(/[\\/]/).includes('public')) fail('Verification output must be a new ignored .artifacts directory outside public output');
  if (existsSync(output)) fail('Refuse to overwrite a verification directory');
  for (let parent = dirname(output); parent !== projectRoot; parent = dirname(parent)) {
    if (existsSync(parent) && lstatSync(parent).isSymbolicLink()) fail('Verification output cannot use symlinks');
  }
  mkdirSync(output, { recursive: true, mode: 0o700 });
  return output;
}
export async function run(options, fetcher = fetch) {
  const config = loadConfiguration(), output = outputDirectory(options.output), verifier = createVerifier(config, fetcher);
  const selected = options.site === 'all' ? Object.keys(siteHosts) : [options.site], results = [];
  for (const site of selected) {
    for (const item of buildCases(site, config)) results.push(await verifier.verifyCase(item));
    results.push(await verifier.uploadCase(site));
  }
  const report = { version: 1, capturedAt: new Date().toISOString(), site: options.site, anonymous: true, methods: ['GET', 'HEAD'],
    scope: '16 exact routes plus representative host/slash/HTTP, UTM and preservation cases; no POST, JS, cookies or credentials',
    passed: results.every(result => result.passed), cases: results.length, failures: results.filter(result => !result.passed).length,
    requests: verifier.getRequests(), maxRequests: MAX_REQUESTS, maxRedirectHops: MAX_HOPS,
    results, targets: verifier.targetResults() };
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return { site: report.site, passed: report.passed, cases: report.cases, failures: report.failures, requests: report.requests, report: join(output, 'report.json') };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const report = await run(parseArguments(process.argv.slice(2))); console.log(JSON.stringify(report, null, 2)); if (!report.passed) process.exitCode = 1; }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
