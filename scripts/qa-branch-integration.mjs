// Rendered, local-only integration QA. No bookings, submissions or remote writes.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = new URL(process.env.SY_QA_ORIGIN || 'http://127.0.0.1:8798/');
assert.ok(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname), 'Local HTTP origins only');
assert.ok(!origin.username && !origin.password && !origin.search && !origin.hash && origin.pathname === '/');
assert.ok(process.env.SY_QA_PACKAGE_ROOT, 'Provide the installed Playwright package directory');
const output = resolve(root, process.argv[2] || '.artifacts/branch-integration-qa-' + Date.now());
assert.ok(output.startsWith(resolve(root, '.artifacts') + '/') && !existsSync(output), 'Use a fresh ignored evidence directory');
mkdirSync(output, { recursive: true });
const require = createRequire(resolve(process.env.SY_QA_PACKAGE_ROOT, '../package.json'));
const { chromium } = require('playwright');
const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/branch-import-manifest.json'), 'utf8'));
const branchIds = ['houston', 'san-antonio', 'the-woodlands', 'san-ignacio', 'el-paso'];
const routePath = route => new URL(route.canonical).pathname;
const normalized = path => path.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/';
const samePath = (left, right) => normalized(new URL(left, origin).pathname) === normalized(new URL(right, origin).pathname);
const safeURL = value => { try { const url = new URL(value); return url.origin + url.pathname; } catch { return '(invalid URL)'; } };
const allowGoogle = process.env.SY_QA_ENABLE_GOOGLE_MAPS === '1';
const report = { version: 2, capturedAt: new Date().toISOString(), origin: origin.origin,
  completed: false, passed: false,
  scope: 'Imported local branch/menu/Catering integration; not publication, commercial approval or complete design certification',
  coverage: { browser: 'Chromium', externalServices: allowGoogle ? 'Google Maps GET/HEAD permitted; no booking/provider actions' : 'External requests excluded; maps checked structurally, not for remote availability',
    physicalDevices: false, safari: false, expectedCases: 42 }, cases: [], journeys: [], failures: [] };
function check(condition, id, message, record) {
  record.checks.push({ id, passed: Boolean(condition), message });
  if (!condition) report.failures.push({ id, path: record.path, width: record.width, language: record.language, message });
}
const browser = await chromium.launch({ headless: true });
async function newPage(width, language) {
  const context = await browser.newContext({ viewport: { width, height: width <= 390 ? 844 : 1024 },
    hasTouch: width <= 768, isMobile: width <= 768, serviceWorkers: 'block' });
  context.setDefaultTimeout(7000);
  context.setDefaultNavigationTimeout(15000);
  await context.addInitScript(({ lang, ownOrigin }) => {
    // Init scripts also run in frames. An excluded map is opaque and cannot
    // access storage; that must not manufacture an application pageerror.
    if (location.origin !== ownOrigin) return;
    try { localStorage.setItem('sy-lang', lang); } catch { /* Storage may be denied independently of the page. */ }
  }, { lang: language, ownOrigin: origin.origin });
  const network = { localFailures: [], blocked: [], externalFailures: [] }, errors = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    let reason;
    if (!['GET', 'HEAD'].includes(request.method())) reason = 'non-read request';
    else if (/umami|google-analytics|analytics\.google|\/collect(?:\?|$)/i.test(request.url())) reason = 'telemetry';
    else if (url.origin !== origin.origin && !(allowGoogle && /(^|\.)(google\.com|googleapis\.com|gstatic\.com)$/.test(url.hostname))) reason = 'external service excluded';
    if (reason) {
      network.blocked.push({ url: safeURL(request.url()), method: request.method(), reason });
      await route.abort();
    } else await route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).origin === origin.origin)
      network.localFailures.push({ url: safeURL(response.url()), status: response.status() });
  });
  page.on('requestfailed', request => {
    const url = new URL(request.url());
    if (network.blocked.some(item => item.url === safeURL(request.url()) && item.method === request.method())) return;
    const entry = { url: safeURL(request.url()), error: request.failure()?.errorText ?? 'Request failed' };
    if (url.origin === origin.origin) network.localFailures.push(entry);
    else network.externalFailures.push(entry);
  });
  return { context, page, network, errors };
}
async function settleFonts(page) {
  await page.locator('h1').evaluate(async heading => {
    heading.getBoundingClientRect();
    const style = getComputedStyle(heading);
    await document.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, heading.textContent);
    await document.fonts.ready;
  });
}
async function walkImages(page) {
  // Discover lazy media as a visitor scrolling through the full page would.
  const images = await page.locator('img').all();
  for (const image of images) {
    const rendered = await image.evaluate(img => img.getClientRects().length > 0);
    if (!rendered) continue;
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(img => new Promise(resolve => {
      if (img.complete) { resolve(); return; }
      const done = () => { clearTimeout(timer); img.removeEventListener('load', done); img.removeEventListener('error', done); resolve(); };
      const timer = setTimeout(done, 5000);
      img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true });
    }));
  }
  return page.locator('img').evaluateAll(imgs => imgs.map(img => ({
    src: new URL(img.currentSrc || img.src, document.baseURI).pathname,
    rendered: img.getClientRects().length > 0, complete: img.complete, naturalWidth: img.naturalWidth,
  })));
}
async function viewportShot(page, record, suffix = 'top', selector) {
  if (selector && await page.locator(selector).count()) await page.locator(selector).first().scrollIntoViewIfNeeded();
  else await page.evaluate(() => scrollTo(0, 0));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  // Native menu/language navigation recreates lazy images. A previous loaded
  // instance is not evidence for this screenshot; decode the currently visible
  // instances without scrolling elsewhere or altering their layout/styles.
  const visibleImages = await page.locator('img').evaluateAll(async images => {
    const visible = images.filter(img => {
      const box = img.getBoundingClientRect(), style = getComputedStyle(img);
      return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight &&
        box.right > 0 && box.left < innerWidth && style.visibility === 'visible' && Number(style.opacity) > 0;
    });
    return Promise.all(visible.map(async img => {
      let timer, error = null;
      try {
        await Promise.race([img.decode(), new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Visible image decode timed out')), 5000);
        })]);
      } catch (failure) { error = failure.message; }
      finally { clearTimeout(timer); }
      return { src: new URL(img.currentSrc || img.src, document.baseURI).pathname,
        complete: img.complete, naturalWidth: img.naturalWidth, decoded: !error, error };
    }));
  });
  (record.captureImages ??= {})[suffix] = visibleImages;
  check(visibleImages.every(image => image.complete && image.naturalWidth > 0 && image.decoded),
    'capture-images-' + suffix, 'Current viewport images are decoded before capture, without changing the framing', record);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  if (suffix === 'catering' && record.kind === 'branch' && record.width > 760) {
    record.cateringTeaser = await page.locator('.bct-photo img').evaluate(img => {
      const image = img.getBoundingClientRect(), figure = img.parentElement.getBoundingClientRect();
      let opacity = 1, visible = true;
      for (let node = img; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        opacity *= Number(style.opacity);
        visible &&= style.visibility === 'visible' && style.display !== 'none';
      }
      const points = [.1, .3, .5].map(ratio => {
        const x = figure.left + figure.width * ratio, y = figure.top + figure.height / 2;
        return { x, y, inViewport: x >= 0 && x < innerWidth && y >= 0 && y < innerHeight,
          imagePaintHit: document.elementsFromPoint(x, y).includes(img) };
      });
      const bounds = ({ left, top, width, height }) => ({ left, top, width, height });
      return { complete: img.complete, naturalWidth: img.naturalWidth, opacity, visible,
        image: bounds(image), figure: bounds(figure), objectFit: getComputedStyle(img).objectFit,
        objectPosition: getComputedStyle(img).objectPosition, points };
    });
    const photo = record.cateringTeaser;
    check(photo.complete && photo.naturalWidth > 0 && photo.visible && photo.opacity >= .99 &&
      photo.figure.width > 100 && photo.figure.height > 100 &&
      Math.abs(photo.image.width - photo.figure.width) < 1 && Math.abs(photo.image.height - photo.figure.height) < 1 &&
      photo.objectFit === 'cover' && photo.points.every(point => point.inViewport && point.imagePaintHit),
      'catering-teaser-painted', 'Desktop Catering photograph occupies its frame and is decoded/hit-testable in the current viewport', record);
  }
  const name = `${record.kind}-${record.branch || 'catering'}-${record.language}-${record.width}-${suffix}.png`;
  await page.screenshot({ path: resolve(output, name), animations: 'disabled' });
  (record.screenshots ??= []).push(name);
}
async function inspectRoute(branch, route, width, kind = 'branch') {
  const language = route.lang, path = routePath(route), session = await newPage(width, language);
  const { page, context, network, errors } = session;
  const record = { branch, kind, path, language, width, checks: [], errors, network };
  report.cases.push(record);
  try {
    const response = await page.goto(new URL(path, origin).href, { waitUntil: 'domcontentloaded' });
    check(response?.status() === 200, 'document-status', 'Document responds 200, not a fallback/listing', record);
    check(await page.locator('h1').count() === 1, 'h1', 'Exactly one H1', record);
    if (await page.locator('h1').count() !== 1) return;
    await settleFonts(page);
    check(await page.locator('html').getAttribute('lang') === language, 'language', 'HTML language matches this route', record);
    if (kind !== 'catering') {
      const branchAttribute = kind === 'menu' ? 'data-branch-id' : 'data-branch';
      check(await page.locator('body').getAttribute(branchAttribute) === branch, 'branch-identity', 'Own branch identity, no Houston substitution', record);
    }
    if (kind === 'menu')
      check(await page.locator('body.digital-menu-page').count() === 1 && await page.locator('[data-menu-group]').count() > 0,
        'menu-identity', 'Digital menu content is rendered; review metadata is not upgraded to commercial approval', record);
    record.images = await walkImages(page);
    check(record.images.filter(image => image.rendered).every(image => image.complete && image.naturalWidth > 0),
      'images', 'Every rendered image has loaded after scrolling', record);
    record.geometry = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth, h1: document.querySelector('h1').innerText }));
    check(record.geometry.scrollWidth <= width + 1 && record.geometry.bodyWidth <= width + 1,
      'horizontal-overflow', 'Document/body do not overflow horizontally', record);
    // Reactive headers can be hidden after the image walk. Return to the actual
    // top before exercising navigation rather than forcing CSS visibility.
    await page.evaluate(() => scrollTo(0, 0));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (kind === 'branch') {
      record.maps = await page.locator('.visit-editorial iframe').evaluateAll(frames => frames.map(frame => ({
        host: new URL(frame.src).hostname, path: new URL(frame.src).pathname, title: frame.title,
      })));
      check(record.maps.length > 0 && record.maps.every(map => /(^|\.)google\.com$/.test(map.host) && map.path.startsWith('/maps') && map.title),
        'google-map', 'Fixed branch map uses an official Google Maps iframe with a title', record);
      check(await page.locator('iframe').count() === record.maps.length, 'map-provider', 'No additional generic map provider/iframe', record);
      const home = page.locator('.hh-brand');
      check(await home.count() === 1 && samePath(await home.getAttribute('href'), '/'), 'brand-home', 'Branch brand logo links to group home', record);
      const ownMenus = (manifest[branch]?.routes ?? []).filter(candidate => candidate.kind === 'menu');
      const menuLink = page.locator('.hh-nav-menu');
      if (ownMenus.length) check(await menuLink.count() === 1, 'menu-configuration', 'Own menu navigation is present', record);
      if (await menuLink.count()) {
        const menuHref = await menuLink.getAttribute('href');
        check(ownMenus.some(menu => samePath(menuHref, routePath(menu))), 'own-menu-link', 'Menu link points to this branch’s own menu/fallback', record);
        if (ownMenus.some(menu => samePath(menuHref, routePath(menu)))) {
          // The compact mobile header intentionally omits Menu. Exercise the
          // visible hero action instead; do not force a hidden link to appear.
          const action = await menuLink.isVisible() ? menuLink : page.locator('.hh-welcome-menu');
          const available = await action.count() === 1 && await action.isVisible();
          check(available && samePath(await action.getAttribute('href'), menuHref),
            'visible-menu-action', 'A visible own-menu action is available at this viewport', record);
          if (available) {
            await Promise.all([page.waitForURL(url => samePath(url.href, menuHref)), action.click()]);
            check(await page.locator('body').getAttribute('data-branch-id') === branch &&
              await page.locator('body.digital-menu-page').count() === 1 && await page.locator('[data-menu-group]').count() > 0,
              'branch-menu-navigation', 'Menu actually opens for the same branch without changing review metadata', record);
            await page.goto(new URL(path, origin).href, { waitUntil: 'domcontentloaded' }); await settleFonts(page);
          }
        }
      } else check(ownMenus.length === 0, 'own-menu-link', 'No menu link is fabricated for a branch without a menu', record);
    }
    if (kind === 'menu') {
      const back = page.locator('.local-header nav a').filter({ hasText: /The location|La sucursal/ });
      const branches = manifest[branch].routes.filter(candidate => candidate.kind !== 'menu');
      check(await back.count() === 1, 'back-configuration', 'Menu has one explicit branch-return action', record);
      if (await back.count()) {
        const href = await back.getAttribute('href');
        check(branches.some(candidate => samePath(href, routePath(candidate))), 'menu-to-branch', 'Menu returns to its own branch, never another location', record);
        const action = await back.isVisible() ? back : page.locator('.digital-editorial a');
        const available = await action.count() === 1 && await action.isVisible();
        const actionHref = available ? await action.getAttribute('href') : null;
        check(available && branches.some(candidate => samePath(actionHref, routePath(candidate))),
          'visible-branch-return', 'A visible own-branch return action is available', record);
        if (available) {
          await Promise.all([page.waitForURL(url => branches.some(candidate => samePath(url.href, routePath(candidate)))), action.click()]);
          check(await page.locator('body').getAttribute('data-branch') === branch, 'menu-back-navigation', 'Own branch page actually opens', record);
          await page.goto(new URL(path, origin).href, { waitUntil: 'domcontentloaded' }); await settleFonts(page);
        }
      }
    }
    const counterparts = kind === 'catering'
      ? [{ lang: language === 'es' ? 'en' : 'es', canonical: `https://sin-yolanda.com/${language === 'es' ? 'en/' : ''}catering${language === 'es' ? '/' : ''}` }]
      : (manifest[branch]?.routes ?? []).filter(candidate => (candidate.kind === 'menu') === (kind === 'menu') && candidate.lang !== language);
    if (counterparts.length) {
      const target = counterparts[0], link = page.locator(kind === 'branch' ? '.hh-language' : kind === 'menu'
        ? `.digital-menu-languages a[lang="${target.lang}"]` : '.ct-language-switch');
      check(await link.count() === 1 && samePath(await link.getAttribute('href'), routePath(target)),
        'language-target', 'Language switch keeps the same branch/service and page kind', record);
      if (await link.count()) {
        await Promise.all([page.waitForURL(url => samePath(url.href, routePath(target))), link.click()]);
        const reciprocal = page.locator(kind === 'branch' ? '.hh-language' : kind === 'menu'
          ? `.digital-menu-languages a[lang="${language}"]` : '.ct-language-switch');
        check(await page.locator('html').getAttribute('lang') === target.lang && await reciprocal.count() === 1 &&
          samePath(await reciprocal.getAttribute('href'), path), 'language-reciprocal', 'Other language renders and links reciprocally to the same page', record);
        await page.goto(new URL(path, origin).href, { waitUntil: 'domcontentloaded' }); await settleFonts(page);
      }
    }
    record.imagesBeforeNavigation = record.images;
    record.images = await walkImages(page);
    check(record.images.filter(image => image.rendered).every(image => image.complete && image.naturalWidth > 0),
      'current-images', 'Images are rechecked on the final document after menu/language navigation', record);
    await viewportShot(page, record);
    if (kind === 'branch' && [390, 1440].includes(width)) {
      for (const [suffix, selector] of [['catering', '#catering-' + branch], ['visit', '#visita-' + branch], ['footer', '[data-branch-footer]']])
        if (await page.locator(selector).count()) await viewportShot(page, record, suffix, selector);
    }
    if (kind === 'menu') {
      await viewportShot(page, record, 'first-section', '[data-menu-group]');
      await viewportShot(page, record, 'footer', '[data-branch-footer]');
    }
    if (kind === 'catering') {
      await viewportShot(page, record, 'experience', '#experiencia');
      await viewportShot(page, record, 'contact', '#contacto');
    }
    check(errors.length === 0, 'page-errors', 'No pageerror observed', record);
    check(network.localFailures.length === 0, 'local-network', 'Local documents/assets have no failed response/request', record);
  } catch (error) {
    check(false, 'case-error', error.message, record);
  } finally { await context.close(); }
}

try {
  for (const branch of branchIds) {
    const routes = manifest[branch]?.routes ?? [];
    const es = routes.find(route => route.kind !== 'menu' && route.lang === 'es');
    assert.ok(es, 'Missing ES branch import route: ' + branch);
    for (const width of [320, 390, 768, 1440]) await inspectRoute(branch, es, width);
    for (const route of routes.filter(route => route.kind !== 'menu' && route.lang === 'en'))
      for (const width of [390, 1440]) await inspectRoute(branch, route, width);
    for (const route of routes.filter(route => route.kind === 'menu'))
      for (const width of [390, 1440]) await inspectRoute(branch, route, width, 'menu');
  }
  for (const lang of ['es', 'en']) for (const width of [390, 1440])
    await inspectRoute(null, { lang, canonical: `https://sin-yolanda.com/${lang === 'en' ? 'en/' : ''}catering${lang === 'en' ? '/' : ''}` }, width, 'catering');
  check(report.cases.length === report.coverage.expectedCases, 'matrix-completeness', 'Five ES, four EN, five menus and Catering ES/EN were all rendered',
    { path: '(matrix)', width: null, language: null, checks: [] });
  // Each native selector link is exercised, not merely inspected in source HTML.
  for (const width of [390, 1440]) for (const branch of branchIds) {
    const { context, page, network, errors } = await newPage(width, 'es');
    const record = { branch, width, path: '/', language: 'es', checks: [], errors, network };
    report.journeys.push(record);
    try {
      await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
      const card = page.locator(`a[data-venue][data-branch-id="${branch}"]`);
      await card.waitFor();
      const target = manifest[branch].routes.find(route => route.kind !== 'menu' && route.lang === 'es');
      check(samePath(await card.getAttribute('href'), routePath(target)), 'native-selector-target', 'Card has its own real native destination', record);
      await Promise.all([page.waitForURL(url => samePath(url.href, routePath(target))), card.click()]);
      check(await page.locator('body').getAttribute('data-branch') === branch && await page.locator('.hh-hero').count() === 1,
        'native-selector-navigation', 'One click/tap opens the full own branch page', record);
      check(await page.locator('[role="dialog"]').evaluateAll(nodes => nodes.every(node => !node.getClientRects().length)),
        'no-home-dialog', 'No inline home modal substitutes for the branch page', record);
      check(errors.length === 0 && network.localFailures.length === 0, 'journey-runtime', 'Native journey has no local runtime/asset failures', record);
    } catch (error) { check(false, 'journey-error', error.message, record); }
    finally { await context.close(); }
  }
  report.completed = true;
  report.passed = report.failures.length === 0;
  console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, journeys: report.journeys.length,
    failures: report.failures, output }));
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  report.fatal = error.message;
  process.exitCode = 1;
  console.error(JSON.stringify({ completed: false, fatal: error.message, output }));
} finally {
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
