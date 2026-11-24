// Proposed external placements are opt-in review data, never an activation of social/GBP links.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {compileMeasurementContract, contractStart, contractEnd, readEmbeddedContract} from '../measurement-contract.mjs';
import {compileGa4Bundle} from '../analytics/ga4-bundle.mjs';

const origin = 'https://sin-yolanda.com';
const measurementAsset = 'assets/js/site-measurement.js';
const ga4Asset = 'assets/js/ga4-consent.js';
const keys = (value, names) => {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'Expected a proposal object');
  assert.deepEqual(Object.keys(value).sort(), [...names].sort(), 'Unexpected proposal fields');
};
export function compileTrafficProposal({root, proposal, approvedContract = compileMeasurementContract(root), pages} = {}) {
  proposal ??= JSON.parse(readFileSync(resolve(root, 'scripts/site-quality/traffic-proposal.json'), 'utf8'));
  keys(proposal, ['version', 'status', 'placements']);
  assert.equal(proposal.version, 1);
  assert.equal(proposal.status, 'proposed', 'This registry cannot claim approval or distribution');
  assert.ok(Array.isArray(proposal.placements) && proposal.placements.length, 'Supply external placements');
  const contract = structuredClone(approvedContract), ids = new Set(), tuples = new Map();
  const links = proposal.placements.map(item => {
    keys(item, ['id', 'branch', 'destination', 'source', 'medium', 'campaign']);
    assert.ok(typeof item.id === 'string' && /^[a-z][a-z0-9-]{2,63}$/.test(item.id) && !ids.has(item.id), 'Unique public placement id required');
    ids.add(item.id);
    assert.ok(typeof item.destination === 'string' && /^\/(?!\/)/.test(item.destination), 'Use an existing site path');
    const url = new URL(item.destination, origin);
    assert.ok(url.origin === origin && !url.search && !url.username && !url.password && url.pathname + url.hash === item.destination, 'No external host, query or normalized aliases');
    assert.ok(Object.hasOwn(contract.routes, url.pathname) && contract.routes[url.pathname] === item.branch, 'Canonical route and branch must match');
    assert.ok(!url.hash || /^#[a-z][a-z0-9-]{0,63}$/.test(url.hash), 'Only public section anchors');
    assert.ok(contract.utmValues.utm_source.includes(item.source) && contract.utmValues.utm_medium.includes(item.medium), 'Use registered source and medium');
    assert.ok(typeof item.campaign === 'string' && /^sy_[a-z0-9]+(?:_[a-z0-9]+)*$/.test(item.campaign) && item.campaign.length <= 64, 'Use a public campaign code');
    if (pages) {
      const html = [...pages.values()].find(html => html.includes(`rel="canonical" href="${origin}${url.pathname}"`) || html.includes(`href="${origin}${url.pathname}" rel="canonical"`));
      assert.ok(html, 'Placement must resolve to a canonical page in the final package');
      if (url.hash) assert.ok(html.includes(`id="${url.hash.slice(1)}"`), 'Placement anchor must exist');
    }
    const tuple = {code: item.campaign, source: item.source, medium: item.medium};
    tuples.set(JSON.stringify(tuple), tuple);
    url.search = new URLSearchParams({utm_source: item.source, utm_medium: item.medium, utm_campaign: item.campaign}).toString();
    return {...item, url: url.href, status: 'proposed', distributed: false};
  });
  for (const tuple of tuples.values()) if (!contract.trafficCampaigns.some(item => JSON.stringify(item) === JSON.stringify(tuple))) contract.trafficCampaigns.push(tuple);
  contract.utmValues.utm_campaign = [...new Set([...contract.utmValues.utm_campaign, ...links.map(item => item.campaign)])];
  return {contract, metadata: {version: 1, status: 'proposed', reviewOnly: true, externalChangesApplied: false, links, tuples: [...tuples.values()]}};
}

export function projectReviewAttribution({root, read, pages} = {}) {
  const {contract, metadata} = compileTrafficProposal({root, pages});
  const source = read(measurementAsset), approved = compileMeasurementContract(root);
  assert.deepEqual(readEmbeddedContract(source), approved, 'Project over the current approved measurement contract only');
  assert.equal(source.split(contractStart).length, 2);
  assert.equal(source.split(contractEnd).length, 2);
  const start = source.indexOf(contractStart) + contractStart.length, end = source.indexOf(contractEnd);
  const proposedSource = source.slice(0, start) + '\n' + JSON.stringify(contract).replace(/</g, '\\u003c') + '\n' + source.slice(end);
  const files = new Map([[measurementAsset, proposedSource], [ga4Asset, compileGa4Bundle(root, {}, contract)]]);
  metadata.assetVersions = Object.fromEntries([...files, ['assets/js/public-data.js', read('assets/js/public-data.js')]]
    .map(([file, text]) => [file, createHash('sha256').update(text).digest('hex').slice(0, 12)]));
  for (const [file, html] of pages ?? []) {
    let next = html;
    for (const [asset, version] of Object.entries(metadata.assetVersions)) {
      const path = asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      next = next.replace(new RegExp(`(src=")/?${path}(?:\\?[^"<>]*)?(")`, 'g'), `$1/${asset}?v=quality-${version}$2`);
    }
    if (next !== html) files.set(file, next);
  }
  return {files, metadata, changes: [...files.keys()].map(file => ({file, kind: 'review-only-external-attribution'}))};
}

export function inspectReviewAttribution({read, metadata, pages} = {}) {
  if (!metadata) return {applicable: false, passed: true};
  try {
    const umami = readEmbeddedContract(read(measurementAsset));
    const ga4 = JSON.parse(read(ga4Asset).match(/window\.SY_GA4_CONTRACT = ([^\n]+);/)[1]);
    assert.deepEqual(ga4, umami, 'Both providers must use the same acquisition contract');
    assert.equal(metadata.status, 'proposed');
    assert.equal(metadata.externalChangesApplied, false);
    for (const [file, version] of Object.entries(metadata.assetVersions)) {
      assert.equal(createHash('sha256').update(read(file)).digest('hex').slice(0, 12), version, 'Loader version must match packaged asset bytes');
      for (const [page, html] of pages ?? []) if (html.includes(`src="/${file}`) || html.includes(`src="${file}`)) {
        assert.ok(html.includes(`src="/${file}?v=quality-${version}"`), page + ': stale asset loader');
      }
    }
    for (const item of metadata.links) {
      const url = new URL(item.url);
      assert.equal(url.origin, origin);
      assert.equal(umami.routes[url.pathname], item.branch);
      assert.deepEqual([...url.searchParams.keys()].sort(), ['utm_campaign', 'utm_medium', 'utm_source']);
      for (const key of ['source', 'medium', 'campaign']) assert.equal(url.searchParams.get('utm_' + key), item[key]);
      assert.ok(umami.trafficCampaigns.some(tuple => tuple.code === item.campaign && tuple.source === item.source && tuple.medium === item.medium));
    }
    return {applicable: true, passed: true, placements: metadata.links.length, tuples: metadata.tuples.length, externalChangesApplied: false};
  } catch (error) {return {applicable: true, passed: false, error: error.message};}
}
