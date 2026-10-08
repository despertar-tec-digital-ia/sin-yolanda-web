import { readFileSync } from 'node:fs';
import { resolve, posix } from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { inspectPublic, projectRoot, forbiddenRoute } from './package-public.mjs';

export function checkPublic(root = projectRoot) {
  const { manifest, files } = inspectPublic(root);
  assert.match(manifest.assetVersion, /^\d{8}-[a-z0-9-]+$/, 'Explicit shared asset version required');
  const fileSet = new Set(files);
  const read = path => readFileSync(resolve(root, path), 'utf8');
  const routes = new Set(manifest.pages.map(path => path === 'index.html' ? '/' : '/' + path.replace(/index\.html$/, '').replace(/\.html$/, '')));
  const sitemap = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(([,href]) => new URL(href).pathname);
  assert.equal(new Set(sitemap).size, sitemap.length, 'Duplicate sitemap URL');
  assert.deepEqual(sitemap.sort(), [...routes].filter(r => r !== '/404').sort(), 'Sitemap differs from public routes');
  let references = 0;
  for (const path of files.filter(f => /\.(html|css|js)$/.test(f))) {
    const source = read(path);
    if (path.endsWith('.html')) {
      for (const [,href] of source.matchAll(/(?:href|src)="((?:styles\.css|assets\/(?:js|css)\/(?:public-data|site|i18n|venue-selector)\.(?:js|css))[^\"]*)"/g)) {
        assert.ok(href.endsWith('?v=' + manifest.assetVersion), 'Stale shared asset version: ' + path);
      }
    }
    for (const [, href] of source.matchAll(/(?:href|src|poster)=["']([^"'<>]+)["']/g)) {
      if (/^([a-z]+:|\/\/|#)|\$\{/.test(href)) continue;
      const local = decodeURIComponent(href.split(/[?#]/)[0]);
      if (!local) continue;
      assert.ok(!forbiddenRoute.test(local), 'Retired route linked in ' + path);
      const name = (local.startsWith('/') ? local.slice(1) : posix.normalize(posix.join(path.endsWith('.html') ? posix.dirname(path) : '.', local))).replace(/\/$/, '');
      assert.ok([name, name + '.html', posix.join(name, 'index.html')].some(p => fileSet.has(p)), 'Missing public reference: ' + path + ' -> ' + local);
      references++;
    }
    if (path.endsWith('.js')) execFileSync(process.execPath, ['--check', resolve(root, path)], {stdio:'pipe'});
  }
  const context = {window:{}};
  vm.runInNewContext(read('assets/js/public-data.js'), context);
  assert.deepEqual(Object.keys(context.window.SY_DATA).sort(), ['branches','events','updatedAt'], 'Internal collections in public data');
  for (const branch of context.window.SY_DATA.branches) {
    for (const key of ['listings','alerts','pendingReviews','newReviews']) assert.ok(!(key in branch), 'Internal branch field');
    if (branch.page === '#') assert.equal(branch.status, 'coming-soon', 'Open branch needs a real page');
    else assert.ok(fileSet.has(branch.page), 'Branch page is not public: ' + branch.id);
    assert.match(branch.phoneIntl || '', /^(?:\+\d{8,15})?$/, 'Invalid branch phone: ' + branch.id);
    if (branch.venuePhoto) assert.ok(fileSet.has(branch.venuePhoto), 'Selector image missing from artifact: ' + branch.id);
  }
  const facts = JSON.parse(read('scripts/branch-import-manifest.json')).houston.facts;
  assert.equal(context.window.SY_DATA.branches.find(b => b.id === 'houston').phoneIntl, facts.phone.e164);
  return { files: files.length, pages: manifest.pages.length, references };
}
if (process.argv[1]?.endsWith('check-public.mjs')) console.log(JSON.stringify(checkPublic()));
