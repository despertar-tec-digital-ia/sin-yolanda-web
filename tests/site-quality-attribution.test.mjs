import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {compileMeasurementContract, readEmbeddedContract} from '../scripts/measurement-contract.mjs';
import {compileTrafficProposal, projectReviewAttribution, inspectReviewAttribution} from '../scripts/site-quality/attribution.mjs';
import {createGa4EventAdapter} from '../scripts/analytics/ga4-event-adapter.mjs';
import {measurementHarness} from './helpers/measurement-harness.mjs';

const root = resolve(import.meta.dirname, '..');
const read = file => readFileSync(resolve(root, file), 'utf8');
const proposal = JSON.parse(read('scripts/site-quality/traffic-proposal.json'));
const approved = compileMeasurementContract(root);
const projection = projectReviewAttribution({root, read});
const source = projection.files.get('assets/js/site-measurement.js');
const contract = readEmbeddedContract(source);

test('proposed placements compile without changing approved acquisition or provider settings', () => {
  assert.equal(projection.metadata.links.length, 7);
  assert.equal(projection.metadata.tuples.length, 3);
  assert.deepEqual(approved.trafficCampaigns, []);
  assert.deepEqual(readEmbeddedContract(read('assets/js/site-measurement.js')), approved);
  const ga4 = text => JSON.parse(text.match(/window\.SY_GA4_(?:CONFIG|CONTRACT) = (?:Object\.freeze\()?([^\n]+?)(?:\))?;/)[1]);
  assert.deepEqual(ga4(projection.files.get('assets/js/ga4-consent.js')), ga4(read('assets/js/ga4-consent.js')));
  assert.deepEqual(inspectReviewAttribution({read: file => projection.files.get(file) ?? read(file), metadata: projection.metadata}),
    {applicable: true, passed: true, placements: 7, tuples: 3, externalChangesApplied: false});
  assert.equal(new URL(projection.metadata.links[0].url).hash, '#ubicaciones');
  assert.ok(!JSON.stringify(projection.metadata).includes('/reservar'));
});

test('invalid destination, mismatched branch, unregistered labels and duplicate/private fields fail before a package is built', () => {
  for (const patch of [
    {destination: '/reservar'}, {destination: '//evil.example/'}, {destination: '/houston?email=test@example.com'},
    {destination: '/san-antonio/'}, {destination: '/houston', branch: 'el-paso'},
    {source: 'person@example.com'}, {medium: 'unknown'}, {campaign: 'guest@example.com'}, {email: 'test@example.com'},
  ]) {
    const invalid = structuredClone(proposal); Object.assign(invalid.placements[0], patch);
    assert.throws(() => compileTrafficProposal({root, proposal: invalid}));
  }
  const duplicate = structuredClone(proposal); duplicate.placements.push(duplicate.placements[0]);
  assert.throws(() => compileTrafficProposal({root, proposal: duplicate}), /Unique/);
  const changedStatus = {...proposal, status: 'active'};
  assert.throws(() => compileTrafficProposal({root, proposal: changedStatus}), /approval/);
});

test('every proposed link survives Umami privacy filtering and reaches GA4 with the same campaign tuple', () => {
  const config = {...JSON.parse(read('scripts/analytics/ga4-event-config.json')), enabled: true, consentScope: 'ga4-only'};
  for (const item of projection.metadata.links) {
    const state = measurementHarness({source, url: item.url + (item.url.includes('#') ? '' : '&email=guest@example.com&gclid=private#secret')});
    const view = state.window.sySiteAnalyticsSanitize('event', {});
    assert.equal(view.data.campaign, item.campaign);
    assert.equal(view.data.source, item.source); assert.equal(view.data.medium, item.medium);
    assert.doesNotMatch(JSON.stringify(view), /guest|email|gclid|private|secret|#ubicaciones/);
    const adapter = createGa4EventAdapter({config, contract, hasConsent: () => true,
      readContext: () => ({href: item.url, acquisition: state.window.syGa4MeasurementContext()}), sendEvent: () => {}});
    assert.equal(adapter.configuration().campaign_name, item.campaign);
    assert.equal(adapter.configuration().campaign_source, item.source);
    assert.equal(adapter.configuration().campaign_medium, item.medium);
  }
});

test('campaign cannot cross source/medium, survive duplicate labels or leak arbitrary acquisition', () => {
  for (const search of [
    'utm_source=instagram&utm_medium=email&utm_campaign=sy_social_profiles',
    'utm_source=google&utm_medium=organic&utm_campaign=sy_social_profiles',
    'utm_source=instagram&utm_medium=social&utm_campaign=sy_social_profiles&utm_campaign=sy_google_profiles',
  ]) {
    const state = measurementHarness({source, url: 'https://sin-yolanda.com/?' + search});
    assert.equal(state.window.sySiteAnalyticsSanitize('event', {}).data.campaign, undefined);
  }
});

test('internal navigation retains bounded per-tab attribution without decorating internal links', () => {
  const storage = new Map(), now = Date.parse('2026-11-24T06:00:00Z');
  measurementHarness({source, url: projection.metadata.links[0].url, storage, now});
  const next = measurementHarness({source, url: 'https://sin-yolanda.com/houston', referrer: 'https://sin-yolanda.com/', storage, now: now + 1000});
  const link = new next.Element({href: '/houston/menu/'}); next.click(link);
  assert.equal(link.rawHref, '/houston/menu/');
  const view = next.window.sySiteAnalyticsSanitize('event', {});
  assert.equal(view.url, '/houston'); assert.equal(view.data.campaign, 'sy_social_profiles');
  const expired = measurementHarness({source, url: 'https://sin-yolanda.com/houston/menu/', referrer: 'https://sin-yolanda.com/houston', storage, now: now + 1801001});
  assert.equal(expired.window.sySiteAnalyticsSanitize('event', {}).data.campaign, undefined);
  const local = measurementHarness({source, url: 'http://127.0.0.1:8917/houston'});
  assert.equal(local.scripts.length, 0); assert.equal(local.calls.length, 0);
});

test('final review pages receive content-versioned loaders and broken anchors or divergent bundles fail', () => {
  const pages = new Map([['index.html', read('index.html')]]);
  // Use the full route set for the projection; a partial published map must fail closed.
  assert.throws(() => projectReviewAttribution({root, read, pages}), /canonical page/);
  const manifest = JSON.parse(read('scripts/public-manifest.json'));
  const all = new Map(manifest.pages.map(file => [file, read(file)]));
  const projected = projectReviewAttribution({root, read, pages: all});
  for (const [asset, version] of Object.entries(projected.metadata.assetVersions)) {
    assert.ok(projected.files.get('index.html').includes(`/${asset}?v=quality-${version}`));
  }
  all.set('index.html', all.get('index.html').replace('id="ubicaciones"', 'id="other"'));
  assert.throws(() => projectReviewAttribution({root, read, pages: all}), /anchor/);
  assert.equal(inspectReviewAttribution({read, metadata: projected.metadata}).passed, false);
  const finalRead = file => projected.files.get(file) ?? read(file);
  const stale = new Map([['index.html', projected.files.get('index.html').replace(/quality-[a-f0-9]{12}/, 'old-version')]]);
  assert.match(inspectReviewAttribution({read: finalRead, pages: stale, metadata: projected.metadata}).error, /stale asset/);
});
