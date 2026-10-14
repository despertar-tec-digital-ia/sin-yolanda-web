import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const origin = process.env.SY_QA_ORIGIN || 'http://127.0.0.1:8815';
assert.ok(new URL(origin).protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
const { chromium } = createRequire(resolve(process.env.SY_QA_PACKAGE_ROOT, '../package.json'))('playwright');
const output = resolve('.artifacts/photo-round2/header'); mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.SY_QA_BROWSER });
const report = { cases: [], limitations: ['Chromium emulation; no physical Safari/iPhone. External requests blocked.'] };
const style = page => page.locator('.hh-header').evaluate(header => {
  const s = getComputedStyle(header), nav = getComputedStyle(header.querySelector('nav')), rect = header.getBoundingClientRect();
  return { color: s.color, font: nav.fontFamily, fontSize: nav.fontSize, padding: s.padding,
    background: s.backgroundImage, backgroundColor: s.backgroundColor, position: s.position,
    width: rect.width, height: rect.height, logo: getComputedStyle(header.querySelector('.hh-brand img')).filter };
});
const scroll = async (page, y) => { await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); };
try {
  for (const width of [320, 390, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const record = { width, passed: false }; const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      const results = [];
      for (const path of ['/en/el-paso/', '/el-paso/menu/']) {
        await page.goto(origin + path); await page.locator('.hh-header[data-smart-header]').waitFor(); await page.evaluate(() => document.fonts.ready);
        const initial = await style(page);
        await scroll(page, 600); assert.equal(await page.locator('.hh-header').getAttribute('data-hidden'), '');
        await scroll(page, 300); assert.equal(await page.locator('.hh-header').getAttribute('data-hidden'), null);
        const scrolled = await style(page);
        await scroll(page, 600); await page.locator('.hh-brand').focus();
        assert.equal(await page.locator('.hh-header').getAttribute('data-hidden'), null, 'Keyboard focus reveals header');
        if (path.includes('/menu/')) {
          assert.equal(await page.locator('.hh-nav-visit').evaluate(a => a.href), origin + '/en/el-paso/#visita-el-paso');
          assert.equal(await page.locator('.hh-skip').evaluate(a => a.href), origin + '/el-paso/menu/#menu');
          if (width <= 760) {
            await page.locator('[data-menu-image]').evaluate(img => img.decode());
            await page.locator('[data-menu-viewport]').evaluate(e => { e.scrollLeft = e.scrollWidth - e.clientWidth; });
            assert.ok(await page.locator('[data-menu-viewport]').evaluate(e => e.scrollLeft > 0));
          }
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        }
        results.push({ initial, scrolled });
      }
      assert.deepEqual(results[1], results[0], 'Menu uses exactly the branch header presentation');
      assert.deepEqual(errors, []); record.styles = results[1]; record.passed = true;
    } catch (error) { record.error = error.message; }
    finally { await context.close(); report.cases.push(record); }
  }
} finally {
  await browser.close(); report.passed = report.cases.every(record => record.passed);
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, failures: report.cases.filter(record => !record.passed), output }));
if (!report.passed) process.exitCode = 1;
