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
const report = { version: 5, origin: origin.origin, capturedAt: new Date().toISOString(),
  scope: 'Local home corrections and retained navigation, not whole-site launch approval',
  viewports: [], interactions: {}, remainingFindings: [] };
const blockShot = (name) => ({ path: resolve(output, name), animations: 'disabled',
  style: '.public-header { visibility: hidden !important; }' });
async function pageFor(width = 1440, height = 900, touch = false, reduced = false) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch,
    reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  // Keep calendar evidence reproducible when this candidate is checked after its campaigns expire.
  await context.addInitScript(() => {
    const NativeDate = Date;
    const fixedNow = NativeDate.parse('2026-10-07T18:00:00Z');
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [fixedNow])); }
      static now() { return fixedNow; }
    };
  });
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
async function revealWithin(page, block) {
  // Walk the block as a visitor does. A full-section screenshot can otherwise
  // capture off-screen opacity-zero cards before IntersectionObserver runs.
  for (const node of await block.locator('.reveal, .reveal-scale').all()) {
    await node.scrollIntoViewIfNeeded();
    await page.waitForFunction(el => el.classList.contains('revealed'), await node.elementHandle(), { timeout: 3000 });
  }
}
async function heroState(page) {
  return page.locator('#inicio').evaluate(hero => {
    const box = element => {
      const { top, right, bottom, left, width, height } = element.getBoundingClientRect();
      return { top, right, bottom, left, width, height };
    };
    const copy = hero.querySelector('.hero-copy-cinema');
    const title = hero.querySelector('h1.hero-rotulo');
    const art = title?.querySelector('svg.rotulo-art');
    const subtitle = hero.querySelector('.hero-sub');
    const actions = hero.querySelector('.hero-actions');
    return { hero: box(hero), header: box(document.querySelector('.public-header')),
      h1Count: hero.querySelectorAll('h1').length, title: title ? box(title) : null,
      accessibleTitle: title?.querySelector('.rotulo-sr')?.textContent.trim(), art: art ? box(art) : null,
      viewBox: art?.getAttribute('viewBox'), decorative: art?.getAttribute('aria-hidden'),
      subtitle: subtitle ? box(subtitle) : null, actions: actions ? box(actions) : null,
      copyOpacity: Number(getComputedStyle(copy).opacity),
      buttons: [...actions.querySelectorAll('a')].map(a => {
        let opacity = 1;
        for (let node = a; node && node !== hero.parentElement; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
        return { ...box(a), href: a.getAttribute('href'), text: a.innerText,
          fontSize: parseFloat(getComputedStyle(a).fontSize), opacity,
          clipped: a.scrollWidth > a.clientWidth + 1 || a.scrollHeight > a.clientHeight + 1 };
      }),
    };
  });
}
try {
  for (const [width, height, touch] of [[320, 568, true], [320, 740, true], [390, 844, true], [560, 900, true],
    [768, 1024, true], [900, 1100, true], [1024, 768, true], [1100, 720, false],
    [1440, 900, false], [1920, 1080, false], [1440, 900, true]]) {
    const { page, context, errors } = await pageFor(width, height, touch);
    const record = { width, height, touch };
    assert.equal(await page.locator('[data-lang-btn="es"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-lang-btn="es"]').evaluate(el => el.classList.contains('active')), true,
      'The initial ES preference must be visibly selected');
    assert.equal(await page.locator('[data-lang-btn="en"]').evaluate(el => el.classList.contains('active')), false);
    await page.locator('#inicio').evaluate(el => Promise.all(el.getAnimations({ subtree: true })
      .filter(animation => animation.effect.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {}))));
    assert.equal(await page.locator('#rotulo, .rotulo-photos').count(), 0, 'The duplicate photo/rotulo section is removed');
    assert.ok(await page.evaluate(() => document.fonts.check('16px "Alfa Slab One"')));
    record.hero = await heroState(page);
    assert.equal(record.hero.h1Count, 1);
    assert.equal(record.hero.accessibleTitle, 'No hay tiempo para llorar');
    assert.equal(record.hero.viewBox, '0 0 600 540');
    assert.equal(record.hero.decorative, 'true');
    assert.equal(record.hero.copyOpacity, 1);
    assert.ok(record.hero.title && record.hero.art && record.hero.art.width > 120 && record.hero.art.height > 100);
    assert.ok(Math.abs(record.hero.art.height / record.hero.art.width - 540 / 600) < .02);
    assert.ok(record.hero.title.top >= record.hero.header.bottom - 1, 'Header must not overlap the headline');
    assert.ok(record.hero.art.left >= 0 && record.hero.art.right <= width + 1, 'The original artwork stays inside the viewport');
    assert.ok(record.hero.title.bottom <= record.hero.subtitle.top + 1 && record.hero.subtitle.bottom <= record.hero.actions.top + 1,
      'Headline, supporting copy and booking actions must have separate space');
    assert.ok(record.hero.buttons.length >= 1 && record.hero.buttons.every(a =>
      a.height >= 44 && a.fontSize >= 14 && !a.clipped && a.opacity >= .99 && a.href === '#ubicaciones' &&
      a.left >= 0 && a.right <= width + 1 && a.top >= record.hero.title.bottom && a.bottom <= record.hero.hero.bottom + 1),
      'Booking actions must be legible, contained and native');
    await page.evaluate(() => window.scrollTo({ top: 10, behavior: 'instant' }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    record.heroAfterScroll = await heroState(page);
    assert.equal(record.heroAfterScroll.copyOpacity, 1, 'Scrolling ten pixels must not fade the headline or booking actions');
    assert.ok(record.heroAfterScroll.buttons.every(a => a.opacity >= .99));
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: resolve(output, `hero-${width}-${height}-${touch ? 'touch' : 'mouse'}.png`), animations: 'disabled' });
    await page.locator('.opening-announcement').scrollIntoViewIfNeeded();
    record.banner = await page.locator('.opening-announcement').evaluate(el => ({ width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height, previousHero: el.previousElementSibling.id === 'inicio',
      nextPlan: el.nextElementSibling.id === 'plan',
      text: el.innerText, links: [...el.querySelectorAll('a')].map(a => a.getAttribute('href')) }));
    assert.equal(record.banner.width, width);
    assert.equal(record.banner.previousHero, true);
    assert.equal(record.banner.nextPlan, true);
    assert.deepEqual(record.banner.links, ['el-paso.html', 'el-paso.html']);
    await page.screenshot({ path: resolve(output, `banner-${width}-${touch ? 'touch' : 'mouse'}.png`), animations: 'disabled' });
    await page.locator('.venue-showcase').scrollIntoViewIfNeeded();
    await page.locator('.venue-frame img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
    record.cards = await galleryState(page);
    assert.equal(record.cards.length, 7);
    assert.ok(record.cards.every(card => card.height > 200 && !card.nameClipped && !card.role));
    assert.ok(record.cards.every(card => card.imageLoaded && card.imageLayer >= 0));
    record.overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(record.overflow, false);
    await page.locator('.venue-showcase').screenshot(blockShot(`selector-${width}-${touch ? 'touch' : 'mouse'}.png`));
    record.openingBadge = await page.locator('[data-branch-id="el-paso"] .venue-badge').evaluate(el => ({
      text: el.innerText, fontSize: parseFloat(getComputedStyle(el).fontSize),
      clipped: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 }));
    assert.equal(record.openingBadge.text, 'Abre el 9 de octubre');
    assert.ok(record.openingBadge.fontSize >= 16 && !record.openingBadge.clipped);
    await page.locator('#experiencia').scrollIntoViewIfNeeded();
    await revealWithin(page, page.locator('#experiencia'));
    await page.locator('#experiencia img').evaluate(img => img.decode());
    record.experience = await page.locator('#experiencia').evaluate(el => {
      const frame = el.querySelector('.experience-media'), img = frame.querySelector('img');
      const f = frame.getBoundingClientRect(), i = img.getBoundingClientRect(), c = el.querySelector('.experience-copy').getBoundingClientRect();
      const columns = getComputedStyle(frame.parentElement).gridTemplateColumns.split(/\s+/).map(parseFloat);
      return { frameWidth: f.width, frameHeight: f.height, imageWidth: i.width, imageHeight: i.height,
        columnWidth: columns[0], frameLeft: f.left, parentLeft: frame.parentElement.getBoundingClientRect().left,
        fit: getComputedStyle(img).objectFit, alt: img.alt, copyTop: c.top, frameBottom: f.bottom, copyBottom: c.bottom,
        loaded: img.complete && img.naturalWidth > 0 };
    });
    assert.ok(record.experience.loaded && record.experience.fit === 'cover');
    assert.ok(Math.abs(record.experience.frameWidth - record.experience.imageWidth) < 1 &&
      Math.abs(record.experience.frameHeight - record.experience.imageHeight) < 1);
    assert.ok(Math.abs(record.experience.frameWidth - record.experience.columnWidth) < 1,
      'The photo frame must fill its real grid column, not leave an empty tablet strip');
    if (width <= 900) assert.ok(record.experience.copyTop >= record.experience.frameBottom - 1);
    else assert.ok(Math.abs(record.experience.copyBottom - record.experience.frameBottom) < 1);
    await page.locator('#experiencia').screenshot(blockShot(`experience-${width}-${touch ? 'touch' : 'mouse'}.png`));
    await page.locator('#plan img').evaluateAll(imgs => Promise.all(imgs.map(i => i.decode())));
    await revealWithin(page, page.locator('#plan'));
    assert.equal(await page.locator('#plan img').count(), 6);
    record.planPhotos = await page.locator('#plan img').evaluateAll(imgs => imgs.map(i => ({
      src: i.getAttribute('src'), position: getComputedStyle(i).objectPosition, loaded: i.complete && i.naturalWidth > 0 })));
    assert.ok(record.planPhotos.every(i => i.loaded));
    await revealWithin(page, page.locator('.pretextos-section'));
    record.pretexts = await page.locator('.pretexto-card').evaluateAll(items => items.map(el => ({
      tag: el.tagName, href: el.getAttribute('href'), height: el.getBoundingClientRect().height,
      width: el.getBoundingClientRect().width, clipped: el.scrollWidth > el.clientWidth + 1,
    })));
    assert.equal(record.pretexts.length, 6);
    assert.ok(record.pretexts.every(item => item.tag === 'A' && item.href === '#ubicaciones' && item.height >= 44 && !item.clipped));
    record.agenda = await page.locator('#cartelera').evaluate(el => ({
      heading: el.querySelector('h2').textContent, text: el.innerText,
      campaigns: [...el.querySelectorAll('[data-campaign]')].map(card => ({ id: card.dataset.campaign,
        dates: [...card.querySelectorAll('.campaign-locations time[datetime]')].map(time => time.getAttribute('datetime')),
        range: [...card.querySelectorAll('.campaign-dates time[datetime]')].map(time => time.getAttribute('datetime')) })),
      links: [...el.querySelectorAll('[data-agenda-branch]')].map(a => ({
        id: a.dataset.agendaBranch, href: a.getAttribute('href'), target: a.target, rel: a.rel,
        height: a.getBoundingClientRect().height, clipped: a.scrollWidth > a.clientWidth + 1,
      })),
    }));
    assert.equal(record.agenda.heading, 'Lo que viene.');
    assert.deepEqual(record.agenda.campaigns.map(card => card.id).sort(), ['catrinas-2026', 'halloween-2026']);
    assert.deepEqual(record.agenda.campaigns.find(card => card.id === 'halloween-2026').dates.sort(), ['2026-10-31', '2026-10-31', '2026-10-31']);
    assert.deepEqual(record.agenda.campaigns.find(card => card.id === 'catrinas-2026').dates.sort(), ['2026-10-24', '2026-10-30', '2026-11-01']);
    assert.deepEqual(record.agenda.campaigns.find(card => card.id === 'halloween-2026').range, ['2026-10-31']);
    assert.deepEqual(record.agenda.campaigns.find(card => card.id === 'catrinas-2026').range, ['2026-10-24', '2026-11-01']);
    assert.equal(record.agenda.links.length, 6);
    assert.ok(record.agenda.links.every(a => a.height >= 44 && !a.clipped && !a.target && /^[a-z-]+\.html$/.test(a.href)));
    assert.doesNotMatch(record.agenda.text, /TODO|CONFIRMAR|Brunch|8:00|Esta semana|Instagram|\$|descuento/i);
    if ([390, 768, 1440].includes(width) && (width !== 1440 || !touch)) {
      // Keep section evidence free of sticky-header capture artefacts; inspect navigation separately.
      for (const selector of ['#plan', '.pretextos-section', '#cartelera', '#botaneo', '#cumple', '.public-footer']) {
        await revealWithin(page, page.locator(selector));
        await page.locator(selector).screenshot(blockShot(`home-${selector.replace(/[.#]/g, '')}-${width}.png`));
      }
    }
    assert.deepEqual(errors, []);
    record.errors = errors; report.viewports.push(record);
    await context.close();
  }
  {
    const { page, context } = await pageFor();
    assert.equal(await page.locator('#demo-modal').count(), 0);
    const expectedAgenda = await page.evaluate(() => window.SY_DATA.events.flatMap(campaign => campaign.occurrences.map(occurrence => {
      const branch = window.SY_DATA.branches.find(branch => branch.id === occurrence.branchId);
      return { campaign: campaign.id, id: branch.id, href: branch.page };
    })));
    const agenda = await page.locator('[data-agenda-branch]').evaluateAll(links => links.map(a => ({
      campaign: a.closest('[data-campaign]').dataset.campaign, id: a.dataset.agendaBranch, href: a.getAttribute('href') })));
    const campaignBranchOrder = (a, b) => (a.campaign + '/' + a.id).localeCompare(b.campaign + '/' + b.id);
    assert.deepEqual(agenda.sort(campaignBranchOrder), expectedAgenda.sort(campaignBranchOrder));
    await page.locator('.pretexto-card').first().click();
    assert.equal(new URL(page.url()).hash, '#ubicaciones');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'ubicaciones');
    await page.locator('#cumple .button').click();
    assert.equal(new URL(page.url()).hash, '#ubicaciones');
    await page.locator('.pretexto-card').nth(1).focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'ubicaciones');
    await page.locator('[data-venue-filter="soon"]').click();
    await page.locator('.pretexto-card').nth(2).click();
    assert.equal(await page.locator('[data-venue-filter="all"]').getAttribute('aria-pressed'), 'true');
    assert.equal((await galleryState(page)).filter(item => !item.hidden).length, 7);
    await page.locator('[data-venue-filter="mx"]').click();
    await page.locator('#cumple .button').click();
    assert.equal(await page.locator('[data-venue-filter="mx"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-venue-filter="soon"]').click();
    await page.locator('#reserve .button').click();
    assert.equal(await page.locator('[data-venue-filter="all"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'ubicaciones');
    await page.locator('[data-venue-filter="us"]').click();
    await page.locator('#reserve .button').click();
    assert.equal(await page.locator('[data-venue-filter="us"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-venue-filter="all"]').click();
    report.interactions.homeActions = { nativePretextClick: true, keyboardFocusAtSelector: true,
      birthdayChoosesLocation: true, finalBookingChoosesLocation: true, clearsOnlySoonFilter: true,
      ownCampaignLocations: agenda, noDraftCalendar: true, noOpeningModal: true };
    const houston = page.locator('[data-branch-id="houston"]');
    await houston.hover(); await page.waitForTimeout(500);
    assert.deepEqual(expanded(await galleryState(page)), ['houston']);
    await page.mouse.move(0, 0); await page.waitForTimeout(500);
    assert.deepEqual(expanded(await galleryState(page)), ['houston']);
    await page.locator('.venue-showcase').screenshot({ path: resolve(output, 'selector-last-hover-houston.png'), animations: 'disabled' });
    for (const id of ['el-paso', 'moreno-valley', 'san-diego']) {
      await page.locator(`[data-branch-id="${id}"]`).hover(); await page.waitForTimeout(500);
      assert.deepEqual(expanded(await galleryState(page)), [id]);
      await page.locator('.venue-showcase').screenshot(blockShot(`selector-preview-${id}.png`));
    }
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
    if (touch) {
      await page.locator('[data-venue-filter="soon"]').tap();
      await page.locator('.pretexto-card').first().tap();
      assert.equal(new URL(page.url()).hash, '#ubicaciones');
      assert.equal(await page.locator('[data-venue-filter="all"]').getAttribute('aria-pressed'), 'true');
    }
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
    assert.equal(await page.locator('[data-branch-id="el-paso"] .venue-badge').innerText(), 'Opens October 9');
    assert.equal((await page.locator('[data-branch-id="el-paso"] .venue-opening-date > span').textContent()).trim(), 'Opens');
    assert.equal(await page.locator('#experiencia img').getAttribute('alt'), 'A shot roulette and drinks on a Sin Yolanda table');
    assert.equal(await page.locator('#agenda-heading').innerText(), "What's coming up.");
    for (const date of await page.locator('#cartelera time[datetime]').all()) assert.match(await date.innerText(), /\d+\s+(Oct|Nov)\b/);
    assert.equal(await page.locator('.pretexto-card small').first().innerText(), 'Choose a location');
    assert.equal(await page.locator('.pretexto-card strong').nth(1).innerText(), 'Payday');
    await page.locator('[data-venue-filter="soon"]').click();
    assert.equal(await page.locator('[data-venue-status]').innerText(), '3 locations');
    report.interactions.english = { banner: await page.locator('.opening-announcement').innerText(), selector: await page.locator('#venue-heading').innerText() };
    // Controlled component removal verifies the native MutationObserver, not just
    // its VM callback. The recreated control must retain the active preference.
    await page.locator('.lang-toggle').evaluate(el => el.remove());
    await page.waitForFunction(() => document.querySelectorAll('.lang-toggle').length === 1 &&
      document.querySelector('[data-lang-btn="en"]').classList.contains('active'));
    assert.equal(await page.locator('[data-lang-btn="en"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-lang-btn="es"]').click();
    assert.equal(await page.locator('#experiencia img').getAttribute('alt'), 'Ruleta de shots y bebidas sobre una mesa de Sin Yolanda');
    assert.equal(await page.locator('[data-branch-id="el-paso"] .venue-badge').innerText(), 'Abre el 9 de octubre');
    assert.equal(await page.locator('#agenda-heading').innerText(), 'Lo que viene.');
    for (const date of await page.locator('#cartelera time[datetime]').all()) assert.match(await date.innerText(), /\d+\s+(oct|nov)\b/);
    assert.equal(await page.locator('.pretexto-card small').first().innerText(), 'Elegir sucursal');
    await page.locator('.lang-toggle').evaluate(el => el.remove());
    await page.waitForFunction(() => document.querySelectorAll('.lang-toggle').length === 1 &&
      document.querySelector('[data-lang-btn="es"]').classList.contains('active'));
    assert.equal(await page.locator('[data-lang-btn="es"]').getAttribute('aria-pressed'), 'true');
    report.interactions.languageToggleRecreation = { spanish: true, english: true, nativeObserver: true };
    await context.close();
  }
  {
    const { page, context } = await pageFor(390, 844, true);
    const toggle = page.locator('.menu-toggle');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    await page.locator('[data-lang-btn="en"]').click();
    assert.equal(await page.locator('[data-branch-id="el-paso"] .venue-badge').innerText(), 'Opens October 9');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    report.interactions.mobileMenu = { openClose: true, english: true };
    await context.close();
  }
  {
    const { page, context } = await pageFor(1440, 900, false, true);
    assert.equal(await page.locator('[data-venue-item]').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    report.interactions.reducedMotion = true;
    await context.close();
  }
  report.branchAgendas = [];
  for (const [branch, profile] of [['san-ignacio', 'sinyolandagdl'], ['san-antonio', 'sinyolanda.sa'], ['the-woodlands', 'sinyolanda.tw']]) {
    for (const width of [390, 1440]) {
      const { page, context, errors } = await pageFor(width, width === 390 ? 844 : 900, width === 390);
      await page.goto(new URL(branch + '.html', origin).href, { waitUntil: 'domcontentloaded' });
      const agenda = page.locator('#cartelera');
      await agenda.waitFor();
      await page.evaluate(() => document.fonts.ready);
      await agenda.scrollIntoViewIfNeeded();
      const link = agenda.locator('a');
      assert.equal(await link.getAttribute('href'), 'https://www.instagram.com/' + profile + '/');
      assert.equal(await link.getAttribute('target'), '_blank');
      assert.match(await link.getAttribute('rel'), /noopener/);
      assert.doesNotMatch(await agenda.innerText(), /TODO|CONFIRMAR|de ejemplo|Brunch|8:00/i);
      assert.equal(await agenda.locator('h2').innerText(), 'Eventos y promociones');
      assert.equal(await agenda.evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
      await agenda.screenshot(blockShot(`branch-agenda-${branch}-${width}.png`));
      // Switch through the site's actual language preference, without submitting anything.
      await page.evaluate(() => { localStorage.setItem('sy-lang', 'en'); });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await agenda.waitFor();
      assert.equal(await agenda.locator('h2').innerText(), 'Events and promotions');
      assert.equal(await link.getAttribute('href'), 'https://www.instagram.com/' + profile + '/');
      assert.deepEqual(errors, []);
      report.branchAgendas.push({ branch, width, ownProfile: true, english: true });
      await context.close();
    }
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
