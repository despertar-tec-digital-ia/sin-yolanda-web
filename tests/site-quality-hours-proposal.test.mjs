import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync, rmSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {prepareHoursProposal, hoursDataForReview} from '../scripts/site-quality/hours-proposal.mjs';
import {reviewedHoursData} from '../scripts/site-quality/reviewed-hours.mjs';
import {writeHoursProposal} from '../scripts/prepare-gbp-hours.mjs';
import {buildSiteQualityReview} from '../scripts/site-quality-review.mjs';

const now = '2026-11-20T01:00:00Z', root = resolve(import.meta.dirname, '..');
const clock = value => {const [hours, minutes] = value.split(':').map(Number); return {hours, minutes};};
const date = value => {const [year, month, day] = value.split('-').map(Number); return {year, month, day};};
function snapshot() {
  return {version: 1, observedAt: reviewedHoursData.observedAt, source: {method: 'locations.getGoogleUpdated'},
    privateAccount: 'not-for-public-output', locations: reviewedHoursData.locations.map(row => ({
      branchId: row.branchId, timeZone: row.timeZone, resourceName: 'private-resource-must-not-be-copied',
      regularHoursRaw: {periods: row.regularPeriods.map(p => ({openDay: p.openDay, openTime: clock(p.openTime), closeDay: p.closeDay, closeTime: clock(p.closeTime)}))},
      specialHoursRaw: {specialHourPeriods: row.specialDates.map(p => ({startDate: date(p.date), ...(p.closed ? {closed: true} : {openTime: clock(p.opens), endDate: date(p.closeDate), closeTime: clock(p.closes)})}))},
    }))};
}
const prepare = input => prepareHoursProposal({snapshot: input, now});

test('a complete snapshot creates a sanitized unchanged proposal without changing reviewed data', () => {
  const input = snapshot(), before = JSON.stringify(input), baseline = JSON.stringify(reviewedHoursData);
  const proposal = prepare(input);
  assert.equal(proposal.status, 'unchanged'); assert.deepEqual(proposal.changes, []);
  assert.equal(proposal.publicationEnabled, false); assert.equal(proposal.externalWritesEnabled, false);
  assert.equal(proposal.reviewRequired, true);
  assert.doesNotMatch(JSON.stringify(proposal), /privateAccount|resourceName|not-for-public|private-resource/);
  assert.equal(JSON.stringify(input), before); assert.equal(JSON.stringify(reviewedHoursData), baseline);
  assert.equal(hoursDataForReview(proposal, {now}).locations.length, 5);
});

test('the diff derives real regular and dated changes from raw fields, ignoring cached normalized values', () => {
  const input = snapshot(), houston = input.locations.find(row => row.branchId === 'houston');
  houston.regularHoursRaw.periods.find(p => p.openDay === 'FRIDAY').openTime.hours = 17;
  houston.specialHoursRaw.specialHourPeriods.find(p => p.startDate.day === 25).closeTime.hours = 3;
  houston.regularPeriods = reviewedHoursData.locations.find(row => row.branchId === 'houston').regularPeriods;
  const proposal = prepare(input);
  assert.equal(proposal.status, 'review-required'); assert.equal(proposal.changes.length, 1);
  assert.equal(proposal.changes[0].branchId, 'houston'); assert.equal(proposal.changes[0].regularChanged, true);
  assert.equal(proposal.changes[0].specialChanged, true);
  assert.match(proposal.changes[0].after.summary, /Vie 5 pm/);
  assert.equal(proposal.changes[0].after.specialDates[0].closes, '03:00');
});

test('freshness, identities, read failures, zones and partial clocks block a proposal', () => {
  const cases = [
    input => {input.locations.pop();},
    input => {input.locations.push(input.locations[0]);},
    input => {input.locations[0].branchId = 'planned-location';},
    input => {input.locations[0].timeZone = 'UTC';},
    input => {input.locations[0].httpStatus = 403;},
    input => {input.locations[0].regularHoursRaw = {periods: []};},
    input => {delete input.locations[0].specialHoursRaw;},
    input => {input.locations[0].regularHoursRaw.periods[0].openTime.minutes = 61;},
    input => {input.observedAt = '2026-11-01T00:00:00Z';},
    input => {input.observedAt = '2026-11-22T00:00:00Z';},
    input => {input.source.method = 'locations.list';},
  ];
  for (const change of cases) {const input = snapshot(); change(input); assert.throws(() => prepare(input));}
});

test('a GDL change is reported but cannot be silently skipped by the Texas candidate', () => {
  const input = snapshot(); input.locations[0].regularHoursRaw.periods[0].openTime.hours = 20;
  const proposal = prepare(input); assert.equal(proposal.changes[0].branchId, 'san-ignacio');
  proposal.changes = []; // Do not trust an edited human-readable diff.
  assert.throws(() => hoursDataForReview(proposal, {now}), /Guadalajara changes require/);
});

test('proposal tampering, unrelated fields, stale review and changed baselines are rejected', () => {
  const proposal = prepare(snapshot()), clone = value => structuredClone(value);
  const changed = clone(proposal); changed.proposed.locations[1].regularPeriods[0].openTime = '17:00';
  assert.throws(() => hoursDataForReview(changed, {now}), /recorded digest/);
  const unrelated = clone(proposal); unrelated.proposed.locations[0].contact = 'do-not-copy';
  unrelated.proposedDigest = createHash('sha256').update(JSON.stringify(unrelated.proposed)).digest('hex');
  assert.throws(() => hoursDataForReview(unrelated, {now}), /Unexpected fields/);
  assert.throws(() => hoursDataForReview(proposal, {now: '2026-11-25T12:00:00Z'}), /stale/);
  const baseline = clone(reviewedHoursData); baseline.revision = 'new-review';
  assert.throws(() => hoursDataForReview(proposal, {now, baseline}), /baseline changed/);
});

test('invalid proposals do not leave a partial candidate and output never overwrites a file', t => {
  const dir = resolve(root, '.artifacts/hours-proposal-test-' + process.pid); mkdirSync(dir);
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  assert.throws(() => buildSiteQualityReview({root, out: resolve(dir, 'invalid'), now, hoursProposal: {}}));
  assert.equal(existsSync(resolve(dir, 'invalid')), false);
  // Use a fixture written only for this test; there is no Google transport or credential.
  const input = resolve(dir, 'snapshot.json');
  const source = snapshot();
  source.locations.find(row => row.branchId === 'houston').regularHoursRaw.periods.find(p => p.openDay === 'FRIDAY').openTime.hours = 17;
  writeFileSync(input, JSON.stringify(source));
  const out = resolve(dir, 'proposal.json');
  const report = writeHoursProposal({root, snapshotFile: input, out, now});
  assert.equal(report.status, 'review-required');
  assert.throws(() => writeHoursProposal({root, snapshotFile: input, out, now}), /new proposal/);
  assert.throws(() => writeHoursProposal({root, snapshotFile: input, out: resolve(root, 'public-proposal.json'), now}), /ignored artifacts/);
  const review = buildSiteQualityReview({root, out: resolve(dir, 'candidate'), now, hoursProposal: report});
  assert.equal(review.qualityReview.hoursProposalUsed, true);
  const html = readFileSync(resolve(dir, 'candidate/public/houston.html'), 'utf8');
  assert.match(html, /datetime="17:00"/);
  assert.match(readFileSync(resolve(dir, 'candidate/public/assets/js/public-data.js'), 'utf8'), /Vie 5 pm/);
});
