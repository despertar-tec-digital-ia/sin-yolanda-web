import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { consentVersion, createPreviewConfig, packageIntakePreview, previewOrigin, projectRoot, sourceAllowlist, transformPreviewHtml, validateSiteKey } from '../scripts/package-intake-preview.mjs';

const publicSiteKey = '0xNativePackageFixture1234567890'; // Synthetic value; never claims provider validation.
const read = name => readFileSync(resolve(projectRoot, name), 'utf8');
const gateway = name => read(`services/loyalty-intake/preview-gateway/${name}`);

function sandbox(t, fixture = false) {
  const parent = resolve(projectRoot, '.artifacts');
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(resolve(parent, 'intake-package-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const root = resolve(directory, 'source');
  if (fixture) {
    for (const [source] of sourceAllowlist) {
      const to = resolve(root, source);
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(resolve(projectRoot, source), to);
    }
  }
  return { directory, root, destination: resolve(directory, 'candidate') };
}

function listed(root, prefix = '') {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const name = prefix + entry.name;
    return entry.isDirectory() ? listed(resolve(root, entry.name), name + '/') : [name];
  }).sort();
}

test('preview config enables only the exact production contract with an explicit public sitekey', () => {
  assert.deepEqual(createPreviewConfig(publicSiteKey), { captureEnabled: true, qaOnly: false, mode: 'production', consentVersion, turnstileSiteKey: publicSiteKey });
  for (const invalid of [undefined, null, '', '0xshort', '1x00000000000000000000AA', 'secret-key', publicSiteKey + '\n', 'https://example.com', '0x' + 'a'.repeat(99), 42]) {
    assert.throws(() => validateSiteKey(invalid), /explicit public Turnstile sitekey/);
  }
});

test('package is deterministic, exact allowlist, photo-free and independent of the public release builder', t => {
  const { directory, destination } = sandbox(t);
  const first = packageIntakePreview({ destination, siteKey: publicSiteKey });
  const secondDestination = resolve(directory, 'candidate-two');
  const second = packageIntakePreview({ destination: secondDestination, siteKey: publicSiteKey });
  assert.deepEqual(first, second);
  assert.equal(first.origin, previewOrigin);
  assert.equal(first.kind, 'private-intake-preview-candidate');
  assert.ok(!('approval' in first) && !('release' in first));
  const expected = [...sourceAllowlist.map(([, output]) => output), 'public/intake-config.json', 'manifest.json'].sort();
  assert.deepEqual(listed(destination), expected);
  assert.equal(first.fileCount, 12);
  const html = readFileSync(resolve(destination, 'public/index.html'), 'utf8');
  assert.match(html, /data-copy="privateReviewNotice"/);
  assert.match(html, /<form id="intake-form"/);
  assert.match(html, /src="\/assets\/media\/brand-logo\.png"/);
  assert.doesNotMatch(html, /welcome-photo|singer-|\.webp|srcset=/);
  assert.deepEqual(listed(resolve(destination, 'public')), ['assets/media/brand-logo.png', 'fonts/bebas-neue-400.woff2', 'fonts/roboto-slab-400.woff2', 'fonts/roboto-slab-700.woff2', 'index.html', 'intake-config.json', 'intake.js', 'styles.css']);
  for (const [name, hash] of Object.entries(first.hashes)) {
    assert.equal(createHash('sha256').update(readFileSync(resolve(destination, name))).digest('hex'), hash);
  }
  assert.equal(createHash('sha256').update(JSON.stringify(first.hashes)).digest('hex'), first.digest);
  assert.doesNotMatch(read('scripts/public-manifest.json'), /loyalty-intake|preview-gateway/);
});

test('incidental photos, QA, documentation, databases and credentials never enter the package', t => {
  const { root, destination } = sandbox(t, true);
  for (const name of ['.env', 'README.md', 'prototypes/loyalty-intake/media/singer-1200.webp', 'prototypes/loyalty-intake/qa-photo/example.png', 'services/loyalty-intake/var/registration.sqlite', 'services/loyalty-intake/.secrets/preview_auth', 'tests/private.test.mjs', 'prototypes/loyalty-intake/intake.js.map']) {
    const path = resolve(root, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, 'fixture-private-marker');
  }
  const manifest = packageIntakePreview({ root, destination, siteKey: publicSiteKey });
  assert.ok(!JSON.stringify(manifest).includes('fixture-private-marker'));
  for (const file of listed(destination)) assert.ok(!readFileSync(resolve(destination, file)).includes(Buffer.from('fixture-private-marker')));
});

test('invalid config, changed consent, inline code or unexpected assets fail before creating output', t => {
  const { root, destination } = sandbox(t, true);
  assert.throws(() => packageIntakePreview({ root, destination, siteKey: '' }));
  assert.equal(existsSync(destination), false);
  const script = resolve(root, 'prototypes/loyalty-intake/intake.js');
  writeFileSync(script, readFileSync(script, 'utf8').replace(consentVersion, 'different-consent'));
  assert.throws(() => packageIntakePreview({ root, destination, siteKey: publicSiteKey }), /consent version/);
  assert.equal(existsSync(destination), false);
  const html = read('prototypes/loyalty-intake/index.html');
  for (const invalid of [html.replace('</head>', '<script>alert(1)</script></head>'), html.replace('<body>', '<body onload="alert(1)">'), html.replace('./intake.js', 'https://example.com/evil.js'), html.replace('#registration', '/private/dashboard'), html.replace('</head>', '<link rel="stylesheet" href="/extra.css"></head>')]) {
    assert.throws(() => transformPreviewHtml(invalid));
  }
});

test('existing outputs and linked inputs or parent directories are rejected without overwrite', t => {
  const { directory, root, destination } = sandbox(t, true);
  mkdirSync(destination);
  writeFileSync(resolve(destination, 'keep.txt'), 'keep');
  assert.throws(() => packageIntakePreview({ root, destination, siteKey: publicSiteKey }), /overwrite/);
  assert.equal(readFileSync(resolve(destination, 'keep.txt'), 'utf8'), 'keep');
  const target = resolve(root, 'fonts/bebas-neue-400.woff2');
  const saved = resolve(directory, 'saved-font.woff2');
  copyFileSync(target, saved);
  rmSync(target);
  symlinkSync(saved, target);
  assert.throws(() => packageIntakePreview({ root, destination: resolve(directory, 'symlink-candidate'), siteKey: publicSiteKey }), /Symbolic links/);
  rmSync(target);
  linkSync(saved, target);
  assert.throws(() => packageIntakePreview({ root, destination: resolve(directory, 'hardlink-candidate'), siteKey: publicSiteKey }), /without links/);
  const parentLink = resolve(directory, 'linked-parent');
  symlinkSync(destination, parentLink);
  assert.throws(() => packageIntakePreview({ destination: resolve(parentLink, 'child'), siteKey: publicSiteKey }), /Symbolic links/);
  const dangling = resolve(directory, 'dangling');
  symlinkSync(resolve(directory, 'absent'), dangling);
  assert.throws(() => packageIntakePreview({ destination: dangling, siteKey: publicSiteKey }), /Symbolic links/);
});

test('gateway inherits Basic Auth on all routes and rejects bodies, origins, queries and methods after auth', () => {
  const config = gateway('nginx.conf');
  assert.equal((config.match(/auth_basic /g) || []).length, 1);
  assert.match(config, /auth_basic_user_file \/run\/secrets\/preview_auth;/);
  assert.doesNotMatch(config, /auth_basic off|satisfy any|allow all|location.*health|if\s*\(/);
  for (const block of config.matchAll(/location (?!@)[^{]+\{([^}]+)\}/g)) {
    assert.match(block[1], /try_files/);
    assert.doesNotMatch(block[1], /return|proxy_pass/);
  }
  assert.match(config, /map \$http_origin \$intake_origin_route[\s\S]*"https:\/\/registro-sy-prueba\.despertartdigital\.cloud" @intake_type;/);
  assert.match(config, /map \$request_uri \$intake_path_route[\s\S]*"\/api\/registrations" @intake_size;/);
  assert.match(config, /map \$request_method \$intake_method_route[\s\S]*POST @intake_origin;/);
  assert.match(config, /client_max_body_size 8192;/);
  assert.match(config, /client_body_timeout 10s;/);
  assert.match(config, /proxy_request_buffering off;/);
  assert.match(config, /proxy_http_version 1\.1;/);
  assert.match(config, /proxy_pass http:\/\/intake:8000;/);
  assert.doesNotMatch(config, /proxy_pass[^;]*\$/);
  assert.match(config, /proxy_pass_request_headers off;/);
  for (const header of ['Authorization', 'Cookie', 'Forwarded', 'X-Forwarded-For', 'X-Forwarded-Host', 'X-Forwarded-Proto']) assert.ok(config.includes(`proxy_set_header ${header} "";`));
  assert.match(config, /access_log off;/);
  assert.match(config, /error_log \/dev\/null;/);
  assert.match(config, /Cache-Control "no-store" always;/);
  assert.match(config, /X-Robots-Tag "noindex, nofollow, noarchive" always;/);
  assert.match(config, /frame-ancestors 'none'; form-action 'none'/);
  assert.doesNotMatch(config, /unsafe-inline|unsafe-eval/);
});

test('gateway image and Compose isolate runtime authentication and never expose the backend or socket', () => {
  const docker = gateway('Dockerfile'), compose = gateway('compose.template.yml'), ignore = gateway('.dockerignore');
  assert.match(docker, /^FROM nginx:1\.28-alpine@sha256:[a-f0-9]{64}\n/);
  assert.match(docker, /USER 101:101/);
  assert.doesNotMatch(docker, /COPY (?:\.|.*preview_auth)|ARG|ENV/);
  assert.match(compose, /read_only: true/);
  assert.match(compose, /cap_drop: \[ALL\]/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(compose, /target: \/run\/secrets\/preview_auth/);
  assert.match(compose, /create_host_path: false/);
  assert.match(compose, /networks: \[staging, proxy\]/);
  assert.match(compose, /name: sinyolanda-loyalty-intake-staging_default/);
  assert.match(compose, /traefik\.http\.routers\.sy-intake-preview\.entrypoints: websecure/);
  assert.match(compose, /logging:\n\s+driver: none/);
  assert.doesNotMatch(compose, /ports:|environment:|env_file:|intake:\n|docker\.sock|privileged|network_mode/);
  assert.equal(ignore.split('\n')[0], '*');
  assert.doesNotMatch(ignore, /^!.*(?:\.env|preview_auth|\.sqlite|\.map|README|tests|singer-)/m);
  assert.deepEqual(ignore.split('\n').filter(line => line.startsWith('!public/') && !line.endsWith('/')).map(line => line.slice(1)).sort(), ['public/assets/media/brand-logo.png', 'public/fonts/bebas-neue-400.woff2', 'public/fonts/roboto-slab-400.woff2', 'public/fonts/roboto-slab-700.woff2', 'public/index.html', 'public/intake-config.json', 'public/intake.js', 'public/styles.css']);
});
