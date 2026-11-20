import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';
import {projectQualitySeo, inspectProjectedSeo} from '../scripts/site-quality/seo-projection.mjs';

const root = new URL('../', import.meta.url).pathname;
const source = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const manifest = JSON.parse(source('scripts/public-manifest.json'));
const projection = projectPublicSite(root, {now: '2026-11-19T18:00:00.000Z', commit: 'a'.repeat(40)});
const finalRead = file => projection.files.get(file) ?? source(file);
const finalPages = () => new Map(manifest.pages.map(file => [file, finalRead(file)]));
const documents = html => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  .map(([, value]) => JSON.parse(value));
const nodes = html => documents(html).flatMap(document => document['@graph'] ?? [document]);
const rewriteNodes = (html, transform) => html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g,
  (_tag, start, value, end) => {const document = JSON.parse(value); for (const node of document['@graph'] ?? [document]) transform(node); return start + JSON.stringify(document) + end;});
const fixture = (pages = finalPages(), read = finalRead) => ({pages, read});

test('candidate SEO derives the directory from published Restaurant identities and repairs only broken logos', () => {
  const input = fixture(), before = [...input.pages], result = projectQualitySeo(input);
  assert.deepEqual([...input.pages], before, 'Never mutate the caller page map');
  assert.deepEqual([...result.files.keys()].sort(), ['assets/js/webmcp.js', 'discovery.json', 'eventos.html',
    'la-cantina.html', 'llms.txt', 'locations.html']);
  assert.equal(result.metadata.restaurantCount, 5);
  const items = nodes(result.files.get('locations.html')).find(node => node['@type'] === 'ItemList').itemListElement;
  assert.deepEqual(items.map(item => item.position), [1, 2, 3, 4, 5]);
  const profiles = [...input.pages.values()].flatMap(nodes).filter(node => node['@type'] === 'Restaurant' && node.url === node['@id'].split('#')[0]);
  assert.deepEqual(items.map(item => item.item), profiles.map(node => ({'@type': 'Restaurant', '@id': node['@id'], name: node.name, url: node.url})));
  assert.ok(items.some(item => item.item.url === 'https://sin-yolanda.com/el-paso'));
  assert.ok(items.some(item => item.item.url === 'https://sin-yolanda.com/guadalajara'));
  assert.ok(items.every(item => !item.item.url.endsWith('.html')));
  for (const file of ['eventos.html', 'la-cantina.html']) {
    const organization = nodes(result.files.get(file)).find(node => node['@type'] === 'Organization');
    assert.equal(organization.logo, result.metadata.approvedLogo);
  }
});

test('Catering auxiliaries follow the final Service while preserving menus, contacts and providers', () => {
  const result = projectQualitySeo(fixture());
  const original = JSON.parse(finalRead('discovery.json')), updated = JSON.parse(result.files.get('discovery.json'));
  const expected = structuredClone(original); delete expected.catering.areaServed;
  assert.deepEqual(updated, expected);
  assert.ok(nodes(finalRead('catering.html')).some(node => node['@type'] === 'Service' && node.areaServed === undefined));
  assert.equal(result.files.get('llms.txt'), finalRead('llms.txt').replace('[Catering en Houston]', '[Catering]'));
  assert.equal(result.files.get('assets/js/webmcp.js'), finalRead('assets/js/webmcp.js').replace('published Houston catering menus', 'published catering menus'));
  for (const [file, before] of finalPages()) {
    const after = result.files.get(file) ?? before;
    assert.equal(after.match(/<body\b[\s\S]*<\/body>/i)?.[0], before.match(/<body\b[\s\S]*<\/body>/i)?.[0], file + ': preserve the entire visible body');
    assert.deepEqual(nodes(after).filter(node => ['Restaurant', 'Service'].includes(node['@type'])),
      nodes(before).filter(node => ['Restaurant', 'Service'].includes(node['@type'])), file + ': preserve business facts/providers');
  }
  assert.equal(result.files.has('index.html'), false, 'The complete approved home remains untouched');
});

test('applying the candidate projection again produces no changes', () => {
  const first = projectQualitySeo(fixture()), pages = finalPages();
  for (const [file, html] of first.files) if (file.endsWith('.html')) pages.set(file, html);
  const second = projectQualitySeo({pages, read: file => first.files.get(file) ?? finalRead(file)});
  assert.equal(second.files.size, 0);
  assert.deepEqual(second.changes, []);
});

test('the approved home logo must resolve inside the final package', () => {
  const logoPath = new URL(nodes(finalRead('index.html')).find(node => node['@type'] === 'Organization').logo).pathname.slice(1);
  assert.throws(() => projectQualitySeo(fixture(finalPages(), file => {
    if (file === logoPath) throw new Error('Missing approved asset');
    return finalRead(file);
  })), /approved Organization logo is missing/);
});

test('an unpublished Restaurant URL is rejected instead of creating another location', () => {
  const pages = finalPages();
  pages.set('el-paso.html', rewriteNodes(pages.get('el-paso.html'), node => {
    if (node['@type'] === 'Restaurant') node.url = 'https://sin-yolanda.com/unpublished-location';
  }));
  assert.throws(() => projectQualitySeo(fixture(pages)), /Restaurant URL is not a published canonical/);
});

test('coming-soon references remain excluded without a full published Restaurant profile', () => {
  const pages = finalPages();
  pages.set('index.html', rewriteNodes(pages.get('index.html'), node => {
    if (node['@type'] === 'Organization') node.subOrganization.push({'@type': 'Restaurant',
      '@id': 'https://sin-yolanda.com/ciudad-juarez#restaurant', name: 'Reference only', url: 'https://sin-yolanda.com/ciudad-juarez'});
  }));
  const result = projectQualitySeo(fixture(pages));
  assert.equal(result.metadata.restaurantCount, 5);
  assert.doesNotMatch(result.files.get('locations.html'), /Reference only/);
  assert.equal(result.files.has('ciudad-juarez.html'), false);
  assert.equal(result.files.has('index.html'), false);
});

test('invalid JSON-LD anywhere in the page inventory fails before producing candidate files', () => {
  const pages = finalPages();
  pages.set('catering.html', pages.get('catering.html').replace('<script id="seo-page" type="application/ld+json">{', '<script id="seo-page" type="application/ld+json">{broken'));
  assert.throws(() => projectQualitySeo(fixture(pages)), /Invalid JSON-LD in catering.html/);
});

test('inconsistent translated Restaurant facts and Catering scope fail closed', () => {
  const pages = finalPages();
  pages.set('en/houston/index.html', rewriteNodes(pages.get('en/houston/index.html'), node => {
    if (node['@type'] === 'Restaurant') node.telephone = '+10000000000';
  }));
  assert.throws(() => projectQualitySeo(fixture(pages)), /Restaurant editions disagree on telephone/);
  const cateringPages = finalPages();
  cateringPages.set('en/catering/index.html', rewriteNodes(cateringPages.get('en/catering/index.html'), node => {
    if (node['@type'] === 'Service') node.areaServed = {'@type': 'City', name: 'Unconfirmed scope'};
  }));
  assert.throws(() => projectQualitySeo(fixture(cateringPages)), /Catering editions disagree on areaServed/);
});

test('artifact inspection detects the stale directory and missing JSON-LD logo despite otherwise public HTML', () => {
  const report = inspectProjectedSeo({...fixture(), publicFiles: [...manifest.pages, ...manifest.assets]});
  assert.equal(report.passed, false);
  assert.ok(report.errors.some(error => error.code === 'directory-restaurant-mismatch' && error.file === 'locations.html'));
  assert.ok(report.errors.some(error => error.code === 'schema-reference-outside-artifact' && error.file === 'la-cantina.html' && error.path.endsWith('.logo')));
  assert.ok(report.errors.some(error => error.code === 'schema-reference-outside-artifact' && error.file === 'eventos.html' && error.path.endsWith('.logo')));
  assert.ok(report.errors.some(error => error.code === 'catering-scope-mismatch'));
});

test('the final candidate passes the artifact inspector without a fixed page count', () => {
  const projected = projectQualitySeo(fixture()), pages = finalPages();
  for (const [file, html] of projected.files) if (file.endsWith('.html')) pages.set(file, html);
  const read = file => projected.files.get(file) ?? finalRead(file);
  const report = inspectProjectedSeo({pages, read, publicFiles: new Set([...manifest.pages, ...manifest.assets])});
  assert.deepEqual(report.errors, []);
  assert.equal(report.passed, true);
  assert.equal(report.summary.pages, manifest.pages.length);
  assert.ok(report.summary.checkedSchemaReferences > 0);
  const partial = inspectProjectedSeo({pages: new Map([...pages].filter(([file]) => file !== 'el-paso.html')), read,
    publicFiles: [...manifest.pages, ...manifest.assets]});
  assert.equal(partial.passed, false);
  assert.ok(partial.errors.some(error => error.code === 'public-page-not-inspected' && error.file === 'el-paso.html'));
});
