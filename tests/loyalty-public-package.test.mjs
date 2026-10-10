import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { packageIntakePublic, publicPath, transformPublicHtml } from '../scripts/package-intake-public.mjs';

const siteKey = '0x4AAAAAAASyntheticPublicKey';
test('the isolated overlay preserves approved photography, serves customer copy and cannot replace the site', () => {
  const temporary = mkdtempSync(resolve(realpathSync(tmpdir()), 'sy-public-package-'));
  try {
    const out = resolve(temporary, 'candidate');
    const manifest = packageIntakePublic({ destination: out, siteKey });
    assert.equal(manifest.deployable, false); assert.equal(manifest.fileCount, 12);
    const html = readFileSync(resolve(out, `public/${publicPath}/index.html`), 'utf8');
    assert.match(html, /data-audience="public"/);
    assert.match(html, /singer-600\.webp 600w/);
    assert.match(html, /almacenamiento protegido operado por Despertar TEC Digital IA/);
    assert.doesNotMatch(html, /Borrador|Vista previa|GoHighLevel|registro de prueba|datos ficticios/i);
    assert.match(html, /disabled data-copy="button">Registro no disponible/);
    const routes = JSON.parse(readFileSync(resolve(out, 'public/_routes.json')));
    assert.deepEqual(routes, { version: 1, include: ['/api/loyalty/el-paso/registrations'], exclude: [] });
    const config = JSON.parse(readFileSync(resolve(out, `public/${publicPath}/intake-config.json`)));
    assert.equal(config.mode, 'production'); assert.equal(config.qaOnly, false);
    assert.equal(config.turnstileSiteKey, siteKey);
    assert.deepEqual(readdirSync(resolve(out, 'public')).sort(), ['_routes.json', 'assets', 'el-paso', 'fonts']);
    assert.equal(readdirSync(out).includes('_redirects'), false);
    assert.throws(() => packageIntakePublic({ destination: out, siteKey }), /overwrite/);
    assert.throws(() => packageIntakePublic({ destination: resolve(temporary, 'test-key'), siteKey: '1x00000000000000000000AA' }), /explicit public/);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});

test('new unreviewed resources or removed copy cannot enter the public candidate', () => {
  const html = readFileSync(new URL('../prototypes/loyalty-intake/index.html', import.meta.url), 'utf8');
  const script = readFileSync(new URL('../prototypes/loyalty-intake/intake.js', import.meta.url), 'utf8');
  assert.throws(() => transformPublicHtml(html.replace('./media/singer-600.webp 600w', 'https://example.invalid/600.webp 600w'), script));
  assert.throws(() => transformPublicHtml(html.replace('data-copy="privacyDraft"', 'data-copy="removed"'), script));
  assert.throws(() => transformPublicHtml(html.replace('</head>', '<script src="https://example.invalid/script.js"></script></head>'), script));
});
