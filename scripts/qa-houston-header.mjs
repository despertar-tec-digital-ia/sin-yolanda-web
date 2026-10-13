// Local packaged UI only. No Maps, bookings, analytics or remote submissions.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const origin = new URL(process.env.SY_QA_ORIGIN || 'http://127.0.0.1:8804/');
assert.ok(origin.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(origin.hostname));
assert.equal(origin.pathname, '/');
assert.ok(!origin.username && !origin.password && !origin.search && !origin.hash);
assert.ok(process.env.SY_QA_PACKAGE_ROOT, 'Provide the installed Playwright directory');
const { chromium } = createRequire(resolve(process.env.SY_QA_PACKAGE_ROOT, '../package.json'))('playwright');
const output = resolve(import.meta.dirname, '..', process.argv[2] || '.artifacts/houston-header-qa-' + Date.now());
assert.ok(output.startsWith(resolve(import.meta.dirname, '../.artifacts') + '/') && !existsSync(output));
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.SY_QA_BROWSER || undefined });
const report = { origin: origin.origin, completed: false, cases: [], limitations: [
  'Chromium emulation, not physical Safari/iPad. Only header behavior and viewport geometry.',
  'External requests blocked; no map, reservation, telemetry or form-service certification.',
] };
const frame = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const scroll = async (page, y) => { await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y); await frame(page); };
const headerStyle = page => page.locator('.hh-header').evaluate(header => {
  const style = getComputedStyle(header), rect = header.getBoundingClientRect();
  return { background: style.backgroundColor, image: style.backgroundImage, color: style.color,
    paddingTop: style.paddingTop, paddingBottom: style.paddingBottom, position: style.position,
    transition: style.transitionDuration, top: rect.top, bottom: rect.bottom, width: rect.width };
});

try {
  const sizes = [[320, 844], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]];
  const cases = sizes.flatMap(([width, height]) => [
    { path: '/houston.html', lang: 'es', width, height },
    { path: '/en/houston/', lang: 'en', width, height },
  ]);
  cases.push({ path: '/houston.html', lang: 'es', width: 1440, height: 900, motion: 'no-preference' });
  cases.push(...['/guadalajara.html', '/san-antonio.html'].flatMap(path => [390, 1440].map(width => ({
    path, lang: 'es', width, height: width === 390 ? 844 : 900, reference: true,
  }))));
  for (const record of cases) {
    record.passed = false;
    const context = await browser.newContext({ viewport: { width: record.width, height: record.height },
      reducedMotion: record.motion || 'reduce', hasTouch: record.width <= 768, serviceWorkers: 'block' });
    context.setDefaultTimeout(7000);
    await context.addInitScript(({ lang, ownOrigin }) => {
      if (location.origin === ownOrigin) try { localStorage.setItem('sy-lang', lang); } catch { /* Storage optional. */ }
    }, { lang: record.lang, ownOrigin: origin.origin });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin.origin &&
      ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [], missing = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (new URL(response.url()).origin === origin.origin && response.status() >= 400) missing.push(response.url());
    });
    try {
      assert.equal((await page.goto(new URL(record.path, origin).href, { waitUntil: 'networkidle' })).status(), 200);
      await page.locator('.hh-header[data-smart-header]').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.hh-cantina-photo img').evaluate(img => img.decode());
      assert.equal(await page.getAttribute('html', 'lang'), record.lang);
      record.top = await headerStyle(page);
      assert.equal(record.top.background, 'rgba(0, 0, 0, 0)', 'Transparent header over hero');
      assert.match(record.top.image, /linear-gradient/);
      assert.equal(record.top.color, 'rgb(255, 244, 222)');
      assert.equal(record.top.position, 'fixed');
      assert.equal(record.top.paddingTop, record.width <= 760 ? '14px' : '24px');
      assert.equal(record.top.paddingBottom, record.width <= 760 ? '24px' : '40px');
      assert.ok((await page.locator('.hh-brand img').evaluate(img => getComputedStyle(img).filter)).includes('invert(1)'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const links = await page.locator('.hh-header nav a').evaluateAll(links => links.filter(link => {
        const rect = link.getBoundingClientRect(); return rect.width && rect.height;
      }).map(link => { const rect = link.getBoundingClientRect(); return { left: rect.left, right: rect.right, height: rect.height }; }));
      assert.ok(links.every(link => link.left >= 0 && link.right <= record.width + 1 && link.height >= 44));
      const label = `${record.path.includes('/en/') ? 'houston-en' : record.path.slice(1).replace('.html', '')}-${record.width}-${record.motion || 'reduce'}`;
      await page.screenshot({ path: resolve(output, label + '-top.png') });
      await scroll(page, 900);
      assert.equal(await page.locator('.hh-header').getAttribute('data-hidden'), '');
      await scroll(page, 600);
      assert.equal(await page.locator('.hh-header').getAttribute('data-hidden'), null);
      record.scrolled = await headerStyle(page);
      assert.equal(record.scrolled.image, 'none');
      assert.notEqual(record.scrolled.background, 'rgba(0, 0, 0, 0)');
      assert.notEqual(record.scrolled.background, 'rgb(255, 255, 255)');
      assert.equal(record.scrolled.paddingTop, '12px');
      assert.equal(record.scrolled.paddingBottom, '12px');
      if (!record.reference) {
        await scroll(page, 1100);
        assert.equal(await page.locator('.hh-header').getAttribute('data-hidden'), '');
        await page.keyboard.press('Tab');
        await page.locator('.hh-brand').focus();
        await frame(page);
        assert.equal(await page.locator('.hh-header').getAttribute('data-hidden'), null, 'Keyboard reveals hidden nav');
        await page.keyboard.press('Tab');
        assert.ok(await page.evaluate(() => document.activeElement.closest('.hh-header') !== null));
        assert.ok(await page.evaluate(() => document.activeElement.matches(':focus-visible')));
        await scroll(page, 1200);
        assert.equal(await page.locator('.hh-header').getAttribute('data-hidden'), null, 'Keyboard latch survives scrolling');
        record.focus = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { color: s.outlineColor, width: s.outlineWidth }; });
        assert.equal(record.focus.color, 'rgb(255, 244, 222)');
        assert.notEqual(record.focus.width, '0px');
        if (!record.motion) assert.equal(record.top.transition, '0s', 'Reduced motion disables transition');
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(missing, []);
      record.passed = true;
    } catch (error) { record.error = error.message; }
    finally { await context.close(); report.cases.push(record); }
  }
  report.completed = true;
  report.passed = report.cases.every(record => record.passed);
} finally {
  await browser.close();
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, failures: report.cases.filter(record => !record.passed), output }));
if (!report.passed) process.exitCode = 1;
