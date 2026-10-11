// Local visual refinement of the existing Houston edition, never a content reimport.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const styles = /<link rel="stylesheet" href="(\/_astro\/[A-Za-z0-9._-]+\.css)">/g;
const modules = /<script type="module" src="(\/_astro\/[A-Za-z0-9._-]+\.js)"><\/script>/g;
const resourceKey = path => path.replace(/\.[^.]+\.(css|js)$/, '.$1');
const cleanBody = html => html.match(/<body\b[\s\S]*?<\/body>/)?.[0]
  ?.replace(/ data-(?:import-audience|import-source-ref|presentation-source-ref)="[^"]*"/g, '')
  // Build observation time is volatile; the existing page retains its timestamp.
  // Campaign snapshot/transition/visibility remain part of the strict comparison.
  .replace(/ data-evaluated-at="\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"/g, '')
  .replace(modules, (_, path) => `<script type="module" src="${resourceKey(path)}"></script>`);

export function refreshHoustonPresentation(current, donor, sourceRef) {
  assert.match(sourceRef, /^[a-f0-9]{40}$/);
  donor = donor.replaceAll('href="/#sucursales"', 'href="/#ubicaciones"');
  assert.match(current, /data-branch="houston"/);
  assert.match(donor, /data-branch="houston"/);
  assert.ok(cleanBody(current), 'Missing current body');
  assert.equal(cleanBody(current), cleanBody(donor), 'Body/content changed: use the separate content integration decision');
  let next = current;
  for (const pattern of [styles, modules]) {
    const old = [...current.matchAll(pattern)], fresh = [...donor.matchAll(pattern)];
    assert.deepEqual(old.map(m => resourceKey(m[1])), fresh.map(m => resourceKey(m[1])), 'Unexpected resource identities/order');
    for (let i = 0; i < old.length; i++) next = next.replace(old[i][0], fresh[i][0]);
  }
  next = next.replace(/ data-presentation-source-ref="[^"]*"/g, '')
    .replace('<body ', `<body data-presentation-source-ref="${sourceRef}" `);
  return next;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(import.meta.dirname, '..');
  const option = name => { const i = process.argv.indexOf(name); assert.ok(i > 0 && process.argv[i + 1], 'Required ' + name); return process.argv[i + 1]; };
  const sourceRoot = resolve(option('--source-root')), sourceRef = option('--source-ref');
  const dryRun = process.argv.includes('--dry-run');
  const selection = JSON.parse(readFileSync(resolve(root, 'scripts/branch-import-manifest.json'))).houston;
  assert.equal(selection.presentationSourceRef, sourceRef, 'Explicit visual source revision required');
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], {cwd:sourceRoot, encoding:'utf8'}).trim(), sourceRef);
  assert.equal(execFileSync('git', ['status', '--porcelain'], {cwd:sourceRoot, encoding:'utf8'}).trim(), '', 'Clean donor required');
  const source = resolve(sourceRoot, 'dist'), pages = selection.routes.filter(r => !r.kind);
  assert.deepEqual(pages.map(r => r.to), ['houston.html', 'en/houston/index.html']);
  const output = pages.map(route => ({path:route.to, html:refreshHoustonPresentation(readFileSync(resolve(root, route.to), 'utf8'), readFileSync(resolve(source, route.from), 'utf8'), sourceRef)}));
  const assets = new Set();
  const add = (content, parent) => {
    for (const [path] of content.matchAll(/\/(?:_astro|fonts|images|licenses)\/[A-Za-z0-9._~%/-]+/g)) assets.add(path.slice(1));
    if (parent) for (const [, path] of content.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["'](\.[^"']+)["']/g)) assets.add(relative(source, resolve(source, dirname(parent), path)));
  };
  output.forEach(o => add(o.html));
  let size = -1;
  while (size !== assets.size) { size = assets.size; for (const path of assets) { assert.match(path, /^(?:_astro|fonts|images|licenses)\/[A-Za-z0-9._~%/-]+$/); assert.ok(!path.split('/').includes('..')); const content = readFileSync(resolve(source, path)); if (/\.(css|js)$/.test(path)) add(content.toString(), path); } }
  for (const path of assets) if (existsSync(resolve(root, path))) assert.ok(readFileSync(resolve(root, path)).equals(readFileSync(resolve(source, path))), 'Refusing differing shared asset: ' + path);
  const report = {sourceRef, contentSourceRef:selection.sourceRef, dryRun, localOnly:true, pages:output.map(o=>o.path), bodyUnchanged:true, metadataPreserved:true, assets:[...assets].sort()};
  const reportPath = resolve(root, option('--report')); assert.ok(reportPath.startsWith(resolve(root, '.artifacts') + '/') && reportPath.endsWith('.json')); mkdirSync(dirname(reportPath), {recursive:true}); writeFileSync(reportPath, JSON.stringify(report,null,2)+'\n');
  if (!dryRun) { for (const path of assets) { const target=resolve(root,path); mkdirSync(dirname(target), {recursive:true}); if (!existsSync(target)) copyFileSync(resolve(source,path),target); } for (const page of output) writeFileSync(resolve(root,page.path), page.html); }
  console.log(JSON.stringify({pages:output.length, assets:assets.size, dryRun, bodyUnchanged:true, metadataPreserved:true, deployment:false}));
}
