import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { projectRoot } from '../scripts/legacy-redirects/package.mjs';
import { packagePlugin } from '../scripts/legacy-redirects/sin-yolanda-menu-redirect-pause/package.mjs';
import { actionLink, parseArguments, parsePausePlugins, pluginFile, pluginName, run, verifyUnchangedInventory,
  verifyUploadOutcome, verifyZip } from '../scripts/legacy-redirects/deploy-menu-pause.mjs';

const origin = 'https://sinyolandatx.com';
const originalFile = 'sin-yolanda-legacy-redirects/sin-yolanda-legacy-redirects.php';
const link = (file = pluginFile, action = 'activate') => `${origin}/wp-admin/plugins.php?action=${action}&plugin=${encodeURIComponent(file)}&_wpnonce=a1b2c3d4e5`;
const row = (file, active, version = '1.0.0') => `<tr data-plugin="${file}" class="${active ? 'active' : 'inactive'}"><td>
 <div>Version ${version}</div>${file === pluginFile ? `<a href="${link(file, active ? 'deactivate' : 'activate').replaceAll('&', '&amp;')}">Action</a>` : ''}</td></tr>`;
const inventory = (pause = null, cache = true) => '<table>' + row(originalFile, true) + row('cache/cache.php', cache, '2.0.0') + (pause === null ? '' : row(pluginFile, pause)) + '</table>';
const upload = `<form method="post" enctype="multipart/form-data" action="${origin}/wp-admin/update.php?action=upload-plugin">
 <input type="hidden" name="_wpnonce" value="a1b2c3d4e5"><input type="file" name="pluginzip"></form>`;
const uploaded = `<a href="${link().replaceAll('&', '&amp;')}">Activate</a>`;

function zipFixture(t) {
  const artifacts = join(projectRoot, '.artifacts'); mkdirSync(artifacts, { recursive: true });
  const dir = mkdtempSync(join(artifacts, 'menu-pause-operator-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const zip = join(dir, `${pluginName}-1.0.0.zip`); packagePlugin(zip); return zip;
}
function snapshotCleanup(t) {
  const base = join(projectRoot, '.artifacts/legacy-redirects/wordpress-backups');
  const before = new Set(existsSync(base) ? readdirSync(base) : []);
  t.after(() => {
    if (!existsSync(base)) return;
    for (const name of readdirSync(base)) if (!before.has(name) && /^tx-[a-zA-Z0-9]+$/.test(name)) rmSync(join(base, name), { recursive: true, force: true });
  });
  return () => readdirSync(base).filter(name => !before.has(name)).map(name => join(base, name, 'menu-pause-operation.json'));
}
function mockWordPress({ pause = null, uploadText = uploaded, activationLocation = '/wp-admin/plugins.php?activate=true', changeOther = false } = {}) {
  const calls = []; let installed = pause, state = 'before';
  const response = (text, status = 200, headers = {}) => new Response(text, { status, headers });
  async function fetcher(href, options) {
    const url = new URL(href); assert.equal(url.origin, origin); assert.equal(options.redirect, 'manual');
    calls.push({ path: url.pathname, query: url.search, method: options.method });
    if (url.pathname === '/wp-login.php' && options.method === 'GET') return response(`<form id="loginform" method="post" action="${origin}/wp-login.php"><input name="log"><input name="pwd" type="password"></form>`);
    if (url.pathname === '/wp-login.php' && options.method === 'POST') return response('', 302, { location: origin + '/wp-admin/plugins.php', 'set-cookie': 'wordpress_logged_in_fixture=fixture-cookie; Path=/; Secure' });
    if (url.pathname === '/wp-admin/plugin-install.php') return response(upload);
    if (url.pathname === '/wp-admin/update.php') { assert.equal(options.method, 'POST'); assert.ok(options.body instanceof FormData); assert.equal(options.body.get('pluginzip').name, `${pluginName}-1.0.0.zip`); installed = false; state = 'installed'; return response(uploadText); }
    if (url.pathname === '/wp-admin/plugins.php' && url.searchParams.get('action') === 'activate') { assert.equal(url.searchParams.get('plugin'), pluginFile); installed = true; state = 'activated'; return response('', 302, { location: new URL(activationLocation, origin).href }); }
    if (url.pathname === '/wp-admin/plugins.php') return response(inventory(installed, !changeOther || state !== 'activated'));
    if (url.pathname === '/wp-json/') { assert.equal(options.headers.Cookie, undefined); return response(JSON.stringify({ namespaces: ['wp/v2'] })); }
    if (url.pathname === '/wp-json/wp/v2/pages') { assert.equal(options.headers.Cookie, undefined); return response(JSON.stringify([{ id: 1, slug: 'menu', link: origin + '/menu/', status: 'publish', modified_gmt: '2026-10-08T00:00:00', title: { rendered: 'Menu' }, content: { rendered: '<img src="/wp-content/uploads/menu.jpg">' } }]), 200, { 'x-wp-totalpages': '1' }); }
    assert.fail('Unexpected fixture request');
  }
  return { fetcher, calls };
}
function reader(path) {
  assert.equal(path, join(resolve(projectRoot, '../..'), '.secrets/sin-yolanda-wp.env'));
  return 'TX_SITE_URL=https://sinyolandatx.com\nTX_WP_USER=fixture-user\nTX_WP_PASS=fixture-password\n';
}

test('menu-pause operation defaults to inspection and accepts only TX/USA with explicit one operation', () => {
  assert.deepEqual(parseArguments(['--site', 'tx']), { mode: 'inspect', site: 'tx' });
  assert.equal(parseArguments(['--site', 'usa', '--install-activate']).mode, 'install-activate');
  for (const args of [[], ['--site', 'gdl'], ['--site', 'tx', '--activate'], ['--site', 'tx', '--install'], ['--site', 'tx', '--inspect', '--install-activate'], ['--site', 'tx', '--site', 'usa'], ['--site', 'tx', '--credentials', '/tmp/file'], ['--site', 'tx', '--plugin', 'other/plugin.php']]) assert.throws(() => parseArguments(args));
});

test('menu-pause action is fixed to exact file, HTTPS origin, nonce and unambiguous allowed keys', () => {
  assert.equal(actionLink(link(), origin), link());
  for (const value of [link(originalFile), link('other/plugin.php'), link().replace(origin, 'https://evil.test'), link().replace('/plugins.php', '/update.php'), link() + '&plugin=x.php', link() + '&action=deactivate', link() + '&redirect_to=/other', link().replace('a1b2c3d4e5', 'bad'), link() + '#fragment', link().replace('https:', 'http:')]) assert.throws(() => actionLink(value, origin));
});

test('exact pause row keeps original inventory, ignores core update notices and validates its action', () => {
  const parsed = parsePausePlugins(inventory(false) + `<tr class="plugin-update-tr" data-plugin="${pluginFile}"></tr>`, origin);
  assert.equal(parsed.length, 3); assert.equal(parsed.find(p => p.file === pluginFile).actions.activate, link());
  assert.equal(parsed.find(p => p.file === originalFile).active, true);
  for (const html of [inventory(false).replace(link().replaceAll('&', '&amp;'), link(originalFile).replaceAll('&', '&amp;')), inventory(false) + row(pluginFile, false), inventory(false).replace('data-plugin="' + pluginFile + '"', 'data-plugin="' + pluginFile + '" data-plugin="other/a.php"')]) assert.throws(() => parsePausePlugins(html, origin));
});

test('upload outcome rejects errors, FTP, auth, replace and unrelated or duplicate activation links', () => {
  assert.equal(verifyUploadOutcome({ status: 200, text: uploaded }, origin), link());
  for (const text of [uploaded + '<input name="ftp_password">', uploaded + '<input name="overwrite">', uploaded + '<div class="notice-error">Error</div>', uploaded + '<form id="loginform"></form>', uploaded + '<div id="two_factor"></div>', uploaded.replace(pluginFile.replace('/', '%2F'), encodeURIComponent(originalFile)), uploaded + uploaded, uploaded.replace(origin, 'https://evil.test')]) assert.throws(() => verifyUploadOutcome({ status: 200, text }, origin));
  assert.throws(() => verifyUploadOutcome({ status: 302, text: uploaded }, origin));
});

test('ZIP provenance is exact and rejected after byte or receipt tampering', t => {
  const zip = zipFixture(t), checked = verifyZip(zip);
  assert.equal(checked.version, '1.0.0'); assert.equal(Object.keys(checked.files).length, 2);
  const receipt = JSON.parse(readFileSync(zip + '.json', 'utf8')); receipt.routes = 9; writeFileSync(zip + '.json', JSON.stringify(receipt));
  assert.throws(() => verifyZip(zip), /exact source or receipt/);
  assert.throws(() => verifyZip('/tmp/arbitrary.zip'), /private local artifact/);
});

test('inspection authenticates but makes no upload/activation and snapshots only public content privately', async t => {
  const zip = zipFixture(t); snapshotCleanup(t); const wp = mockWordPress();
  const result = await run({ site: 'tx', mode: 'inspect', zip }, wp.fetcher, reader);
  assert.equal(result.phase, 'inspected'); assert.equal(result.changed, null);
  assert.ok(wp.calls.every(call => call.path !== '/wp-admin/update.php' && !call.query.includes('action=activate')));
  const snapshot = JSON.parse(readFileSync(result.snapshot, 'utf8'));
  assert.match(snapshot.pages[0].publicRenderedContent, /menu.jpg/);
  assert.equal(statSync(result.snapshot).mode & 0o077, 0); assert.equal(statSync(result.operationReceipt).mode & 0o077, 0);
  assert.doesNotMatch(readFileSync(result.operationReceipt, 'utf8') + readFileSync(result.snapshot, 'utf8'), /fixture-password|fixture-cookie|_wpnonce|TX_WP_PASS/);
});

test('explicit additive operation installs inactive then records and activates only the fresh exact plugin', async t => {
  const zip = zipFixture(t); snapshotCleanup(t); const wp = mockWordPress();
  const result = await run({ site: 'tx', mode: 'install-activate', zip }, wp.fetcher, reader);
  assert.equal(result.phase, 'activated'); assert.equal(result.changed, 'installed-and-activated');
  assert.equal(result.unrelatedPluginStateUnchanged, true);
  assert.equal(wp.calls.filter(call => call.path === '/wp-admin/update.php').length, 1);
  assert.equal(wp.calls.filter(call => call.query.includes('action=activate')).length, 1);
  const receipt = JSON.parse(readFileSync(result.operationReceipt, 'utf8'));
  assert.equal(receipt.inventoryAfterInstall.find(p => p.file === pluginFile).active, false);
  assert.equal(receipt.inventoryAfter.find(p => p.file === pluginFile).active, true);
  assert.equal(receipt.inventoryAfter.find(p => p.file === originalFile).active, true);
});

test('already active target is recorded without write while an inactive prior upload is never replaced/activated', async t => {
  const zip = zipFixture(t); snapshotCleanup(t);
  const active = mockWordPress({ pause: true });
  assert.equal((await run({ site: 'tx', mode: 'install-activate', zip }, active.fetcher, reader)).phase, 'already-active');
  assert.ok(active.calls.every(call => call.path !== '/wp-admin/update.php' && !call.query.includes('action=activate')));
  const inactive = mockWordPress({ pause: false });
  await assert.rejects(run({ site: 'tx', mode: 'install-activate', zip }, inactive.fetcher, reader), /private operation receipt \(tx\)/);
  assert.ok(inactive.calls.every(call => call.path !== '/wp-admin/update.php' && !call.query.includes('action=activate')));
});

test('failed upload leaves complete stopped receipt without activation or secret error output', async t => {
  const zip = zipFixture(t), receipts = snapshotCleanup(t); const wp = mockWordPress({ uploadText: uploaded + '<input name="ftp_password">' });
  await assert.rejects(run({ site: 'tx', mode: 'install-activate', zip }, wp.fetcher, reader), /private operation receipt \(tx\)/);
  assert.equal(wp.calls.filter(call => call.query.includes('action=activate')).length, 0);
  const result = JSON.parse(readFileSync(receipts()[0], 'utf8'));
  assert.equal(result.outcome, 'failed'); assert.equal(result.failedPhase, 'upload-requested'); assert.equal(result.phase, 'stopped');
  assert.doesNotMatch(JSON.stringify(result), /fixture-password|fixture-cookie/);
});

test('unexpected activation redirect stops without following it or retrying', async t => {
  const zip = zipFixture(t); snapshotCleanup(t); const wp = mockWordPress({ activationLocation: 'https://evil.test/steal' });
  await assert.rejects(run({ site: 'tx', mode: 'install-activate', zip }, wp.fetcher, reader), /private operation receipt/);
  assert.equal(wp.calls.filter(call => call.query.includes('action=activate')).length, 1);
});

test('unrelated inventory change fails final verification rather than mutating other plugins', async t => {
  const zip = zipFixture(t); snapshotCleanup(t); const wp = mockWordPress({ changeOther: true });
  await assert.rejects(run({ site: 'tx', mode: 'install-activate', zip }, wp.fetcher, reader), /private operation receipt/);
  assert.throws(() => verifyUnchangedInventory([{ file: originalFile, active: true, version: '1' }], [{ file: originalFile, active: false, version: '1' }]), /unrelated plugin/);
});

test('credential read failures are redacted and no WordPress request occurs', async t => {
  const zip = zipFixture(t); let requests = 0;
  await assert.rejects(run({ site: 'tx', mode: 'inspect', zip }, () => { requests++; }, () => { throw new Error('fixture-password /private/secret/path'); }), error => error.message === 'Private WordPress credentials could not be read safely');
  assert.equal(requests, 0);
});
