// Repeatable local acceptance of the existing site; isolated Brave, no external writes.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync, existsSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadReviewPackage, startReviewServer} from './serve-review.mjs';
import {localQaBrowserPath} from './local-qa-browser.mjs';

const root = resolve(import.meta.dirname, '..');
const artifact = loadReviewPackage(process.argv[2]);
assert.equal(artifact.metadata.publicationEnabled, false, 'Provide an isolated quality candidate');
assert.ok(process.env.SY_QA_PACKAGE_ROOT, 'Provide the installed Playwright package directory');
const output = resolve(process.argv[3] ?? '.artifacts/quality-qa-' + Date.now());
assert.ok(output.startsWith(resolve(root, '.artifacts') + '/') && !existsSync(output), 'Use a fresh ignored evidence directory');
mkdirSync(output, {recursive: true});
const require = createRequire(resolve(process.env.SY_QA_PACKAGE_ROOT, '../package.json'));
const {chromium} = require('playwright');
const executablePath = localQaBrowserPath();
let server, origin, browser;
const report = {version: 1, passed: false, artifactCommit: artifact.metadata.commit,
  artifactDirty: artifact.metadata.dirty, publicDigest: artifact.metadata.publicDigest,
  asOf: artifact.metadata.qualityReview.asOf, browser: 'Installed Brave, isolated contexts',
  externalRequestsBlocked: 0, unexpectedWriteRequests: 0, views: [], interactions: [], expiryChecks: [], submitted: false};
const contexts = [];
async function visit(path, width = 390, language = 'es', javaScriptEnabled = true) {
  const context = await browser.newContext({viewport: {width, height: 1000},
    reducedMotion: 'reduce', serviceWorkers: 'block', javaScriptEnabled});
  contexts.push(context);
  await context.route('**/*', route => {
    const request = route.request();
    if (!['GET', 'HEAD'].includes(request.method())) {report.unexpectedWriteRequests++; return route.abort();}
    if (new URL(request.url()).origin !== origin) {report.externalRequestsBlocked++; return route.abort();}
    return route.continue();
  });
  await context.addInitScript(lang => localStorage.setItem('sy-lang', lang), language);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  if (javaScriptEnabled) await page.clock.install({time: new Date(report.asOf)});
  const response = await page.goto(origin + path, {waitUntil: 'load'});
  await page.evaluate(() => document.fonts.ready);
  return {context, page, errors, status: response.status()};
}
const close = async context => {await context.close(); contexts.splice(contexts.indexOf(context), 1);};
const shot = async (page, name) => page.screenshot({path: resolve(output, name + '.jpg'), quality: 86, animations: 'disabled'});
try {
  server = await startReviewServer({...artifact, port: 0});
  origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({headless: true, executablePath});
  const paths = Object.keys(artifact.metadata.hashes).filter(file => file.endsWith('.html')).map(file => file === '404.html' ? '/_quality-missing-route' : '/' + file);
  for (const width of [320, 390, 1440]) for (const path of paths) {
    const {context, page, errors, status} = await visit(path, width);
    assert.equal(status, path.includes('_quality-missing') ? 404 : 200, path);
    const dimensions = await page.evaluate(() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth}));
    assert.ok(dimensions.scrollWidth <= width, 'Horizontal overflow: ' + path + ' at ' + width);
    const images = await page.locator('img').evaluateAll(async nodes => {
      const visible = nodes.filter(node => {
        const box = node.getBoundingClientRect();
        return (node.currentSrc || node.getAttribute('src')) && box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight;
      });
      await Promise.all(visible.map(node => node.decode().catch(() => {})));
      return visible.map(node => ({src: node.getAttribute('src'), loaded: node.naturalWidth > 0}));
    });
    assert.ok(images.every(image => image.loaded), 'Visible image failed: ' + path + ' ' + JSON.stringify(images));
    assert.deepEqual(errors, [], path + ': browser errors');
    report.views.push({path, ...dimensions, status, errors, images});
    await close(context);
  }
  // A cached page must adapt after a poster expires, without requiring a rebuild.
  // Use a pre-expiry build to exercise this path; a current post-expiry build has no poster markup.
  for (const file of artifact.metadata.qualityReview.pilotPages) {
    const path = '/' + file;
    const {context, page} = await visit(path, 1440);
    const poster = page.locator('.sy-sunday-programming .sy-nfl-poster[data-expires-at]');
    if (await poster.count() !== 1) {await close(context); continue;}
    const expiry = Date.parse(await poster.getAttribute('data-expires-at'));
    if (!Number.isFinite(expiry) || expiry <= Date.parse(report.asOf)) {await close(context); continue;}
    assert.ok(await poster.isVisible(), path + ': poster must be visible before its expiry');
    await page.clock.fastForward(expiry - Date.parse(report.asOf) + 1100);
    assert.equal(await poster.isVisible(), false, path + ': expired poster must disappear');
    const layout = await page.locator('.sy-sunday-programming').evaluate(card => {
      const copy = card.querySelector('.sy-agenda-night-copy');
      const style = getComputedStyle(card);
      return {columns: style.gridTemplateColumns, cardWidth: card.getBoundingClientRect().width,
        contentWidth: card.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        copyWidth: copy.getBoundingClientRect().width};
    });
    assert.ok(Math.abs(layout.copyWidth - layout.contentWidth) <= 2,
      path + ': hidden poster must not reserve a narrow text column');
    report.expiryChecks.push({path, expiry: new Date(expiry).toISOString(), ...layout});
    await close(context);
  }
  if (process.argv.includes('--require-expiry-scenarios')) {
    assert.equal(report.expiryChecks.length, 8, 'Use a pre-expiry candidate covering four Texas branches in ES/EN');
  }
  for (const path of ['/index.html', '/locations.html']) {
    const {context, page, errors} = await visit(path);
    await page.waitForFunction(() => document.querySelector('[data-venue-status]')?.hasAttribute('data-i18n-en'));
    for (const language of ['es', 'en', 'es', 'en']) {
      const menu = page.locator('.menu-toggle');
      if (await menu.getAttribute('aria-expanded') !== 'true') await menu.click();
      await page.locator(`[data-lang-btn="${language}"]`).click();
      await page.keyboard.press('Escape');
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      assert.ok(await menu.evaluate(node => node === document.activeElement));
      for (const filter of ['all', 'mx', 'us', 'soon', 'all']) {
        await page.locator(`[data-venue-filter="${filter}"]`).click();
        const count = await page.locator('[data-venue-item]:not([hidden])').count();
        const expected = `${count} ${language === 'en' ? (count === 1 ? 'location' : 'locations') : (count === 1 ? 'sucursal' : 'sucursales')}`;
        await page.waitForFunction(text => document.querySelector('[data-venue-status]').textContent === text, expected);
        assert.equal(await page.locator(`[data-venue-filter="${filter}"]`).getAttribute('aria-pressed'), 'true');
        report.interactions.push({path, language, filter, count, expected});
      }
    }
    // Switch language while a non-default filter stays selected.
    await page.locator('[data-venue-filter="mx"]').click();
    const mexicoCount = await page.locator('[data-venue-item]:not([hidden])').count();
    await page.locator('.menu-toggle').click(); await page.locator('[data-lang-btn="es"]').click(); await page.keyboard.press('Escape');
    await page.waitForFunction(text => document.querySelector('[data-venue-status]').textContent === text,
      `${mexicoCount} ${mexicoCount === 1 ? 'sucursal' : 'sucursales'}`);
    assert.equal(await page.locator('[data-venue-filter="mx"]').getAttribute('aria-pressed'), 'true');
    // Reservation entry restores real choices when the visitor had selected coming-soon.
    await page.locator('[data-venue-filter="soon"]').click();
    await page.locator('.menu-toggle').click(); await page.locator('.public-nav [data-select-location]').first().click();
    assert.equal(await page.locator('[data-venue-filter="all"]').getAttribute('aria-pressed'), 'true');
    await page.locator('.venue-showcase').evaluate(node => scrollTo({top: node.getBoundingClientRect().top + scrollY - 100, behavior: 'instant'}));
    await shot(page, path.includes('locations') ? 'directory-mobile' : 'home-selector-mobile');
    assert.deepEqual(errors, []); await close(context);
  }
  for (const language of ['es', 'en']) {
    const {context, page, errors, status} = await visit('/_quality-missing-route', 390, language);
    assert.equal(status, 404);
    await page.waitForFunction(lang => document.documentElement.lang === lang, language);
    assert.equal(await page.locator('h1').innerText(), language === 'en' ? 'This table does not exist.' : 'Esta mesa no existe.');
    assert.match(await page.title(), language === 'en' ? /Page not found/ : /Página no encontrada/);
    await shot(page, '404-' + language); assert.deepEqual(errors, []); await close(context);
  }
  for (const width of [390, 768, 1024, 1440]) {
    const {context, page} = await visit('/index.html', width);
    for (const selector of ['.pretextos-section', '#botaneo', '#cumple']) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await page.locator(selector).evaluate(node => scrollTo({top: node.getBoundingClientRect().top + scrollY - 100, behavior: 'instant'}));
      await shot(page, 'home-' + selector.replace(/[.#]/g, '') + '-' + width);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await close(context);
  }
  for (const path of ['/index.html', '/locations.html', '/_quality-missing-route']) {
    const {context, page, status} = await visit(path, 390, 'es', false);
    assert.equal(status, path.includes('_quality-missing') ? 404 : 200);
    assert.ok((await page.locator('h1').innerText()).trim());
    assert.ok(await page.locator('a[href]').count()); await close(context);
  }
  assert.equal(report.unexpectedWriteRequests, 0); report.passed = true;
} catch (error) {report.error = String(error); throw error;}
finally {
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  for (const context of contexts) await context.close();
  await browser?.close(); if (server) await new Promise(done => server.close(done));
}
console.log(JSON.stringify({passed: report.passed, views: report.views.length, interactions: report.interactions.length, submitted: false}));
