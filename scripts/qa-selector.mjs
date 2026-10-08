// Local rendered acceptance checks; never publish, submit forms or collect telemetry.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = new URL(process.env.SY_QA_ORIGIN || 'http://127.0.0.1:8797/');
assert.ok(['localhost', '127.0.0.1'].includes(origin.hostname), 'Candidate QA accepts local origins only');
assert.ok(!origin.username && !origin.password && !origin.search && !origin.hash);
assert.ok(process.env.SY_QA_PACKAGE_ROOT, 'Provide the installed Playwright package directory');
const output = resolve(root, process.argv[2] || '.artifacts/selector-qa-' + Date.now());
assert.ok(output.startsWith(resolve(root, '.artifacts') + '/') && !existsSync(output), 'Use a fresh ignored evidence directory');
mkdirSync(output, { recursive: true });
const require = createRequire(resolve(process.env.SY_QA_PACKAGE_ROOT, '../package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
const report = { version: 1, origin: origin.origin, capturedAt: new Date().toISOString(), viewports: [], interactions: {} };
async function pageFor(width = 1440, height = 900, touch = false, reduced = false) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch,
    reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  await context.route('**/*', route => !['GET', 'HEAD'].includes(route.request().method()) ||
    /umami|google-analytics|analytics\.google|\/collect(?:\?|$)/i.test(route.request().url()) ? route.abort() : route.continue());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-venue-gallery]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { context, page, errors };
}
async function galleryState(page) {
  return page.locator('[data-venue-item]').evaluateAll(items => items.map(item => {
    const card = item.querySelector('[data-venue]');
    const img = card.querySelector('img');
    const name = card.querySelector('strong');
    return { hidden: item.hidden, open: item.classList.contains('is-open'), id: card.dataset.branchId,
      href: card.getAttribute('href'), role: card.getAttribute('role'), height: item.getBoundingClientRect().height,
      nameClipped: name.scrollWidth > name.clientWidth + 1,
      imageLoaded: img ? img.complete && img.naturalWidth > 0 : null,
      imageLayer: img ? Number(getComputedStyle(img.parentElement).zIndex) : null };
  }));
}
const expanded = state => state.filter(item => !item.hidden && item.open).map(item => item.id);
try {
  for (const [width, height, touch] of [[320, 740, true], [390, 844, true], [560, 900, true],
    [768, 1024, true], [1024, 768, true], [1440, 900, false], [1920, 1080, false], [1440, 900, true]]) {
    const { page, context, errors } = await pageFor(width, height, touch);
    const record = { width, height, touch };
    await page.locator('.opening-announcement').scrollIntoViewIfNeeded();
    record.banner = await page.locator('.opening-announcement').evaluate(el => ({ width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height, previousHero: el.previousElementSibling.id === 'inicio',
      text: el.innerText, links: [...el.querySelectorAll('a')].map(a => a.getAttribute('href')) }));
    assert.equal(record.banner.width, width);
    assert.equal(record.banner.previousHero, true);
    assert.deepEqual(record.banner.links, ['el-paso.html', 'el-paso.html']);
    await page.screenshot({ path: resolve(output, `banner-${width}-${touch ? 'touch' : 'mouse'}.png`), animations: 'disabled' });
    await page.locator('.venue-showcase').scrollIntoViewIfNeeded();
    await page.locator('.venue-frame img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
    record.cards = await galleryState(page);
    assert.equal(record.cards.length, 7);
    assert.ok(record.cards.every(card => card.height > 200 && !card.nameClipped && !card.role));
    assert.ok(record.cards.filter(card => card.imageLoaded !== null).every(card => card.imageLoaded && card.imageLayer >= 0));
    record.overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(record.overflow, false);
    await page.locator('.venue-showcase').screenshot({ path: resolve(output, `selector-${width}-${touch ? 'touch' : 'mouse'}.png`), animations: 'disabled' });
    await page.locator('#rotulo').scrollIntoViewIfNeeded();
    record.rotulo = await page.locator('#rotulo').evaluate(el => ({ height: el.getBoundingClientRect().height,
      images: [...el.querySelectorAll('img')].map(i => ({ height: i.getBoundingClientRect().height, loaded: i.complete && i.naturalWidth > 0 })) }));
    assert.ok(record.rotulo.images.every(img => img.loaded && img.height < 700));
    assert.ok(await page.evaluate(() => document.fonts.check('16px "Alfa Slab One"')));
    await page.locator('#rotulo').screenshot({ path: resolve(output, `rotulo-${width}-${touch ? 'touch' : 'mouse'}.png`), animations: 'disabled' });
    assert.deepEqual(errors, []);
    record.errors = errors; report.viewports.push(record);
    await context.close();
  }
  {
    const { page, context } = await pageFor();
    const houston = page.locator('[data-branch-id="houston"]');
    await houston.hover(); await page.waitForTimeout(500);
    assert.deepEqual(expanded(await galleryState(page)), ['houston']);
    await page.mouse.move(0, 0); await page.waitForTimeout(500);
    assert.deepEqual(expanded(await galleryState(page)), ['houston']);
    await page.locator('.venue-showcase').screenshot({ path: resolve(output, 'selector-last-hover-houston.png'), animations: 'disabled' });
    for (const [filter, count] of [['mx', 1], ['us', 6], ['soon', 3], ['all', 7]]) {
      await page.locator(`[data-venue-filter="${filter}"]`).click();
      assert.equal((await galleryState(page)).filter(item => !item.hidden).length, count);
      assert.equal(expanded(await galleryState(page)).length, 1);
      assert.equal(await page.locator('[data-venue-filter][aria-pressed="true"]').count(), 1);
    }
    await houston.click(); await page.waitForURL('**/houston.html');
    assert.equal(await page.locator('iframe[src*="google.com/maps"]').count(), 1);
    assert.ok(await page.locator('a[href*="opentable.com"]').count() > 0);
    assert.ok(await page.locator('a[href*="houston/menu"]').count() > 0);
    report.interactions.desktop = { previewPersists: true, firstClick: page.url(), map: 'Google iframe' };
    await context.close();
  }
  for (const touch of [false, true]) {
    const { page, context } = await pageFor(touch ? 390 : 1440, touch ? 844 : 900, touch);
    const card = page.locator('[data-branch-id="houston"]');
    if (touch) await card.tap();
    else { await card.focus(); assert.deepEqual(expanded(await galleryState(page)), ['houston']); await page.keyboard.press('Enter'); }
    await page.waitForURL('**/houston.html');
    report.interactions[touch ? 'touch' : 'keyboard'] = { firstActivation: page.url() };
    await context.close();
  }
  {
    const { page, context } = await pageFor();
    await page.locator('[data-lang-btn="en"]').click();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(await page.locator('.opening-announcement time').innerText(), 'October 9');
    assert.equal((await page.locator('.opening-announcement-link').innerText()).trim(), 'View location');
    assert.equal(await page.locator('#venue-heading').innerText(), 'Find your cantina');
    await page.locator('[data-venue-filter="soon"]').click();
    assert.equal(await page.locator('[data-venue-status]').innerText(), '3 locations');
    report.interactions.english = { banner: await page.locator('.opening-announcement').innerText(), selector: await page.locator('#venue-heading').innerText() };
    await context.close();
  }
  {
    const { page, context } = await pageFor(1440, 900, false, true);
    assert.equal(await page.locator('[data-venue-item]').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    report.interactions.reducedMotion = true;
    await context.close();
  }
  for (const path of ['houston.html', 'en/houston/', 'houston/menu/']) {
    const response = await fetch(new URL(path, origin));
    assert.equal(response.status, 200, path);
  }
  for (const path of ['dashboard.html', 'assets/js/mock-data.js', 'deploy_pages.py', 'docker-compose.yml', 'maricarmen.html']) {
    const response = await fetch(new URL(path, origin));
    assert.equal(response.status, 404, path);
  }
  report.passed = true;
  console.log(JSON.stringify({ passed: true, viewports: report.viewports.length, output }));
} catch (error) {
  report.passed = false; report.failure = error.message;
  throw error;
} finally {
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
