import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {restoreEventMediaSource} from '../scripts/event-media-source-contract.mjs';
import {novemberSource, restoreNovemberSource} from '../scripts/november-source-contract.mjs';
import {config, contentDigest, validateNovember, selectNovember, visibilityWindow, applyNovemberHtml, projectNovemberProgramming} from '../scripts/editorial/november-2026-programming.mjs';
import {projectPublicSite} from '../scripts/editorial/public-site.mjs';
import {elementRange} from '../scripts/editorial/public-agenda.mjs';
const root = resolve(import.meta.dirname, '..'), commit = 'a'.repeat(40), now = '2026-11-11T02:00:00Z';

test('the November allowlist restores the exact preceding bytes while detecting unrelated edits and changed media', () => {
  const hash = value => createHash('sha256').update(value).digest('hex');
  const file = novemberSource.file, source = restoreEventMediaSource(file, readFileSync(resolve(root, file), 'utf8'));
  assert.equal(hash(source), novemberSource.afterSha256);
  const restored = restoreNovemberSource(file, source);
  assert.equal(hash(restored), novemberSource.beforeSha256);
  assert.equal(restoreNovemberSource(file, restored), restored);
  assert.notEqual(hash(restoreNovemberSource(file, source + 'unknown edit')), novemberSource.beforeSha256);
  assert.throws(() => restoreNovemberSource(file, source + novemberSource.patches[0].after), /November source patch/);
  const previous = JSON.parse(restored), current = JSON.parse(source);
  assert.deepEqual(current.pages, previous.pages);
  assert.deepEqual(current.assets.filter(file => !previous.assets.includes(file)).sort(), Object.keys(novemberSource.assets).sort());
  for (const [asset, expected] of Object.entries(novemberSource.assets)) assert.equal(hash(readFileSync(resolve(root, asset))), expected, asset);
});

test('the November intake has its own explicit approval and cannot publish a disabled draft or edited content', () => {
  assert.equal(config.publicationEnabled, true);
  assert.equal(config.approvedBy, 'Luis');
  assert.equal(config.approvedContentDigest, contentDigest(config));
  assert.deepEqual(projectNovemberProgramming(root, new Map(), '2026-11-05T12:00:00Z'), {metadata: null});
  const draft = {...config, publicationEnabled: false};
  assert.deepEqual(projectNovemberProgramming(root, new Map(), now, {data: draft}), {metadata: null});
  const edited = structuredClone(config); edited.records[0].date = '2026-11-26';
  assert.throws(() => projectNovemberProgramming(root, new Map(), now, {data: edited}), /changed after approval/);
  assert.equal(validateNovember().records.length, 23);
  assert.equal(new Set(config.records.map(r => r.id)).size, 23);
});
test('the previous release remains available as a baseline without the November projection', () => {
  const files = projectPublicSite(root, {now, commit, november:false}).files;
  for (const html of files.values()) assert.ok(!html.includes('sa-exs-night-20261113-DflCmDVhNcn.jpg'));
});
test('the new post overrides the calendar: Ex’s Night is Nov 13, not Nov 14 or Jungle Fever', () => {
  const ex = config.records.find(r => r.id.includes('exs-night'));
  assert.equal(ex.branchId, 'san-antonio'); assert.equal(ex.date, '2026-11-13');
  assert.equal(ex.postUrl, 'https://www.instagram.com/p/DflCmDVhNcn/');
  assert.deepEqual([ex.artwork.width, ex.artwork.height], [1136, 1408]);
  assert.ok(!config.records.some(r => r.id.includes('jungle')));
});
test('expiry uses each branch timezone and preserves known late-night opening', () => {
  const ex = config.records.find(r => r.id.includes('exs-night'));
  assert.equal(visibilityWindow(ex).expiresAt, '2026-11-14T08:00:00.000Z');
  const ep = config.records.find(r => r.id === 'el-paso-black-friday-20261127');
  assert.equal(visibilityWindow(ep).expiresAt, '2026-11-28T09:00:00.000Z');
  assert.ok(selectNovember([ex], '2026-11-14T07:59:59Z').visible.length);
  assert.equal(selectNovember([ex], '2026-11-14T08:00:00Z').visible.length, 0);
});
test('the monthly El Paso package retires in Denver time at the end of November', () => {
  const offer = config.records.find(r => r.kind === 'dated-promotion');
  assert.equal(visibilityWindow(offer).expiresAt, '2026-12-01T07:00:00.000Z');
  assert.equal(selectNovember([offer], '2026-12-01T06:59:59Z').visible.length, 1);
  assert.equal(selectNovember([offer], '2026-12-01T07:00:00Z').visible.length, 0);
});
test('upcoming registered events include December and do not require a seven-day window', () => {
  assert.ok(selectNovember(config.records, now).visible.some(r => r.date === '2026-12-03'));
  const future = {...config.records[0], publishFrom: '2026-11-12T06:00:00Z'};
  assert.equal(selectNovember([future], '2026-11-12T05:59:59Z').visible.length, 0);
  assert.equal(selectNovember([future], '2026-11-12T06:00:00Z').visible.length, 1);
});
test('ES/EN preserve branch shells, existing external venues and approved performances without duplication', () => {
  const files = projectPublicSite(root, {now, commit, november:false}).files;
  projectNovemberProgramming(root, files, now, {review: true});
  for (const lang of ['es', 'en']) for (const id of ['houston', 'san-antonio', 'the-woodlands', 'el-paso']) {
    const file = lang === 'es' ? id + '.html' : 'en/' + id + '/index.html';
    const baseline = projectPublicSite(root, {now, commit, november:false}).files.get(file), result = files.get(file);
    const ids = [...result.matchAll(/data-record="([^"]+)"/g)].map(m => m[1]);
    assert.equal(ids.length, new Set(ids).size, 'Duplicate event in ' + file);
    assert.match(result, /agenda-visibility\.js/);
    assert.doesNotMatch(result, /src="\/assets\/js\/agenda-clock\.js/);
    const strip = html => {const range = elementRange(html, 'section', 'programacion-' + id); return html.slice(0, range.start) + html.slice(range.end);};
    const baselineClock = /src="(\/assets\/js\/agenda-clock\.js[^"]*)"/.exec(baseline)[1];
    assert.equal(strip(result).replace(/<link rel="stylesheet" href="\/assets\/css\/november-agenda\.css[^>]*>/, '').replace('/assets/js/agenda-visibility.js?v=20261110-november-agenda', baselineClock), strip(baseline));
    if (id === 'san-antonio') {assert.match(result, /K\.O\.P\. Sports/); assert.match(result, /san-antonio-jorge-20261114/); assert.match(result, /san-antonio-exs-night-20261113/);}
    if (id === 'the-woodlands') assert.match(result, /Instalación privada de aviación|Private aviation facility/);
  }
});
test('series group repeated contest dates, expired cards disappear, and El Paso promos do not leak to other branches', () => {
  const baseline = projectPublicSite(root, {now, commit, november:false}).files;
  const houston = applyNovemberHtml(baseline.get('houston.html'), 'houston', 'es', now).html;
  assert.equal((houston.match(/data-agenda-series/g) || []).length, 1);
  assert.doesNotMatch(houston, /el-paso-friendsgiving-paquetes/);
  const after = projectPublicSite(root, {now:'2026-12-04T06:00:00Z',commit}).files;
  projectNovemberProgramming(root, after, '2026-12-04T06:00:00Z', {review:true});
  for (const [file, html] of after) if (/^(?:en\/)?(?:houston|san-antonio|the-woodlands|el-paso)/.test(file)) assert.doesNotMatch(html, /sy-november-event|sy-november-series/);
});
test('an already-open page reveals a scheduled card and hides it at expiry without losing the future DOM node', () => {
  const record = {dataset:{publishFrom:'2026-11-12T06:00:00Z',expiresAt:'2026-11-13T06:00:00Z'},hidden:false};
  const group = {hidden:false,querySelectorAll:() => [record]};
  const agenda = {querySelectorAll:selector => selector === '[data-record]' ? [record] : selector.includes('data-agenda-group') ? [group] : []};
  let clock = Date.parse('2026-11-12T05:59:59Z'), callback;
  const context = {document:{querySelectorAll:() => [agenda],addEventListener(){}},window:{addEventListener(){}},Date:{now:()=>clock,parse:Date.parse},setTimeout:fn => {callback=fn;return 1;},clearTimeout(){}};
  vm.runInNewContext(readFileSync(resolve(root, 'assets/js/agenda-visibility.js'), 'utf8'), context);
  assert.equal(record.hidden, true); assert.equal(group.hidden, true);
  clock = Date.parse('2026-11-12T06:00:00Z'); callback();
  assert.equal(record.hidden, false); assert.equal(group.hidden, false);
  clock = Date.parse('2026-11-13T06:00:00Z'); callback();
  assert.equal(record.hidden, true); assert.equal(group.hidden, true);
});
