// Isolated browser QA of the additive public candidate. No real challenge, backend or contact.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { packageIntakePublic, publicPath } from './package-intake-public.mjs';
import { assertNoLinkAncestors, projectRoot, statIfPresent } from './package-intake-preview.mjs';

assert.ok(process.env.SY_QA_PACKAGE_ROOT, 'Provide the installed Playwright package directory');
const out = resolve(projectRoot, process.argv[2] || `.artifacts/intake-public-visual-${Date.now()}`);
assertNoLinkAncestors(out);
assert.ok(out.startsWith(resolve(projectRoot, '.artifacts') + '/') && !statIfPresent(out), 'Use a fresh ignored evidence directory');
mkdirSync(out, { recursive: true });
const packageRoot = resolve(out, 'candidate');
const manifest = packageIntakePublic({ destination: packageRoot, siteKey: '0x4AAAAAAASyntheticVisualOnlyKey' });
const publicFiles = new Map(Object.keys(manifest.hashes).filter(name => name.startsWith('public/') && !name.endsWith('/_routes.json'))
  .map(name => ['/' + name.slice(7), readFileSync(resolve(packageRoot, name))]));
const types = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'application/javascript; charset=utf-8', json: 'application/json; charset=utf-8', woff2: 'font/woff2', png: 'image/png', webp: 'image/webp' };
const require = createRequire(resolve(process.env.SY_QA_PACKAGE_ROOT, '../package.json'));
const { chromium } = require('playwright');
let serverWrites = 0;
const server = createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { serverWrites++; response.writeHead(405); response.end(); return; }
  let path = new URL(request.url, 'http://127.0.0.1').pathname;
  if (path === `/${publicPath}/`) path += 'index.html';
  const body = publicFiles.get(path);
  if (!body) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': types[path.split('.').at(-1)], 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
  response.end(request.method === 'HEAD' ? undefined : body);
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const report = { version: 1, passed: false, scope: 'Public ES/EN candidate layout, keyboard, simulated verification/error/success and offline states only. No real widget, POST, storage, GHL or publication.', cases: [] };
const labels = {
  es: { welcome: 'Qué gusto tenerte aquí.', form: 'Tu registro', name: 'Nombre completo', saved: 'Tu registro quedó guardado', retry: 'Reintentar verificación' },
  en: { welcome: 'Glad to have you here.', form: 'Your registration', name: 'Full name', saved: 'Your registration was saved', retry: 'Retry verification' },
};
// Browser-only fixture. It is never included in the candidate or served outside this QA context.
const widgetFixture = `window.__visualTokenCounter = 0; window.__nextVisualToken = () => 'visual-fixture-' + (++window.__visualTokenCounter); window.turnstile = { render(container, options) { window.__visualVerification = options; setTimeout(() => options.callback(window.__nextVisualToken()), 0); return 'visual-widget'; }, remove() {}, reset() { setTimeout(() => window.__visualVerification.callback(window.__nextVisualToken()), 0); } };`;
try {
  browser = await chromium.launch({ headless: true });
  for (const width of [320, 390, 768, 1024, 1502, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const errors = [], external = [], unexpected = [];
    let providerAvailable = false, receiptMode = 'failure', mockSaves = 0;
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.hostname === 'challenges.cloudflare.com') {
        external.push(url.hostname);
        return providerAvailable ? route.fulfill({ status: 200, contentType: 'application/javascript', body: widgetFixture }) : route.abort();
      }
      if (url.origin !== origin) { unexpected.push(url.hostname); return route.abort(); }
      if (request.method() === 'POST' && url.pathname === '/api/loyalty/el-paso/registrations') {
        // Fulfill locally; no payload is recorded or forwarded to the loopback server.
        mockSaves++;
        return route.fulfill({ status: receiptMode === 'success' ? 201 : 503, contentType: 'application/json', body: JSON.stringify(receiptMode === 'success'
          ? { status: 'received', receipt_id: '37acd8fe-918f-4bd3-a8b9-f1dd0480fd87', sync_status: 'pending' } : { code: 'unavailable' }) });
      }
      if (!['GET', 'HEAD'].includes(request.method())) { unexpected.push(request.method()); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.name));
    assert.equal((await page.goto(`${origin}/${publicPath}/`, { waitUntil: 'networkidle' })).status(), 200);
    await page.waitForFunction(() => document.querySelector('#verification-retry')?.hidden === false);
    await page.evaluate(() => document.fonts.ready);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.skip-link').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#registration').evaluate(el => el === document.activeElement), true);
    // Capture the ordinary form view separately from the deliberately focused skip link.
    await page.locator('#language-toggle').focus();
    for (const language of ['es', 'en']) {
      if (language === 'en') await page.locator('#language-toggle').click();
      await page.waitForFunction(lang => document.documentElement.lang === lang, language);
      await page.waitForFunction(() => document.querySelector('#verification-retry')?.hidden === false);
      const geometry = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        outside: [...document.querySelectorAll('h1,h2,label,.site-header,.site-footer,input:not(#website),button')].filter(el => el.getClientRects().length)
          .filter(el => { const r = el.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; }).map(el => el.tagName),
        imagesLoaded: [...document.images].every(el => el.complete && el.naturalWidth > 0),
        storage: localStorage.length + sessionStorage.length,
        font: getComputedStyle(document.querySelector('h1')).fontFamily,
      }));
      assert.ok(geometry.overflow <= 1 && !geometry.outside.length && geometry.imagesLoaded, `Layout ${width}/${language}`);
      assert.equal(geometry.storage, 0); assert.match(geometry.font, /SY Display/);
      assert.equal(await page.locator('h1').textContent(), labels[language].welcome);
      assert.equal(await page.locator('#form-title').textContent(), labels[language].form);
      assert.equal(await page.locator('[data-copy="name"]').textContent(), labels[language].name);
      assert.equal(await page.locator('#verification-retry').textContent(), labels[language].retry);
      assert.equal(await page.locator('#register-button').isDisabled(), true);
      assert.equal(await page.locator('#consent').isChecked(), false);
      assert.equal(await page.locator('#email-marketing').isChecked(), false);
      assert.equal(await page.locator('#registration-success').isVisible(), false);
      await page.locator('.privacy-disclosure summary').click();
      const privacy = await page.locator('.privacy-copy').innerText();
      assert.match(privacy, /sinyolandaelpaso/); assert.doesNotMatch(privacy, /Borrador|Draft|GoHighLevel|fictici|preview|preparaci|preparation/i);
      await page.screenshot({ path: resolve(out, `${language}-${width}-privacy.png`), fullPage: true, animations: 'disabled' });
      await page.locator('.privacy-disclosure summary').click();
      // Clicking the disclosure can scroll a narrow viewport. Keep the screenshot neutral,
      // not a fixed skip-link focus artifact at the previous scroll offset.
      await page.locator('#language-toggle').focus();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(() => document.querySelector('.skip-link').getBoundingClientRect().bottom <= 0);
      await page.screenshot({ path: resolve(out, `${language}-${width}.png`), fullPage: true, animations: 'disabled' });
      report.cases.push({ width, language, state: 'provider-unavailable', passed: true, geometry });
    }
    providerAvailable = true;
    await page.locator('#verification-retry').click();
    await page.waitForFunction(() => !document.querySelector('#register-button').disabled);
    await page.locator('#register-button').click();
    assert.equal(mockSaves, 0, 'Empty fields must not submit even to the mock');
    assert.equal(await page.locator('#full-name').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('#full-name').evaluate(el => el === document.activeElement), true);
    await page.screenshot({ path: resolve(out, `en-${width}-invalid.png`), fullPage: true, animations: 'disabled' });
    await page.locator('#full-name').fill('PRUEBA VISUAL'); await page.locator('#email').fill('visual@example.invalid'); await page.locator('#consent').check();
    await page.locator('#register-button').click();
    await page.waitForFunction(() => !document.querySelector('#server-error').hidden);
    assert.equal(await page.locator('#email').inputValue(), 'visual@example.invalid');
    assert.equal(await page.locator('#registration-success').isVisible(), false);
    await page.screenshot({ path: resolve(out, `en-${width}-retry.png`), fullPage: true, animations: 'disabled' });
    receiptMode = 'success';
    // In production a fresh real token is requested after a failed save; this callback is fixture-only.
    await page.evaluate(() => window.__visualVerification.callback(window.__nextVisualToken()));
    await page.locator('#register-button').click();
    await page.waitForFunction(() => !document.querySelector('#registration-success').hidden);
    assert.equal(await page.locator('#success-title').textContent(), labels.en.saved);
    assert.equal(await page.locator('#form-heading').isVisible(), false);
    assert.equal(await page.locator('#email').inputValue(), '');
    assert.equal(await page.locator('#email-marketing').isChecked(), false);
    assert.equal(await page.locator('#registration-success').evaluate(el => el === document.activeElement), true);
    await page.screenshot({ path: resolve(out, `en-${width}-success.png`), fullPage: true, animations: 'disabled' });
    await page.locator('#language-toggle').click(); assert.equal(await page.locator('#success-title').textContent(), labels.es.saved);
    await page.locator('#new-registration').click();
    await page.locator('#full-name').fill('PRUEBA VISUAL');
    await page.locator('#language-toggle').click(); assert.equal(await page.locator('#full-name').inputValue(), 'PRUEBA VISUAL');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('#full-name').inputValue(), ''); assert.equal(await page.locator('html').getAttribute('lang'), 'es');
    assert.equal(await page.locator('#consent').isChecked(), false); assert.equal(await page.locator('#email-marketing').isChecked(), false);
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []); assert.equal((await context.cookies()).length, 0);
    report.cases.push({ width, state: 'simulated-validation-retry-success', passed: true, mockedSaves: mockSaves, externalBlockedOrStubbed: [...new Set(external)] });
    await context.close();
  }
  assert.equal(serverWrites, 0, 'No registration reached a server');
  report.passed = true;
} finally {
  if (browser) await browser.close();
  server.close(); await once(server, 'close');
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, evidence: out, scope: report.scope }));
