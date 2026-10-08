// Local selective integration only: no commit, network request or deployment.
// Review is a local candidate, never a shortcut around commercial publication gates.
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const option = (name, fallback) => {
  const at = process.argv.indexOf(name);
  if (at < 0) return fallback;
  const value = process.argv[at + 1];
  if (!value || value.startsWith('--')) throw new Error('Missing value for ' + name);
  return value;
};
const dryRun = process.argv.includes('--dry-run');
const branchId = option('--branch', 'houston');
const audience = option('--audience', 'commercial');
const reportPath = option('--report');
if (!['commercial', 'review'].includes(audience)) throw new Error('Audience must be commercial or review');
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(branchId)) throw new Error('Invalid selection ID');
const review = audience === 'review';
const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/branch-import-manifest.json'), 'utf8'));
const selection = manifest[branchId];
if (!selection) throw new Error('No explicit packaging manifest for ' + branchId);
if (!review && selection.publicationApproved !== true) throw new Error('Commercial publication is not approved for this selection');
const sourceArgument = option('--source-root');
const sourceRef = option('--source-ref');
if (!sourceArgument || !/^[a-f0-9]{40}$/.test(sourceRef ?? '')) throw new Error('Explicit --source-root checkout and --source-ref full commit required; never infer a sibling');
if (selection.sourceRef && selection.sourceRef !== sourceRef) throw new Error('Selection is not approved for this donor revision');
const sourceRoot = resolve(sourceArgument);
if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim() !== sourceRef) throw new Error('Donor revision mismatch');
if (execFileSync('git', ['status', '--porcelain'], { cwd: sourceRoot, encoding: 'utf8' }).trim()) throw new Error('Donor checkout must be clean');
const source = realpathSync(resolve(sourceRoot, 'dist'));
const branches = JSON.parse(readFileSync(resolve(sourceRoot, 'src/data/public-branches.json'), 'utf8'));
const catering = selection.kind === 'catering';
const branch = catering ? undefined : branches.find(item => item.id === branchId);
if (!catering && (!branch || branch.publicEnabled === false)) throw new Error('Unknown or retired source branch');
const routes = selection.routes;
const indexationPolicy = JSON.parse(readFileSync(resolve(root, 'scripts/indexation-policy.json'), 'utf8'));
if (!dryRun && routes.some(route => indexationPolicy.pages.includes(route.to))) throw new Error('Promoted migration routes require a new explicit source/indexation decision before replacement; review dry-run remains available.');
if (!Array.isArray(routes) || !routes.length) throw new Error('Explicit routes are required');
const assets = new Set(), output = new Map();
const safe = path => typeof path === 'string' && !path.startsWith('/') && !path.split('/').includes('..') && /^[A-Za-z0-9._~%/-]+$/.test(path);
const sourceFile = path => {
  if (!safe(path)) throw new Error('Unsafe source path');
  const file = resolve(source, path);
  if (!existsSync(file)) throw new Error('Missing source file: ' + path);
  const canonical = relative(source, realpathSync(file));
  if (canonical === '..' || canonical.startsWith('../') || canonical.startsWith('/')) throw new Error('Escaping source file');
  return file;
};
const targetFile = path => {
  if (!safe(path)) throw new Error('Unsafe target path');
  const file = resolve(root, path);
  for (let parent = file; parent !== root; parent = dirname(parent)) {
    if (existsSync(parent) && lstatSync(parent).isSymbolicLink()) throw new Error('Target symlinks are not permitted');
  }
  return file;
};
const addAssets = (content, parent) => {
  for (const [path] of content.matchAll(/\/(?:_astro|fonts|images|licenses)\/[A-Za-z0-9._~%/-]+/g)) assets.add(path.slice(1));
  if (!parent) return;
  const imports = [...content.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["'](\.[^"']+)["']/g)];
  const cssUrls = [...content.matchAll(/url\(["']?(\.[^)"']+)["']?\)/g)];
  for (const [, dependency] of [...imports, ...cssUrls]) {
    const file = relative(source, resolve(source, dirname(parent), dependency));
    if (!safe(file) || !/^(?:_astro|fonts|images|licenses)\//.test(file)) throw new Error('Unsafe relative dependency: ' + parent);
    assets.add(file);
  }
};
const branchFacts = branch && {
  name: selection.displayName ?? branch.name, sourceName: branch.name, slug: branch.slug,
  street: branch.street, city: branch.city, postalCode: branch.postalCode,
  countryCode: branch.countryCode, regionCode: branch.regionCode, areaName: branch.areaName,
  phone: branch.phone, reservation: branch.reservation, hours: branch.hours,
  instagram: branch.instagram, facebook: branch.facebook, tiktok: branch.tiktok,
  operationalStatus: branch.operationalStatus, openingDate: branch.openingDate,
  currency: branch.currency, timezone: branch.timezone, placeId: branch.placeId, mapPoint: branch.mapPoint,
};
if (branch && selection.facts) {
  for (const key of ['street', 'city', 'postalCode']) if (selection.facts[key] !== branch[key]) throw new Error('Manifest facts mismatch: ' + key);
  if (selection.facts.phone?.e164 !== branch.phone?.e164 || selection.facts.reservation?.url !== branch.reservation?.url) throw new Error('Manifest contact facts mismatch');
}
for (const license of ['BEBAS-NEUE-OFL.txt', 'ROBOTO-SLAB-APACHE-2.0.txt', 'ROBOTO-SLAB-COPYRIGHT.txt', 'ALFA-SLAB-ONE-OFL.txt']) assets.add('fonts/licenses/' + license);
for (const route of routes) {
  if (!safe(route.from) || !safe(route.to) || !['es', 'en'].includes(route.lang)) throw new Error('Unsafe manifest route');
  const prefix = route.lang === 'en' ? 'en/' : '';
  const menu = route.kind === 'menu';
  const allowedFrom = catering ? prefix + 'catering/index.html' : menu ? (branchId === 'houston' ? '' : prefix) + branch.slug + '/menu/index.html' : prefix + branch.slug + '/index.html';
  const allowedTo = catering ? (route.lang === 'en' ? 'en/catering/index.html' : 'catering.html') : menu ? allowedFrom : route.lang === 'en' ? 'en/' + branch.slug + '/index.html' : branch.slug + '.html';
  const canonical = 'https://sin-yolanda.com/' + allowedTo.replace(/index\.html$/, '').replace(/\.html$/, '');
  if (route.from !== allowedFrom || route.to !== allowedTo || route.canonical !== canonical || output.has(route.to)) throw new Error('Manifest cannot replace unrelated or duplicate routes');
  targetFile(route.to);
  let html = readFileSync(sourceFile(route.from), 'utf8');
  const schemaText = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  const schema = schemaText ? JSON.parse(schemaText) : undefined;
  if (menu) {
    if (!html.includes('data-branch-id="' + branchId + '"') || !html.includes('class="digital-menu-group')) throw new Error(route.from + ': menu identity failed');
    if (!review && (schema?.['@type'] !== 'Menu' || schema.url !== route.canonical || schema.inLanguage !== route.lang || !schema.hasMenuSection?.length)) throw new Error(route.from + ': customer menu identity failed');
    if (schema && (schema['@type'] !== 'Menu' || schema.url !== route.canonical || schema.inLanguage !== route.lang)) throw new Error(route.from + ': menu schema mismatch');
    if (/Prueba local|Editorial review pending|About this menu preview|Local design review/.test(html)) throw new Error(route.from + ': internal menu copy is not a visitor candidate');
  } else if (catering) {
    if (!html.includes('data-catering-direction="fiesta"') || !html.includes('Sin Yolanda Catering') || /ct-review-tools|href="\/(?:en\/)?pruebas\//.test(html)) throw new Error(route.from + ': approved Catering composition required');
    if (!review) throw new Error('Catering commercial release requires separate content and media authorization');
  } else {
    if (schema?.['@type'] !== 'Restaurant' || schema.address?.streetAddress !== branch.street || schema.address?.addressLocality !== branch.city || schema.address?.postalCode !== branch.postalCode || schema.telephone !== branch.phone?.e164) throw new Error(route.from + ': schema does not match branch facts');
    const iframe = html.match(/<iframe\b[^>]*src="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
    const map = iframe ? new URL(iframe) : undefined;
    if (map?.origin !== 'https://www.google.com' || map.pathname !== '/maps/embed' || !map.searchParams.get('pb')?.includes(selection.mapIdentity) || !map.searchParams.get('pb')?.includes(selection.mapName) || html.includes('data-google-branch-map')) throw new Error(route.from + ': verified branch map is missing');
    if (!review && (!html.includes('data-media-publication="authorized"') || /data-catering-photo|data-demo-programming|data-programming-audience="review"/.test(html))) throw new Error(route.from + ': rendered subblocks need publication authorization');
    if (!/data-media-publication="(?:authorized|review)"/.test(html)) throw new Error(route.from + ': missing media audience');
    if (branch.operationalStatus === 'coming-soon' && (schema.hasMenu || schema.openingHoursSpecification || schema.acceptsReservations || /href="tel:/.test(html))) throw new Error(route.from + ': preopening cannot claim live services');
  }
  if (branch?.reservation && branch.operationalStatus === 'open' && !html.includes(branch.reservation.url)) throw new Error('Missing own reservation destination');
  if ((html.match(/<h1\b/g) ?? []).length !== 1 || !html.includes('<html lang="' + route.lang + '">') || (!catering && !(html.includes('data-branch="' + branchId + '"') || menu && html.includes('data-branch-id="' + branchId + '"')))) throw new Error(route.from + ': route identity failed');
  const canonicalCount = (html.match(/rel="canonical"/g) ?? []).length;
  if (canonicalCount === 0 && review && (menu || catering)) html = html.replace('</head>', '<link rel="canonical" href="' + route.canonical + '"></head>');
  else if (canonicalCount !== 1 || !html.includes('href="' + route.canonical + '"')) throw new Error(route.from + ': canonical mismatch');
  html = html.replaceAll('href="/#sucursales"', 'href="/#ubicaciones"')
    .replaceAll('href="/pruebas/inicio-h2/#sucursales"', 'href="/#ubicaciones"')
    .replaceAll('href="/pruebas/inicio-h2/"', 'href="/"');
  if (selection.displayName && branch.name !== selection.displayName) {
    // Rename the customer-facing branch, not Avenida San Ignacio or historical IDs.
    html = html.replaceAll(branch.name, selection.displayName)
      .replaceAll(branch.street.replaceAll(branch.name, selection.displayName), branch.street);
  }
  if (review) {
    html = html.replace(/<meta name="robots" content="[^"]+">/, '<meta name="robots" content="noindex,nofollow">')
      .replace('<body ', '<body data-import-audience="review" data-import-source-ref="' + sourceRef + '" ');
  } else html = html.replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow,max-image-preview:large">');
  const expectedRobots = review ? 'noindex,nofollow' : 'index,follow,max-image-preview:large';
  if (!html.includes('content="' + expectedRobots + '"') || /href="\/(?:en\/)?pruebas\//.test(html) || html.includes('demo-sin-yolanda.despertartdigital.cloud')) throw new Error(route.from + ': preview link or robots failure');
  output.set(route.to, html);
  addAssets(html);
}
let previousSize = -1;
while (previousSize !== assets.size) {
  previousSize = assets.size;
  for (const asset of assets) {
    const file = sourceFile(asset);
    if (/\.(?:css|js)$/.test(asset)) addAssets(readFileSync(file, 'utf8'), asset);
  }
}
const conflictingAssets = [...assets].filter(asset => {
  const target = targetFile(asset);
  return existsSync(target) && !readFileSync(target).equals(readFileSync(sourceFile(asset)));
}).sort();
const blockingReasons = [...(selection.blockingReasons ?? []), ...conflictingAssets.map(asset => 'Differing shared asset requires review: ' + asset)];
const report = {
  audience, selection: branchId, sourceRef, dryRun, localOnly: true,
  publicationApproved: selection.publicationApproved === true,
  routes: routes.map(route => ({ ...route })), assets: [...assets].sort(),
  facts: branchFacts ?? null, factsEvidence: selection.factsEvidence,
  displayAdaptation: selection.displayName ? { sourceName: branch.name, displayName: selection.displayName, slugPreserved: branch.slug } : null,
  blockingReasons, conflictingAssets, importReady: conflictingAssets.length === 0,
};
if (reportPath) {
  if (!safe(reportPath) || !reportPath.startsWith('.artifacts/') || !reportPath.endsWith('.json')) throw new Error('Report must be a JSON file inside .artifacts');
  const target = targetFile(reportPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
}
if (conflictingAssets.length) throw new Error('Refusing to overwrite ' + conflictingAssets.length + ' differing shared assets');
let sitemap = readFileSync(resolve(root, 'sitemap.xml'), 'utf8');
if (!review) for (const route of routes) if (!sitemap.includes('<loc>' + route.canonical + '</loc>')) sitemap = sitemap.replace('</urlset>', '  <url><loc>' + route.canonical + '</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>');
if (!dryRun) {
  for (const asset of assets) {
    const target = targetFile(asset);
    mkdirSync(dirname(target), { recursive: true });
    if (!existsSync(target)) copyFileSync(sourceFile(asset), target);
  }
  for (const [path, html] of output) {
    const target = targetFile(path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, html);
  }
  if (!review && sitemap !== readFileSync(resolve(root, 'sitemap.xml'), 'utf8')) writeFileSync(resolve(root, 'sitemap.xml'), sitemap);
}
console.log(JSON.stringify({ audience, selection: branchId, pages: routes.length, assets: assets.size, blockers: blockingReasons.length, dryRun, deployment: false }));
