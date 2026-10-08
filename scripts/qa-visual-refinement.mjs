// First visual correction batch: rendered geometry, not source-text CSS assertions.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = new URL(process.env.SY_QA_ORIGIN || 'http://127.0.0.1:8797/');
assert.ok(['localhost', '127.0.0.1'].includes(origin.hostname), 'Local origins only');
assert.ok(!origin.username && !origin.password && !origin.search && !origin.hash);
assert.ok(process.env.SY_QA_PACKAGE_ROOT, 'Provide the installed Playwright package directory');
const output = resolve(root, process.argv[2] || '.artifacts/visual-refinement-' + Date.now());
assert.ok(output.startsWith(resolve(root, '.artifacts') + '/') && !existsSync(output), 'Use a fresh ignored evidence directory');
mkdirSync(output, { recursive: true });
const require = createRequire(resolve(process.env.SY_QA_PACKAGE_ROOT, '../package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
const report = { version: 1, completed: false, passed: false, origin: origin.origin, capturedAt: new Date().toISOString(),
  scope: 'QV01/02/04/06/12/13/17 local correction batch; not whole-site launch approval', cases: [], failures: [] };
const check = (condition, id, message, record) => {
  record.checks.push({ id, passed: Boolean(condition), message });
  if (!condition) report.failures.push({ id, path: record.path, width: record.width, language: record.language, message });
};
async function visit(path, width, language = 'es') {
  const context = await browser.newContext({ viewport: { width, height: width <= 390 ? 844 : 1024 },
    hasTouch: width <= 768, isMobile: width <= 768, serviceWorkers: 'block' });
  await context.addInitScript(lang => localStorage.setItem('sy-lang', lang), language);
  await context.route('**/*', route => !['GET', 'HEAD'].includes(route.request().method()) ||
    /umami|google-analytics|analytics\.google|\/collect(?:\?|$)/i.test(route.request().url()) ? route.abort() : route.continue());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(new URL(path, origin).href, { waitUntil: 'domcontentloaded' });
  await page.locator(path === 'aviso-de-privacidad.html' ? '.legal-wrap' : '.public-header').waitFor();
  // Force layout/font discovery before waiting: fonts.ready alone can resolve
  // before the first render has requested a heading's webfont.
  await page.locator('h1').evaluate(async heading => {
    heading.getBoundingClientRect();
    const style = getComputedStyle(heading);
    await document.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, heading.textContent);
  });
  await page.evaluate(() => document.fonts.ready);
  if (path !== 'aviso-de-privacidad.html') {
    await page.locator('[data-lang-btn]').first().waitFor({ state: 'attached' });
    await page.waitForFunction(lang => document.documentElement.lang === lang, language);
  }
  const record = { path, width, language, checks: [], errors };
  report.cases.push(record);
  return { page, context, record };
}
async function reveal(page, block) {
  for (const node of await block.locator('.reveal, .reveal-scale').all()) {
    await node.scrollIntoViewIfNeeded();
    await page.waitForFunction(el => el.classList.contains('revealed'), await node.elementHandle());
  }
}
async function shot(page, block, name) {
  await reveal(page, block);
  await block.screenshot({ path: resolve(output, name), animations: 'disabled',
    style: '.public-header { visibility: hidden !important; }' });
}
async function headingBounds(page, selector) {
  return page.locator(selector).evaluate(element => {
    const range = document.createRange(); range.selectNodeContents(element);
    const glyphs = [...range.getClientRects()].filter(rect => rect.width && rect.height);
    const box = element.getBoundingClientRect();
    return { text: element.innerText, font: getComputedStyle(element).fontSize,
      left: box.left, right: box.right, viewport: innerWidth,
      glyphs: glyphs.map(({ left, right, top, bottom }) => ({ left, right, top, bottom })) };
  });
}
try {
  for (const width of [320, 390, 768, 1024, 1440]) {
    const { page, context, record } = await visit('', width);
    record.toggle = await page.locator('[data-lang-btn]').evaluateAll(buttons => buttons.map(b => ({
      language: b.dataset.langBtn, active: b.classList.contains('active'), pressed: b.getAttribute('aria-pressed') })));
    check(record.toggle.every(b => b.active === (b.language === 'es') && b.pressed === String(b.active)), 'QV13', 'ES initially selected visually and accessibly', record);
    const experience = page.locator('#experiencia');
    await experience.scrollIntoViewIfNeeded(); await reveal(page, experience);
    await experience.locator('img').evaluate(img => img.decode());
    record.experience = await experience.evaluate(section => {
      const frame = section.querySelector('.experience-media'), img = frame.querySelector('img');
      const box = frame.getBoundingClientRect(), image = img.getBoundingClientRect();
      const column = parseFloat(getComputedStyle(frame.parentElement).gridTemplateColumns.split(/\s+/)[0]);
      return { frameWidth: box.width, columnWidth: column, frameHeight: box.height, imageWidth: image.width,
        imageHeight: image.height, fit: getComputedStyle(img).objectFit, loaded: img.complete && img.naturalWidth > 0 };
    });
    const e = record.experience;
    check(Math.abs(e.frameWidth - e.columnWidth) < 1 && Math.abs(e.imageWidth - e.frameWidth) < 1 &&
      Math.abs(e.imageHeight - e.frameHeight) < 1 && e.fit === 'cover' && e.loaded, 'QV01', 'Photo fills its grid column and frame', record);
    await shot(page, experience, `experience-${width}.png`);
    const birthday = page.locator('#cumple');
    await reveal(page, birthday);
    record.birthday = await birthday.evaluate(section => {
      const range = document.createRange(); range.selectNodeContents(section.querySelector('h2'));
      const h = range.getBoundingClientRect(), copy = section.querySelector('.cumple-copy').getBoundingClientRect();
      const button = section.querySelector('.button').getBoundingClientRect();
      return { headingCenter: (h.left + h.right) / 2, copyCenter: (copy.left + copy.right) / 2,
        buttonCenter: (button.left + button.right) / 2 };
    });
    const b = record.birthday;
    check(Math.abs(b.headingCenter - b.copyCenter) < 2 && Math.abs(b.buttonCenter - b.copyCenter) < 2,
      'QV12', 'Birthday heading, copy and action share an axis', record);
    await shot(page, birthday, `birthday-${width}.png`);
    // Native visitor flow, no manual location/filter state assignment.
    await page.locator('[data-venue-filter="soon"]').click();
    await page.locator('#reserve .button').click();
    check(await page.locator('[data-venue-filter="all"]').getAttribute('aria-pressed') === 'true' &&
      await page.evaluate(() => document.activeElement.id) === 'ubicaciones', 'QV02', 'Final booking clears soon and focuses selector', record);
    check(errorsFree(record), 'runtime', 'No browser runtime errors', record);
    await context.close();
  }
  for (const path of ['san-ignacio.html', 'the-woodlands.html']) {
    for (const width of [320, 390, 768, 1440]) for (const language of ['es', 'en']) {
      const { page, context, record } = await visit(path, width, language);
      await page.locator('.branch-hero h1').evaluate(el => Promise.all(el.getAnimations()
        .map(animation => animation.finished.catch(() => {}))));
      record.heading = await headingBounds(page, '.branch-hero h1');
      const h = record.heading;
      check(h.glyphs.length > 0 && h.glyphs.every(g => g.left >= h.left - 1 && g.right <= h.right + 1 &&
        g.left >= 0 && g.right <= h.viewport + 1), 'QV04', 'Branch title glyphs fit their real content box', record);
      await page.screenshot({ path: resolve(output, `${path.replace('.html', '')}-${width}-${language}.png`), animations: 'disabled' });
      check(errorsFree(record), 'runtime', 'No browser runtime errors', record);
      await context.close();
    }
  }
  for (const width of [320, 390, 768, 1440]) {
    const { page, context, record } = await visit('aviso-de-privacidad.html', width);
    record.heading = await headingBounds(page, '.legal-wrap h1');
    record.documentOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const h = record.heading;
    check(!record.documentOverflow && h.glyphs.length > 0 && h.glyphs.every(g =>
      g.left >= h.left - 1 && g.right <= h.right + 1 && g.left >= 0 && g.right <= width + 1),
      'QV06', 'Privacy title fits the legal content column', record);
    await page.screenshot({ path: resolve(output, `privacy-${width}.png`), animations: 'disabled' });
    await context.close();
  }
  for (const width of [320, 390, 768, 1024, 1440]) for (const language of ['es', 'en']) {
    const { page, context, record } = await visit('eventos.html', width, language);
    const cta = page.locator('.reserve-cta');
    await reveal(page, cta);
    record.buttons = await cta.locator('a.button').evaluateAll(buttons => buttons.map(button => {
      const { left, right, top, bottom, height } = button.getBoundingClientRect();
      return { left, right, top, bottom, height, clipped: button.scrollWidth > button.clientWidth + 1 };
    }));
    const [a, b] = record.buttons;
    check(record.buttons.length === 2 && record.buttons.every(b => b.height >= 44 && !b.clipped && b.left >= 0 && b.right <= width + 1) &&
      (b.left - a.right >= 10 || a.left - b.right >= 10 || b.top - a.bottom >= 10 || a.top - b.bottom >= 10),
      'QV17', 'Event actions retain a real gap when stacked or side by side', record);
    await shot(page, cta, `events-${width}-${language}.png`);
    check(errorsFree(record), 'runtime', 'No browser runtime errors', record);
    await context.close();
  }
  report.completed = true;
  report.passed = report.failures.length === 0;
  console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, failures: report.failures, output }));
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  report.fatal = error.message;
  throw error;
} finally {
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
function errorsFree(record) { return record.errors.length === 0; }
