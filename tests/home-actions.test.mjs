import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('assets/js/site.js');
const context = { window: {} };
vm.runInNewContext(read('assets/js/public-data.js'), context);
const data = context.window.SY_DATA;
const block = name => {
  const start = source.indexOf('  function ' + name + '(');
  assert.ok(start >= 0, 'Missing renderer: ' + name);
  const end = source.indexOf('\n  function ', start + 1);
  return source.slice(start, end < 0 ? source.length : end);
};
const testNow = new Date('2026-10-07T18:00:00Z');
const campaignSource = () => ['escapeHtml', 'validCalendarDate', 'calendarDay', 'calendarLabel', 'homeCampaigns', 'homeAgenda'].map(block).join('\n');
const agenda = (facts = data, now = testNow) => vm.runInNewContext(campaignSource() + '\nhomeAgenda(now)', {
  data: facts, now, Date, Intl, branchById: id => facts.branches.find(branch => branch.id === id),
});
const home = () => vm.runInNewContext(campaignSource() + block('homePage') + '\nhomePage()', {
  data, Date: class extends Date { constructor(...args) { super(...(args.length ? args : [testNow])); } }, Intl,
  branchById: id => data.branches.find(branch => branch.id === id),
  publicHeader: () => '', publicFooter: () => '', openingAnnouncement: () => '', venueShowcase: () => '<section id="ubicaciones"></section>',
});
const campaignHtml = (html, id) => html.match(new RegExp('<article\\b[^>]*data-campaign="' + id + '"[^>]*>[\\s\\S]*?<\\/article>'))?.[0] || '';
const campaignIds = html => [...html.matchAll(/data-campaign="([^"]+)"/g)].map(match => match[1]);
const branchIds = html => [...html.matchAll(/data-agenda-branch="([^"]+)"/g)].map(match => match[1]);

test('home agenda contains only the two scheduled campaigns with their own branch dates and local links', () => {
  const html = agenda();
  assert.deepEqual(campaignIds(html).sort(), ['catrinas-2026', 'halloween-2026']);
  assert.equal(data.events.length, 2);
  const expectedDates = {
    'halloween-2026': { houston: '2026-10-31', 'the-woodlands': '2026-10-31', 'san-antonio': '2026-10-31' },
    'catrinas-2026': { houston: '2026-10-24', 'the-woodlands': '2026-10-30', 'san-antonio': '2026-11-01' },
  };
  for (const campaign of data.events) {
    assert.equal(campaign.status, 'scheduled');
    assert.equal(campaign.placement, 'home');
    assert.match(campaign.visibleFrom, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(campaign.title && campaign.description);
    assert.ok(!('displayDate' in campaign), 'Derive displayed dates from occurrences; do not maintain a second date field');
    assert.deepEqual(Object.fromEntries(campaign.occurrences.map(item => [item.branchId, item.date])), expectedDates[campaign.id]);
    const card = campaignHtml(html, campaign.id);
    assert.ok(card, 'Each campaign has one semantic article');
    for (const occurrence of campaign.occurrences) {
      const branch = data.branches.find(item => item.id === occurrence.branchId);
      assert.ok(card.includes(`href="${branch.page}"`));
      assert.ok(card.includes(`data-agenda-branch="${branch.id}"`));
      assert.ok(card.includes(`datetime="${occurrence.date}"`));
    }
    assert.equal(branchIds(card).length, 3);
  }
  assert.doesNotMatch(html, /instagram\.com|target="_blank"|el-paso|moreno-valley|san-diego|Reservar evento|TODO|CONFIRMAR|Brunch|8:00|Eventbrite|\$|descuento/i);
  assert.match(html, /Lo que viene\./);
});

test('campaign visibility includes its first day and retires each occurrence after its local calendar day', () => {
  const facts = structuredClone(data);
  facts.events.forEach(campaign => { campaign.visibleFrom = '2026-10-07'; });
  assert.equal(agenda(facts, new Date('2026-10-07T04:59:59Z')), '');
  assert.deepEqual(campaignIds(agenda(facts, new Date('2026-10-07T05:00:00Z'))).sort(), ['catrinas-2026', 'halloween-2026']);
  const october24 = campaignHtml(agenda(facts, new Date('2026-10-25T04:59:59Z')), 'catrinas-2026');
  assert.ok(branchIds(october24).includes('houston'), 'Houston remains visible throughout October 24 in Chicago');
  const october25 = campaignHtml(agenda(facts, new Date('2026-10-25T05:00:00Z')), 'catrinas-2026');
  assert.deepEqual(branchIds(october25).sort(), ['san-antonio', 'the-woodlands']);
  const october31 = campaignHtml(agenda(facts, new Date('2026-10-31T05:00:00Z')), 'catrinas-2026');
  assert.deepEqual(branchIds(october31), ['san-antonio'], 'Do not keep expired Houston or Woodlands dates');
  assert.ok(campaignIds(agenda(facts, new Date('2026-11-01T04:59:59Z'))).includes('halloween-2026'));
  assert.deepEqual(campaignIds(agenda(facts, new Date('2026-11-01T05:00:00Z'))), ['catrinas-2026']);
  assert.deepEqual(campaignIds(agenda(facts, new Date('2026-11-02T05:59:59Z'))), ['catrinas-2026']);
  assert.equal(agenda(facts, new Date('2026-11-02T06:00:00Z')), '', 'After the DST change Chicago midnight is 06:00 UTC');
});

test('calendar days use the supplied time zone, including the November daylight-saving change', () => {
  const day = (timeZone, now) => vm.runInNewContext(block('calendarDay') + '\ncalendarDay(timeZone, now)', { timeZone, now, Date, Intl });
  assert.equal(day('America/Chicago', new Date('2026-10-25T04:59:59Z')), '2026-10-24');
  assert.equal(day('America/Chicago', new Date('2026-10-25T05:00:00Z')), '2026-10-25');
  assert.equal(day('America/Chicago', new Date('2026-11-02T05:59:59Z')), '2026-11-01');
  assert.equal(day('America/Chicago', new Date('2026-11-02T06:00:00Z')), '2026-11-02');
  assert.equal(day('America/Los_Angeles', new Date('2026-11-02T06:00:00Z')), '2026-11-01');
});

test('home campaigns omit unknown or inactive branches and never borrow a different destination', () => {
  const facts = structuredClone(data);
  facts.events = [{ ...facts.events[0], occurrences: [
    { branchId: 'unknown-location', date: '2026-10-31', timeZone: 'America/Chicago' },
    { branchId: 'el-paso', date: '2026-10-31', timeZone: 'America/Chicago' },
    { branchId: 'houston', date: '2026-10-31', timeZone: 'America/Chicago' },
    { branchId: 'the-woodlands', date: '2026-10-31', timeZone: 'America/Chicago' },
  ] }];
  assert.deepEqual(branchIds(agenda(facts)).sort(), ['houston', 'the-woodlands']);
  facts.branches.find(branch => branch.id === 'houston').status = 'coming-soon';
  assert.equal(agenda(facts), '', 'A campaign with only one eligible location belongs on its ficha');
  const misplaced = structuredClone(data);
  misplaced.events.forEach(campaign => { campaign.placement = 'branch'; });
  assert.equal(agenda(misplaced), '');
  misplaced.events.forEach(campaign => { campaign.placement = 'home'; campaign.status = 'draft'; });
  assert.equal(agenda(misplaced), '');
});

test('occurrence retirement follows its own time zone rather than the visitor or campaign summary', () => {
  const facts = structuredClone(data);
  const occurrence = facts.events.find(campaign => campaign.id === 'catrinas-2026').occurrences
    .find(item => item.branchId === 'houston');
  occurrence.timeZone = 'America/Los_Angeles';
  const beforeMidnight = campaignHtml(agenda(facts, new Date('2026-10-25T05:30:00Z')), 'catrinas-2026');
  assert.ok(branchIds(beforeMidnight).includes('houston'), 'October 24 continues in the occurrence zone after Chicago midnight');
  const afterMidnight = campaignHtml(agenda(facts, new Date('2026-10-25T07:00:00Z')), 'catrinas-2026');
  assert.ok(!branchIds(afterMidnight).includes('houston'));
  assert.ok(!afterMidnight.includes('datetime="2026-10-24"'), 'Date labels must also retire with their occurrence');
});

test('pretexts and birthday CTA use native location selection with no opening modal or default city', () => {
  const html = home();
  const pretexts = html.match(/<section class="section pretextos-section">[\s\S]*?<\/section>/)[0];
  assert.equal((pretexts.match(/href="#ubicaciones"/g) || []).length, 6);
  assert.equal((pretexts.match(/<a class="pretexto-card /g) || []).length, 6);
  assert.doesNotMatch(pretexts, /<button|data-open-modal|apartamos mesa|<span>0\d<\/span>/);
  const birthday = html.match(/<section class="section cumple-section"[\s\S]*?<\/section>/)[0];
  assert.equal((birthday.match(/<a /g) || []).length, 1);
  assert.match(birthday, /href="#ubicaciones" data-select-location>Elegir sucursal/);
  assert.doesNotMatch(birthday, /wa\.me|pastel/);
  assert.doesNotMatch(html, /demo-modal|TODO:|CONFIRMAR CON OPERACIÓN|Programación de ejemplo|Brunch de domingo/);
});

test('booking entries clear only the coming-soon filter and never intercept native links', () => {
  let soon = true, clicks = 0, listener;
  const link = { addEventListener: (name, fn) => { listener = fn; } };
  const document = {
    querySelector: selector => selector.includes('soon') ? (soon ? {} : null)
      : selector.includes('all') ? { click() { clicks++; } } : null,
    querySelectorAll: selector => selector === '[data-select-location]' ? [link] : [],
  };
  vm.runInNewContext(block('bindCommon') + '\nbindCommon()', { document });
  listener({ button: 0, ctrlKey: true, preventDefault() { throw Error('Do not intercept'); } });
  assert.equal(clicks, 0);
  listener({ button: 0, preventDefault() { throw Error('Do not intercept'); } });
  assert.equal(clicks, 1);
  soon = false;
  listener({ button: 0 });
  assert.equal(clicks, 1, 'Keep the chosen country when it is not the soon filter');
});

test('legacy branch pages no longer receive a shared fictitious calendar', () => {
  const branch = data.branches.find(branch => branch.id === 'san-antonio');
  const html = vm.runInNewContext(block('hasAgendaProfile') + block('branchAgenda') + '\nbranchAgenda(branch)', { branch });
  assert.ok(html.includes(`href="${branch.socialUrl}"`));
  assert.doesNotMatch(html, /opentable|event\.date|de ejemplo|Houston|Jue–Sáb/);
  assert.match(block('branchPage'), /\$\{branchAgenda\(branch\)\}/);
  assert.doesNotMatch(block('branchPage'), /data\.events\.map|Programación de ejemplo/);
});
