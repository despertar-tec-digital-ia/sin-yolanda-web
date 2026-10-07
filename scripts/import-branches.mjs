// Local packaging only: no commit, network request or deployment.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const sourceFlag = process.argv.indexOf('--source-root');
const refFlag = process.argv.indexOf('--source-ref');
const dryRun = process.argv.includes('--dry-run');
const branchFlag = process.argv.indexOf('--branch');
const branchId = branchFlag < 0 ? 'houston' : process.argv[branchFlag + 1];
const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/branch-import-manifest.json'), 'utf8'));
const selection = manifest[branchId];
if (!selection) throw new Error(`No approved packaging manifest for ${branchId}`);
if (sourceFlag < 0 || refFlag < 0 || !process.argv[sourceFlag + 1] || !/^[a-f0-9]{40}$/.test(process.argv[refFlag + 1] ?? '')) throw new Error('Explicit --source-root checkout and --source-ref full commit required; never infer a sibling');
const sourceRoot = resolve(process.argv[sourceFlag + 1]);
const sourceRef = process.argv[refFlag + 1];
if (execFileSync('git', ['rev-parse', 'HEAD'], {cwd: sourceRoot, encoding: 'utf8'}).trim() !== sourceRef) throw new Error('Donor revision mismatch');
if (execFileSync('git', ['status', '--porcelain'], {cwd: sourceRoot, encoding: 'utf8'}).trim()) throw new Error('Donor checkout must be clean');
const source = resolve(sourceRoot, 'dist');
const branches = JSON.parse(readFileSync(resolve(sourceRoot, 'src/data/public-branches.json'), 'utf8'));
const branch = branches.find((item) => item.id === branchId);
if (!branch) throw new Error(`Unknown branch: ${branchId}`);
const routes = selection.routes, assets = new Set(), output = new Map();
const safe = (path) => typeof path === 'string' && !path.startsWith('/') && !path.split('/').includes('..') && /^[A-Za-z0-9._~%/-]+$/.test(path);
const addAssets = (content, parent) => {
  for (const [path] of content.matchAll(/\/(?:_astro|fonts|images|licenses)\/[A-Za-z0-9._~%/-]+/g)) assets.add(path.slice(1));
  if (parent) {
    const imports = [...content.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["'](\.[^"']+)["']/g)];
    const cssUrls = [...content.matchAll(/url\(["']?(\.[^)"']+)["']?\)/g)];
    for (const [,dependency] of [...imports, ...cssUrls]) {
      const file = relative(source, resolve(source, dirname(parent), dependency));
      if (!safe(file) || !/^(?:_astro|fonts|images|licenses)\//.test(file)) throw new Error(`Unsafe relative dependency: ${parent}`);
      assets.add(file);
    }
  }
};
for (const license of ['BEBAS-NEUE-OFL.txt', 'ROBOTO-SLAB-APACHE-2.0.txt', 'ROBOTO-SLAB-COPYRIGHT.txt', 'ALFA-SLAB-ONE-OFL.txt']) assets.add(`fonts/licenses/${license}`);
for (const route of routes) {
  if (!safe(route.from) || !safe(route.to)) throw new Error('Unsafe manifest route');
  if (route.to !== `${branch.slug}.html` && route.to !== `en/${branch.slug}/index.html` && !(route.kind === 'menu' && route.to === `${branch.slug}/menu/index.html`)) throw new Error('Manifest cannot replace unrelated pages');
  let html = readFileSync(resolve(source, route.from), 'utf8');
  const schemaText = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  const schema = schemaText ? JSON.parse(schemaText) : undefined;
  if (route.kind === 'menu') {
    if (schema?.['@type'] !== 'Menu' || schema.url !== route.canonical || schema.inLanguage !== route.lang
      || !html.includes(`data-branch-id="${branchId}"`) || !schema.hasMenuSection?.length
      || /Prueba local|Editorial review pending|About this menu preview|Local design review/.test(html)) throw new Error(`${route.from}: customer menu identity failed`);
  } else {
  if (!schema || schema.address?.streetAddress !== branch.street || schema.address?.addressLocality !== branch.city
    || schema.address?.postalCode !== branch.postalCode || schema.telephone !== branch.phone?.e164) throw new Error(`${route.from}: schema does not match branch facts`);
  const iframe = html.match(/<iframe\b[^>]*src="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
  const map = iframe ? new URL(iframe) : undefined;
  if (map?.origin !== 'https://www.google.com' || map.pathname !== '/maps/embed'
    || !map.searchParams.get('pb')?.includes(selection.mapIdentity)
    || !map.searchParams.get('pb')?.includes(selection.mapName)
    || html.includes('data-google-branch-map')) throw new Error(`${route.from}: verified branch map is missing`);
  if (!html.includes('data-media-publication="authorized"')) throw new Error(`${route.from}: rendered media needs publication authorization`);
  }
  if ((html.match(/<h1\b/g) ?? []).length !== 1 || (html.match(/rel="canonical"/g) ?? []).length !== 1
    || !html.includes(`href="${route.canonical}"`) || !html.includes(`<html lang="${route.lang}">`)
    || !(html.includes(`data-branch="${branchId}"`) || route.kind === 'menu' && html.includes(`data-branch-id="${branchId}"`))) throw new Error(`${route.from}: route identity failed`);
  if (branch.reservation && branch.operationalStatus === 'open' && !html.includes(branch.reservation.url)) throw new Error('Missing reservation destination');
  html = html.replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow,max-image-preview:large">')
    .replaceAll('href="/pruebas/inicio-h2/#sucursales"', 'href="/#ubicaciones"')
    .replaceAll('href="/pruebas/inicio-h2/"', 'href="/"');
  // Lazy does not hide the map: it stays permanently in the visit section.
  if (!html.includes('content="index,follow,max-image-preview:large"') || /href="\/(?:en\/)?pruebas\//.test(html)
    || html.includes('demo-sin-yolanda.despertartdigital.cloud')) throw new Error(`${route.from}: preview link or robots failure`);
  output.set(route.to, html); addAssets(html);
}
let previousSize = -1;
while (previousSize !== assets.size) {
  previousSize = assets.size;
  for (const asset of assets) {
    if (!safe(asset)) throw new Error(`Unsafe asset: ${asset}`);
    const file = resolve(source, asset);
    if (!existsSync(file)) throw new Error(`Missing source asset: ${asset}`);
    if (/\.(?:css|js)$/.test(asset)) addAssets(readFileSync(file, 'utf8'), asset);
  }
}
for (const asset of assets) {
  const target = resolve(root, asset);
  if (existsSync(target) && !readFileSync(target).equals(readFileSync(resolve(source, asset)))) throw new Error(`Refusing to overwrite a differing shared asset: ${asset}`);
}
let sitemap = readFileSync(resolve(root, 'sitemap.xml'), 'utf8');
for (const route of routes) if (!sitemap.includes(`<loc>${route.canonical}</loc>`)) sitemap = sitemap.replace('</urlset>', `  <url><loc>${route.canonical}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>`);
if (dryRun) console.log(`Ready: ${branchId}, ${routes.length} pages, ${assets.size} assets; no changes.`);
else {
  for (const asset of assets) { const target = resolve(root, asset); mkdirSync(dirname(target), { recursive: true }); if (!existsSync(target)) copyFileSync(resolve(source, asset), target); }
  for (const [path, html] of output) { const target = resolve(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, html); }
  if (sitemap !== readFileSync(resolve(root, 'sitemap.xml'), 'utf8')) writeFileSync(resolve(root, 'sitemap.xml'), sitemap);
  console.log(`Packaged ${branchId}: ${routes.length} pages, ${assets.size} assets. No deployment; home and other branches preserved.`);
}
