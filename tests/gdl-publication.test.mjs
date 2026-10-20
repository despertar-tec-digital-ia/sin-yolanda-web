import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadGdlApproval, projectGdlAgenda } from '../scripts/editorial/gdl-approved.mjs';
import { projectAllAgendas } from '../scripts/editorial/all-agendas.mjs';
import { renderGdlAgenda } from '../scripts/editorial/gdl-agenda.mjs';
import { compileMeasurementContract } from '../scripts/measurement-contract.mjs';
import { measurementHarness } from './helpers/measurement-harness.mjs';
const root = new URL('../', import.meta.url).pathname, commit = 'a'.repeat(40), config = loadGdlApproval(root);
const page = now => projectGdlAgenda(root, { now, commit }).files.get('guadalajara.html');
const articleCount = (html, id) => [...html.matchAll(/<article\b[^>]*\bdata-record="([^"]+)"/g)].filter(match => match[1] === id).length;

test('the four approved GDL pieces preserve the reviewed composition without private controls', () => {
  const publicHtml = page(config.approval.approvedAt);
  for (const record of config.records) assert.equal(articleCount(publicHtml, record.id), 1);
  const shared = renderGdlAgenda({ records: config.records });
  assert.match(shared, /<section id="agenda-san-ignacio-canta"[^>]*><article class="sy-gdl-competition" data-record=/);
  assert.doesNotMatch(publicHtml, /review-agenda|Propuesta local|sy-review-controls|En revisión:|localhost|127\.0\.0\.1/);
  assert.match(publicHtml, /muted loop playsinline preload="none"/);
  assert.match(publicHtml, /src="\/assets\/js\/agenda-clock.js\?v=/);
  assert.equal(page('2026-10-16T23:59:00Z').includes('data-record="san-ignacio-solteras-weekly"'), false);
});

test('GDL dates retire in HTML and in the shared scheduler at local boundaries', () => {
  const before = page('2026-11-01T08:59:59Z'), after = page('2026-11-01T09:00:00Z');
  for (const id of ['san-ignacio-brujas-20261031', 'san-ignacio-cumpleanos-202610']) {
    assert.equal(articleCount(before, id), 1); assert.equal(articleCount(after, id), 0);
  }
  assert.equal(articleCount(page('2026-12-03T05:59:59Z'), 'san-ignacio-canta-5-2026'), 1);
  const expired = page('2026-12-03T06:00:00Z');
  assert.equal(articleCount(expired, 'san-ignacio-canta-5-2026'), 0);
  assert.match(expired, /<div class="hh-welcome-actions" data-gdl-event-feature="active" hidden>/);
  const navigation = expired.match(/<a\b[^>]*\bdata-gdl-contest-link\b[^>]*>/)?.[0];
  assert.match(navigation, /href="#programacion-san-ignacio"/);
  assert.doesNotMatch(navigation, /\sdata-record=/);
  assert.ok(page('2026-12-03T06:00:00Z').includes('data-record="san-ignacio-solteras-weekly"'));
  assert.equal(projectAllAgendas(root, { now: '2026-11-01T08:59:59Z', commit }).metadata.nextTransitionAt, '2026-11-01T09:00:00.000Z');
  assert.equal(config.records.find(record => record.id.includes('solteras')).recurrence.endsOn, null);
});

test('both contest links measure the same approved GDL event once and unrelated links are rejected', () => {
  const contract = compileMeasurementContract(root), event = contract.events['san-ignacio-canta-5-2026'];
  const state = measurementHarness({ url: 'https://sin-yolanda.com/guadalajara', body: { branch: 'san-ignacio' } });
  const agenda = new state.Element({ tag: 'section', classes: ['sy-agenda'] });
  const record = new state.Element({ tag: 'article', dataset: { record: 'san-ignacio-canta-5-2026' }, parent: agenda });
  for (const href of [event.post, ...event.additionalPosts]) state.click(new state.Element({ href, parent: record }));
  assert.equal(state.calls.length, 2);
  assert.ok(state.calls.every(([name, data]) => name === 'programming_action_click' && data.event_id === 'san-ignacio-canta-5-2026' && data.branch === 'san-ignacio'));
  state.click(new state.Element({ href: 'https://www.instagram.com/p/Unknown/', parent: record }));
  assert.equal(state.calls.length, 2);
});
