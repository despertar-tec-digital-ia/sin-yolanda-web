import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inspectPlugin, packagePlugin, pluginName, projectRoot, sourceRoot } from '../scripts/legacy-redirects/package.mjs';
import { inspectPublic } from '../scripts/package-public.mjs';
import { actionLink, authenticate, createSession, credentialsFromEnvironment, fixedUrl, parseArguments,
  parseEnvironment, parseLoginForm, parsePlugins, parseUploadForm, pluginFile, verifyDestinations,
  validateInstallationReceipt, verifyUploadOutcome, verifyZip, writeSnapshot } from '../scripts/legacy-redirects/deploy-wordpress.mjs';

const { config, root } = inspectPlugin();
const phpCandidates = [process.env.SY_LEGACY_PHP_BIN, 'php', '/Applications/XAMPP/xamppfiles/bin/php'].filter(Boolean);
const php = phpCandidates.find(binary => {
  try { execFileSync(binary, ['--version'], { stdio: 'pipe' }); return true; } catch { return false; }
});
const phpOptions = php ? {} : { skip: 'PHP runtime unavailable: resolver and WordPress adapter are not runtime verified' };
const engine = join(root, 'redirect-engine.php');
const entry = join(root, 'sin-yolanda-legacy-redirects.php');
const approved = [
  ['sinyolandagdl.com', '/', '/san-ignacio'],
  ['sinyolandagdl.com', '/menu/', '/san-ignacio/menu/'],
  ['sinyolandagdl.com', '/cocteles-shots/', '/san-ignacio/menu/#cocktails'],
  ['sinyolandatx.com', '/', '/san-antonio'],
  ['sinyolandatx.com', '/menu/', '/san-antonio/menu/'],
  ['sinyolandatx.com', '/english/', '/en/san-antonio/menu/'],
  ['sinyolandatx.com', '/cocktails/', '/san-antonio/menu/#cocktails'],
  ['sinyolandausa.com', '/', '/the-woodlands'],
  ['sinyolandausa.com', '/sinyolanda-thewoodlands/', '/the-woodlands'],
  ['sinyolandausa.com', '/houston/', '/houston'],
  ['sinyolandausa.com', '/houston/menu/', '/houston/menu/'],
  ['sinyolandausa.com', '/sinyolanda-sanantonio/', '/san-antonio'],
  ['sinyolandausa.com', '/sinyolanda-sanantonio/menu-espanol/', '/san-antonio/menu/'],
  ['sinyolandausa.com', '/sinyolanda-sanantonio/english-menu/', '/en/san-antonio/menu/'],
  ['sinyolandausa.com', '/sinyolanda-thewoodlands/menu-espanol/', '/the-woodlands/menu/'],
  ['sinyolandausa.com', '/sinyolanda-thewoodlands/english-menu/', '/the-woodlands/menu/'],
];
const request = (uri = '/menu/', change = {}) => ({ REQUEST_METHOD: 'GET', HTTP_HOST: 'sinyolandagdl.com', REQUEST_URI: uri, ...change });
function resolveBatch(requests, policy = config) {
  const script = `require $argv[1]; $p=json_decode(file_get_contents('php://stdin'),true);
    $out=[]; foreach($p['requests'] as $r) {$out[]=\\SinYolanda\\LegacyRedirects\\resolve($r,$p['config']);}
    echo json_encode($out,JSON_UNESCAPED_SLASHES);`;
  return JSON.parse(execFileSync(php, ['-r', script, engine], {
    input: JSON.stringify({ requests, config: policy }), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  }));
}
function runAdapter(server, context = {}) {
  const script = `$p=json_decode(file_get_contents('php://stdin'),true); $context=$p['context'];
    $_SERVER=$p['server']; define('ABSPATH','/test-only/'); define('REST_REQUEST',!empty($context['rest']));
    function is_admin(){global $context;return !empty($context['admin']);}
    function is_user_logged_in(){global $context;return !empty($context['loggedIn']);}
    function is_preview(){global $context;return !empty($context['preview']);}
    function wp_doing_ajax(){global $context;return !empty($context['ajax']);}
    function add_action($hook,$callback,$priority){global $handler; if($hook!=='template_redirect'||$priority!==0)throw new Exception('Unexpected hook'); $handler=$callback;}
    function wp_redirect($location,$status,$by){echo json_encode(['location'=>$location,'status'=>$status,'by'=>$by],JSON_UNESCAPED_SLASHES);return true;}
    require $argv[1]; $handler(); echo json_encode(['redirect'=>null]);`;
  return JSON.parse(execFileSync(php, ['-r', script, entry], {
    input: JSON.stringify({ server, context }), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  }));
}

test('legacy map contains only the 16 approved origin-to-canonical equivalences', () => {
  const actual = Object.entries(config.sites).flatMap(([host, routes]) => Object.entries(routes).map(([path, target]) => [host, path, target]));
  assert.deepEqual(actual, approved);
  assert.deepEqual(Object.values(config.sites).map(v => Object.keys(v).length), [3, 4, 9]);
  const publicFiles = inspectPublic().files;
  assert.ok(publicFiles.every(path => !path.includes('legacy-redirects') && !path.endsWith('.zip')));
  assert.equal(config.targetOrigin, 'https://sin-yolanda.com'); assert.equal(config.status, 301);
});

test('PHP syntax is valid for both the pure resolver and the WordPress entry point', phpOptions, () => {
  for (const file of [engine, entry]) assert.match(execFileSync(php, ['-l', file], { encoding: 'utf8' }), /No syntax errors/);
});

test('all approved GET and HEAD routes use one fixed canonical target on apex and www', phpOptions, () => {
  const scenarios = approved.flatMap(([host, path, target]) => ['GET', 'HEAD'].flatMap(method => [host, 'www.' + host].flatMap(HTTP_HOST =>
    [...new Set([path, path === '/' ? '/' : path.slice(0, -1)])].map(uri => ({ server: request(uri, { HTTP_HOST, REQUEST_METHOD: method }), target }))
  )));
  const actual = resolveBatch(scenarios.map(v => v.server));
  assert.equal(scenarios.length, 116);
  actual.forEach((result, i) => assert.deepEqual(result, { status: 301, location: config.targetOrigin + scenarios[i].target }));
  assert.deepEqual(resolveBatch([request('/', { HTTP_HOST: 'WWW.SINYOLANDAGDL.COM' })])[0], { status: 301, location: config.targetOrigin + '/san-ignacio' });
});

test('unknown paths, ambiguous paths, unrelated hosts and non-GET methods remain in WordPress', phpOptions, () => {
  const paths = ['/wp-admin/', '/wp-admin/admin-ajax.php', '/wp-login.php', '/wp-json/', '/wp-json/wp/v2/pages', '/wp-content/uploads/menu.pdf',
    '/wp-content/plugins/a.php', '/xmlrpc.php', '/robots.txt', '/feed/', '/songs/', '/policy/', '/menu-other/', '/menu/a/', '/Menu/',
    '/%6denu/', '/menu%2f', '//menu/', '/menu//', '/menu/../', '/menu/./', '/menu\\', '/menu/#x', 'https://sinyolandagdl.com/menu/', '', '/menu/\r\n'];
  const hosts = ['sin-yolanda.com', 'evil.com', 'sinyolandagdl.com.evil.com', 'sinyolandagdl.com:8080', 'sinyolandagdl.com@evil.com',
    'www.www.sinyolandagdl.com', 'sinyolandagdl.com.', 'sinyolandagdl.com\r\nLocation: https://evil.com'];
  const requests = [...paths.map(uri => request(uri)), ...hosts.map(HTTP_HOST => request('/menu/', { HTTP_HOST })),
    ...['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'get'].map(REQUEST_METHOD => request('/menu/', { REQUEST_METHOD })),
    request('/menu/', { HTTP_HOST: 'evil.com', HTTP_X_FORWARDED_HOST: 'sinyolandagdl.com' }),
    request('/menu/', { HTTP_HOST: null }), request('/menu/', { REQUEST_METHOD: null }), request('a'.repeat(4097))];
  assert.ok(resolveBatch(requests).every(v => v === null));
});

test('pending selectors, forms, special menus and catering are never redirected', phpOptions, () => {
  const excluded = [
    ['sinyolandatx.com', '/menu-english/'],
    ['sinyolandausa.com', '/sin-yolanda-catering-form/'],
    ['sinyolandausa.com', '/sinyolanda-thewoodlands/special-menu/'],
    ['sinyolandausa.com', '/catering-experience/'],
    ['sinyolandausa.com', '/maricarmen/'],
  ];
  const requests = excluded.flatMap(([host, uri]) => [host, 'www.' + host].flatMap(HTTP_HOST => ['GET', 'HEAD', 'POST'].map(REQUEST_METHOD =>
    request(uri, { HTTP_HOST, REQUEST_METHOD }))));
  assert.ok(resolveBatch(requests).every(v => v === null));
});

test('only exact registered UTM values survive, before the cocktails fragment', phpOptions, () => {
  const scenarios = [
    ['utm_medium=social&utm_source=instagram', '?utm_source=instagram&utm_medium=social'],
    ['utm_source=%69nstagram&utm_medium=email', '?utm_source=instagram&utm_medium=email'],
    ['utm_source=instagram&utm_campaign=john-smith&utm_content=client-name&utm_term=person%40example.test&utm_id=1234567890', '?utm_source=instagram'],
    ['utm_source=person%40example.test&utm_medium=%2B15551234567', ''],
    ['utm_source=instagram&utm_source=facebook&utm_medium=social', '?utm_medium=social'],
    ['utm_source=instagram&utm_source=person%40example.test', ''],
    ['utm_source=Instagram&utm_medium=SOCIAL', ''],
    ['utm_source=https%3A%2F%2Fevil.com&utm_medium=%0d%0aLocation%3Aevil', ''],
    ['utm_source=instagram%250d&utm_medium=' + 'a'.repeat(81), ''],
    ['utm_source=qr&utm_unknown=private&fbclid=private-id&gclid=private-id', '?utm_source=qr'],
    ['fbclid=private-id&gad_campaignid=123456789&gclid=private-id', ''],
  ];
  const actual = resolveBatch(scenarios.map(([query]) => request('/cocteles-shots/?' + query)));
  actual.forEach((result, i) => assert.deepEqual(result, { status: 301, location: config.targetOrigin + '/san-ignacio/menu/' + scenarios[i][1] + '#cocktails' }));
  assert.deepEqual(config.utmValues.utm_campaign, []);
  assert.deepEqual(config.utmValues.utm_term, []);
  assert.deepEqual(config.utmValues.utm_content, []);
});

test('form, preview, REST, search and action query strings stay at their legacy origin', phpOptions, () => {
  const queries = ['email=private%40example.test', 'name=Client', 'phone=123456789', 'action=submit', '_wpnonce=private',
    'preview=true', 'preview_id=1', 'rest_route=%2Fwp%2Fv2%2Fpages', 's=song', 'p=1', 'page_id=2', 'add-to-cart=1',
    'elementor-preview=1', 'customize_changeset_uuid=private', 'redirect_to=https%3A%2F%2Fevil.com', 'utm_source[]=instagram',
    '%75tm_source=instagram', 'utm_source=instagram;email=private', 'utm_source=instagram#fragment', 'utm_source=instagram\n',
    'q=' + 'a'.repeat(2049)];
  assert.ok(resolveBatch(queries.map(query => request('/menu/?' + query))).every(v => v === null));
});

test('tampered configuration cannot change the origin, status or redirect scheme', phpOptions, () => {
  for (const change of [{ targetOrigin: 'https://evil.com' }, { status: 302 }, { version: 2 }, { sites: null }, { utmValues: 'arbitrary' }]) {
    assert.deepEqual(resolveBatch([request()], { ...config, ...change }), [null]);
  }
  for (const target of ['//evil.com/', 'https://evil.com/', '/menu/?redirect_to=https://evil.com', '/menu/\r\nLocation: evil',
    '/menu/#javascript:evil', '/menu/#cocktails#other', '/../', '/menu/%0d']) {
    const policy = structuredClone(config); policy.sites['sinyolandagdl.com']['/menu/'] = target;
    assert.deepEqual(resolveBatch([request()], policy), [null]);
  }
});

test('WordPress adapter preserves editor/admin/REST/AJAX flows and issues 301 only through WP', phpOptions, () => {
  assert.deepEqual(runAdapter(request()), { location: config.targetOrigin + '/san-ignacio/menu/', status: 301, by: 'Sin Yolanda Legacy Redirects' });
  for (const key of ['admin', 'loggedIn', 'preview', 'rest', 'ajax']) assert.deepEqual(runAdapter(request(), { [key]: true }), { redirect: null });
  assert.deepEqual(runAdapter(request('/menu/', { REQUEST_METHOD: 'POST' })), { redirect: null });
  assert.deepEqual(runAdapter(request('/unknown/')), { redirect: null });
  assert.equal(execFileSync(php, ['-r', 'require $argv[1]; echo "should not run";', entry], { encoding: 'utf8' }), '');
});

test('plugin ZIP includes only the exact three source files and cannot enter the public artifact', t => {
  const temporary = mkdtempSync(join(projectRoot, '.artifacts/sy-legacy-plugin-test-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const destination = join(temporary, 'plugin.zip');
  const report = packagePlugin(destination);
  assert.equal(report.routes, 16); assert.match(report.zipSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(report.files).sort(), ['redirect-engine.php', 'redirects.json', 'sin-yolanda-legacy-redirects.php'].map(f => pluginName + '/' + f).sort());
  assert.deepEqual(JSON.parse(readFileSync(destination + '.json', 'utf8')), report);
  assert.throws(() => packagePlugin(destination), /overwrite/);
  for (const path of [join(projectRoot, 'public/plugin.zip'), join(projectRoot, '.artifacts/public/plugin.zip'), join(sourceRoot, 'plugin.zip')]) {
    assert.throws(() => packagePlugin(path), /outside public|public output/);
    assert.ok(!existsSync(path));
  }
  const linked = join(temporary, 'linked'); symlinkSync(sourceRoot, linked);
  assert.throws(() => packagePlugin(join(linked, 'plugin.zip')), /symlinks/);
});

const wpOrigin = 'https://sinyolandatx.com';
const loginFixture = `<form id="loginform" action="${wpOrigin}/wp-login.php" method="post">
  <input name="log" type="text"><input type="password" name="pwd">
  <input name="testcookie" type="hidden" value="1"><input type="hidden" name="redirect_to" value="https://evil.test/">
  </form>`;
const uploadFixture = `<form method="post" enctype="multipart/form-data" action="${wpOrigin}/wp-admin/update.php?action=upload-plugin">
  <input type="hidden" name="_wpnonce" value="a1b2c3d4e5"><input type="file" name="pluginzip"></form>`;
const pluginFixture = `<table class="wp-list-table plugins"><tr class="active" data-plugin="cache/cache.php">
  <td>Cache<div>Version 2.1.0</div></td></tr><tr class="inactive" data-plugin="${pluginFile}"><td>
  <a href="${wpOrigin}/wp-admin/plugins.php?action=activate&amp;plugin=${encodeURIComponent(pluginFile)}&amp;_wpnonce=a1b2c3d4e5">Activate</a>
  <a href="https://example.test/documentation">Details</a><div>Version 1.0.0</div></td></tr></table>`;
const fixtureCredentials = { origin: wpOrigin, loginUrl: wpOrigin + '/wp-login.php', username: 'fixture-user', password: 'fixture-only-password' };

test('deployment arguments are read-only by default and actions cannot be combined', () => {
  assert.deepEqual(parseArguments(['--site', 'gdl']), { site: 'gdl', mode: 'inspect' });
  for (const mode of ['inspect', 'install', 'deactivate']) assert.equal(parseArguments(['--site', 'usa', '--' + mode]).mode, mode);
  assert.equal(parseArguments(['--site', 'usa', '--activate', '--backup', '/fixture/operation.json']).mode, 'activate');
  assert.throws(() => parseArguments(['--site', 'usa', '--activate']), /requires --backup/);
  for (const args of [[], ['--site', 'other'], ['--site', 'gdl', '--install', '--activate'], ['--site', 'tx', '--password', 'value']]) {
    assert.throws(() => parseArguments(args), /known site|Supported arguments/);
  }
});

test('credential parsing is literal and accepts only the fixed HTTPS origin for its site', () => {
  const values = parseEnvironment('TX_SITE_URL="https://sinyolandatx.com/"\nTX_WP_USER=fixture-user\nTX_WP_PASS=\'fixture # only\'\n');
  assert.deepEqual(credentialsFromEnvironment('tx', values), { origin: wpOrigin, loginUrl: wpOrigin + '/wp-login.php', username: 'fixture-user', password: 'fixture # only' });
  assert.equal(parseEnvironment('TX_WP_PASS=$(do-not-execute)\n').TX_WP_PASS, '$(do-not-execute)');
  for (const url of ['http://sinyolandatx.com', 'https://evil.test', 'https://sinyolandatx.com.evil.test', 'https://user:password@sinyolandatx.com', 'https://sinyolandatx.com:444']) {
    assert.throws(() => credentialsFromEnvironment('tx', { ...values, TX_SITE_URL: url }), /fixed legacy site/);
  }
  assert.throws(() => parseEnvironment('A=1\nA=2'), /duplicate/);
  assert.throws(() => parseEnvironment('A="unterminated'), /quoting/);
});

test('local HTML fixtures yield exact login/upload/actions without trusting external links', () => {
  assert.deepEqual(parseLoginForm(loginFixture, fixtureCredentials.loginUrl), { action: fixtureCredentials.loginUrl, hidden: { testcookie: '1' } });
  assert.deepEqual(parseUploadForm(uploadFixture, wpOrigin), { action: wpOrigin + '/wp-admin/update.php?action=upload-plugin', nonce: 'a1b2c3d4e5' });
  const plugins = parsePlugins(pluginFixture, wpOrigin);
  assert.equal(plugins.length, 2); assert.equal(plugins[0].active, true); assert.equal(plugins[1].active, false);
  assert.equal(plugins[1].version, '1.0.0');
  assert.equal(new URL(plugins[1].actions.activate).searchParams.get('plugin'), pluginFile);
  assert.equal(parseUploadForm('<p>Insufficient capability</p>', wpOrigin), null);
  assert.equal(parsePlugins(pluginFixture.replace('</table>', '<tr class="plugin-update-tr active" data-plugin="cache/cache.php"><td>Update</td></tr></table>'), wpOrigin).length, 2);
  assert.throws(() => parseLoginForm(loginFixture.replace(wpOrigin + '/wp-login.php', 'https://evil.test/wp-login.php'), fixtureCredentials.loginUrl), /fixed HTTPS origin/);
  assert.throws(() => parseUploadForm(uploadFixture.replace('action=upload-plugin', 'action=update-selected'), wpOrigin), /exact WordPress/);
  assert.throws(() => actionLink(plugins[1].actions.activate.replace(encodeURIComponent(pluginFile), 'other%2Fplugin.php'), wpOrigin, 'activate'), /exact installed plugin/);
  assert.throws(() => fixedUrl('//evil.test/', wpOrigin), /fixed HTTPS origin/);
  assert.throws(() => parseLoginForm('<div class="g-recaptcha"></div>' + loginFixture, fixtureCredentials.loginUrl), /challenge/);
  assert.doesNotThrow(() => verifyUploadOutcome({ status: 200, text: pluginFixture }, wpOrigin));
  for (const text of ['<input name="ftp_password">' + pluginFixture, '<input name="overwrite" value="update-plugin">' + pluginFixture,
    '<div class="notice-error">Failed</div>' + pluginFixture, '<p>Install status unknown</p>']) {
    assert.throws(() => verifyUploadOutcome({ status: 200, text }, wpOrigin), /Installation stopped|exact installed plugin/);
  }
});

test('HTTP fixture sends the credential POST once, with manual redirects and ephemeral cookies', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.redirect, 'manual'); assert.equal(new URL(url).origin, wpOrigin);
    if (options.method === 'GET') return new Response(loginFixture, { headers: { 'set-cookie': 'wordpress_test_cookie=fixture; Path=/; Secure' } });
    assert.ok(options.body instanceof URLSearchParams);
    assert.equal(options.body.get('log'), fixtureCredentials.username); assert.equal(options.body.get('pwd'), fixtureCredentials.password);
    assert.equal(options.body.get('redirect_to'), wpOrigin + '/wp-admin/plugins.php');
    assert.match(options.headers.Cookie, /wordpress_test_cookie=fixture/);
    return new Response('', { status: 302, headers: { location: wpOrigin + '/wp-admin/plugins.php', 'set-cookie': 'wordpress_logged_in_fixture=fixture-cookie; Path=/; Secure' } });
  };
  const session = createSession(wpOrigin, fetcher);
  assert.equal(await authenticate(session, fixtureCredentials), true);
  assert.equal(calls.length, 2); assert.equal(calls.filter(call => call.options.method === 'POST').length, 1);
  assert.equal(session.hasLoginCookie(), true);
  await assert.rejects(session.request('https://evil.test/wp-admin/'), /fixed HTTPS origin/);
  assert.equal(calls.length, 2);
});

test('auth fixture stops on foreign redirect, 307 replay, missing session or interactive challenge', async () => {
  for (const mode of ['foreign', 'replay', 'no-cookie', 'challenge']) {
    let postCount = 0;
    const session = createSession(wpOrigin, async (_url, options) => {
      if (options.method === 'GET') return new Response(loginFixture);
      postCount++;
      const headers = { location: mode === 'foreign' ? 'https://evil.test/' : wpOrigin + '/wp-admin/' };
      if (mode !== 'no-cookie') headers['set-cookie'] = 'wordpress_logged_in_fixture=fixture-cookie; Path=/; Secure';
      return new Response(mode === 'challenge' ? '<input name="authcode">' : '', { status: mode === 'replay' ? 307 : 302, headers });
    });
    await assert.rejects(authenticate(session, fixtureCredentials), /fixed HTTPS origin|interactive authentication/);
    assert.equal(postCount, 1);
  }
  const session = createSession(wpOrigin, async (_url, options) => options.method === 'GET' ? new Response(loginFixture)
    : new Response('', { status: 302, headers: { location: wpOrigin + '/', 'set-cookie': 'wordpress_logged_in_fixture=fixture-cookie; Path=/; Secure' } }));
  assert.equal(await authenticate(session, fixtureCredentials), true);
});

test('anonymous central preflight requires 200, canonical, indexability and cocktails anchor', async () => {
  const fetcher = async (url, options) => {
    assert.equal(new URL(url).origin, 'https://sin-yolanda.com'); assert.equal(options.headers.Cookie, undefined);
    const path = new URL(url).pathname;
    return new Response(`<link rel="canonical" href="https://sin-yolanda.com${path}"><section id="cocktails"></section>`);
  };
  assert.equal((await verifyDestinations(config, fetcher)).ready, true);
  for (const failure of ['noindex', 'wrong-canonical', 'missing-anchor', 'redirect']) {
    const result = await verifyDestinations(config, async url => new Response(
      failure === 'wrong-canonical' ? '<link rel="canonical" href="https://evil.test/">'
        : `<link rel="canonical" href="${url}">${failure === 'missing-anchor' ? '' : '<div id="cocktails"></div>'}`,
      { status: failure === 'redirect' ? 301 : 200, headers: failure === 'noindex' ? { 'x-robots-tag': 'noindex,nofollow' } : {} }));
    assert.equal(result.ready, false);
  }
});

test('ZIP validation matches the exact source and private snapshot excludes action nonces', t => {
  const temporary = mkdtempSync(join(projectRoot, '.artifacts/sy-wp-deploy-test-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const zip = join(temporary, 'plugin.zip');
  const report = packagePlugin(zip);
  assert.equal(verifyZip(zip).sha256, report.zipSha256);
  const plugins = parsePlugins(pluginFixture, wpOrigin);
  const snapshot = writeSnapshot('tx', plugins, { settings: { observedOrigin: wpOrigin }, pages: [{ id: 1, slug: 'menu', renderedContentSha256: '0'.repeat(64) }] });
  t.after(() => rmSync(join(snapshot, '..'), { recursive: true, force: true }));
  assert.equal(statSync(snapshot).mode & 0o777, 0o600);
  assert.equal(statSync(join(snapshot, '..')).mode & 0o777, 0o700);
  const text = readFileSync(snapshot, 'utf8');
  assert.doesNotMatch(text, /a1b2c3d4e5|_wpnonce|actions|cookie|fixture-only-password|<html/);
  assert.match(text, /not source restoration/);
});

test('activation receipt binds exact uploaded artifact, host, plugin and prior installation state', t => {
  const temporary = mkdtempSync(join(projectRoot, '.artifacts/sy-wp-receipt-test-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const path = join(temporary, 'plugin.zip'); packagePlugin(path); const zip = verifyZip(path);
  const snapshot = writeSnapshot('tx', [{ file: 'cache/cache.php', active: true, version: '1' }], { settings: { observedOrigin: wpOrigin }, pages: [] });
  const directory = join(snapshot, '..'); t.after(() => rmSync(directory, { recursive: true, force: true }));
  const receiptPath = join(directory, 'operation.json');
  const receipt = { site: 'tx', origin: wpOrigin, mode: 'install', changed: 'installed-inactive', pluginFile,
    pluginVersion: zip.config.pluginVersion, pluginActive: false, zipSha256: zip.sha256, files: inspectPlugin().hashes, snapshot };
  writeFileSync(receiptPath, JSON.stringify(receipt), { mode: 0o600 });
  assert.deepEqual(validateInstallationReceipt(receiptPath, 'tx', zip, wpOrigin), receipt);
  for (const change of [{ origin: 'https://evil.test' }, { site: 'gdl' }, { pluginActive: true }, { zipSha256: '0'.repeat(64) }, { pluginFile: 'other/plugin.php' }, { pluginVersion: '9.0.0' }]) {
    writeFileSync(receiptPath, JSON.stringify({ ...receipt, ...change }));
    assert.throws(() => validateInstallationReceipt(receiptPath, 'tx', zip, wpOrigin), /differs/);
  }
  assert.throws(() => validateInstallationReceipt(undefined, 'tx', zip, wpOrigin), /requires --backup/);
});
