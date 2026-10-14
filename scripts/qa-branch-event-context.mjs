// Headless local QA: external navigation, analytics and third-party services stay blocked.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const { chromium } = createRequire(resolve(process.env.SY_QA_PACKAGE_ROOT, '../package.json'))('playwright');
const origin = process.env.SY_QA_ORIGIN || 'http://127.0.0.1:8820';
assert.ok(new URL(origin).protocol === 'http:' && new URL(origin).hostname === '127.0.0.1');
const output = resolve(process.env.SY_QA_OUTPUT || '.artifacts/branch-event-context-qa');
assert.ok(output.startsWith(resolve('.artifacts') + '/')); mkdirSync(output, { recursive: true });
const editorial = JSON.parse(readFileSync('scripts/editorial/front-b-review.json'));
const browser = await chromium.launch({ executablePath: process.env.SY_QA_BROWSER });
const report = { cases: [], limitations: ['Local Chromium emulation; no physical Safari/iPhone or external checkout certification. External requests blocked.'] };
async function scenario(branch, language, width, javascript = true) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', javaScriptEnabled: javascript, serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage(), errors = [], missing = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (new URL(response.url()).origin === origin && response.status() >= 400) missing.push(response.url()); });
  const record = { branch, language, width, javascript, passed: false };
  try {
    const path = language === 'es' ? '/' + branch : '/en/' + branch + '/';
    assert.equal((await page.goto(origin + path)).status(), 200); await page.evaluate(() => document.fonts.ready);
    const agenda = page.locator('.sy-agenda'); assert.equal(await agenda.count(), 1);
    assert.equal(await page.locator('.pb,.bpd').count(), 0);
    await page.locator('.hh-nav-agenda').click();
    assert.equal(new URL(page.url()).hash, '#programacion-' + branch);
    if (branch === 'houston' && javascript) assert.equal(await page.locator('.hh-nav-agenda').evaluate(link => {
      const color = getComputedStyle(link).color.match(/[\d.]+/g).map(Number);
      return color[0] > 240 && color[1] > 220 && color[2] > 200;
    }), true, 'Houston header retains light, legible navigation after scrolling');
    const visibleIds = await agenda.locator('[data-record]').evaluateAll(elements => elements.map(element => element.dataset.record));
    assert.equal(new Set(visibleIds).size, visibleIds.length);
    const expected = editorial.branches[branch].units.filter(unit => !unit.sourceConflict && !unit.validityUnknown && unit.temporalKind !== 'weekday-slot').map(unit => unit.id).sort();
    assert.deepEqual(visibleIds.sort(), expected);
    const ids = await page.locator('[id]').evaluateAll(elements => elements.map(element => element.id)); assert.equal(new Set(ids).size, ids.length, 'Unique page anchors');
    for (const img of await agenda.locator('img').all()) { await img.scrollIntoViewIfNeeded(); await img.evaluate(img => img.decode()); assert.ok(await img.evaluate(img => img.naturalWidth > 0 && getComputedStyle(img).objectFit === 'contain')); }
    assert.equal(await agenda.locator('.sy-agenda-art-label').count(), 0, 'No visible publication label on photos');
    for (const img of await agenda.locator('.sy-agenda-night img').all()) {
      const geometry = await img.evaluate(img => {
        const art = img.getBoundingClientRect(), card = img.closest('.sy-agenda-night').getBoundingClientRect();
        return { top: art.top-card.top, bottom: art.bottom-card.bottom, right: art.right-card.right, width: art.width, height: art.height, naturalRatio: img.naturalWidth/img.naturalHeight, linked: img.parentElement.tagName === 'A' && img.parentElement.getAttribute('aria-label') };
      });
      assert.ok(Math.abs(geometry.top)<1 && Math.abs(geometry.bottom)<1 && Math.abs(geometry.right)<1, 'Poster meets card edges: '+JSON.stringify(geometry));
      assert.ok(Math.abs(geometry.width/geometry.height-geometry.naturalRatio)<.01, 'Complete poster fills its frame: '+JSON.stringify(geometry));
      assert.ok(geometry.linked, 'Photo is a named accessible link');
    }
    for (const cls of ['.hh-header', '.sy-agenda', '.ve-hours', '.branch-footer']) {
      assert.equal(await page.locator(cls).evaluate(element => element.getBoundingClientRect().right <= innerWidth + 1 && element.getBoundingClientRect().left >= -1), true, cls + ' fits viewport');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'No page overflow');
    const links = await agenda.locator('a').evaluateAll(elements => elements.map(link => ({ href: link.href, rel: link.rel, target: link.target })));
    assert.ok(links.every(link => /^https:\/\/(www\.)?(instagram|eventbrite)\.com\//.test(link.href) && link.rel.includes('noopener') && link.target === '_blank'));
    const tickets = await agenda.locator('.sy-agenda-action').all();
    if (tickets.length) { await tickets[0].focus(); await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => document.activeElement.tagName === 'A')); }
    assert.equal(await page.locator('.ve-hours dl>div').count(), 5);
    assert.equal(await page.locator('.ve-hours').getAttribute('data-hours-zone'), branch === 'el-paso' ? 'America/Denver' : 'America/Chicago');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), process.env.SY_QA_PUBLIC_CANDIDATE === 'true' ? 'index,follow,max-image-preview:large' : 'noindex,nofollow');
    if(process.env.SY_QA_PUBLIC_CANDIDATE==='true')assert.equal(await page.locator('.sy-review-controls').count(),0);
    // Capture the agenda with a little of its neighboring section for contextual inspection.
    await page.evaluate(() => scrollTo(0, document.querySelector('.sy-agenda').offsetTop - 170));
    if (language === 'es' && [390, 1440].includes(width) && javascript) {
      await page.screenshot({ path: resolve(output, branch + '-' + width + '.png'), fullPage: true });
      if (branch === 'houston') await page.locator('.sy-agenda-weekly').screenshot({ path: resolve(output, 'houston-weekly-' + width + '.png') });
      if (width === 1440) { await page.setViewportSize({ width, height: 1800 }); await page.evaluate(() => scrollTo(0, document.querySelector('.sy-agenda').offsetTop - 170)); await page.screenshot({ path: resolve(output, branch + '-context.png') }); }
    }
    assert.deepEqual(errors, []); assert.deepEqual(missing, []); record.passed = true;
  } catch (error) { record.error = error.message; }
  finally { await context.close(); report.cases.push(record); }
}
async function homeScenario(javascript) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', javaScriptEnabled: javascript });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const record = { branch: 'home-campaign-dates', javascript, passed: false };
  try {
    const page = await context.newPage(); await page.goto(origin + '/');
    const dates = await page.locator('[data-campaign="catrinas-2026"] .campaign-locations a').evaluateAll(links => Object.fromEntries(links.map(link => [link.dataset.agendaBranch, link.querySelector('time').getAttribute('datetime')])));
    assert.deepEqual(dates, { houston: '2026-11-01', 'the-woodlands': '2026-10-30', 'san-antonio': '2026-11-01' });
    const range = await page.locator('[data-campaign="catrinas-2026"] .campaign-dates time').evaluateAll(times => times.map(time => time.getAttribute('datetime')));
    assert.deepEqual(range, ['2026-10-30', '2026-11-01']); record.passed = true;
  } catch (error) { record.error = error.message; }
  finally { await context.close(); report.cases.push(record); }
}
try {
  for (const width of [320, 390, 768, 1024, 1440]) for (const language of ['es', 'en']) for (const branch of Object.keys(editorial.branches)) await scenario(branch, language, width);
  for (const branch of Object.keys(editorial.branches)) await scenario(branch, 'es', 390, false);
  await homeScenario(true); await homeScenario(false);
} finally {
  await browser.close(); report.passed = report.cases.every(record => record.passed);
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, failures: report.cases.filter(record => !record.passed), output }));
if (!report.passed) process.exitCode = 1;
