import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileMeasurementContract, readEmbeddedContract } from '../scripts/measurement-contract.mjs';
import { createGa4EventAdapter } from '../scripts/analytics/ga4-event-adapter.mjs';
import { contestPath, contestRecord, registrationWhatsapp, registrationPhone } from '../scripts/editorial/gdl-contest-config.mjs';
import { measurementHarness } from './helpers/measurement-harness.mjs';

const root = new URL('../', import.meta.url).pathname;
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const source = read('assets/js/site-measurement.js');
const contract = readEmbeddedContract(source);
const consentContract = JSON.parse(read('assets/js/ga4-consent.js').match(/window\.SY_GA4_CONTRACT = ([^\n]+);\n/)[1]);

test('production measurement and compiled consent share the approved contest route and public destinations', () => {
  assert.deepEqual(contract, compileMeasurementContract(root));
  assert.deepEqual(consentContract, contract);
  assert.equal(contract.routes[contestPath.replace(/\/$/, '')], 'san-ignacio');
  const event = contract.events[contestRecord];
  assert.equal(event.branch, 'san-ignacio');
  assert.equal(event.detailRoute, contestPath.replace(/\/$/, ''));
  assert.equal(event.registrationWhatsapp, registrationWhatsapp);
  assert.equal(event.registrationPhone, registrationPhone);
  assert.equal(event.tickets, undefined);
  assert.ok(Object.entries(contract.events).every(([id, item]) => id === contestRecord || !item.registrationWhatsapp && !item.registrationPhone && !item.detailRoute));
});

test('production click owner scopes contest intent, keeps reservations distinct and delivers GA4 only while consented', () => {
  const config = JSON.parse(read('scripts/analytics/ga4-event-config.json'));
  let granted = false, adapter;
  const googleCalls = [];
  const state = measurementHarness({ source, url: 'https://sin-yolanda.com' + contestPath,
    body: { branch: 'san-ignacio' }, beforeRun({ window, document }) {
      adapter = createGa4EventAdapter({ config, contract: consentContract,
        hasConsent: () => granted,
        readContext: () => ({ href: window.location.href, referrer: document.referrer }),
        sendEvent: (name, data) => googleCalls.push([name, data]) });
      window.syGa4MeasurementObserver = (name, data) => adapter.event(name, data);
    } });
  const link = href => new state.Element({ href, dataset: { record: contestRecord } });
  state.click(link(registrationWhatsapp));
  assert.equal(googleCalls.length, 0);
  assert.equal(adapter.pageView(), false);
  granted = true;
  assert.equal(adapter.pageView(), true);
  assert.equal(adapter.pageView(), false);
  const before = state.calls.length;
  state.runAgain();
  for (const href of [registrationWhatsapp, registrationPhone, contestPath]) state.click(link(href));
  state.auxclick(link(registrationWhatsapp));
  state.click(new state.Element({ href: 'https://wa.me/5213310186159' }));
  const expected = [
    ['programming_action_click', 'whatsapp', contestRecord],
    ['programming_action_click', 'phone', contestRecord],
    ['programming_action_click', 'agenda_section', contestRecord],
    ['programming_action_click', 'whatsapp', contestRecord],
    ['reservation_click', 'whatsapp', undefined],
  ];
  const summary = calls => calls.map(([name, data]) => [name, data.destination, data.event_id]);
  assert.deepEqual(summary(state.calls.slice(before)), expected);
  assert.deepEqual(summary(googleCalls.slice(1)), expected);
  const count = state.calls.length;
  for (const href of ['https://wa.me/520000000000', 'tel:+520000000000', '/houston', 'https://private.example' + contestPath]) state.click(link(href));
  state.click(new state.Element({ href: registrationWhatsapp, dataset: { record: 'houston-ladies-weekly' } }));
  assert.equal(state.calls.length, count, 'Unapproved or cross-branch destinations must not fall through to reservation tracking');
  for (const calls of [state.calls, googleCalls]) assert.doesNotMatch(JSON.stringify(calls), /3319422709|3310186159|disponibilidad|Me%20comparten|text=/);
  granted = false;
  state.click(link(registrationWhatsapp));
  assert.equal(googleCalls.length, expected.length + 1);
});
