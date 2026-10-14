import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const { chromium } = createRequire(resolve(process.env.SY_QA_PACKAGE_ROOT, '../package.json'))('playwright');
const origin = process.env.SY_QA_ORIGIN || 'http://127.0.0.1:8815';
assert.ok(new URL(origin).protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
const output = resolve(process.env.SY_QA_OUTPUT || '.artifacts/site-intake-a-qa');
assert.ok(output.startsWith(resolve('.artifacts') + '/')); mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.SY_QA_BROWSER });
const report = { cases: [], limitations: ['Chromium emulation, no physical Safari/iPhone or external service certification. External requests blocked.'] };
async function scenario(name, width, language, fn, extra = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, reducedMotion: 'reduce', serviceWorkers: 'block', ...extra });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.addInitScript(language => { try { localStorage.setItem('sy-lang', language); } catch {} }, language);
  const page = await context.newPage(); const errors = [], missing = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (new URL(response.url()).origin === origin && response.status() >= 400) missing.push(response.url()); });
  const record = { name, width, language, passed: false };
  try { await fn(page, context); assert.deepEqual(errors, []); assert.deepEqual(missing, []); record.passed = true; }
  catch (error) { record.error = error.message; }
  finally { await context.close(); report.cases.push(record); }
}
const load = async (page, path) => { assert.equal((await page.goto(origin + path)).status(), 200); await page.evaluate(() => document.fonts.ready); };
const geometry = async page => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'No page overflow');
try {
  for (const width of [320, 390, 768, 1024, 1440]) for (const language of ['es', 'en']) for (const branch of ['houston', 'san-antonio', 'the-woodlands', 'el-paso']) {
    await scenario(branch, width, language, async (page, context) => {
      await load(page, language === 'en' ? '/en/' + branch + '/' : '/' + branch);
      await geometry(page);
      const hours = page.locator('.ve-hours'); await hours.scrollIntoViewIfNeeded();
      assert.equal(await hours.locator('dl>div').count(), 5);
      assert.match(await hours.innerText(), language === 'en' ? /Monday and Tuesday\s+Closed/ : /Lunes y martes\s+Cerrado/);
      assert.equal(await hours.getAttribute('data-hours-zone'), branch === 'el-paso' ? 'America/Denver' : 'America/Chicago');
      assert.equal(await hours.evaluate(e => e.parentElement.classList.contains('ve-information')), true, 'Hours outside action row');
      if (branch === 'el-paso') {
        assert.equal(await page.locator('.ep-reservations').count(), 0);
        const table = page.locator('.hh-table'); await table.scrollIntoViewIfNeeded(); await table.locator('img').evaluate(img => img.decode());
        assert.equal(await table.locator('img').evaluate(img => img.naturalWidth > 0), true);
        if (width === 1440) assert.ok(await table.evaluate(e => e.querySelector('figure').getBoundingClientRect().left > e.querySelector('.hh-table-copy').getBoundingClientRect().left));
        if ([390, 1440].includes(width)) await page.screenshot({ path: resolve(output, `el-paso-table-${language}-${width}.png`) });
        if (width === 390 && language === 'es') {
          const [popup] = await Promise.all([context.waitForEvent('page'), table.locator('a').click()]);
          await popup.waitForLoadState(); assert.equal(new URL(popup.url()).pathname, '/el-paso/menu/'); await popup.close();
        }
      }
    });
  }
  for (const width of [320, 390, 768, 1024, 1440]) await scenario('menu fit/zoom/reset', width, 'en', async page => {
    await load(page, '/el-paso/menu/'); const image = page.locator('[data-menu-image]'); await image.evaluate(img => img.decode());
    await page.locator('[data-menu-controls]:not([hidden])').waitFor(); await geometry(page);
    const before = await image.evaluate(img => img.getBoundingClientRect().width);
    assert.equal(Math.round(before), width <= 760 ? 1800 : width);
    assert.equal(await page.locator('[data-menu-zoom="in"]').isEnabled(), true);
    await page.getByRole('button', { name: 'Zoom in', exact: true }).focus(); await page.keyboard.press('Enter');
    assert.ok(await image.evaluate(img => img.getBoundingClientRect().width) > before + 100);
    assert.equal(await page.locator('[data-menu-viewport]').evaluate(e => e.scrollWidth > e.clientWidth), true);
    await geometry(page);
    if ([390, 1440].includes(width)) await page.screenshot({ path: resolve(output, `el-paso-menu-zoom-${width}.png`) });
    await page.getByRole('button', { name: 'View whole menu' }).click();
    assert.equal(await image.evaluate(img => Math.round(img.getBoundingClientRect().width)), width);
    if ([390, 1440].includes(width)) await page.screenshot({ path: resolve(output, `el-paso-menu-fit-${width}.png`) });
    assert.equal(await page.locator('.ep-menu-intro').count(), 0);
    assert.equal(await page.locator('[data-menu-fallback]').isVisible(), false);
    await page.getByRole('button', { name: 'View whole menu' }).focus(); await page.keyboard.press('Tab');
    assert.equal(await page.locator('[data-menu-viewport]').evaluate(e => e === document.activeElement && e.matches(':focus-visible')), true);
  });
  await scenario('image failure escape', 390, 'en', async page => {
    // Force a client resource failure; no origin failure or real customer request.
    await page.route('**/images/el-paso-menu-en-v6.webp', route => route.abort());
    await load(page, '/el-paso/menu/'); await page.locator('[data-menu-fallback]:not([hidden])').waitFor();
    assert.equal(await page.locator('[data-menu-fallback] a').getAttribute('href'), '/menus/el-paso-menu-en-v6.pdf');
    assert.equal(await page.locator('[data-menu-controls]').isVisible(), false);
  });
  await scenario('menu without JS', 390, 'en', async page => {
    await load(page, '/el-paso/menu/'); assert.ok(await page.locator('[data-menu-image]').evaluate(img => img.complete && img.naturalWidth === 3600));
    assert.equal(await page.locator('noscript a').isVisible(), true); await geometry(page);
  }, { javaScriptEnabled: false });
  for (const width of [390, 768, 1440, 1920]) for (const language of ['es', 'en']) await scenario('unchanged production hero', width, language, async page => {
    await load(page, '/'); await page.locator('[data-hero-slide]').first().evaluate(img => img.decode());
    assert.match(await page.locator('[data-hero-slide]').first().getAttribute('srcset'), /cantina-duo-1280\.webp 1280w/);
    assert.match(await page.locator('[data-hero-slide]').nth(2).getAttribute('data-srcset'), /cantina-canto-1280\.webp 1280w/);
    assert.match(await page.locator('[data-hero-slide]').nth(1).getAttribute('data-src'), /cantina-selfie-1280/);
    assert.equal(await page.locator('[data-hero-slide]').first().evaluate(img => getComputedStyle(img).filter), 'none');
    await geometry(page);
    await page.screenshot({ path: resolve(output, `hero-one-${language}-${width}.png`) });
    await page.evaluate(() => {
      const slides = [...document.querySelectorAll('[data-hero-slide]')]; slides.forEach(img => img.classList.remove('is-active'));
      const last = slides[2]; last.srcset = last.dataset.srcset; last.src = last.dataset.src; last.classList.add('is-active');
    });
    await page.locator('[data-hero-slide]').nth(2).evaluate(img => img.decode());
    await page.screenshot({ path: resolve(output, `hero-three-${language}-${width}.png`) });
  }, { deviceScaleFactor: 2 });
} finally {
  await browser.close(); report.passed = report.cases.every(record => record.passed);
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, failures: report.cases.filter(record => !record.passed), output }));
if (!report.passed) process.exitCode = 1;
