// Build only the branded booking entrance for an isolated, noindex review host.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const name = process.argv[2];
assert.match(name ?? '', /^reservas-share-[a-z0-9-]+$/, 'Use a new reservas-share-* artifact name');
const artifact = resolve(root, '.artifacts', name);
assert.ok(!existsSync(artifact), 'Refuse to overwrite a review artifact');
const status = execFileSync('git', ['status', '--porcelain'], {cwd: root, encoding: 'utf8'}).trim();
assert.equal(status, '', 'Build only from a clean, committed checkout');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
const host = 'https://reservas-demo-sy.187.77.220.209.sslip.io';
const publicRoot = resolve(artifact, 'public');

const assets = [
  'styles.css',
  'assets/css/opentable-review.css',
  'assets/css/reservar.css',
  'assets/js/i18n.js',
  'assets/js/reservar.js',
  'assets/js/opentable-review.js',
  'assets/media/apple-touch-gdl.png',
  'assets/media/favicon-gdl-32.png',
  'assets/media/brand-logo-gdl.png',
  'assets/media/karaoke.webp',
  'assets/media/venues/san-ignacio.webp',
  'assets/media/venues/the-woodlands.webp',
  'assets/media/venues/future/future-crowd-640.webp',
  'assets/media/venues/future/future-crowd-960.webp',
  'assets/media/venues/future/future-singalong-640.webp',
  'assets/media/venues/future/future-singalong-960.webp',
  'images/approved-20261026/houston-neon-800.webp',
  'images/branch-review/san-antonio-hero-800.webp',
  'images/home-20261029/el-paso.webp',
  'fonts/bebas-neue-400.woff2',
];

const source = readFileSync(resolve(root, 'reservar.html'), 'utf8');
assert.match(source, /<meta name="robots" content="noindex,nofollow">/);
const editorial = JSON.parse(readFileSync(resolve(root, 'scripts/editorial/opentable-review.json'), 'utf8'));
for (const branch of editorial.branches) {
  assert.match(source, new RegExp(`data-booking-choice="${branch.slug}"[^>]+data-rid="${branch.rid}"`));
}
assert.match(source, /data-booking-choice="guadalajara"[^>]+data-provider-url="https:\/\/wa\.me\/5213310186159"/);
assert.equal([...source.matchAll(/data-booking-choice="/g)].length, 5);
assert.deepEqual([...source.matchAll(/data-booking-upcoming data-country="(mx|us)"/g)].map(match => match[1]), ['mx', 'us', 'us']);
for (const name of ['Ciudad Juárez', 'San Diego', 'Moreno Valley']) assert.ok(source.includes(`<h3>${name}</h3>`), `Missing future location ${name}`);
assert.ok(!/sucursal=(?:ciudad-juarez|san-diego|moreno-valley)/.test(source), 'Future locations cannot open a booking channel');

function replaceOnce(input, before, after) {
  assert.equal(input.split(before).length, 2, `Expected one occurrence of ${before}`);
  return input.replace(before, after);
}

let page = source;
page = replaceOnce(page, '<meta property="og:url" content="https://sin-yolanda.com/reservar" />',
  `<meta property="og:url" content="${host}/reservar" />`);
page = replaceOnce(page, '<meta property="og:image" content="https://sin-yolanda.com/assets/media/karaoke.webp" />',
  `<meta property="og:image" content="${host}/assets/media/karaoke.webp" />`);
page = page.replace(/\s*<script defer src="\/assets\/js\/site-measurement\.js[^\"]*"><\/script>/, '');
page = page.replace(/\s*<link rel="stylesheet" href="\/assets\/css\/ga4-consent\.css[^\"]*" \/>/, '');
page = page.replace(/\s*<script defer src="\/assets\/js\/ga4-consent\.js[^\"]*"><\/script>/, '');
page = page.replace(/\s*<script type="application\/ld\+json">[^<]*<\/script>/, '');
for (const path of ['/locations', '/catering', '/la-cantina', '/eventos', '/aviso-de-privacidad']) {
  assert.ok(page.includes(`href="${path}"`), `Missing navigation link ${path}`);
  page = page.replaceAll(`href="${path}"`, `href="https://sin-yolanda.com${path}"`);
}
page = page.replaceAll('href="/"', 'href="/reservar"');
page = page.replace(/data-branch-page="\/(guadalajara|san-antonio|the-woodlands|houston|el-paso)"/g,
  (_, slug) => `data-branch-page="https://sin-yolanda.com/${slug}"`);
assert.equal([...page.matchAll(/data-branch-page="https:\/\/sin-yolanda\.com\//g)].length, 5);
for (const excluded of ['site-measurement.js', 'ga4-consent.js', 'ga4-consent.css', 'application/ld+json']) {
  assert.ok(!page.includes(excluded), `${excluded} must not run in the visual preview`);
}

mkdirSync(publicRoot, {recursive: true});
for (const path of assets) {
  const src = resolve(root, path);
  assert.ok(lstatSync(src).isFile(), `Missing or nonregular preview asset: ${path}`);
  const dst = resolve(publicRoot, path);
  mkdirSync(dirname(dst), {recursive: true});
  copyFileSync(src, dst);
}
writeFileSync(resolve(publicRoot, 'reservar.html'), page);
writeFileSync(resolve(publicRoot, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
writeFileSync(resolve(publicRoot, '404.html'), '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Página no disponible · Sin Yolanda</title><p>Página no disponible. <a href="/reservar">Volver a reservas</a>.</p></html>\n');
const files = ['reservar.html', 'robots.txt', '404.html', ...assets].sort();
const hashes = Object.fromEntries(files.map(path => [path,
  createHash('sha256').update(readFileSync(resolve(publicRoot, path))).digest('hex')]));
writeFileSync(resolve(artifact, 'release.json'), JSON.stringify({
  version: 1, commit, dirty: false, audience: 'visual-preview', host, route: '/reservar',
  officialPublicationEnabled: false, analyticsEnabled: false, fileCount: files.length, hashes,
}, null, 2) + '\n');
console.log(JSON.stringify({artifact, commit, fileCount: files.length, host, route: '/reservar'}));
