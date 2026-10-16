import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGa4EventAdapter } from '../scripts/analytics/ga4-event-adapter.mjs';
import { projectGa4EventBridge, restoreGa4EventBridge } from '../scripts/analytics/project-ga4-event-bridge.mjs';
import { checkGa4Coverage } from '../scripts/sync-ga4.mjs';
import { compileMeasurementContract } from '../scripts/measurement-contract.mjs';
import { measurementHarness } from './helpers/measurement-harness.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const config = JSON.parse(read('scripts/analytics/ga4-event-config.json'));
// Activation is only a test fixture; the scope was chosen by Luis on 16 October.
const testConfig = { ...config, enabled: true, consentScope: 'ga4-only' };
const contract = compileMeasurementContract(new URL('../', import.meta.url).pathname);
const currentSource = restoreGa4EventBridge(read('assets/js/site-measurement.js'));
const projectedSource = projectGa4EventBridge(currentSource);
const baseData = (branch = 'houston') => ({ schema_version: 2, action: 'menu_click', branch,
  language: 'es', page_branch: branch, page_language: 'es', destination: 'menu', link_location: 'hero' });
function fixture({ enabled = true, consent = true, href = 'https://sin-yolanda.com/houston',
  referrer = '', acquisition = {}, suppliedContract = contract, sendEvent, ...privacy } = {}) {
  const calls = [], context = { href, referrer, acquisition, ...privacy };
  let granted = consent;
  const adapter = createGa4EventAdapter({ config: { ...testConfig, enabled }, contract: suppliedContract,
    hasConsent: () => granted, readContext: () => context,
    sendEvent: sendEvent || ((name, data) => calls.push([name, data])) });
  return { adapter, calls, context, grant: value => { granted = value; } };
}
function integrated({ consent = true, ...options } = {}) {
  let granted = consent, adapter;
  const calls = [];
  const state = measurementHarness({ url: 'https://sin-yolanda.com/houston', ...options,
    source: projectedSource, beforeRun({ window, document, context }) {
      adapter = createGa4EventAdapter({ config: testConfig, contract,
        hasConsent: () => granted,
        readContext: () => ({ href: window.location.href, referrer: document.referrer,
          acquisition: window.syGa4MeasurementContext?.(),
          globalPrivacyControl: context.navigator.globalPrivacyControl,
          doNotTrack: context.navigator.doNotTrack, msDoNotTrack: context.navigator.msDoNotTrack,
          windowDoNotTrack: window.doNotTrack, umamiDisabled: window.localStorage.getItem('umami.disabled') }),
        sendEvent: (name, data) => calls.push([name, data]) });
      window.syGa4MeasurementObserver = (name, data) => adapter.event(name, data);
    } });
  return { ...state, adapter, googleCalls: calls, grant: value => { granted = value; } };
}

test('the authorized GA4-only integration covers public pages while disabled and unresolved policies still fail closed', () => {
  assert.equal(config.enabled, true); assert.equal(config.consentScope, 'ga4-only');
  assert.equal(config.measurementId, 'G-PZQE63983T');
  const manifest = JSON.parse(read('scripts/public-manifest.json'));
  assert.doesNotMatch(JSON.stringify(manifest), /ga4-event|scripts\/analytics/);
  assert.equal(checkGa4Coverage().measuredPages, manifest.pages.length - 1);
  assert.equal(read('assets/js/site-measurement.js'), projectedSource);
  const state = fixture({ enabled: false });
  assert.equal(state.adapter.configuration(), null);
  assert.equal(state.adapter.pageView(), false);
  assert.equal(state.adapter.event('menu_click', baseData()), false);
  assert.equal(state.calls.length, 0);
  const undecided = createGa4EventAdapter({ config: { ...config, enabled: true, consentScope: null }, contract,
    hasConsent: () => true, readContext: () => ({ href: 'https://sin-yolanda.com/houston' }),
    sendEvent: () => assert.fail('An undecided policy must remain disabled') });
  assert.equal(undecided.event('menu_click', baseData()), false);
});

test('there is no pre-consent queue; acceptance sends a single pageview and only subsequent actions', () => {
  const state = fixture({ consent: false });
  state.adapter.event('menu_click', baseData()); state.adapter.pageView();
  assert.equal(state.adapter.configuration(), null); assert.equal(state.calls.length, 0);
  state.grant(true);
  assert.equal(state.adapter.pageView(), true); assert.equal(state.adapter.pageView(), false);
  assert.equal(state.calls.length, 1);
  state.adapter.event('menu_click', baseData());
  assert.deepEqual(state.calls.map(([name]) => name), ['page_view', 'menu_click']);
  state.grant(false); state.adapter.event('menu_click', baseData());
  assert.equal(state.calls.length, 2);
  state.grant(true); assert.equal(state.adapter.pageView(), false);
});

test('every current route and its HTML aliases retain canonical identity, including Guadalajara and El Paso menu', () => {
  for (const [path, branch] of Object.entries(contract.routes)) {
    const aliases = path === '/' ? ['/', '/index', '/index.html'] : [path, path + '/', path + '.html', path + '/index.html'];
    for (const alias of aliases) {
      const state = fixture({ href: 'https://www.sin-yolanda.com' + alias + '?email=private@example.com#private' });
      assert.equal(state.adapter.event('menu_click', baseData(branch)), true, alias);
      assert.equal(state.calls[0][1].page_location, 'https://sin-yolanda.com' + path);
      assert.equal(state.calls[0][1].page_branch, branch);
    }
  }
  assert.equal(contract.routes['/guadalajara'], 'san-ignacio');
  assert.equal(contract.routes['/el-paso/menu'], 'el-paso');
});

test('unapproved hosts, non-default ports, local, preview, unknown and demo pages never deliver', () => {
  for (const href of ['http://sin-yolanda.com/houston', 'https://sin-yolanda.com:8443/houston',
    'https://private.example/houston', 'https://sin-yolanda.com.attacker.example/houston',
    'http://127.0.0.1:8832/houston', 'https://sin-yolanda-web.pages.dev/houston',
    'https://sin-yolanda.com/404', 'https://sin-yolanda.com/dashboard',
    'https://sin-yolanda.com/private@example.com', 'https://user:password@sin-yolanda.com/houston']) {
    const state = fixture({ href });
    assert.equal(state.adapter.event('menu_click', baseData()), false, href);
    assert.equal(state.adapter.pageView(), false); assert.equal(state.adapter.configuration(), null);
    assert.equal(state.calls.length, 0);
  }
});

test('explicit GA4 consent controls each delivery independently of browser signals and the Umami preference', () => {
  for (const privacy of [{ globalPrivacyControl: true }, { doNotTrack: '1' }, { doNotTrack: 'yes' },
    { windowDoNotTrack: '1' }, { msDoNotTrack: '1' }, { umamiDisabled: true }]) {
    const state = fixture({consent: false, ...privacy});
    assert.equal(state.adapter.event('menu_click', baseData()), false);
    assert.equal(state.adapter.configuration(), null); assert.equal(state.calls.length, 0);
    state.grant(true);
    assert.equal(state.adapter.event('menu_click', baseData()), true);
    assert.ok(state.adapter.configuration()); assert.equal(state.calls.length, 1);
    state.grant(false);
    assert.equal(state.adapter.event('menu_click', baseData()), false);
    assert.equal(state.calls.length, 1);
  }
  for (const consent of [false, null, undefined, 'granted', 1]) {
    const state = fixture(); state.grant(consent);
    assert.equal(state.adapter.event('menu_click', baseData()), false);
  }
});

test('revocation during context preparation wins before any event or pageview can be delivered', () => {
  let granted = true, calls = 0;
  const adapter = createGa4EventAdapter({ config: testConfig, contract,
    hasConsent: () => granted,
    readContext: () => { granted = false; return { href: 'https://sin-yolanda.com/houston' }; },
    sendEvent: () => { calls++; } });
  assert.equal(adapter.event('menu_click', baseData()), false);
  granted = true; assert.equal(adapter.pageView(), false);
  granted = true; assert.equal(adapter.configuration(), null);
  assert.equal(calls, 0);
});

test('all approved agenda records use current event/branch/kind and retained ticket destinations stay rejected', () => {
  for (const [id, event] of Object.entries(contract.events)) for (const language of ['es', 'en']) {
    const branch = event.branch;
    const state = integrated({ url: 'https://sin-yolanda.com/' + (language === 'en' ? 'en/' : '') + branch, body: { branch } });
    state.document.documentElement.lang = language;
    const agenda = new state.Element({ tag: 'section', classes: ['sy-agenda'], dataset: { branch } });
    const record = new state.Element({ tag: 'article', dataset: { record: id }, parent: agenda });
    state.click(new state.Element({ href: event.post, parent: record }));
    assert.equal(state.googleCalls.length, 1, id); assert.equal(state.calls.length, 1, id);
    const data = state.googleCalls[0][1];
    assert.equal(data.event_id, id); assert.equal(data.branch, branch);
    assert.equal(data.event_kind, event.kind); assert.equal(data.link_location, 'agenda');
    assert.equal(data.language, language); assert.equal(data.page_language, language);
    const attempt = { ...baseData(branch), action: 'tickets', destination: 'tickets', event_id: id };
    assert.equal(state.adapter.event('programming_action_click', attempt), Boolean(event.tickets), id);
  }
  const state = fixture();
  for (const event_id of ['houston-cartelera-slot-5', 'san-ignacio-brujas-20261031', 'unknown', '__proto__']) {
    assert.equal(state.adapter.event('programming_action_click', { ...baseData(), action: 'post', event_id }), false);
  }
  assert.equal(state.adapter.event('programming_action_click', { ...baseData(), action: 'post', event_id: 'el-paso-jorge-20261016' }), false);
});

test('the click bridge observes once while Umami loads, flushes and reexecutes its guarded script', () => {
  const state = integrated({ delayed: true });
  const link = new state.Element({ href: '/houston/menu/' });
  state.click(link); assert.equal(state.googleCalls.length, 1); assert.equal(state.calls.length, 0);
  state.ready(); assert.equal(state.googleCalls.length, 1); assert.equal(state.calls.length, 1);
  state.runAgain(); state.click(link);
  assert.equal(state.googleCalls.length, 2); assert.equal(state.calls.length, 2);
  state.auxclick(link); assert.equal(state.googleCalls.length, 3); assert.equal(state.calls.length, 3);
  assert.equal(state.adapter.pageView(), true); assert.equal(state.adapter.pageView(), false);
});

test('the adapter covers the complete current event vocabulary and keeps the source language of a switch', () => {
  const cases = { location_select: 'branch', location_selector_open: 'selector', branch_click: 'branch',
    catering_click: 'catering', reservation_click: 'reservation', menu_click: 'menu', phone_click: 'phone',
    directions_click: 'maps', social_click: 'instagram_profile', programming_action_click: 'agenda_section',
    language_switch_click: 'language', location_filter_click: 'filter', catering_contact_click: 'contact_section' };
  const currentEvents = JSON.parse(currentSource.match(/const events = new Set\((\[[^;]+\])\);/)[1]);
  assert.deepEqual(Object.keys(cases).sort(), currentEvents.sort());
  for (const [name, destination] of Object.entries(cases)) {
    const action = { programming_action_click: 'agenda_section', location_filter_click: 'filter_us', catering_contact_click: 'contact_section' }[name] || name;
    const state = fixture();
    assert.equal(state.adapter.event(name, { ...baseData(), action, destination }), true, name);
  }
  const state = integrated();
  state.click(new state.Element({ href: '/en/houston/', lang: 'en', classes: ['hh-language'] }));
  assert.equal(state.googleCalls.length, 1);
  const data = state.googleCalls[0][1];
  assert.equal(data.page_language, 'es'); assert.equal(data.language, 'en'); assert.equal(data.destination_language, 'en');
});

test('acceptance during the Umami queue wait cannot replay a pre-consent click to Google', () => {
  const state = integrated({ delayed: true, consent: false });
  const link = new state.Element({ href: '/houston/menu/' });
  state.click(link); assert.equal(state.googleCalls.length, 0);
  state.grant(true); state.ready();
  assert.equal(state.googleCalls.length, 0); assert.equal(state.calls.length, 1);
  state.click(link); assert.equal(state.googleCalls.length, 1); assert.equal(state.calls.length, 2);
  state.grant(false); state.click(link);
  assert.equal(state.googleCalls.length, 1); assert.equal(state.calls.length, 3);
});

test('the pageview context comes from the current sanitized owner and expires its old acquisition', () => {
  const start = Date.parse('2026-10-16T08:00:00Z');
  const state = integrated({ now: start,
    url: 'https://sin-yolanda.com/houston?utm_source=instagram&utm_medium=social&utm_campaign=unregistered&email=private@example.com#private' });
  const snapshot = state.window.syGa4MeasurementContext();
  assert.equal(Object.isFrozen(snapshot), true);
  assert.doesNotMatch(JSON.stringify(snapshot), /private|unregistered|\?/);
  assert.equal(state.adapter.configuration().campaign_source, 'instagram');
  assert.equal(state.adapter.configuration().campaign_name, undefined);
  state.setTime(start + 30 * 60 * 1000);
  assert.equal(state.adapter.configuration().campaign_source, undefined);
  assert.equal(state.adapter.pageView(), true);
  assert.equal(state.googleCalls[0][1].landing_path, '/houston');
  assert.equal(state.googleCalls[0][1].entry_source, undefined);
  assert.equal(state.googleCalls[0][1].page_location, 'https://sin-yolanda.com/houston');
});

test('page location/referrer and event parameters cannot leak raw queries, private origins or free text', () => {
  const state = fixture({ href: 'https://sin-yolanda.com/houston?email=private@example.com#name',
    referrer: 'https://private.example/person?phone=5551234567' });
  state.adapter.event('menu_click', { ...baseData(), user_id: 'private@example.com',
    name: 'Personal name', phone: '5551234567', url: 'https://private.example/',
    landing_path: '/private@example.com', source: 'Personal name', campaign: 'private@example.com' });
  const data = state.calls[0][1];
  assert.equal(data.page_referrer, ''); assert.equal(data.page_location, 'https://sin-yolanda.com/houston');
  assert.doesNotMatch(JSON.stringify(data), /private|Personal|555123|user_id|\?/);
  for (const [referrer, expected] of [['https://www.instagram.com/p/private?name=secret', 'https://www.instagram.com'],
    ['https://sin-yolanda.com/guadalajara?name=secret', 'https://sin-yolanda.com/guadalajara'],
    ['https://sin-yolanda.com/private?name=secret', ''], ['https://user:pass@instagram.com/', '']]) {
    state.context.referrer = referrer;
    assert.equal(state.adapter.configuration().page_referrer, expected);
  }
});

test('editorial and traffic campaigns stay separate and native acquisition accepts only a registered tuple', () => {
  const suppliedContract = structuredClone(contract);
  suppliedContract.trafficCampaigns = [{ code: 'test_only', source: 'instagram', medium: 'social' }];
  const acquisition = { page_language: 'en', landing_path: '/houston', source: 'instagram',
    medium: 'social', campaign: 'test_only', entry_referrer: 'instagram', legacy_hop: 'unknown' };
  const state = fixture({ suppliedContract, acquisition });
  const settings = state.adapter.configuration();
  assert.equal(settings.campaign_source, 'instagram'); assert.equal(settings.campaign_medium, 'social');
  assert.equal(settings.campaign_name, 'test_only'); assert.equal(settings.send_page_view, false);
  assert.equal(settings.allow_google_signals, false); assert.equal(settings.allow_ad_personalization_signals, false);
  state.adapter.event('programming_action_click', { ...baseData(), action: 'programming_action_click',
    destination: 'branch', campaign_id: 'halloween-2026', ...acquisition });
  const data = state.calls[0][1]; assert.equal(data.editorial_campaign_id, 'halloween-2026');
  assert.equal(data.entry_campaign, 'test_only'); assert.equal(data.campaign_id, undefined);
  state.context.acquisition.medium = 'email';
  assert.equal(state.adapter.configuration().campaign_name, undefined);
  const active = fixture({ acquisition });
  assert.equal(active.adapter.configuration().campaign_name, undefined, 'Test code never enters the active empty catalogue');
});

test('provider/observer failures remain isolated from Umami and navigation, and context errors fail closed', async () => {
  const state = integrated(); state.window.syGa4MeasurementObserver = () => { throw Error('Provider unavailable'); };
  state.click(new state.Element({ href: '/houston/menu' })); assert.equal(state.calls.length, 1);
  const throwing = fixture({ sendEvent: () => { throw Error('Provider unavailable'); } });
  assert.equal(throwing.adapter.event('menu_click', baseData()), false);
  const rejecting = fixture({ sendEvent: () => Promise.reject(Error('Provider unavailable')) });
  assert.equal(rejecting.adapter.event('menu_click', baseData()), true);
  await new Promise(resolve => setImmediate(resolve));
  const failedContext = createGa4EventAdapter({ config: testConfig, contract,
    hasConsent: () => { throw Error('Consent storage unavailable'); }, readContext: () => ({}),
    sendEvent: () => assert.fail('A failed consent read must not deliver') });
  assert.equal(failedContext.event('menu_click', baseData()), false);
  assert.equal(failedContext.configuration(), null);
});

test('the exact projection stops when its owner changes and a stable property cannot be replaced at runtime', () => {
  assert.throws(() => projectGa4EventBridge('unreviewed tracker'), /current measurement owner/);
  assert.throws(() => projectGa4EventBridge(projectedSource), /current measurement owner/);
  const mutable = { ...testConfig }, calls = [];
  const adapter = createGa4EventAdapter({ config: mutable, contract, hasConsent: () => true,
    readContext: () => ({ href: 'https://sin-yolanda.com/houston' }), sendEvent: (name, data) => calls.push(data) });
  mutable.measurementId = 'G-OTHERPROPERTY'; adapter.event('menu_click', baseData());
  assert.equal(calls[0].send_to, config.measurementId);
});
