// Read-only local UI review. Never completes a challenge or submits a registration.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { constants, closeSync, existsSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function unlinkedPath(path) {
  let current = resolve(path);
  while (true) {
    let info;
    try { info = lstatSync(current); } catch (error) { if (error.code !== 'ENOENT') throw new Error('local_qa_path_invalid'); }
    assert.ok(!info?.isSymbolicLink(), 'local_qa_links_rejected');
    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}
function fixtureAuth(path) {
  unlinkedPath(path);
  let descriptor;
  try {
    descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const info = fstatSync(descriptor);
    assert.ok(info.isFile() && info.nlink === 1 && (info.mode & 0o077) === 0);
    assert.ok(info.size > 0 && info.size <= 2048);
    const auth = JSON.parse(readFileSync(descriptor, 'utf8'));
    assert.deepEqual(Object.keys(auth).sort(), ['password', 'username']);
    assert.ok(typeof auth.username === 'string' && auth.username.length > 0 && auth.username.length <= 100);
    assert.ok(typeof auth.password === 'string' && auth.password.length > 0 && auth.password.length <= 200);
    return auth;
  } catch { throw new Error('local_qa_fixture_auth_invalid'); }
  finally { if (descriptor !== undefined) closeSync(descriptor); }
}
const origin = new URL(process.env.SY_QA_ORIGIN || 'http://127.0.0.1:8798/');
assert.ok(origin.protocol === 'http:' && origin.hostname === '127.0.0.1' && origin.pathname === '/' && !origin.search && !origin.hash && !origin.username && !origin.password, 'Local isolated gateway only');
assert.ok(process.env.SY_QA_PACKAGE_ROOT, 'Provide the installed Playwright package directory');
const out = resolve(root, process.argv[2] || `.artifacts/intake-preview-visual-${Date.now()}`);
unlinkedPath(out);
assert.ok(out.startsWith(resolve(root, '.artifacts') + '/') && !existsSync(out), 'Use a fresh ignored evidence directory');
const authPath = resolve(process.env.SY_QA_AUTH_FILE || '');
assert.ok(authPath.startsWith(resolve(root, '.artifacts') + '/'), 'Use only a disposable local fixture auth file');
const auth = fixtureAuth(authPath);
mkdirSync(out);
const require = createRequire(resolve(process.env.SY_QA_PACKAGE_ROOT, '../package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
const report = { version: 1, passed: false, scope: 'Local private candidate ES/EN layout and provider-unavailable state only; no real widget, registration, TLS, GHL or publication', cases: [] };
const expected = {
  es: { title: 'Tu registro', name: 'Nombre completo', notice: 'Prueba privada:', privacy: 'Sobre tus datos y privacidad', heading: 'Qué gusto tenerte aquí.', verification: 'La verificación no está disponible.' },
  en: { title: 'Your registration', name: 'Full name', notice: 'Private test:', privacy: 'Your details and privacy', heading: 'Glad to have you here.', verification: 'Verification is unavailable.' },
};
try {
  for (const width of [320, 390, 768, 1502]) {
    const context = await browser.newContext({ viewport: { width, height: width <= 390 ? 844 : 772 }, httpCredentials: auth, serviceWorkers: 'block' });
    const errors = [], blocked = [], posts = [];
    await context.route('**/*', route => {
      const request = route.request();
      if (!['GET', 'HEAD'].includes(request.method())) { posts.push(request.method()); return route.abort(); }
      if (new URL(request.url()).origin !== origin.origin) { blocked.push(new URL(request.url()).hostname); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.name));
    const response = await page.goto(origin.href, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200, 'Private gateway access must succeed');
    await page.waitForFunction(() => document.querySelector('#verification-retry')?.hidden === false);
    await page.locator('h1').evaluate(async element => {
      const style = getComputedStyle(element);
      await document.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, element.textContent);
    });
    await page.evaluate(() => document.fonts.ready);
    for (const language of ['es', 'en']) {
      if (language === 'en') await page.locator('#language-toggle').click();
      await page.waitForFunction(lang => document.documentElement.lang === lang, language);
      await page.waitForFunction(() => document.querySelector('#verification-retry')?.hidden === false);
      const geometry = await page.evaluate(() => {
        const visible = [...document.querySelectorAll('h1,h2,.private-review-notice,label,.site-header,.site-footer,.register-button,input:not(#website)')].filter(el => el.getClientRects().length);
        return { overflow: document.documentElement.scrollWidth - innerWidth,
          outside: visible.filter(el => { const rect = el.getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1; }).map(el => el.tagName),
          images: [...document.images].map(el => ({ loaded: el.complete && el.naturalWidth > 0, src: new URL(el.src).pathname })),
          font: getComputedStyle(document.querySelector('h1')).fontFamily,
          localStorage: localStorage.length, sessionStorage: sessionStorage.length };
      });
      assert.ok(geometry.overflow <= 1 && geometry.outside.length === 0, `No overflow ${width}/${language}`);
      assert.deepEqual(geometry.images, [{ loaded: true, src: '/assets/media/brand-logo.png' }]);
      assert.match(geometry.font, /SY Display/);
      assert.equal(geometry.localStorage + geometry.sessionStorage, 0);
      assert.equal(await page.locator('#form-title').textContent(), expected[language].title);
      assert.equal(await page.locator('[data-copy="name"]').textContent(), expected[language].name);
      assert.equal(await page.locator('h1').textContent(), expected[language].heading);
      assert.ok((await page.locator('.private-review-notice').textContent()).startsWith(expected[language].notice));
      assert.ok((await page.locator('#verification-status').textContent()).startsWith(expected[language].verification));
      assert.equal(await page.locator('#register-button').isDisabled(), true);
      assert.equal(await page.locator('#consent').isChecked(), false);
      assert.equal(await page.locator('#email-marketing').isChecked(), false);
      assert.equal(await page.locator('#registration-success').isVisible(), false);
      await page.screenshot({ path: resolve(out, `${language}-${width}.png`), fullPage: true, animations: 'disabled' });
      const privacy = page.locator('.privacy-disclosure');
      await privacy.locator('summary').click();
      assert.equal(await privacy.locator('[data-copy="privacyTitle"]').textContent(), expected[language].privacy);
      assert.equal(await privacy.locator('.privacy-copy').isVisible(), true);
      await privacy.locator('summary').click();
      report.cases.push({ width, language, passed: true, geometry, expectedExternalScriptBlocked: blocked.includes('challenges.cloudflare.com') });
    }
    await page.locator('#full-name').fill('PRUEBA VISUAL');
    await page.locator('#language-toggle').click();
    assert.equal(await page.locator('#full-name').inputValue(), 'PRUEBA VISUAL');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('#full-name').inputValue(), '');
    assert.equal(await page.locator('html').getAttribute('lang'), 'es');
    assert.equal(await page.locator('#consent').isChecked(), false);
    assert.equal(await page.locator('#email-marketing').isChecked(), false);
    assert.deepEqual(errors, []);
    assert.deepEqual(posts, []);
    assert.equal((await context.cookies()).length, 0);
    await context.close();
  }
  report.passed = true;
} finally {
  await browser.close();
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, evidence: out, scope: report.scope }));
