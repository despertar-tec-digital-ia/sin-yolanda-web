import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => JSON.parse(readFileSync(new URL('../scripts/editorial/' + file, import.meta.url), 'utf8'));
const review = read('front-b-review.json');
const evidence = read('front-b-sources.json');
const initial = read('front-b-events.json');
const units = Object.entries(review.branches).flatMap(([branch, value]) => value.units.map(unit => ({ branch, ...unit })));
const sources = new Map([...evidence.posts, ...evidence.tickets, ...initial.sources].map(source => [source.id, source]));

test('every semantic unit has grounded stable sources without enabling publication', () => {
  assert.equal(review.publicationEnabled, false);
  assert.equal(review.schedulerEnabled, false);
  assert.equal(new Set(units.map(unit => unit.id)).size, units.length);
  for (const unit of units) {
    assert.equal(unit.publicationEnabled, false);
    assert.equal(unit.operationalApproval, null);
    assert.equal(unit.rightsApproval, null);
    assert.ok(unit.sourceRefs.length);
    for (const id of unit.sourceRefs) assert.ok(sources.has(id), unit.id + ': ' + id);
    assert.equal(unit.timeZone, unit.branch === 'el-paso' ? 'America/Denver' : 'America/Chicago');
  }
});

test('compilations do not become another event or indefinitely repeat their one-off activities', () => {
  const compilationIds = new Set(evidence.posts.filter(post => post.classification === 'compilation').map(post => post.id));
  assert.equal(compilationIds.size, 4);
  assert.ok(units.every(unit => !compilationIds.has(unit.id)));
  for (const id of ['the-woodlands-mes-hispano-20261015', 'san-antonio-pelucas-20261017', 'el-paso-jorge-20261016']) {
    assert.equal(units.find(unit => unit.id === id).temporalKind, 'dated');
  }
  const proposedSlots = units.filter(unit => unit.temporalKind === 'weekday-slot');
  assert.ok(proposedSlots.every(unit => !unit.date && !unit.startsOn && !unit.endsOn));
});

test('Jorge venues and ticket functions remain distinct across branches', () => {
  const sa = units.find(unit => unit.id === 'san-antonio-jorge-20261114');
  const houston = units.find(unit => unit.id === 'houston-jorge-mariana-20261113');
  const elPaso = units.find(unit => unit.id === 'el-paso-jorge-20261016');
  assert.equal(sa.venue.kind, 'external');
  assert.match(sa.venue.name, /K\.O\.P\./);
  assert.equal(sa.action, 'tickets-jorge-sa');
  assert.equal(houston.action, 'tickets-jorge-houston');
  assert.equal(houston.venue, undefined);
  assert.equal(elPaso.action, undefined);
  assert.equal(elPaso.admission, 'unknown');
});

test('invitation-only sponsorship never offers branch reservation or ticket purchase', () => {
  const jets = units.find(unit => unit.semanticKind === 'external-sponsorship');
  assert.equal(jets.venue.city, 'Conroe');
  assert.equal(jets.venue.address, null);
  assert.equal(jets.admission, 'invitation-only');
  assert.equal(jets.action, undefined);
});

test('offers keep product scope and source times; provider ranges are not checkout totals', () => {
  const offer = units.find(unit => unit.semanticKind === 'offer');
  assert.equal(offer.branch, 'the-woodlands');
  assert.deepEqual([offer.start, offer.end], ['16:00', '21:00']);
  assert.deepEqual([offer.price.amount, offer.price.currency], [27, 'USD']);
  assert.match(offer.conditions, /tequila, whisky, ron o brandy/);
  for (const ticket of evidence.tickets) assert.equal(ticket.finalCheckoutTotal, null);
  const brunch = units.find(unit => unit.id === 'el-paso-recovery-brunch');
  assert.equal(brunch.weekday, 0);
  assert.equal(brunch.start, '10:00');
  assert.equal(brunch.end, null);
});

test('conflicting captions and time-limited artwork keep their own review constraints', () => {
  assert.ok(units.find(unit => unit.id === 'san-antonio-dontcry-20261015').sourceConflict);
  const jorge = units.find(unit => unit.id === 'san-antonio-jorge-20261114');
  assert.ok(jorge.artworkSafeBefore < jorge.date);
  assert.match(jorge.artworkExpiryBasis, /no hour/);
  assert.ok(evidence.openIssues.some(issue => issue.includes('presale artwork')));
});
