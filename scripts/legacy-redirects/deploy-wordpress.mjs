import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectPlugin, pluginName, projectRoot } from './package.mjs';

export const pluginFile = `${pluginName}/${pluginName}.php`;
const privateFile = join(resolve(projectRoot, '../..'), '.secrets/sin-yolanda-wp.env');
const sites = {
  gdl: { host: 'sinyolandagdl.com', loginKey: 'MATRIZ_WP_LOGIN_URL', userKey: 'MATRIZ_WP_USER', passKey: 'MATRIZ_WP_PASS' },
  tx: { host: 'sinyolandatx.com', urlKey: 'TX_SITE_URL', userKey: 'TX_WP_USER', passKey: 'TX_WP_PASS' },
  usa: { host: 'sinyolandausa.com', urlKey: 'USA_SITE_URL', userKey: 'USA_WP_USER', passKey: 'USA_WP_PASS' },
};
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(message); };
const challenge = html => /cf-chl-|challenge-platform|(?:class|id)=["'][^"']*(?:g-recaptcha|h-captcha|two-factor|two_factor)|name=["'](?:authcode|otp|two_factor_code)["']|id=["']login_error["']/i.test(html);

export function parseEnvironment(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || Object.hasOwn(values, match[1])) fail('Credential file has an unsupported or duplicate entry');
    let value = match[2];
    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value[0];
      const end = value.lastIndexOf(quote);
      if (end === 0 || !/^\s*(?:#.*)?$/.test(value.slice(end + 1))) fail('Credential file has invalid quoting');
      value = value.slice(1, end);
      if (quote === '"') value = value.replace(/\\([\\"])/g, '$1');
    } else value = value.replace(/\s+#.*$/, '').trim();
    values[match[1]] = value;
  }
  return values;
}

export function credentialsFromEnvironment(site, values) {
  const settings = sites[site];
  if (!settings) fail('Choose a known site: gdl, tx or usa');
  const configured = values[settings.loginKey ?? settings.urlKey];
  const url = new URL(configured || `https://${settings.host}${settings.loginKey ? '/wp-login.php' : '/'}`);
  if (url.protocol !== 'https:' || url.port || url.username || url.password
    || ![settings.host, 'www.' + settings.host].includes(url.hostname)) fail('Credential origin is outside the fixed legacy site');
  const username = values[settings.userKey], password = values[settings.passKey];
  if (!username || !password || /[\r\n\0]/.test(username + password)) fail('Required login credentials are unavailable');
  return { origin: url.origin, loginUrl: settings.loginKey ? url.href : url.origin + '/wp-login.php', username, password };
}

function decode(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[0-9a-f]+);/gi, entity => {
    const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const numeric = entity.slice(2, -1), point = numeric[0].toLowerCase() === 'x' ? parseInt(numeric.slice(1), 16) : parseInt(numeric, 10);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
  });
}
function attributes(text) {
  const output = {};
  for (const match of text.matchAll(/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    output[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return output;
}
function forms(html) {
  return [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form\s*>/gi)].map(match => ({
    ...attributes(match[1]), inputs: [...match[2].matchAll(/<input\b([^>]*)>/gi)].map(input => attributes(input[1])),
  }));
}
export function fixedUrl(value, origin) {
  let url;
  try { url = new URL(value, origin); } catch { fail('Invalid WordPress action URL'); }
  if (url.origin !== origin || url.protocol !== 'https:' || url.username || url.password || url.hash) fail('WordPress action leaves the fixed HTTPS origin');
  return url;
}
export function parseLoginForm(html, loginUrl) {
  if (challenge(html)) fail('Login requires an interactive authentication challenge');
  const form = forms(html).find(form => form.inputs.some(input => input.name === 'log') && form.inputs.some(input => input.name === 'pwd'));
  if (!form || (form.method ?? '').toLowerCase() !== 'post') fail('Supported WordPress login form was not found');
  const login = new URL(loginUrl), action = fixedUrl(form.action || loginUrl, login.origin);
  if (![login.pathname, '/wp-login.php'].includes(action.pathname)) fail('Unexpected WordPress login action');
  return { action: action.href, hidden: Object.fromEntries(form.inputs.filter(input => input.type === 'hidden'
    && ['testcookie', '_wpnonce'].includes(input.name)).map(input => [input.name, input.value ?? ''])) };
}
export function parseUploadForm(html, origin) {
  const form = forms(html).find(form => form.inputs.some(input => input.name === 'pluginzip' && input.type === 'file'));
  if (!form) return null;
  const action = fixedUrl(form.action || '', origin);
  const nonce = form.inputs.find(input => input.name === '_wpnonce')?.value;
  if ((form.method ?? '').toLowerCase() !== 'post' || (form.enctype ?? '').toLowerCase() !== 'multipart/form-data'
    || action.pathname !== '/wp-admin/update.php' || action.searchParams.get('action') !== 'upload-plugin'
    || [...action.searchParams.keys()].some(key => key !== 'action') || !/^[a-zA-Z0-9]{8,64}$/.test(nonce ?? '')) {
    fail('Upload form failed its exact WordPress contract');
  }
  return { action: action.href, nonce };
}
export function actionLink(value, origin, action) {
  const url = fixedUrl(value, origin);
  if (url.pathname !== '/wp-admin/plugins.php' || url.searchParams.get('action') !== action
    || url.searchParams.get('plugin') !== pluginFile || !/^[a-zA-Z0-9]{8,64}$/.test(url.searchParams.get('_wpnonce') ?? '')
    || [...url.searchParams.keys()].some(key => !['action', 'plugin', '_wpnonce', 'plugin_status', 'paged', 's'].includes(key))) {
    fail('Plugin action does not target the exact installed plugin');
  }
  return url.href;
}
export function verifyUploadOutcome(response, origin) {
  if (response.status !== 200 || challenge(response.text)
    || /name=["'](?:hostname|ftp_username|ftp_password|connection_type|overwrite)["']|overwrite=(?:update-plugin|true)|class=["'][^"']*(?:notice-error|\berror\b)/i.test(response.text)) {
    fail('Installation stopped: upload failed, replacement or interactive/FTP access was requested; no retry or activation');
  }
  const links = [...response.text.matchAll(/<a\b([^>]*)>/gi)].map(match => attributes(match[1]).href).filter(Boolean);
  const installedLink = links.find(value => {
    try { const url = new URL(value, origin); return url.searchParams.get('action') === 'activate' && url.searchParams.get('plugin') === pluginFile; }
    catch { return false; }
  });
  if (!installedLink) fail('Upload did not return the exact installed plugin action; stop and inspect');
  actionLink(installedLink, origin, 'activate');
}
export function parsePlugins(html, origin) {
  if (challenge(html) || /<form\b[^>]*id=["']loginform["']/i.test(html)) fail('Authenticated plugin page is unavailable');
  const plugins = [];
  for (const match of html.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr\s*>/gi)) {
    const attrs = attributes(match[1]), file = attrs['data-plugin'];
    // Core's update-notice row repeats data-plugin but is not another install.
    if ((attrs.class ?? '').split(/\s+/).includes('plugin-update-tr')) continue;
    if (!file || !/^[a-zA-Z0-9_.\/-]+\.php$/.test(file) || file.includes('..')) continue;
    const links = [...match[2].matchAll(/<a\b([^>]*)>/gi)].map(link => attributes(link[1]).href).filter(Boolean);
    const actions = {};
    if (file === pluginFile) for (const candidate of links) {
      let url; try { url = new URL(candidate, origin); } catch { continue; }
      const action = url.searchParams.get('action');
      if (action === 'activate' || action === 'deactivate') actions[action] = actionLink(candidate, origin, action);
    }
    const version = match[2].match(/(?:Version|Versión)\s+([0-9][a-zA-Z0-9.+_-]*)/i)?.[1] ?? null;
    plugins.push({ file, active: (attrs.class ?? '').split(/\s+/).includes('active'), version, actions });
  }
  if (!plugins.length) fail('Plugin inventory could not be read reliably');
  if (new Set(plugins.map(plugin => plugin.file)).size !== plugins.length) fail('Ambiguous plugin inventory');
  return plugins;
}

/** Cookies and nonces are ephemeral. No HTML or authentication state is persisted. */
export function createSession(origin, fetcher = fetch) {
  fixedUrl(origin, origin);
  const cookies = new Map();
  async function request(value, { method = 'GET', body, authenticated = true } = {}) {
    const url = fixedUrl(value, origin), headers = { 'User-Agent': 'SinYolanda-WP-Release/1.0', Accept: 'text/html,application/json' };
    if (authenticated) {
      const applicable = [...cookies.values()].filter(cookie => url.pathname.startsWith(cookie.path));
      if (applicable.length) headers.Cookie = applicable.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    }
    if (body instanceof URLSearchParams) headers['Content-Type'] = 'application/x-www-form-urlencoded';
    let response;
    try { response = await fetcher(url.href, { method, body, headers, redirect: 'manual', signal: AbortSignal.timeout(20000) }); }
    catch { fail('WordPress request failed; authentication material was not logged'); }
    if (authenticated) for (const cookie of response.headers.getSetCookie?.() ?? []) {
      const parts = cookie.split(';').map(value => value.trim()), split = parts[0].indexOf('=');
      if (split < 1) continue;
      const name = parts[0].slice(0, split), value = parts[0].slice(split + 1);
      const props = Object.fromEntries(parts.slice(1).map(part => { const i = part.indexOf('='); return [part.slice(0, i < 0 ? part.length : i).toLowerCase(), i < 0 ? true : part.slice(i + 1)]; }));
      const domain = typeof props.domain === 'string' ? props.domain.replace(/^\./, '').toLowerCase() : url.hostname;
      if (!/^[a-zA-Z0-9_-]+$/.test(name) || /[\r\n;]/.test(value)
        || !(url.hostname === domain || url.hostname.endsWith('.' + domain))) continue;
      const path = typeof props.path === 'string' && props.path.startsWith('/') ? props.path : '/';
      cookies.set(name, { name, value, path });
    }
    let text;
    try { text = await response.text(); } catch { fail('WordPress response could not be read'); }
    if (text.length > 8 * 1024 * 1024) fail('WordPress response exceeds the inspection limit');
    return { status: response.status, headers: response.headers, text };
  }
  return { origin, request, hasLoginCookie: () => [...cookies.keys()].some(name => name.startsWith('wordpress_logged_in_')) };
}
async function okGet(session, path, authenticated = true) {
  const response = await session.request(path, { authenticated });
  if (response.status !== 200 || (authenticated && challenge(response.text))) fail('WordPress read requires additional access or a challenge');
  return response;
}
export async function authenticate(session, credentials) {
  if (credentials.origin !== session.origin) fail('Login origin differs from the fixed session');
  const login = await okGet(session, credentials.loginUrl), form = parseLoginForm(login.text, credentials.loginUrl);
  const fields = new URLSearchParams({ ...form.hidden, log: credentials.username, pwd: credentials.password,
    redirect_to: session.origin + '/wp-admin/plugins.php', 'wp-submit': 'Log In' });
  const response = await session.request(form.action, { method: 'POST', body: fields });
  // Never repeat or forward the credential POST, including 307/308 redirects.
  if (![200, 302, 303].includes(response.status) || challenge(response.text) || !session.hasLoginCookie()) {
    fail('WordPress login failed or needs interactive authentication');
  }
  if (response.status !== 200) {
    // A site may send a successful login to its own home. Do not follow it;
    // inspect plugins.php explicitly next to prove the admin session/capability.
    fixedUrl(response.headers.get('location') ?? '', session.origin);
  }
  return true;
}

export function verifyZip(path) {
  const inspected = inspectPlugin();
  const file = resolve(path ?? join(projectRoot, '.artifacts/legacy-redirects', `${pluginName}-${inspected.config.pluginVersion}.zip`));
  if (!existsSync(file) || lstatSync(file).isSymbolicLink() || !lstatSync(file).isFile()) fail('Verified plugin ZIP is unavailable');
  let receipt;
  try { receipt = JSON.parse(readFileSync(file + '.json', 'utf8')); } catch { fail('Plugin ZIP receipt is unavailable'); }
  const bytes = readFileSync(file);
  if (receipt.version !== inspected.config.pluginVersion || receipt.routes !== 16 || receipt.zipSha256 !== sha256(bytes)
    || JSON.stringify(receipt.files) !== JSON.stringify(inspected.hashes)) fail('Plugin ZIP differs from the exact current source or receipt');
  const entries = execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' }).trim().split('\n');
  if (entries.join('\n') !== Object.keys(inspected.hashes).join('\n')) fail('Plugin ZIP contains unexpected entries');
  for (const [entry, digest] of Object.entries(inspected.hashes)) {
    if (sha256(execFileSync('unzip', ['-p', file, entry])) !== digest) fail('Plugin ZIP entry differs from its source hash');
  }
  return { path: file, bytes, sha256: receipt.zipSha256, config: inspected.config };
}
export async function verifyDestinations(config, fetcher = fetch) {
  const session = createSession('https://sin-yolanda.com', fetcher), results = [];
  for (const target of [...new Set(Object.values(config.sites).flatMap(routes => Object.values(routes)))]) {
    const [path, fragment] = target.split('#');
    const response = await session.request(path, { authenticated: false });
    const links = [...response.text.matchAll(/<link\b([^>]*)>/gi)].map(match => attributes(match[1]));
    const meta = [...response.text.matchAll(/<meta\b([^>]*)>/gi)].map(match => attributes(match[1]));
    const canonical = links.find(link => (link.rel ?? '').split(/\s+/).includes('canonical'))?.href;
    const noindex = /noindex|nofollow/i.test(response.headers.get('x-robots-tag') ?? '')
      || meta.some(item => ['robots', 'googlebot'].includes((item.name ?? '').toLowerCase()) && /noindex|nofollow/i.test(item.content ?? ''));
    const hasFragment = !fragment || [...response.text.matchAll(/\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].some(match => (match[1] ?? match[2]) === fragment);
    const ready = response.status === 200 && canonical === 'https://sin-yolanda.com' + path && !noindex && hasFragment;
    results.push({ target, ready });
  }
  return { ready: results.every(result => result.ready), targets: results };
}

async function publicSnapshot(session) {
  const publicSettings = await okGet(session, '/wp-json/', false);
  let settings;
  try { settings = JSON.parse(publicSettings.text); } catch { fail('Public WordPress metadata is unavailable'); }
  const pages = [];
  for (let page = 1; page <= 10; page++) {
    const response = await okGet(session, `/wp-json/wp/v2/pages?context=view&status=publish&per_page=100&page=${page}&_fields=id,slug,link,status,modified_gmt,title,content`, false);
    let items;
    try { items = JSON.parse(response.text); } catch { fail('Public page inventory is unavailable'); }
    if (!Array.isArray(items) || items.some(item => item.status !== 'publish')) fail('Public page inventory returned an unexpected scope');
    for (const item of items) {
      const url = fixedUrl(item.link, session.origin);
      if (!Number.isInteger(item.id) || !/^[a-zA-Z0-9_-]+$/.test(item.slug ?? '')) fail('Public page inventory has an unsupported record');
      pages.push({ id: item.id, slug: item.slug, path: url.pathname, modifiedGmt: item.modified_gmt ?? null,
        renderedContentSha256: sha256(typeof item.content?.rendered === 'string' ? item.content.rendered : '') });
    }
    const total = Number(response.headers.get('x-wp-totalpages') ?? 1);
    if (page >= total) break;
    if (page === 10) fail('Public page inventory exceeds the snapshot limit');
  }
  return { settings: { observedOrigin: session.origin, publicRestAvailable: true,
    namespaces: Array.isArray(settings.namespaces) ? settings.namespaces.filter(value => /^[a-zA-Z0-9_.\/-]+$/.test(value)) : [] }, pages };
}
export function writeSnapshot(site, plugins, state) {
  if (!sites[site]) fail('Unknown WordPress snapshot site');
  const artifacts = join(projectRoot, '.artifacts'), base = join(artifacts, 'legacy-redirects/wordpress-backups');
  for (let parent = base; parent !== projectRoot; parent = dirname(parent)) {
    if (existsSync(parent) && lstatSync(parent).isSymbolicLink()) fail('Backup directory cannot contain symlinks');
  }
  mkdirSync(base, { recursive: true, mode: 0o700 });
  const directory = mkdtempSync(join(base, `${site}-`));
  const file = join(directory, 'snapshot.json');
  const snapshot = { version: 1, capturedAt: new Date().toISOString(), site,
    scope: 'Public page inventory/content hashes and plugin state only; not source restoration, a database or full WordPress backup',
    plugins: plugins.map(({ file, active, version }) => ({ file, active, version })),
    settings: state.settings, pages: state.pages, incomplete: state.incomplete ?? false };
  writeFileSync(file, JSON.stringify(snapshot, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  return file;
}
export function validateInstallationReceipt(path, site, zip, origin) {
  if (!path) fail('Activation requires --backup with this exact installation receipt');
  const file = resolve(path), allowedRoot = join(projectRoot, '.artifacts/legacy-redirects/wordpress-backups') + '/';
  if (!file.startsWith(allowedRoot) || !existsSync(file) || lstatSync(file).isSymbolicLink()
    || !lstatSync(file).isFile() || (lstatSync(file).mode & 0o077) !== 0) fail('Installation receipt must be a private local backup file');
  for (let parent = dirname(file); parent !== projectRoot; parent = dirname(parent)) {
    if (lstatSync(parent).isSymbolicLink()) fail('Installation receipt cannot contain symlinked parents');
  }
  let receipt;
  try { receipt = JSON.parse(readFileSync(file, 'utf8')); } catch { fail('Installation receipt is invalid'); }
  if (receipt.site !== site || receipt.origin !== origin || receipt.mode !== 'install'
    || receipt.changed !== 'installed-inactive' || receipt.pluginFile !== pluginFile
    || receipt.pluginVersion !== zip.config.pluginVersion || receipt.pluginActive !== false
    || receipt.zipSha256 !== zip.sha256 || JSON.stringify(receipt.files) !== JSON.stringify(inspectPlugin().hashes)) {
    fail('Installation receipt differs from this site, plugin, ZIP or inactive installation');
  }
  const snapshotPath = resolve(receipt.snapshot ?? '');
  if (dirname(snapshotPath) !== dirname(file) || !existsSync(snapshotPath)
    || lstatSync(snapshotPath).isSymbolicLink() || (lstatSync(snapshotPath).mode & 0o077) !== 0) fail('Installation snapshot is unavailable');
  let snapshot;
  try { snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')); } catch { fail('Installation snapshot is invalid'); }
  if (snapshot.site !== site || snapshot.settings?.observedOrigin !== origin
    || !Array.isArray(snapshot.plugins) || snapshot.plugins.some(plugin => plugin.file === pluginFile)) {
    fail('Snapshot does not match the prior state of this additive installation');
  }
  return receipt;
}
export function parseArguments(args) {
  const parsed = { mode: 'inspect' }, modes = [];
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (['--inspect', '--install', '--activate', '--deactivate'].includes(flag)) modes.push(flag.slice(2));
    else if (['--site', '--zip', '--backup'].includes(flag) && args[i + 1] && !args[i + 1].startsWith('--')) parsed[flag.slice(2)] = args[++i];
    else fail('Supported arguments: --site gdl|tx|usa, --inspect, --install, --activate, --deactivate, --zip and --backup');
  }
  if (!sites[parsed.site] || modes.length > 1) fail('Select one known site and at most one action');
  if (modes.length) parsed.mode = modes[0];
  if (parsed.mode === 'activate' && !parsed.backup) fail('Activation requires --backup with the installation receipt');
  if (parsed.backup && parsed.mode !== 'activate') fail('--backup is reserved for exact activation');
  return parsed;
}

export async function run(options, fetcher = fetch) {
  // Rollback must remain available even when a local ZIP/receipt has been lost.
  const zip = options.mode === 'deactivate' ? null : verifyZip(options.zip);
  let values;
  try { values = parseEnvironment(readFileSync(privateFile, 'utf8')); } catch { fail('Private WordPress credential file could not be read safely'); }
  const credentials = credentialsFromEnvironment(options.site, values), session = createSession(credentials.origin, fetcher);
  if (options.mode === 'activate') validateInstallationReceipt(options.backup, options.site, zip, session.origin);
  await authenticate(session, credentials);
  const pluginPage = await okGet(session, '/wp-admin/plugins.php?plugin_status=all');
  const plugins = parsePlugins(pluginPage.text, session.origin), existing = plugins.find(plugin => plugin.file === pluginFile);
  let upload = null;
  if (options.mode === 'inspect' || options.mode === 'install') {
    const uploadPage = await session.request('/wp-admin/plugin-install.php?tab=upload');
    upload = uploadPage.status === 200 && !challenge(uploadPage.text) ? parseUploadForm(uploadPage.text, session.origin) : null;
  }
  let state;
  try { state = await publicSnapshot(session); }
  catch (error) {
    if (options.mode !== 'deactivate') throw error;
    // A REST outage must not block removal of the redirect hook during rollback.
    state = { settings: { observedOrigin: session.origin, publicRestAvailable: false }, pages: [], incomplete: true };
  }
  const backup = writeSnapshot(options.site, plugins, state);
  const destinations = options.mode === 'deactivate' ? null : await verifyDestinations(zip.config, fetcher);
  const result = { site: options.site, mode: options.mode, authenticated: true,
    canUploadPlugin: ['inspect', 'install'].includes(options.mode) ? Boolean(upload) : null,
    pluginInstalled: Boolean(existing), pluginActive: existing?.active ?? false, zipSha256: zip?.sha256 ?? null,
    snapshot: backup, snapshotScope: 'metadata and source hashes only; original remote pages/plugins are retained', destinations };
  if (options.mode === 'inspect') return result;
  if (!['install', 'activate', 'deactivate'].includes(options.mode)) fail('Unsupported WordPress operation');
  if (options.mode !== 'deactivate' && !destinations.ready) fail('Approved canonical destinations are not all indexable and ready; no plugin change was made');

  if (options.mode === 'install') {
    if (existing) fail('Plugin already exists; refusing replacement or upgrade');
    if (!upload) fail('Standard plugin upload is unavailable');
    const form = new FormData(); form.append('_wpnonce', upload.nonce);
    form.append('_wp_http_referer', '/wp-admin/plugin-install.php?tab=upload');
    form.append('pluginzip', new Blob([zip.bytes], { type: 'application/zip' }), `${pluginName}-${zip.config.pluginVersion}.zip`);
    form.append('install-plugin-submit', 'Install Now');
    const response = await session.request(upload.action, { method: 'POST', body: form });
    verifyUploadOutcome(response, session.origin);
    // Verify state afresh. Never follow an activation or overwrite link from upload HTML.
    const after = parsePlugins((await okGet(session, '/wp-admin/plugins.php?plugin_status=all')).text, session.origin);
    const installed = after.find(plugin => plugin.file === pluginFile);
    if (!installed || installed.active || installed.version !== zip.config.pluginVersion) fail('Uploaded plugin state differs from the expected inactive version; stop and inspect');
    const operationReceipt = join(dirname(backup), 'operation.json');
    const installedResult = { ...result, origin: session.origin, pluginFile, pluginVersion: zip.config.pluginVersion,
      files: inspectPlugin().hashes, pluginInstalled: true, pluginActive: false, changed: 'installed-inactive', operationReceipt };
    writeFileSync(operationReceipt, JSON.stringify(installedResult, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    return installedResult;
  }
  if (!existing) fail('Exact plugin is not installed');
  const action = options.mode;
  if ((action === 'activate') === existing.active) fail('Plugin already has the requested state; no change was made');
  if (action === 'activate' && existing.version !== zip.config.pluginVersion) fail('Installed version differs from the verified ZIP');
  const link = existing.actions[action];
  if (!link) fail('Authorized plugin action is unavailable');
  const response = await session.request(actionLink(link, session.origin, action));
  if (![200, 302, 303].includes(response.status) || challenge(response.text)) fail('Plugin state action failed; no retry');
  if (response.status !== 200) {
    const target = fixedUrl(response.headers.get('location') ?? '', session.origin);
    if (target.pathname !== '/wp-admin/plugins.php') fail('Plugin action returned an unexpected redirect');
  }
  const after = parsePlugins((await okGet(session, '/wp-admin/plugins.php?plugin_status=all')).text, session.origin);
  const current = after.find(plugin => plugin.file === pluginFile);
  if (!current || current.active !== (action === 'activate')) fail('Plugin state did not match the requested operation; stop and inspect');
  return { ...result, pluginActive: current.active, changed: action === 'activate' ? 'activated' : 'deactivated' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await run(parseArguments(process.argv.slice(2))), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
