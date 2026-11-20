import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';
import {visibilityWindow} from '../scripts/editorial/november-2026-programming.mjs';
import {eventMediaRecords} from '../scripts/editorial/event-media.mjs';
import {elementRange} from '../scripts/editorial/public-agenda.mjs';
import {projectReviewedEventClock} from '../scripts/site-quality/event-clock.mjs';
import {reviewedHoursData} from '../scripts/site-quality/reviewed-hours.mjs';
import {createGbpHoursModel} from '../assets/js/gbp-hours-model.js';

const root = new URL('../', import.meta.url).pathname;
const hoursModel = createGbpHoursModel(reviewedHoursData);
const record = id => eventMediaRecords().records.find(value => value.id === id);
test('the November25 event remains visible through the actual overnight exception without announcing an event end', () => {
  const cases = [['the-woodlands-concurso-canto-20261125', '2026-11-26T08:00:00.000Z'],
    ['el-paso-friendsgiving-20261125', '2026-11-26T09:00:00.000Z']];
  for (const [id, closing] of cases) {
    const event = record(id), original = structuredClone(event);
    assert.equal(visibilityWindow(event, {hoursModel}).expiresAt, closing);
    assert.equal(event.sourceEndTime, null);
    assert.deepEqual(event, original);
  }
});

test('the candidate recovers a late-night record omitted by the legacy projection and retires it exactly at its closing', () => {
  const at = '2026-11-26T07:30:00.000Z';
  const baseline = projectPublicSite(root, {now: at, commit: 'a'.repeat(40)}).files;
  const id = 'the-woodlands-concurso-canto-20261125';
  assert.ok(!baseline.get('the-woodlands.html').includes('data-record="' + id + '"'));
  const candidate = projectReviewedEventClock({pages: baseline, now: at});
  for (const language of ['es', 'en']) {
    const file = language === 'es' ? 'the-woodlands.html' : 'en/the-woodlands/index.html';
    const html = candidate.files.get(file);
    assert.ok(html.includes('data-record="' + id + '"'));
    assert.ok(html.includes('data-expires-at="2026-11-26T08:00:00.000Z"'));
    const ids = [...html.matchAll(/data-record="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size);
    const outside = value => {const range = elementRange(value, 'section', 'programacion-the-woodlands'); return value.slice(0, range.start) + value.slice(range.end);};
    assert.equal(outside(html), outside(baseline.get(file)), 'Keep all non-agenda content and controllers intact');
  }
  const ended = projectReviewedEventClock({pages: baseline, now: '2026-11-26T08:00:00.000Z'});
  const after = ended.files.get('the-woodlands.html') ?? baseline.get('the-woodlands.html');
  assert.ok(!after.includes('data-record="' + id + '"'));
});

test('calendar promotions retain their approved date window while operating-hours expiry remains opt-in', () => {
  const promotion = eventMediaRecords().records.find(value => value.kind === 'dated-promotion');
  assert.deepEqual(visibilityWindow(promotion, {hoursModel}), visibilityWindow(promotion));
  const event = record('the-woodlands-concurso-canto-20261125');
  assert.notEqual(visibilityWindow(event).expiresAt, visibilityWindow(event, {hoursModel}).expiresAt);
});
