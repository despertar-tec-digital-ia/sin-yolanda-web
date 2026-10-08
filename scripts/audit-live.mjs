// Read-only production audit. Evidence is local; this script never publishes or submits forms.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = new URL(process.env.SY_AUDIT_ORIGIN || 'https://sin-yolanda.com/');
assert.ok(['https:', 'http:'].includes(origin.protocol));
assert.ok(!origin.username && !origin.password && !origin.search && !origin.hash, 'Use a public origin without credentials/query/fragment');
assert.ok(process.env.SY_QA_PACKAGE_ROOT, 'Set SY_QA_PACKAGE_ROOT to the installed Playwright package directory');
const deployment = process.env.SY_AUDIT_DEPLOYMENT ? new URL(process.env.SY_AUDIT_DEPLOYMENT) : null;
if (deployment) assert.ok(deployment.protocol === 'https:' && !deployment.username && !deployment.password && !deployment.search && !deployment.hash);
const output = resolve(root, process.argv[2] || `.artifacts/live-audit-${new Date().toISOString().replace(/[:.]/g, '-')}`);
assert.ok(output.startsWith(resolve(root, '.artifacts') + '/'), 'Evidence must stay in ignored .artifacts');
assert.ok(!existsSync(output), 'Use a fresh evidence directory');
mkdirSync(output, { recursive: true });
const sha256 = data => createHash('sha256').update(data).digest('hex');
const report = { version: 1, capturedAt: new Date().toISOString(), origin: origin.origin, deployment: deployment?.origin, sources: [], routes: [], viewports: [], interactions: {}, photos: [], stability: [] };
const sources = ['index.html', 'styles.css', 'assets/js/site.js', 'assets/js/i18n.js', 'assets/js/mock-data.js', 'houston.html', 'locations.html', 'sitemap.xml', 'robots.txt'];

for (const path of sources) {
  const response = await fetch(new URL(path, origin), { cache: 'no-store', signal: AbortSignal.timeout(20000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  const destination = resolve(output, 'sources', path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, bytes);
  const comparisons = {};
  for (const ref of ['origin/main', 'origin/rediseno-elplan', 'HEAD']) {
    try { comparisons[ref] = sha256(execFileSync('git', ['show', `${ref}:${path}`], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })) === sha256(bytes); }
    catch { comparisons[ref] = null; }
  }
  report.sources.push({ path, status: response.status, bytes: bytes.length, sha256: sha256(bytes), comparisons });
}
for (const path of ['/', '/locations', '/houston', '/houston.html', '/houston/', '/houston/menu/', '/en/houston/', '/san-antonio', '/the-woodlands', '/san-ignacio', '/el-paso', '/catering', '/maricarmen', '/dashboard', '/deploy_pages.py', '/docker-compose.yml', '/route-that-does-not-exist-sy-qa']) {
  const observations = [];
  const targets = [{ name: 'usual', url: new URL(path, origin) }, { name: 'fresh', url: new URL(path, origin) }];
  targets[1].url.searchParams.set('sy-qa', String(Date.now()));
  if (deployment && ['/', '/houston/menu/', '/en/houston/'].includes(path)) targets.push({ name: 'deployment', url: new URL(path, deployment) });
  for (const { name, url } of targets) {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    const text = await response.text();
    observations.push({ name, status: response.status, destination: response.url.split('?')[0], title: text.match(/<title>([^<]+)<\/title>/i)?.[1] || null, canonical: text.match(/rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1] || null, age: response.headers.get('age'), cache: response.headers.get('cf-cache-status'), bytes: Buffer.byteLength(text), sha256: sha256(text) });
  }
  report.routes.push({ path, observations });
}

// The official site remains dependency-free. Supply the installed browser tooling explicitly.
const require = createRequire(resolve(process.env.SY_QA_PACKAGE_ROOT, '../package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
async function openPage({ width = 1440, height = 900, touch = false, reduced = false, javascript = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion: reduced ? 'reduce' : 'no-preference', javaScriptEnabled: javascript, serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const request = route.request();
    // Do not send telemetry, form submissions, or any other mutation during QA.
    if (!['GET', 'HEAD'].includes(request.method()) || /umami|google-analytics|analytics\.google|\/collect(?:\?|$)/i.test(request.url())) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (javascript) {
    await page.locator('#ubicaciones').waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  return { context, page, errors };
}
async function cards(page) {
  return page.locator('[data-venue]').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    const title = node.querySelector('strong');
    const label = node.querySelector('.venue-label');
    const style = getComputedStyle(node);
    return { title: title?.textContent, href: node.getAttribute('href'), open: node.classList.contains('is-open'), width: Math.round(rect.width), height: Math.round(rect.height), titleClipped: title ? title.scrollWidth > title.clientWidth : null, labelOverflows: label ? label.scrollWidth > label.clientWidth : null, cityOpacity: getComputedStyle(node.querySelector('.venue-city')).opacity, role: node.getAttribute('role'), focusOutline: style.outline, photo: style.backgroundImage };
  }));
}
try {
  for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
    const { context, page, errors } = await openPage({ width, height, touch: width < 768 });
    const result = { width, height, errors, sections: {} };
    for (const id of ['rotulo', 'ubicaciones']) {
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(650); // Let the existing 550 ms transition settle before measuring.
      await section.screenshot({ path: resolve(output, `${id}-${width}.png`), animations: 'disabled' });
      result.sections[id] = await section.evaluate(node => {
        const rect = node.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height), text: node.innerText, buttons: [...node.querySelectorAll('button')].map(e => e.innerText), images: [...node.querySelectorAll('img')].map(e => ({ source: e.getAttribute('src'), loaded: e.complete && e.naturalWidth > 0, naturalWidth: e.naturalWidth, naturalHeight: e.naturalHeight, renderedWidth: Math.round(e.getBoundingClientRect().width), renderedHeight: Math.round(e.getBoundingClientRect().height), cssHeight: getComputedStyle(e).height, objectPosition: getComputedStyle(e).objectPosition })) };
      });
    }
    result.cards = await cards(page);
    result.documentOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    report.viewports.push(result);
    await context.close();
  }
  {
    const { context, page, errors } = await openPage();
    const houston = page.locator('[data-venue][href="houston.html"]');
    await houston.scrollIntoViewIfNeeded();
    const before = await cards(page);
    await houston.hover(); await page.waitForTimeout(650);
    const hovered = await cards(page);
    await page.screenshot({ path: resolve(output, 'selector-hover-houston-1440.png') });
    await page.mouse.move(0, 0); await page.waitForTimeout(650);
    const afterExit = await cards(page);
    const beforeClick = page.url();
    await houston.click(); await page.waitForTimeout(650);
    const firstClick = { url: page.url(), navigated: page.url() !== beforeClick, cards: await cards(page) };
    // Once navigation is fixed, there is no second card to click on the destination page.
    let secondClickDestination = null;
    if (!firstClick.navigated) {
      await houston.click(); await page.waitForLoadState('domcontentloaded');
      secondClickDestination = page.url();
    }
    report.interactions.desktop = { errors, before, hovered, afterExit, firstClick, secondClickDestination };
    await context.close();
  }
  {
    const { context, page } = await openPage({ width: 390, height: 844, touch: true });
    const houston = page.locator('[data-venue][href="houston.html"]');
    await houston.scrollIntoViewIfNeeded();
    const initialUrl = page.url();
    const visible = await houston.isVisible();
    if (visible) { await houston.tap({ timeout: 5000 }); await page.waitForTimeout(650); }
    report.interactions.mobileFirstTap = { visible, navigated: page.url() !== initialUrl, url: page.url(), cards: await cards(page) };
    await context.close();
  }
  {
    const { context, page } = await openPage();
    const houston = page.locator('[data-venue][href="houston.html"]');
    await houston.focus();
    const focused = await cards(page);
    const initialUrl = page.url();
    await page.keyboard.press('Enter'); await page.waitForTimeout(650);
    report.interactions.keyboard = { focused, firstEnterNavigated: page.url() !== initialUrl, url: page.url() };
    await context.close();
  }
  {
    const { context, page } = await openPage({ reduced: true });
    await page.locator('#rotulo').scrollIntoViewIfNeeded();
    report.interactions.reducedMotion = await page.evaluate(() => ({ video: [...document.querySelectorAll('video')].map(e => ({ paused: e.paused, autoplay: e.autoplay, src: e.currentSrc })), animations: document.getAnimations().filter(a => a.playState === 'running').map(a => ({ name: a.animationName, target: a.effect?.target?.className?.baseVal ?? a.effect?.target?.className })), transitions: [...document.querySelectorAll('[data-venue]')].map(e => getComputedStyle(e).transitionDuration) }));
    await context.close();
  }
  {
    const { context, page } = await openPage();
    await page.locator('[data-lang-btn="en"]').click();
    report.interactions.english = await page.evaluate(() => ({ lang: document.documentElement.lang, rotulo: document.querySelector('#rotulo')?.textContent.replace(/\s+/g, ' ').trim(), selector: document.querySelector('#ubicaciones')?.innerText, headings: [...document.querySelectorAll('h1,h2')].map(e => e.textContent.trim()) }));
    report.fonts = await page.evaluate(() => [...new Set([...document.fonts].map(font => font.family))]);
    await context.close();
  }
  {
    const { context, page } = await openPage({ javascript: false });
    report.interactions.noJavascript = await page.evaluate(() => ({ text: document.body.innerText, links: document.querySelectorAll('a[href]').length, h1: document.querySelectorAll('h1').length }));
    await context.close();
  }
  for (const card of report.viewports[0].cards) {
    const source = card.photo.match(/url\("([^\"]+)"\)/)?.[1];
    if (!source) continue;
    const response = await fetch(source, { signal: AbortSignal.timeout(20000) });
    const bytes = await response.arrayBuffer();
    report.photos.push({ branch: card.title, status: response.status, bytes: bytes.byteLength, type: response.headers.get('content-type') });
  }
  // Detect concurrent publication while this evidence was being collected.
  for (const source of report.sources) {
    const response = await fetch(new URL(source.path, origin), { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    report.stability.push({ path: source.path, unchanged: source.sha256 === sha256(bytes) });
  }
} finally {
  await browser.close();
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ output, routes: report.routes.length, viewports: report.viewports.length, completed: Object.keys(report.interactions) }));
