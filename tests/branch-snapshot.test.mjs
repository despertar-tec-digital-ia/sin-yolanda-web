import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { capturePublicBranches, normalizePublicBranch, normalizeRenderedPage, publicUrl, publicText, parseArguments,
  validateOrigin, createSnapshotDirectory, writeSnapshotFile, sha256 } from '../scripts/snapshot-public-branches.mjs';

const origin = 'https://sin-yolanda.com/';
test('snapshot retains only whitelisted public branch facts, not internal metrics or arbitrary nested properties', () => {
  const record = normalizePublicBranch({ id: 'houston', name: 'Sin Yolanda Houston', address: '4901 Washington Ave',
    rating: 4.6, reviewsTotal: 152, revenue: 12345, credentials: 'never retain', analytics: { internal: 'never retain' },
    gallery: ['/images/photo.webp'], quotes: [{ text: 'Public quote', source: 'Google', stars: 5, email: 'private@example.com' }],
  }, origin);
  assert.equal(record.name, 'Sin Yolanda Houston');
  assert.equal(record.rating, 4.6);
  assert.equal(record.gallery[0], 'https://sin-yolanda.com/images/photo.webp');
  assert.equal(record.quotes[0].text, 'Public quote');
  assert.ok(!JSON.stringify(record).includes('never retain'));
  assert.ok(!Object.hasOwn(record.quotes[0], 'email'));
});
test('public URL sanitizer rejects credentials, executable schemes and internal routes; strips access keys', () => {
  for (const value of ['https://user:password@example.com/path', 'javascript:alert(1)', '/dashboard', '/admin/login', '/.env', '/api/private']) assert.equal(publicUrl(value, origin), null, value);
  assert.equal(publicUrl('https://www.google.com/maps/embed/v1/place?key=not-for-archive&q=Houston', origin), 'https://www.google.com/maps/embed/v1/place?q=Houston');
  assert.equal(publicUrl('https://example.com/#access_token=secret', origin), 'https://example.com/');
  assert.equal(publicUrl('tel:+13468791675', origin), 'tel:+13468791675');
});
test('rendered snapshot preserves visible content, FAQ and public Restaurant fields without arbitrary schema payloads', () => {
  const result = normalizeRenderedPage({ title: 'Houston', text: 'Public    branch text', language: 'es', branchIdentity: 'houston',
    headings: [{ level: 'h1', text: 'Houston' }], practicalRows: [{ label: 'Parking', text: 'Valet' }],
    faqs: [{ question: 'Groups?', answer: 'Call the branch.' }], links: [{ text: 'Admin', url: '/dashboard' }, { text: 'Reserve', url: 'https://www.opentable.com/r/sin-yolanda-houston' }],
    schemas: [{ '@graph': [{ '@type': 'Restaurant', name: 'Houston', telephone: '+13468791675', url: '/houston',
      address: { streetAddress: '4901 Washington Ave', privateContact: 'never retain' }, geo: { latitude: 29.77, longitude: -95.4 },
      openingHoursSpecification: [{ dayOfWeek: ['Wednesday'], opens: '12:00', closes: '21:00', internal: 'never retain' }],
      privateData: 'never retain' }, { '@type': 'Organization', internal: 'never retain' }] }],
  }, origin);
  assert.equal(result.text, 'Public branch text');
  assert.deepEqual(result.practicalRows, [{ label: 'Parking', text: 'Valet' }]);
  assert.equal(result.faqs[0].answer, 'Call the branch.');
  assert.equal(result.links.length, 1);
  assert.equal(result.schemas[0].address.streetAddress, '4901 Washington Ave');
  assert.equal(result.schemas[0].openingHoursSpecification[0].closes, '21:00');
  assert.ok(!JSON.stringify(result).includes('never retain'));
});
test('snapshot sanitizes accidentally displayed tokens without persisting them', () => {
  const value = 'AIza' + 'x'.repeat(35);
  assert.equal(publicText('Public ' + value), 'Public [redacted]');
  assert.equal(publicUrl('/photo?key=' + value, origin), 'https://sin-yolanda.com/photo');
});
test('CLI accepts only explicit known public branches and a clean source origin', () => {
  assert.deepEqual(parseArguments(['--output-dir', '.artifacts/fresh', '--branches', 'houston,el-paso']).branches, ['houston', 'el-paso']);
  for (const branches of ['maricarmen', 'houston,houston', '../dashboard', '']) assert.throws(() => parseArguments(['--output-dir', '.artifacts/fresh', '--branches', branches]));
  for (const source of ['https://user:secret@example.com/', 'https://example.com/path', 'https://example.com/?key=secret', 'file:///tmp/']) assert.throws(() => validateOrigin(source));
  assert.throws(() => parseArguments(['--unknown', 'value']));
});
test('snapshot files are immutable and cannot escape their chosen directory', t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'sy-branch-snapshot-test-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const output = createSnapshotDirectory(join(root, 'fresh'));
  writeSnapshotFile(output, 'houston.json', { id: 'houston' });
  assert.deepEqual(JSON.parse(readFileSync(join(output, 'houston.json'), 'utf8')), { id: 'houston' });
  assert.throws(() => writeSnapshotFile(output, 'houston.json', {}), /EEXIST/);
  assert.throws(() => createSnapshotDirectory(output), /overwrite/);
  assert.throws(() => writeSnapshotFile(output, '../escape.json', {}), /Unsafe/);
  symlinkSync(output, join(root, 'linked'));
  assert.throws(() => createSnapshotDirectory(join(root, 'linked', 'child')), /symlink/);
  assert.equal(sha256('public'), 'efa1f375d76194fa51a3556a97e641e61685f914d446979da50a551a4333ffd7');
});

function captureFixture(t, { unstable = false, identity = 'houston' } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'sy-branch-capture-test-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const requests = [], routeHandlers = [];
  let homeReads = 0, browserClosed = false;
  const page = {
    goto: async () => {},
    locator: selector => ({ waitFor: async () => {}, evaluateAll: async () => selector === 'script[src]' ? ['/assets/js/mock-data.js'] : [] }),
    evaluate: async callback => callback.toString().includes('window.SY_DATA') ? [
      { id: 'houston', name: 'Sin Yolanda Houston', address: '4901 Washington Ave', metrics: 'never retain' },
      { id: 'moreno-valley', status: 'coming-soon', name: 'Moreno Valley', revenue: 'never retain' },
      { id: 'unknown-private-branch', name: 'never retain' },
    ] : { title: 'Houston', branchIdentity: identity, canonical: origin + 'houston',
      text: 'Houston public branch text', headings: [{ level: 'h1', text: 'Houston' }] },
  };
  const context = { route: async (_, handler) => routeHandlers.push(handler), addInitScript: async () => {},
    newPage: async () => page, close: async () => {} };
  const chromium = { launch: async () => ({ newContext: async () => context, close: async () => { browserClosed = true; } }) };
  const fetchImpl = async (url, options) => {
    requests.push({ path: url.pathname, method: options.method || 'GET' });
    let text = 'public source ' + url.pathname;
    if (url.pathname === '/' && ++homeReads > 1 && unstable) text += ' changed';
    return new Response(text);
  };
  return { root, chromium, fetchImpl, requests, routeHandlers, browserClosed: () => browserClosed };
}

test('capture preserves five-page-compatible public schema with stability evidence and blocks mutations/external/internal browser requests', async t => {
  const fixture = captureFixture(t), outputDir = join(fixture.root, 'fresh');
  const report = await capturePublicBranches({ sourceOrigin: origin, outputDir, branches: ['houston'], chromium: fixture.chromium, fetchImpl: fixture.fetchImpl });
  assert.equal(report.complete, true);
  assert.equal(report.branches.length, 1);
  assert.equal(report.rawSourcesStored, false);
  assert.ok(report.sources.every(source => source.stable));
  assert.deepEqual(report.registry.announcementsWithoutPage, ['moreno-valley']);
  const registry = readFileSync(join(outputDir, 'public-registry.json'), 'utf8');
  assert.ok(!registry.includes('never retain'));
  assert.equal(JSON.parse(readFileSync(join(outputDir, 'manifest.json'), 'utf8')).complete, true);
  assert.ok(fixture.requests.every(request => request.method === 'GET'));
  assert.ok(fixture.browserClosed());
  for (const [url, method, expected] of [[origin + 'houston', 'GET', 'continued'],
    [origin + 'houston', 'POST', 'aborted'], ['https://external.example/path', 'GET', 'aborted'],
    [origin + 'api/private', 'GET', 'aborted'], [origin + 'umami.js', 'GET', 'aborted']]) {
    let result;
    await fixture.routeHandlers[0]({ request: () => ({ url: () => url, method: () => method }),
      abort: () => { result = 'aborted'; }, continue: () => { result = 'continued'; } });
    assert.equal(result, expected);
  }
});

test('capture never labels concurrently changed live sources as a complete snapshot', async t => {
  const fixture = captureFixture(t, { unstable: true });
  const report = await capturePublicBranches({ sourceOrigin: origin, outputDir: join(fixture.root, 'fresh'), branches: ['houston'], chromium: fixture.chromium, fetchImpl: fixture.fetchImpl });
  assert.equal(report.complete, false);
  assert.equal(report.sources.find(source => source.path === '/').stable, false);
  assert.ok(fixture.browserClosed());
});

test('capture rejects a wrong branch identity even if its canonical points to the requested branch', async t => {
  const fixture = captureFixture(t, { identity: 'san-antonio' });
  const report = await capturePublicBranches({ sourceOrigin: origin, outputDir: join(fixture.root, 'fresh'), branches: ['houston'], chromium: fixture.chromium, fetchImpl: fixture.fetchImpl });
  assert.equal(report.complete, false);
  assert.equal(report.branches.length, 0);
  assert.match(report.errors[0].message, /Wrong public page identity/);
  assert.ok(fixture.browserClosed());
});
