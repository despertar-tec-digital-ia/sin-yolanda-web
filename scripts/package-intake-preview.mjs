// Fresh, deterministic private candidate only. No publication, credential lookup or main build.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { constants, closeSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const previewHostname = 'registro-sy-prueba.despertartdigital.cloud';
export const previewOrigin = `https://${previewHostname}`;
export const consentVersion = 'sy-el-paso-registration-v2-2026-10-09';
export const sourceAllowlist = Object.freeze([
  ['prototypes/loyalty-intake/index.html', 'public/index.html'],
  ['prototypes/loyalty-intake/styles.css', 'public/styles.css'],
  ['prototypes/loyalty-intake/intake.js', 'public/intake.js'],
  ['assets/media/brand-logo.png', 'public/assets/media/brand-logo.png'],
  ['fonts/bebas-neue-400.woff2', 'public/fonts/bebas-neue-400.woff2'],
  ['fonts/roboto-slab-400.woff2', 'public/fonts/roboto-slab-400.woff2'],
  ['fonts/roboto-slab-700.woff2', 'public/fonts/roboto-slab-700.woff2'],
  ...['Dockerfile', 'nginx.conf', '.dockerignore', 'compose.template.yml'].map(name => [
    `services/loyalty-intake/preview-gateway/${name}`, name,
  ]),
].map(entry => Object.freeze(entry)));

export function validateSiteKey(siteKey) {
  assert.ok(typeof siteKey === 'string' && /^0x[A-Za-z0-9_-]{20,98}$/.test(siteKey),
    'Provide an explicit public Turnstile sitekey through SY_INTAKE_TURNSTILE_SITE_KEY');
  return siteKey;
}

export function createPreviewConfig(siteKey) {
  return {
    captureEnabled: true, qaOnly: false, mode: 'production', consentVersion,
    turnstileSiteKey: validateSiteKey(siteKey),
  };
}

function statIfPresent(path) {
  try { return lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function assertNoLinkAncestors(path) {
  let current = resolve(path);
  while (true) {
    const info = statIfPresent(current);
    if (info) assert.ok(!info.isSymbolicLink(), 'Symbolic links are not valid package paths');
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

function readSource(root, name) {
  const path = resolve(root, name);
  assertNoLinkAncestors(path);
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = fstatSync(descriptor);
    assert.ok(info.isFile() && info.nlink === 1, 'Package input must be a regular file without links');
    return readFileSync(descriptor);
  } finally { closeSync(descriptor); }
}

export function transformPreviewHtml(source) {
  const photos = [...source.matchAll(/\s*<figure class="welcome-photo">[\s\S]*?<\/figure>/g)];
  assert.equal(photos.length, 1, 'Expected one review-only welcome photograph');
  let html = source.replace(photos[0][0], '')
    .replace('<body>', '<body class="private-intake-preview">')
    .replace('src="../../assets/media/brand-logo.png"', 'src="/assets/media/brand-logo.png"');
  assert.ok(!html.includes('data-copy="privateReviewNotice"'), 'Private notice belongs to the isolated package');
  html = html.replace('<main class="registration-layout">',
    '<p class="private-review-notice" data-copy="privateReviewNotice" role="status">Prueba privada: usa únicamente datos ficticios. No se envían a GHL ni se activan mensajes.</p>\n\n    <main class="registration-layout">');
  assert.match(html, /data-copy="privateReviewNotice"/);
  assert.doesNotMatch(html, /(?:<figure|srcset=|\.webp|singer-|selected-30|qa-photo)/i);
  assert.doesNotMatch(html, /<(?:script|style)\b[^>]*>(?!<\/script>)[\s\S]*?<\/(?:script|style)>|\son[a-z]+\s*=|\sstyle\s*=/i);
  const resources = [...html.matchAll(/<(?:img|script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(resources.sort(), ['./intake.js', './styles.css', '/assets/media/brand-logo.png'].sort(), 'Unexpected frontend resource');
  const anchors = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(match => match[1]);
  assert.ok(anchors.every(href => ['#registration', 'https://sin-yolanda.com/', 'https://sin-yolanda.com/el-paso', 'https://www.instagram.com/sinyolandaelpaso/'].includes(href)), 'Unexpected preview link');
  assert.doesNotMatch(html, /unsafe-inline|unsafe-eval|sourceMappingURL/);
  return html;
}

export function transformPreviewCss(source) {
  const css = source.replaceAll('../../fonts/', '/fonts/');
  const urls = [...css.matchAll(/url\("([^"]+)"\)/g)].map(match => match[1]);
  assert.deepEqual(urls.sort(), ['/fonts/bebas-neue-400.woff2', '/fonts/roboto-slab-400.woff2', '/fonts/roboto-slab-700.woff2'].sort(), 'Unexpected stylesheet resource');
  assert.doesNotMatch(css, /@import|sourceMappingURL|url\((?!")/i);
  return css + '\n/* Only the isolated private package omits the review-only photograph. */\n' +
    '.private-review-notice { width: min(1180px, calc(100% - 80px)); margin: 22px auto 0; padding: 12px 14px; border-left: 3px solid var(--orange); background: var(--cream); font-size: .8rem; line-height: 1.6; }\n' +
    '.private-intake-preview .welcome { display: block; }\n' +
    '.private-intake-preview .welcome-text { padding-top: 22px; }\n' +
    '@media (max-width: 1000px) { .private-review-notice { width: calc(100% - 48px); } }\n' +
    '@media (max-width: 760px) { .private-intake-preview .welcome-text { padding-top: 0; } }\n' +
    '@media (max-width: 420px) { .private-review-notice { width: calc(100% - 32px); } }\n';
}

export function packageIntakePreview({ root = projectRoot, destination, siteKey } = {}) {
  const config = createPreviewConfig(siteKey);
  assert.ok(typeof destination === 'string' && destination.length > 0, 'Provide a fresh candidate directory');
  const sourceRoot = resolve(root), out = resolve(destination);
  assertNoLinkAncestors(sourceRoot);
  assertNoLinkAncestors(out);
  assert.equal(statIfPresent(out), null, 'Refuse to overwrite an existing candidate path');
  const inside = relative(sourceRoot, out);
  assert.ok(inside !== '' && (inside.startsWith(`..${sep}`) || isAbsolute(inside) || inside.startsWith(`.artifacts${sep}`)), 'In-repository candidates belong in a fresh .artifacts directory');
  const files = new Map(sourceAllowlist.map(([input, output]) => [output, readSource(sourceRoot, input)]));
  files.set('public/index.html', Buffer.from(transformPreviewHtml(files.get('public/index.html').toString('utf8'))));
  files.set('public/styles.css', Buffer.from(transformPreviewCss(files.get('public/styles.css').toString('utf8'))));
  const script = files.get('public/intake.js').toString('utf8');
  assert.ok(script.includes(`const consentVersion = '${consentVersion}'`), 'Frontend consent version must match the candidate');
  assert.doesNotMatch(script, /sourceMappingURL|SY_INTAKE_ENCRYPTION_KEY|SY_INTAKE_TURNSTILE_SECRET|preview_auth/);
  assert.ok(script.includes('privateReviewNotice:'), 'Frontend must translate the private notice');
  const docker = files.get('Dockerfile').toString('utf8');
  assert.match(docker, /^FROM nginx:1\.28-alpine@sha256:[a-f0-9]{64}\n/);
  files.set('public/intake-config.json', Buffer.from(JSON.stringify(config, null, 2) + '\n'));
  const ordered = [...files].sort(([a], [b]) => a.localeCompare(b, 'en'));
  const hashes = Object.fromEntries(ordered.map(([name, body]) => [name, createHash('sha256').update(body).digest('hex')]));
  const digest = createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
  const manifest = { version: 1, kind: 'private-intake-preview-candidate', origin: previewOrigin, consentVersion, fileCount: ordered.length, hashes, digest };
  // Read and validate all inputs before creating the new output. Never follow an output link.
  mkdirSync(dirname(out), { recursive: true });
  assertNoLinkAncestors(dirname(out));
  mkdirSync(out);
  for (const [name, body] of ordered) {
    const path = resolve(out, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body, { flag: 'wx', mode: 0o644 });
  }
  writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o644 });
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, 'Use package-intake-preview.mjs <fresh-directory>');
  const manifest = packageIntakePreview({ destination: process.argv[2], siteKey: process.env.SY_INTAKE_TURNSTILE_SITE_KEY });
  process.stdout.write(JSON.stringify({ kind: manifest.kind, origin: manifest.origin, fileCount: manifest.fileCount, digest: manifest.digest }) + '\n');
}
