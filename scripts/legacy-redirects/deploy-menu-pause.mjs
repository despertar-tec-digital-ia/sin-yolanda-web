import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticate, createSession, credentialsFromEnvironment, fixedUrl, parseEnvironment,
  parsePlugins, parseUploadForm, pluginFile as originalPluginFile, writeSnapshot } from './deploy-wordpress.mjs';
import { projectRoot } from './package.mjs';
import { inspectPlugin } from './sin-yolanda-menu-redirect-pause/package.mjs';

export const pluginName = 'sin-yolanda-menu-redirect-pause';
export const pluginFile = `${pluginName}/${pluginName}.php`;
export const pluginVersion = '1.0.0';
const privateFile = join(resolve(projectRoot, '../..'), '.secrets/sin-yolanda-wp.env');
const fail = message => { throw new Error(message); };
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const challenge = html => /cf-chl-|challenge-platform|(?:class|id)=["'][^"']*(?:g-recaptcha|h-captcha|two-factor|two_factor)|name=["'](?:authcode|otp|two_factor_code)["']|id=["']login_error["']/i.test(html);

function attributes(source) {
  const result = {};
  for (const match of source.matchAll(/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    const key = match[1].toLowerCase();
    if (Object.hasOwn(result, key)) fail('Ambiguous WordPress HTML attributes');
    result[key] = (match[2] ?? match[3] ?? match[4] ?? '').replace(/&amp;|&#0*38;|&#x0*26;/gi, '&');
  }
  return result;
}

export function actionLink(value, origin, action = 'activate') {
  if (action !== 'activate' && action !== 'deactivate') fail('Unsupported exact plugin action');
  const url = fixedUrl(value, origin, origin + '/wp-admin/plugins.php');
  const keys = [...url.searchParams.keys()];
  if (url.pathname !== '/wp-admin/plugins.php' || url.searchParams.get('action') !== action
    || url.searchParams.get('plugin') !== pluginFile || !/^[a-zA-Z0-9]{8,64}$/.test(url.searchParams.get('_wpnonce') ?? '')
    || keys.some(key => !['action', 'plugin', '_wpnonce', 'plugin_status', 'paged', 's'].includes(key))
    || new Set(keys).size !== keys.length) fail('Plugin action does not target the exact menu-pause plugin');
  return url.href;
}

export function parsePausePlugins(html, origin) {
  const allRows = [...html.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr\s*>/gi)].map(match => ({ match, attrs: attributes(match[1]) }));
  const inventory = parsePlugins(html, origin);
  const target = inventory.find(item => item.file === pluginFile);
  if (!target) return inventory;
  const rows = allRows.filter(({ attrs }) => {
    return attrs['data-plugin'] === pluginFile && !(attrs.class ?? '').split(/\s+/).includes('plugin-update-tr');
  }).map(({ match }) => match);
  if (rows.length !== 1) fail('Ambiguous exact menu-pause plugin row');
  for (const match of rows[0][2].matchAll(/<a\b([^>]*)>/gi)) {
    const href = attributes(match[1]).href;
    if (!href) continue;
    let url; try { url = new URL(href, origin + '/wp-admin/plugins.php'); } catch { continue; }
    const action = url.searchParams.get('action');
    if (action === 'activate' || action === 'deactivate') {
      if (target.actions[action]) fail('Ambiguous menu-pause plugin action');
      target.actions[action] = actionLink(href, origin, action);
    }
  }
  return inventory;
}

export function verifyUploadOutcome(response, origin) {
  if (response.status !== 200 || challenge(response.text)
    || /<form\b[^>]*id=["']loginform["']|name=["'](?:hostname|ftp_username|ftp_password|connection_type|overwrite)["']|overwrite=(?:update-plugin|true)|class=["'][^"']*(?:notice-error|\berror\b)/i.test(response.text)) {
    fail('Installation stopped: error, authentication, replacement or FTP access requested; no retry or activation');
  }
  const links = [...response.text.matchAll(/<a\b([^>]*)>/gi)].map(match => attributes(match[1]).href).filter(Boolean);
  const activation = links.filter(value => {
    try { const url = new URL(value, origin + '/wp-admin/update.php'); return url.searchParams.get('action') === 'activate' && url.searchParams.get('plugin') === pluginFile; }
    catch { return false; }
  });
  if (activation.length !== 1) fail('Upload did not return one exact menu-pause activation action');
  return actionLink(activation[0], origin);
}

export function verifyZip(path) {
  const inspected = inspectPlugin();
  if (inspected.version !== pluginVersion || inspected.routes !== 8) fail('Menu-pause source contract differs from the approved version');
  const expected = [`${pluginName}/pause-engine.php`, pluginFile].sort();
  if (JSON.stringify(Object.keys(inspected.hashes).sort()) !== JSON.stringify(expected)) fail('Menu-pause source contains unexpected files');
  const file = resolve(path ?? join(projectRoot, '.artifacts/legacy-redirects', `${pluginName}-${pluginVersion}.zip`));
  const artifactRoot = join(projectRoot, '.artifacts') + '/';
  if (!file.startsWith(artifactRoot) || file.slice(artifactRoot.length).split('/').includes('public')) fail('Menu-pause ZIP must be a private local artifact');
  if (!existsSync(file) || lstatSync(file).isSymbolicLink() || !lstatSync(file).isFile()) fail('Verified menu-pause ZIP is unavailable');
  for (let parent = dirname(file); parent !== projectRoot; parent = dirname(parent)) {
    if (lstatSync(parent).isSymbolicLink()) fail('Menu-pause artifact cannot contain symlinked parents');
  }
  if (!existsSync(file + '.json') || lstatSync(file + '.json').isSymbolicLink() || !lstatSync(file + '.json').isFile()) fail('Menu-pause ZIP receipt is unavailable');
  let receipt;
  try { receipt = JSON.parse(readFileSync(file + '.json', 'utf8')); } catch { fail('Menu-pause ZIP receipt is unavailable'); }
  const bytes = readFileSync(file);
  if (receipt.version !== pluginVersion || receipt.routes !== 8 || receipt.zipSha256 !== digest(bytes)
    || JSON.stringify(receipt.files) !== JSON.stringify(inspected.hashes)) fail('Menu-pause ZIP differs from its exact source or receipt');
  let entries;
  try { entries = execFileSync('unzip', ['-Z1', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim().split('\n'); }
  catch { fail('Menu-pause ZIP could not be inspected'); }
  if (JSON.stringify(entries.sort()) !== JSON.stringify(expected)) fail('Menu-pause ZIP contains unexpected entries');
  for (const [entry, hash] of Object.entries(inspected.hashes)) {
    let content;
    try { content = execFileSync('unzip', ['-p', file, entry], { stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch { fail('Menu-pause ZIP entry could not be inspected'); }
    if (digest(content) !== hash) fail('Menu-pause ZIP entry differs from its source hash');
  }
  return { path: file, bytes, sha256: receipt.zipSha256, files: inspected.hashes, version: pluginVersion };
}

export function parseArguments(args) {
  const result = { mode: 'inspect' }, modes = [];
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (['--inspect', '--install-activate'].includes(flag)) modes.push(flag.slice(2));
    else if (['--site', '--zip'].includes(flag) && args[i + 1] && !args[i + 1].startsWith('--')) {
      const key = flag.slice(2);
      if (Object.hasOwn(result, key)) fail('Duplicate menu-pause operation argument');
      result[key] = args[++i];
    } else fail('Supported arguments: --site tx|usa, --inspect or --install-activate, and --zip');
  }
  if (!['tx', 'usa'].includes(result.site) || modes.length > 1) fail('Choose TX or USA and at most one exact operation');
  if (modes.length) result.mode = modes[0];
  return result;
}

async function okGet(session, path, authenticated = true) {
  const response = await session.request(path, { authenticated });
  if (response.status !== 200 || (authenticated && (challenge(response.text) || /<form\b[^>]*id=["']loginform["']/i.test(response.text)))) {
    fail('WordPress read requires additional access or an authentication challenge');
  }
  return response;
}

async function publicSnapshot(session) {
  let settings;
  try { settings = JSON.parse((await okGet(session, '/wp-json/', false)).text); } catch { fail('Public WordPress metadata is unavailable'); }
  const pages = [];
  for (let page = 1; page <= 10; page++) {
    const response = await okGet(session, `/wp-json/wp/v2/pages?context=view&status=publish&per_page=100&page=${page}&_fields=id,slug,link,status,modified_gmt,title,content`, false);
    let items;
    try { items = JSON.parse(response.text); } catch { fail('Public page inventory is unavailable'); }
    if (!Array.isArray(items) || items.some(item => item.status !== 'publish')) fail('Public page inventory returned an unexpected scope');
    for (const item of items) {
      const url = fixedUrl(item.link, session.origin);
      if (!Number.isInteger(item.id) || !/^[a-zA-Z0-9_-]+$/.test(item.slug ?? '') || typeof item.content?.rendered !== 'string') fail('Public page snapshot has an unsupported record');
      pages.push({ id: item.id, slug: item.slug, path: url.pathname, modifiedGmt: item.modified_gmt ?? null,
        renderedContentSha256: digest(item.content.rendered), publicRenderedContent: item.content.rendered,
        publicRenderedTitle: typeof item.title?.rendered === 'string' ? item.title.rendered : '' });
    }
    const total = Number(response.headers.get('x-wp-totalpages') ?? 1);
    if (!Number.isInteger(total) || total < 1 || total > 10) fail('Public page inventory exceeds the supported snapshot limit');
    if (page >= total) break;
  }
  return { settings: { observedOrigin: session.origin, publicRestAvailable: true,
    namespaces: Array.isArray(settings.namespaces) ? settings.namespaces.filter(value => /^[a-zA-Z0-9_.\/-]+$/.test(value)) : [] }, pages };
}

export function verifyUnchangedInventory(before, after) {
  const state = plugins => plugins.filter(plugin => plugin.file !== pluginFile).map(({ file, active, version }) => ({ file, active, version })).sort((a, b) => a.file.localeCompare(b.file));
  if (JSON.stringify(state(before)) !== JSON.stringify(state(after))) fail('An unrelated plugin changed; stop without retry or further actions');
}

/** The fixed secret file is read only at execution; the optional reader is a fixture seam, not a CLI option. */
export async function run(options, fetcher = fetch, reader = path => readFileSync(path, 'utf8')) {
  if (!['tx', 'usa'].includes(options.site) || !['inspect', 'install-activate'].includes(options.mode)) fail('Unsupported exact menu-pause operation');
  const zip = verifyZip(options.zip);
  let values;
  try { values = parseEnvironment(reader(privateFile)); } catch { fail('Private WordPress credentials could not be read safely'); }
  const credentials = credentialsFromEnvironment(options.site, values), session = createSession(credentials.origin, fetcher);
  await authenticate(session, credentials);
  const plugins = parsePausePlugins((await okGet(session, '/wp-admin/plugins.php?plugin_status=all')).text, session.origin);
  const uploadPage = await okGet(session, '/wp-admin/plugin-install.php?tab=upload');
  const upload = parseUploadForm(uploadPage.text, session.origin);
  const backup = writeSnapshot(options.site, plugins, await publicSnapshot(session));
  const operationReceipt = join(dirname(backup), 'menu-pause-operation.json');
  const receipt = { version: 1, capturedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), site: options.site,
    origin: session.origin, mode: options.mode, phase: 'inspected', authenticated: true, canUploadPlugin: Boolean(upload),
    pluginFile, pluginVersion, zipSha256: zip.sha256, files: zip.files, snapshot: backup,
    scope: 'Additive menu-redirect pause only; public rendered page snapshot, not database or complete source restoration',
    pluginInstalled: plugins.some(item => item.file === pluginFile), pluginActive: plugins.find(item => item.file === pluginFile)?.active ?? false,
    inventoryBefore: plugins.map(({ file, active, version }) => ({ file, active, version })), changed: null, operationReceipt };
  writeFileSync(operationReceipt, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  const record = change => { Object.assign(receipt, change, { updatedAt: new Date().toISOString() }); writeFileSync(operationReceipt, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 }); };
  try {
    if (options.mode === 'inspect') return receipt;
    const existing = plugins.find(item => item.file === pluginFile);
    if (existing?.active) { record({ phase: 'already-active', changed: null }); return receipt; }
    if (existing) fail('Menu-pause plugin already exists inactive; refusing replacement or activation of an unverified prior upload');
    if (!plugins.some(item => item.file === originalPluginFile && item.active && item.version === '1.0.0')) fail('Original legacy redirect plugin is not the expected active version; stop without changing plugin state');
    if (!upload) fail('Standard additive plugin upload is unavailable');
    record({ phase: 'upload-requested' });
    const form = new FormData();
    form.append('_wpnonce', upload.nonce);
    form.append('_wp_http_referer', '/wp-admin/plugin-install.php?tab=upload');
    form.append('pluginzip', new Blob([zip.bytes], { type: 'application/zip' }), `${pluginName}-${pluginVersion}.zip`);
    form.append('install-plugin-submit', 'Install Now');
    verifyUploadOutcome(await session.request(upload.action, { method: 'POST', body: form }), session.origin);
    const installedInventory = parsePausePlugins((await okGet(session, '/wp-admin/plugins.php?plugin_status=all')).text, session.origin);
    verifyUnchangedInventory(plugins, installedInventory);
    const installed = installedInventory.find(item => item.file === pluginFile);
    if (!installed || installed.active || installed.version !== pluginVersion || !installed.actions.activate) fail('Uploaded plugin is not the expected inactive version with exact activation capability');
    record({ phase: 'installed-inactive', changed: 'installed-inactive', pluginInstalled: true, pluginActive: false,
      inventoryAfterInstall: installedInventory.map(({ file, active, version }) => ({ file, active, version })) });
    // Only the fresh plugin-inventory action is used; never follow upload HTML automatically.
    record({ phase: 'activation-requested' });
    const activation = await session.request(actionLink(installed.actions.activate, session.origin));
    if (![200, 302, 303].includes(activation.status) || challenge(activation.text)
      || /<form\b[^>]*id=["']loginform["']|name=["'](?:hostname|ftp_username|ftp_password|connection_type)["']/i.test(activation.text)) fail('Menu-pause activation failed or requested interactive access; no retry');
    if (activation.status !== 200) {
      const target = fixedUrl(activation.headers.get('location') ?? '', session.origin);
      if (target.pathname !== '/wp-admin/plugins.php' || [...target.searchParams.keys()].some(key => !['activate', 'plugin_status', 'paged', 's'].includes(key))) fail('Menu-pause activation returned an unexpected redirect');
    }
    const after = parsePausePlugins((await okGet(session, '/wp-admin/plugins.php?plugin_status=all')).text, session.origin);
    verifyUnchangedInventory(plugins, after);
    const active = after.find(item => item.file === pluginFile);
    if (!active?.active || active.version !== pluginVersion) fail('Menu-pause plugin did not reach the exact active version; stop and inspect');
    record({ phase: 'activated', changed: 'installed-and-activated', pluginInstalled: true, pluginActive: true,
      unrelatedPluginStateUnchanged: true, inventoryAfter: after.map(({ file, active, version }) => ({ file, active, version })) });
    return receipt;
  } catch (error) {
    record({ outcome: 'failed', failedPhase: receipt.phase, phase: 'stopped', error: error.message });
    throw new Error(`Menu-pause operation stopped; inspect the private operation receipt (${options.site})`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await run(parseArguments(process.argv.slice(2))), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
