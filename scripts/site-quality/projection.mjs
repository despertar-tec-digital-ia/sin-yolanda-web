// Shared incremental adaptation over the existing projected site. No writes or publication.
import assert from 'node:assert/strict';
import {projectQualitySeo} from './seo-projection.mjs';
import {projectReviewedHours, reviewedHoursAssets} from './reviewed-hours.mjs';
import {projectReviewedEventClock} from './event-clock.mjs';
import {projectQualityNavigation} from './navigation.mjs';
import {projectQualityContinuity, continuityAssets} from './continuity.mjs';
import {projectReviewAttribution} from './attribution.mjs';
import {projectCommercialData} from './commercial-data.mjs';

const asset = 'assets/css/site-quality-pilot.css';
export const qualityAssets = Object.freeze([asset, ...reviewedHoursAssets, ...continuityAssets]);
const branches = new Set(['houston', 'san-antonio', 'the-woodlands', 'el-paso']);
export function projectSiteQuality({root, pages, read, now, hoursData} = {}) {
  const seo = projectQualitySeo({pages, read});
  const changed = new Map(seo.files);
  const currentPages = () => new Map([...pages].map(([file, source]) => [file, changed.get(file) ?? source]));
  const hours = projectReviewedHours({pages: currentPages(), read: file => changed.get(file) ?? read(file), now, hoursData});
  for (const pair of hours.files) changed.set(...pair);
  const eventClock = projectReviewedEventClock({pages: currentPages(), now, hoursData});
  for (const pair of eventClock.files) changed.set(...pair);
  const navigation = projectQualityNavigation({pages: currentPages()});
  for (const pair of navigation.files) changed.set(...pair);
  const continuity = projectQualityContinuity({pages: currentPages()});
  for (const pair of continuity.files) changed.set(...pair);
  const commercial = projectCommercialData({pages: currentPages(), read: file => changed.get(file) ?? read(file)});
  for (const pair of commercial.files) changed.set(...pair);
  const attribution = projectReviewAttribution({root, read: file => changed.get(file) ?? read(file), pages: currentPages()});
  for (const pair of attribution.files) changed.set(...pair);
  const pilotPages = [], controlPages = [];
  for (const [file, source] of currentPages()) {
    const body = source.match(/<body\b[^>]*>/)?.[0] ?? '';
    const branch = body.match(/data-branch="([^"]+)"/)?.[1];
    const agenda = /class="[^"]*\bbranch-landing\b/.test(body) && branches.has(branch);
    const controls = /class="[^"]*\b(?:digital-menu-page|gdl-original-menu|ep-menu-page)\b/.test(body) || file === 'aviso-de-privacidad.html';
    if (!agenda && !controls) continue;
    assert.ok(!source.includes('data-site-quality-pilot='), 'Do not apply the pilot twice');
    const flag = agenda ? ' data-site-quality-pilot="agenda"' : ' data-site-quality-controls="targets"';
    const html = source.replace(/<body\b[^>]*>/, tag => tag.replace('>', flag + '>'))
      .replace('</head>', `<link rel="stylesheet" href="/${asset}?v=20261119-agenda-pilot"></head>`);
    changed.set(file, html); (agenda ? pilotPages : controlPages).push(file);
  }
  assert.equal(pilotPages.length, 8, 'Expected the four existing Texas locations in ES/EN');
  for (const file of qualityAssets) changed.set(file, read(file));
  return {files: changed, metadata: {version: 5, asOf: now, pilotPages, controlPages,
    seo: seo.metadata, hours: {...hours.metadata, eventEditorialExpiryReconciled: true}, eventClock: eventClock.metadata,
    navigation: navigation.metadata, continuity: continuity.metadata,
    attribution: attribution.metadata, commercial: commercial.metadata,
    changes: [...seo.changes, ...hours.changes, ...eventClock.changes, ...navigation.changes, ...continuity.changes,
      ...commercial.changes, ...attribution.changes, ...qualityAssets.map(file => ({file, kind: 'incremental-quality-asset'}))]}};
}
