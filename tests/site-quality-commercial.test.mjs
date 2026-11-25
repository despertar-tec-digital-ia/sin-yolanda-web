import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';
import {projectQualitySeo} from '../scripts/site-quality/seo-projection.mjs';
import {projectCommercialData, inspectCommercialData} from '../scripts/site-quality/commercial-data.mjs';

const root = resolve(import.meta.dirname, '..');
const source = file => readFileSync(resolve(root, file), 'utf8');
const manifest = JSON.parse(source('scripts/public-manifest.json'));
const baseline = projectPublicSite(root, {now: '2026-11-23T23:00:00Z', commit: 'a'.repeat(40)});
function fixture() {
  const files = new Map(baseline.files);
  const read = file => files.get(file) ?? source(file);
  const pages = new Map(manifest.pages.map(file => [file, read(file)]));
  for (const pair of projectQualitySeo({pages, read}).files) files.set(...pair);
  for (const pair of projectCommercialData({pages, read}).files) files.set(...pair);
  return {pages, read, files};
}
test('commercial candidate derives five canonical destinations and preserves phones, addresses and every provider', () => {
  const input = fixture(), report = inspectCommercialData(input);
  assert.equal(report.passed, true, report.error);
  assert.equal(report.branches, 5);
  assert.equal(report.profiles.find(item => item.branch === 'houston').telephone, '+13468791675');
  assert.match(report.profiles.find(item => item.branch === 'the-woodlands').address.streetAddress, /Suite 180/);
  const parse = text => JSON.parse(text.slice(text.indexOf('=') + 1, text.indexOf('\nif (window.SY_OCTOBER_HOURS)')).trim().replace(/;$/, ''));
  const before = parse(baseline.files.get('assets/js/public-data.js') ?? source('assets/js/public-data.js'));
  const after = parse(input.read('assets/js/public-data.js'));
  for (const branch of before.branches) {
    const next = after.branches.find(item => item.id === branch.id);
    assert.deepEqual({...next, website: branch.website}, branch, 'Only the active website destination may change');
    if (branch.status !== 'active') assert.deepEqual(next, branch, 'Do not activate an unopened branch');
  }
  assert.equal(projectCommercialData(input).files.size, 0, 'Projection is idempotent');
});
test('contact drift across languages, visible phones, discovery and public data blocks acceptance', () => {
  const language = fixture();
  language.pages.set('en/houston/index.html', language.pages.get('en/houston/index.html').replace('"telephone":"+13468791675"', '"telephone":"+17134854024"'));
  assert.equal(inspectCommercialData(language).passed, false);
  const visible = fixture();
  visible.pages.set('houston.html', visible.pages.get('houston.html').replaceAll('tel:+13468791675', 'tel:+17134854024'));
  assert.match(inspectCommercialData(visible).error, /visible phone/);
  const discovery = fixture();
  const data = JSON.parse(discovery.read('discovery.json')); data.locations.find(item => item.id === 'houston').telephone = '+17134854024';
  discovery.files.set('discovery.json', JSON.stringify(data));
  assert.match(inspectCommercialData(discovery).error, /discovery phone/);
  const directory = fixture();
  directory.files.set('assets/js/public-data.js', directory.read('assets/js/public-data.js').replace('"phoneIntl": "+13468791675"', '"phoneIntl": "+17134854024"'));
  assert.match(inspectCommercialData(directory).error, /public phone/);
});
