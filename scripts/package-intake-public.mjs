// Standalone additive candidate: not a complete site release and never a deployment command.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoLinkAncestors, consentVersion, projectRoot, readSource, statIfPresent, validateSiteKey } from './package-intake-preview.mjs';

export const publicPath = 'el-paso/registro';
export const sourceAllowlist = Object.freeze([
  ['prototypes/loyalty-intake/index.html', `public/${publicPath}/index.html`],
  ['prototypes/loyalty-intake/styles.css', `public/${publicPath}/styles.css`],
  ['prototypes/loyalty-intake/intake.js', `public/${publicPath}/intake.js`],
  ['assets/media/brand-logo.png', 'public/assets/media/brand-logo.png'],
  ...['singer-600.webp', 'singer-1200.webp'].map(name => [`assets/media/loyalty-el-paso/${name}`, `public/${publicPath}/media/${name}`]),
  ...['bebas-neue-400.woff2', 'roboto-slab-400.woff2', 'roboto-slab-700.woff2'].map(name => [`fonts/${name}`, `public/fonts/${name}`]),
  ['services/loyalty-intake/pages/functions/api/loyalty/el-paso/registrations.js', 'functions/api/loyalty/el-paso/registrations.js'],
].map(entry => Object.freeze(entry)));

function spanishLiteral(script, key) {
  // Read the same reviewed ES copy used by the UI rather than maintain a second notice.
  const match = script.match(new RegExp(`^      ${key}: '([^'\\\\]*)'(?=,|$)`, 'm'));
  assert.ok(match, `Expected one plain Spanish copy literal for ${key}`);
  return match[1];
}

export function transformPublicHtml(source, script) {
  let html = source.replace('<form id="intake-form"', '<form id="intake-form" data-audience="public"')
    .replace('src="../../assets/media/brand-logo.png"', 'src="/assets/media/brand-logo.png"');
  assert.equal((html.match(/data-audience="public"/g) || []).length, 1, 'Expected one public registration form');
  for (const [node, copy] of Object.entries({
    privacyStorage: 'privacyStorageProduction', privacyContact: 'privacyContactPublic',
    privacyDraft: 'privacyPublic', button: 'publicUnavailableButton', previewNote: 'productionFootnote',
    successTitle: 'productionSuccessTitle', successBody: 'productionSuccessBody', newRegistration: 'productionNewRegistration',
  })) {
    const pattern = new RegExp(`(data-copy="${node}"[^>]*>)[^<]*(<\\/)`, 'g');
    const matches = [...html.matchAll(pattern)];
    assert.equal(matches.length, 1, `Expected one default ${node} node`);
    const value = spanishLiteral(script, copy).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    html = html.replace(pattern, (_, opening, closing) => opening + value + closing);
  }
  html = html.replace('    <footer class="site-footer">',
    '    <noscript><p class="no-script-notice">Activa JavaScript para registrarte. Enable JavaScript to register.</p></noscript>\n    <footer class="site-footer">');
  assert.doesNotMatch(html, /Borrador|Vista previa|registro de prueba|preparaci[oó]n|GoHighLevel|datos ficticios/i);
  assert.doesNotMatch(html, /\son[a-z]+\s*=|\sstyle\s*=|<(?:style)\b|<script\b[^>]*>[^<]/i);
  const resources = [...html.matchAll(/<(?:img|script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(resources.sort(), ['./intake.js', './styles.css', './media/singer-1200.webp', '/assets/media/brand-logo.png'].sort());
  assert.deepEqual([...html.matchAll(/\bsrcset="([^"]+)"/g)].map(match => match[1]), ['./media/singer-600.webp 600w, ./media/singer-1200.webp 1200w']);
  const links = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(match => match[1]);
  assert.ok(links.every(href => ['#registration', 'https://sin-yolanda.com/', 'https://sin-yolanda.com/el-paso', 'https://www.instagram.com/sinyolandaelpaso/'].includes(href)), 'Unexpected public link');
  return html;
}

export function packageIntakePublic({ root = projectRoot, destination, siteKey } = {}) {
  const config = { captureEnabled: true, qaOnly: false, mode: 'production', consentVersion, turnstileSiteKey: validateSiteKey(siteKey) };
  assert.ok(typeof destination === 'string' && destination.length > 0, 'Provide a fresh candidate directory');
  const sourceRoot = resolve(root), out = resolve(destination);
  assertNoLinkAncestors(sourceRoot); assertNoLinkAncestors(out);
  assert.equal(statIfPresent(out), null, 'Refuse to overwrite an existing candidate');
  const inside = relative(sourceRoot, out);
  assert.ok(inside !== '' && (inside.startsWith(`..${sep}`) || isAbsolute(inside) || inside.startsWith(`.artifacts${sep}`)), 'In-repository candidates belong in a fresh .artifacts directory');
  const files = new Map(sourceAllowlist.map(([input, output]) => [output, readSource(sourceRoot, input)]));
  const permission = JSON.parse(readSource(sourceRoot, 'services/loyalty-intake/public-media.json'));
  assert.equal(permission.authorization, 'user-approved-public-el-paso-registration');
  for (const [name, hash] of Object.entries(permission.hashes)) {
    assert.ok(['singer-600.webp', 'singer-1200.webp'].includes(name));
    assert.equal(createHash('sha256').update(files.get(`public/${publicPath}/media/${name}`)).digest('hex'), hash, 'Photograph must match the publicly approved asset');
  }
  assert.equal(Object.keys(permission.hashes).length, 2);
  const script = files.get(`public/${publicPath}/intake.js`).toString('utf8');
  assert.ok(script.includes(`const consentVersion = '${consentVersion}'`), 'Consent version mismatch');
  assert.doesNotMatch(script, /sourceMappingURL|SY_INTAKE_ENCRYPTION_KEY|SY_INTAKE_TURNSTILE_SECRET|SY_INTAKE_PROXY_AUTH/);
  files.set(`public/${publicPath}/index.html`, Buffer.from(transformPublicHtml(files.get(`public/${publicPath}/index.html`).toString('utf8'), script)));
  const css = files.get(`public/${publicPath}/styles.css`).toString('utf8').replaceAll('../../fonts/', '/fonts/');
  assert.deepEqual([...css.matchAll(/url\("([^"]+)"\)/g)].map(match => match[1]).sort(), ['/fonts/bebas-neue-400.woff2', '/fonts/roboto-slab-400.woff2', '/fonts/roboto-slab-700.woff2'].sort());
  files.set(`public/${publicPath}/styles.css`, Buffer.from(css + '\n.no-script-notice { margin: 24px auto; max-width: 70ch; padding: 16px; background: var(--cream); }\n'));
  files.set(`public/${publicPath}/intake-config.json`, Buffer.from(JSON.stringify(config, null, 2) + '\n'));
  // Invocations are restricted to the one registration API; ordinary pages remain static.
  files.set('public/_routes.json', Buffer.from(JSON.stringify({ version: 1, include: ['/api/loyalty/el-paso/registrations'], exclude: [] }, null, 2) + '\n'));
  const ordered = [...files].sort(([a], [b]) => a.localeCompare(b, 'en'));
  const hashes = Object.fromEntries(ordered.map(([name, body]) => [name, createHash('sha256').update(body).digest('hex')]));
  const digest = createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
  const manifest = { version: 1, kind: 'public-intake-overlay-candidate', deployable: false, origin: 'https://sin-yolanda.com', path: `/${publicPath}/`, consentVersion, fileCount: ordered.length, hashes, digest };
  mkdirSync(dirname(out), { recursive: true }); assertNoLinkAncestors(dirname(out)); mkdirSync(out);
  for (const [name, body] of ordered) {
    const path = resolve(out, name); mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body, { flag: 'wx', mode: 0o644 });
  }
  writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o644 });
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, 'Use package-intake-public.mjs <fresh-directory>');
  const manifest = packageIntakePublic({ destination: process.argv[2], siteKey: process.env.SY_INTAKE_TURNSTILE_SITE_KEY });
  process.stdout.write(JSON.stringify({ kind: manifest.kind, deployable: false, fileCount: manifest.fileCount, digest: manifest.digest }) + '\n');
}
