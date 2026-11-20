// A public-data proposal, never an approval, remote collector or automatic publication.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {GBP_HOURS_BRANCHES, GBP_HOURS_MAX_AGE_HOURS, normalizeGbpRegularHours, normalizeGbpSpecialHours} from './gbp-hours.mjs';
import {createGbpHoursModel} from '../../assets/js/gbp-hours-model.js';
import {reviewedHoursData} from './reviewed-hours.mjs';

const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const digest = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');
function fresh(observedAt, now, maxAgeHours) {
  const observed = Date.parse(observedAt), current = Date.parse(now);
  assert.ok(Number.isFinite(observed) && Number.isFinite(current), 'A valid observation and review time are required');
  assert.ok(Number.isFinite(maxAgeHours) && maxAgeHours > 0, 'Invalid freshness policy');
  assert.ok(observed <= current + 300000 && current - observed <= maxAgeHours * 3600000, 'Snapshot is stale or in the future');
}
function differences(before, after, now) {
  const oldModel = createGbpHoursModel(before), newModel = createGbpHoursModel(after);
  return GBP_HOURS_BRANCHES.flatMap(({id}) => {
    const old = oldModel.location(id), next = newModel.location(id);
    const regular = !same(old.regularPeriods, next.regularPeriods) || !same(old.closedOpeningDays, next.closedOpeningDays);
    const special = !same(oldModel.specialSpecification(id, now), newModel.specialSpecification(id, now));
    return regular || special ? [{branchId: id, regularChanged: regular, specialChanged: special,
      before: {summary: oldModel.summaryFor(id), specialDates: oldModel.specialDates(id, now)},
      after: {summary: newModel.summaryFor(id), specialDates: newModel.specialDates(id, now)}}] : [];
  });
}

export function prepareHoursProposal({snapshot, baseline = reviewedHoursData, now = new Date().toISOString(), maxAgeHours = GBP_HOURS_MAX_AGE_HOURS} = {}) {
  assert.ok(snapshot?.version === 1 && snapshot.source?.method === 'locations.getGoogleUpdated', 'Expected a consumer-facing GBP snapshot');
  fresh(snapshot.observedAt, now, maxAgeHours);
  assert.ok(Array.isArray(snapshot.locations), 'Expected operating branch records');
  assert.deepEqual(snapshot.locations.map(row => row.branchId).sort(), GBP_HOURS_BRANCHES.map(branch => branch.id).sort(), 'Expected exactly the five operating branches');
  const proposed = {
    version: 1, revision: new Date(snapshot.observedAt).toISOString().replace(/[-:.]/g, '') + '-gbp-proposal',
    observedAt: snapshot.observedAt,
    source: {...reviewedHoursData.source}, policy: reviewedHoursData.policy,
    locations: GBP_HOURS_BRANCHES.map(({id, timeZone}) => {
      const row = snapshot.locations.find(value => value.branchId === id);
      assert.ok(!Object.hasOwn(row, 'httpStatus') || row.httpStatus === 200, 'The branch snapshot was not read successfully');
      assert.equal(row.timeZone, timeZone, 'Snapshot time zone differs from the configured branch');
      const regularPeriods = normalizeGbpRegularHours(row.regularHoursRaw);
      return {branchId: id, timeZone, regularPeriods,
        closedOpeningDays: days.filter(day => !regularPeriods.some(period => period.openDay === day)),
        specialDates: normalizeGbpSpecialHours(row.specialHoursRaw)};
    }),
  };
  createGbpHoursModel(proposed); // Enforce supported periods, dates and IANA boundaries.
  const changes = differences(baseline, proposed, now);
  return {version: 1, preparedAt: now, observedAt: proposed.observedAt,
    publicationEnabled: false, externalWritesEnabled: false, reviewRequired: true,
    status: changes.length ? 'review-required' : 'unchanged',
    baselineDigest: digest(baseline), proposedDigest: digest(proposed),
    changes, proposed};
}

export function hoursDataForReview(proposal, {baseline = reviewedHoursData, now = new Date().toISOString()} = {}) {
  assert.ok(proposal?.version === 1 && proposal.reviewRequired === true && proposal.publicationEnabled === false && proposal.externalWritesEnabled === false, 'An explicit unpublished review proposal is required');
  assert.equal(proposal.baselineDigest, digest(baseline), 'Proposal baseline changed; regenerate the diff');
  assert.equal(proposal.proposedDigest, digest(proposal.proposed), 'Proposal data differs from its recorded digest');
  // Strict shape prevents importing unrelated account/contact fields into public HTML.
  const exact = (object, keys) => assert.deepEqual(Object.keys(object).sort(), [...keys].sort(), 'Unexpected fields in public hours data');
  const data = proposal.proposed;
  exact(data, ['version', 'revision', 'observedAt', 'source', 'policy', 'locations']);
  assert.equal(data.observedAt, proposal.observedAt);
  assert.equal(data.revision, new Date(data.observedAt).toISOString().replace(/[-:.]/g, '') + '-gbp-proposal');
  assert.deepEqual(data.source, reviewedHoursData.source, 'Use the known public source description');
  assert.equal(data.policy, reviewedHoursData.policy);
  for (const row of data.locations) {
    exact(row, ['branchId', 'timeZone', 'regularPeriods', 'closedOpeningDays', 'specialDates']);
    for (const period of row.regularPeriods) exact(period, ['openDay', 'openTime', 'closeDay', 'closeTime', 'closeDayOffset']);
    for (const special of row.specialDates) exact(special, special.closed ? ['date', 'closed'] : ['date', 'closed', 'opens', 'closeDate', 'closes']);
  }
  fresh(data.observedAt, now, GBP_HOURS_MAX_AGE_HOURS);
  const changes = differences(baseline, data, now);
  assert.ok(!changes.some(change => change.branchId === 'san-ignacio'), 'Guadalajara changes require its own hours/campaign projection; do not silently skip them');
  return createGbpHoursModel(data).data;
}
