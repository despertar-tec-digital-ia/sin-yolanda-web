import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { inspectPlugin, packagePlugin, pluginName, projectRoot } from '../scripts/legacy-redirects/sin-yolanda-menu-redirect-pause/package.mjs';

const { root } = inspectPlugin();
const original = join(projectRoot, 'scripts/legacy-redirects/sin-yolanda-legacy-redirects');
const config = JSON.parse(readFileSync(join(original, 'redirects.json'), 'utf8'));
const php = [process.env.SY_LEGACY_PHP_BIN, 'php', '/Applications/XAMPP/xamppfiles/bin/php'].filter(Boolean).find(binary => {
  try { execFileSync(binary, ['--version'], { stdio: 'pipe' }); return true; } catch { return false; }
});
const phpOptions = php ? {} : { skip: 'PHP unavailable; WordPress behavior not runtime verified' };
const routes = Object.entries(config.sites).flatMap(([host, map]) => Object.entries(map)
  .filter(([source, target]) => host !== 'sinyolandagdl.com' && target.includes('/menu/')).map(([source, target]) => [host, source, target]));
const request = (uri = '/menu/', changes = {}) => ({ HTTP_HOST: 'sinyolandatx.com', REQUEST_METHOD: 'GET', REQUEST_URI: uri, ...changes });
function batch(cases, policy = config, loadOriginal = true) {
  const program = `if($argv[3]==='1')require $argv[1]; require $argv[2]; $p=json_decode(file_get_contents('php://stdin'),true);
    $out=[];foreach($p['cases'] as $c){$out[]=\\SinYolanda\\MenuRedirectPause\\shouldPause($c['server'],$c['location'],$p['config']);}echo json_encode($out);`;
  return JSON.parse(execFileSync(php, ['-r', program, join(original, 'redirect-engine.php'), join(root, 'pause-engine.php'), loadOriginal ? '1' : '0'], {
    input: JSON.stringify({ cases, config: policy }), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  }));
}
function adapter(server, context = {}, location = null, status = 301) {
  const program = `$p=json_decode(file_get_contents('php://stdin'),true);$context=$p['context'];$_SERVER=$p['server'];
    define('ABSPATH','/fixture/');define('REST_REQUEST',!empty($context['rest']));$filters=[];$redirect=null;
    function is_admin(){global $context;return !empty($context['admin']);}
    function is_user_logged_in(){global $context;return !empty($context['loggedIn']);}
    function is_preview(){global $context;return !empty($context['preview']);}
    function wp_doing_ajax(){global $context;return !empty($context['ajax']);}
    function add_filter($hook,$cb,$priority,$argc){global $filters;if($hook!=='wp_redirect'||$priority!==PHP_INT_MAX||$argc!==2)throw new Exception('Unexpected filter');$filters[]=$cb;}
    function add_action($hook,$cb,$priority){global $handler;if($hook!=='template_redirect'||$priority!==0)throw new Exception('Unexpected action');$handler=$cb;}
    function wp_redirect($location,$status,$by){global $filters,$redirect;foreach($filters as $f)$location=$f($location,$status);
      $redirect=['location'=>$location,'status'=>$status,'by'=>$by];if($location===false)return false;echo json_encode(['redirect'=>$redirect,'continued'=>false]);return true;}
    require $argv[1];require $argv[2];
    if($p['location']!==null){$result=$p['location'];foreach($filters as $f)$result=$f($result,$p['status']);echo json_encode(['location'=>$result]);}
    else{$handler();echo json_encode(['redirect'=>$redirect,'continued'=>true]);}`;
  return JSON.parse(execFileSync(php, ['-r', program, join(original, 'sin-yolanda-legacy-redirects.php'), join(root, 'sin-yolanda-menu-redirect-pause.php')], {
    input: JSON.stringify({ server, context, location, status }), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  }));
}

test('pause artifact has separate identity, exactly two PHP files and eight US menu routes', () => {
  assert.equal(routes.length, 8);
  assert.deepEqual(Object.keys(inspectPlugin().hashes).sort(), [pluginName + '/pause-engine.php', pluginName + '/sin-yolanda-menu-redirect-pause.php']);
  const manifest = JSON.parse(readFileSync(join(projectRoot, 'scripts/public-manifest.json'), 'utf8'));
  assert.ok(!JSON.stringify(manifest).includes('menu-redirect-pause'));
});
test('PHP 7.4-compatible files pass runtime syntax checks', phpOptions, () => {
  for (const file of ['pause-engine.php', 'sin-yolanda-menu-redirect-pause.php']) assert.match(execFileSync(php, ['-l', join(root, file)], { encoding: 'utf8' }), /No syntax errors/);
});
test('all eight exact menu routes pause GET/HEAD on apex/www and one optional slash', phpOptions, () => {
  const cases = routes.flatMap(([host, source, target]) => [host, 'www.' + host].flatMap(HTTP_HOST => ['GET', 'HEAD'].flatMap(REQUEST_METHOD =>
    [source, source.slice(0, -1)].map(uri => ({ server: request(uri, { HTTP_HOST, REQUEST_METHOD }), location: config.targetOrigin + target })))));
  assert.equal(cases.length, 64); assert.ok(batch(cases).every(Boolean));
  assert.deepEqual(batch([{ server: request('/menu/', { HTTP_HOST: 'WWW.SINYOLANDATX.COM' }), location: 'https://sin-yolanda.com/san-antonio/menu/' }]), [true]);
});
test('root, branch and Guadalajara redirects are preserved unchanged', phpOptions, () => {
  const cases = Object.entries(config.sites).flatMap(([host, map]) => Object.entries(map)
    .filter(([source, target]) => host === 'sinyolandagdl.com' || !target.includes('/menu/'))
    .map(([source, target]) => ({ server: request(source, { HTTP_HOST: host }), location: config.targetOrigin + target })));
  assert.ok(batch(cases).every(result => !result));
  assert.deepEqual(adapter(request('/', { HTTP_HOST: 'sinyolandatx.com' })), { redirect: { location: 'https://sin-yolanda.com/san-antonio', status: 301, by: 'Sin Yolanda Legacy Redirects' }, continued: false });
});
test('unknown, malicious and ambiguous requests never cancel redirects', phpOptions, () => {
  const invalid = ['/menu//', '//menu/', '/menu/../', '/Menu/', '/%6denu/', '/menu%2f', '/menu\\', '/menu/#x', '/menu/?action=submit',
    '/menu/?preview=1', '/menu/?s=private', '/menu/?email=private%40example.test', '/menu/?utm_source[]=instagram', '/unknown/', 'https://sinyolandatx.com/menu/'];
  const cases = invalid.map(uri => ({ server: request(uri), location: 'https://sin-yolanda.com/san-antonio/menu/' }));
  cases.push(...['POST', 'PUT', 'OPTIONS', 'get'].map(REQUEST_METHOD => ({ server: request('/menu/', { REQUEST_METHOD }), location: 'https://sin-yolanda.com/san-antonio/menu/' })));
  cases.push(...['evil.test', 'sinyolandatx.com.evil.test', 'sinyolandatx.com:443', 'www.www.sinyolandatx.com', 'sinyolandatx.com.'].map(HTTP_HOST => ({ server: request('/menu/', { HTTP_HOST }), location: 'https://sin-yolanda.com/san-antonio/menu/' })));
  assert.ok(batch(cases).every(result => !result));
  const locations = [false, null, 'http://sin-yolanda.com/san-antonio/menu/', 'https://evil.test/san-antonio/menu/', 'https://sin-yolanda.com.evil.test/san-antonio/menu/', 'https://sin-yolanda.com/houston/menu/', 'https://sin-yolanda.com/san-antonio/menu/?action=submit', 'https://sin-yolanda.com/san-antonio/menu/#other'];
  assert.ok(batch(locations.map(location => ({ server: request(), location }))).every(result => !result));
});
test('only the installed resolver exact sanitized UTM result is cancelled', phpOptions, () => {
  const cases = [
    { server: request('/cocktails/?utm_medium=social&utm_source=instagram'), location: 'https://sin-yolanda.com/san-antonio/menu/?utm_source=instagram&utm_medium=social#cocktails' },
    { server: request('/menu/?utm_source=private%40example.test&fbclid=private'), location: 'https://sin-yolanda.com/san-antonio/menu/' },
    { server: request('/menu/?utm_source=instagram'), location: 'https://sin-yolanda.com/san-antonio/menu/?utm_source=facebook' },
  ];
  assert.deepEqual(batch(cases), [true, true, false]);
});
test('missing dependency or changed policy fails without affecting redirects', phpOptions, () => {
  const cases = [{ server: request(), location: 'https://sin-yolanda.com/san-antonio/menu/' }];
  assert.deepEqual(batch(cases, config, false), [false]);
  for (const changes of [{ version: 2 }, { status: 302 }, { targetOrigin: 'https://evil.test' }, { sites: {} }]) assert.deepEqual(batch(cases, { ...config, ...changes }), [false]);
  const changed = structuredClone(config); changed.sites['sinyolandatx.com']['/menu/'] = '/houston/menu/';
  assert.deepEqual(batch(cases, changed), [false]);
});
test('WordPress resumes rendering its original template instead of exiting after paused redirect', phpOptions, () => {
  assert.deepEqual(adapter(request()), { redirect: { location: false, status: 301, by: 'Sin Yolanda Legacy Redirects' }, continued: true });
  assert.deepEqual(adapter(request('/menu/?utm_source=qr')), { redirect: { location: false, status: 301, by: 'Sin Yolanda Legacy Redirects' }, continued: true });
  for (const [host, source] of routes) assert.deepEqual(adapter(request(source, { HTTP_HOST: host })), {
    redirect: { location: false, status: 301, by: 'Sin Yolanda Legacy Redirects' }, continued: true,
  });
  for (const state of ['admin', 'loggedIn', 'preview', 'rest', 'ajax']) {
    assert.deepEqual(adapter(request(), { [state]: true }), { redirect: null, continued: true });
    assert.deepEqual(adapter(request(), { [state]: true }, 'https://sin-yolanda.com/san-antonio/menu/'), { location: 'https://sin-yolanda.com/san-antonio/menu/' });
  }
  assert.deepEqual(adapter(request(), {}, 'https://sin-yolanda.com/san-antonio/menu/', 302), { location: 'https://sin-yolanda.com/san-antonio/menu/' });
  assert.deepEqual(adapter(request('/menu/?action=submit')), { redirect: null, continued: true });
  assert.equal(execFileSync(php, ['-r', 'require $argv[1];echo "must not run";', join(root, 'sin-yolanda-menu-redirect-pause.php')], { encoding: 'utf8' }), '');
});
test('package allowlist excludes helper, originals and any public output', t => {
  mkdirSync(join(projectRoot, '.artifacts'), { recursive: true });
  const temporary = mkdtempSync(join(projectRoot, '.artifacts/menu-pause-test-')); t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const zip = join(temporary, 'pause.zip'); const report = packagePlugin(zip);
  assert.equal(report.routes, 8); assert.match(report.zipSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(JSON.parse(readFileSync(zip + '.json', 'utf8')), report);
  assert.throws(() => packagePlugin(zip), /overwrite/);
  assert.throws(() => packagePlugin(join(projectRoot, '.artifacts/public/plugin.zip')), /outside public/);
  assert.throws(() => packagePlugin(join(root, 'plugin.zip')), /under .artifacts/);
});
