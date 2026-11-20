// Local candidate only. The normal build and historical approvals do not import this.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import reviewedData from './reviewed-hours-20261119.json' with {type: 'json'};
import {createGbpHoursModel, REVIEWED_USA_BRANCHES} from '../../assets/js/gbp-hours-model.js';
import {GBP_HOURS_BRANCHES} from './gbp-hours.mjs';

export const reviewedHoursAssets = Object.freeze(['assets/js/gbp-hours-model.js', 'assets/js/gbp-hours-client.js']);
export const reviewedHoursData = reviewedData;
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const attributes = source => Object.fromEntries([...source.matchAll(/([^\s=<>"']+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1].toLowerCase(), match[2] ?? match[3]]));
function hoursRange(html) {
  const openings = [...html.matchAll(/<div\b([^>]*)>/gi)].filter(match => (attributes(match[1]).class ?? '').split(/\s+/).includes('ve-hours'));
  assert.equal(openings.length, 1, 'Expected one existing hours block');
  const opening = openings[0], tags = /<(\/?)div\b[^>]*>/gi;
  tags.lastIndex = opening.index + opening[0].length;
  let depth = 1, closing;
  while ((closing = tags.exec(html)) && (depth += closing[1] ? -1 : 1)) {}
  assert.ok(closing && depth === 0, 'Existing hours block must close');
  return {start: opening.index, end: tags.lastIndex};
}
function projectSchema(html, model, id, now) {
  let restaurants = 0;
  const next = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (tag, attrs, content) => {
    if (attributes(attrs).type !== 'application/ld+json') return tag;
    const value = JSON.parse(content), before = JSON.stringify(value);
    const visit = node => {
      if (Array.isArray(node)) node.forEach(visit);
      else if (node && typeof node === 'object') {
        if ([].concat(node['@type'] ?? []).includes('Restaurant') && node['@id'] === 'https://sin-yolanda.com/' + id + '#restaurant') restaurants++;
        if (node['@graph']) visit(node['@graph']);
      }
    };
    visit(value); model.updateRestaurant(value, id, now);
    return JSON.stringify(value) === before ? tag : `<script${attrs}>${json(value)}</script>`;
  });
  assert.equal(restaurants, 1, 'Expected one matching Restaurant identity');
  return next;
}
function publicRegistry(source, model) {
  assert.equal(source.split('window.SY_DATA =').length, 2, 'Use the existing public data registry');
  const start = source.indexOf('=') + 1, end = source.indexOf('\nif (window.SY_OCTOBER_HOURS)');
  assert.ok(end > start, 'Public registry compatibility boundary changed');
  const value = JSON.parse(source.slice(start, end).trim().replace(/;$/, ''));
  model.applyToData(value);
  return source.slice(0, start) + ' ' + JSON.stringify(value, null, 2) + ';' + source.slice(end);
}
function translationDictionary(source, model) {
  const marker = 'const DICT = {';
  assert.equal(source.split(marker).length, 2, 'Expected the existing translation dictionary');
  const translations = new Map(REVIEWED_USA_BRANCHES.map(id => [model.summaryFor(id, 'es'), model.summaryFor(id, 'en')]));
  const lines = [...translations].map(([es, en]) => '    ' + JSON.stringify(es) + ': ' + JSON.stringify(en) + ',').filter(line => !source.includes(line));
  return lines.length ? source.replace(marker, marker + '\n' + lines.join('\n')) : source;
}

/** Pure overlay over final projected HTML/assets. Copy reviewedHoursAssets separately.
 *  No source refresh or freshness expiry occurs here: reviewed regular data persists.
 *  Only dated opening/closure notices and their schema expire, using local IANA time.
 */
export function projectReviewedHours({pages, read, now = new Date().toISOString(), hoursData = reviewedData} = {}) {
  assert.ok(pages instanceof Map && pages.size, 'Provide projected HTML pages');
  assert.equal(typeof read, 'function', 'Provide a reader for the final artifact');
  assert.ok(Number.isFinite(Date.parse(now)), 'Invalid reviewed hours projection time');
  const model = createGbpHoursModel(hoursData), files = new Map(), changes = [];
  const inventory = new Set();
  for (const source of pages.values()) for (const [, attrs, text] of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (attributes(attrs).type !== 'application/ld+json') continue;
    const document = JSON.parse(text);
    for (const node of document['@graph'] ?? [document]) {
      if ([].concat(node['@type'] ?? []).includes('Restaurant') && node.url) {
        assert.equal(typeof node['@id'], 'string', 'Operating branch requires a stable Restaurant identity');
        inventory.add(node['@id'].split('#')[0]);
      }
    }
  }
  assert.deepEqual([...inventory].sort(), GBP_HOURS_BRANCHES.map(branch => branch.url).sort(),
    'Reconcile operating branch inventory with GBP before adding or retiring a location');
  const current = file => files.get(file) ?? pages.get(file) ?? read(file);
  const save = (file, value, kind) => {if (value !== current(file)) {files.set(file, value); changes.push({file, kind});}};
  const revision = encodeURIComponent(model.data.revision);
  const dataTag = `<script type="application/json" id="sy-reviewed-hours-data">${json(model.data)}</script>`;
  const clientTag = `<script type="module" src="/assets/js/gbp-hours-client.js?v=${revision}"></script>`;
  const profiles = new Map(REVIEWED_USA_BRANCHES.flatMap(id => [[id + '.html', id], ['en/' + id + '/index.html', id]]));
  for (const file of profiles.keys()) assert.ok(pages.has(file), 'Missing reviewed branch edition: ' + file);
  for (const [file, source] of pages) {
    assert.ok(file.endsWith('.html') && typeof source === 'string', 'The page map must contain HTML only');
    let html = source;
    const id = profiles.get(file);
    if (id) {
      const body = html.match(/<body\b([^>]*)>/i);
      assert.equal(body && attributes(body[1])['data-branch'], id, 'Branch page identity differs');
      const range = hoursRange(html);
      html = html.slice(0, range.start) + model.html(id, file.startsWith('en/') ? 'en' : 'es', now) + html.slice(range.end);
      html = projectSchema(html, model, id, now);
    }
    const legacy = /<script\b[^>]*\bsrc=["']\/?assets\/js\/october-hours\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>/gi;
    const legacyCount = [...html.matchAll(legacy)].length;
    assert.ok(legacyCount <= 1, 'Duplicate legacy hours controller');
    if (legacyCount) html = html.replace(legacy, dataTag + clientTag);
    else if (id) {
      assert.ok(html.includes('id="sy-reviewed-hours-data"') && html.includes('/assets/js/gbp-hours-client.js?'), 'Reviewed profile needs the replacement controller');
      html = html.replace(/<script\b[^>]*\bid="sy-reviewed-hours-data"[^>]*>[\s\S]*?<\/script>/, dataTag);
    }
    if (legacyCount || id) {
      assert.equal([...html.matchAll(/\bid="sy-reviewed-hours-data"/g)].length, 1, 'Duplicate reviewed data identity');
      assert.ok(!html.includes('src="/assets/js/october-hours.js') && !html.includes('src="assets/js/october-hours.js'), 'Legacy hours controller must not run alongside reviewed hours');
    }
    html = html.replace(/(src=["'])(\/?assets\/js\/(?:public-data|i18n)\.js)(?:\?[^"']*)?(["'])/g, '$1$2?v=' + revision + '$3');
    save(file, html, id ? 'reviewed-branch-hours' : 'reviewed-hours-controller');
  }
  save('assets/js/public-data.js', publicRegistry(current('assets/js/public-data.js'), model), 'reviewed-public-hours-summary');
  save('assets/js/i18n.js', translationDictionary(current('assets/js/i18n.js'), model), 'reviewed-hours-translations');
  const discovery = JSON.parse(current('discovery.json'));
  for (const id of REVIEWED_USA_BRANCHES) {
    const records = discovery.locations.filter(location => location.id === id);
    assert.equal(records.length, 1, 'Expected one discovery identity per reviewed branch');
    const record = records[0]; record.openingHoursSpecification = model.specification(id);
    const special = model.specialSpecification(id, now);
    if (special.length) record.specialOpeningHoursSpecification = special;
    else delete record.specialOpeningHoursSpecification;
  }
  save('discovery.json', JSON.stringify(discovery, null, 2) + '\n', 'reviewed-discovery-hours');
  return {files, changes, metadata: {version: 1, revision: model.data.revision, observedAt: model.data.observedAt,
    sourceMethod: model.data.source.method, assets: [...reviewedHoursAssets], branchIds: [...REVIEWED_USA_BRANCHES],
    dataDigest: createHash('sha256').update(json(model.data)).digest('hex'), nextTransitionAt: model.nextTransitionAt(now),
    activeSpecialDates: Object.fromEntries(REVIEWED_USA_BRANCHES.map(id => [id, model.specialDates(id, now).map(record => record.date)])),
    regularHoursPersist: true, eventProgrammingChanged: false, eventEditorialExpiryReconciled: false}};
}
