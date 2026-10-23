// Approval and time projection for the separately reviewed Guadalajara batch.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { elementRange } from './public-agenda.mjs';
import { resolveProgrammingClock } from './programming-clock.mjs';
import { renderGdlAgenda } from './gdl-agenda.mjs';
import { arrangeGdlAgenda, refreshGdlFeature, participationUntil } from './gdl-featured.mjs';

export const gdlApprovalInputs = ['scripts/editorial/front-b-events.json', 'scripts/editorial/gdl-event-review.json',
  'scripts/editorial/gdl-agenda.mjs', 'scripts/editorial/gdl-approved.mjs',
  'scripts/editorial/gdl-review.css', 'scripts/editorial/gdl-review-video.js',
  'scripts/editorial/gdl-featured.mjs', 'scripts/editorial/gdl-contest-config.mjs',
  'scripts/editorial/gdl-contest-page.mjs', 'scripts/editorial/gdl-contest-footer.mjs', 'assets/css/gdl-focus.css', 'assets/css/gdl-contest-page.css',
  'assets/css/gdl-menu.css', 'assets/js/gdl-focus.js', 'assets/js/gdl-menu.js'];
const hash = value => createHash('sha256').update(value).digest('hex');
export function gdlApprovalDigest(root) {
  return hash(JSON.stringify(gdlApprovalInputs.map(file => [file, hash(readFileSync(resolve(root, file)))])));
}
export function loadGdlApproval(root) {
  const file = resolve(root, 'scripts/editorial/approved-gdl-agenda.json');
  if (!existsSync(file)) return null;
  const approval = JSON.parse(readFileSync(file));
  assert.equal(approval.version, 1); assert.equal(approval.approvedBy, 'Luis');
  assert.equal(approval.publicationEnabled, true); resolveProgrammingClock(approval.approvedAt);
  assert.equal(approval.sourceDigest, gdlApprovalDigest(root), 'GDL changed since its approval');
  const previous = JSON.parse(readFileSync(resolve(root, 'scripts/editorial/front-b-events.json')));
  const current = JSON.parse(readFileSync(resolve(root, 'scripts/editorial/gdl-event-review.json')));
  const records = [...previous.records.filter(record => record.branchId === 'san-ignacio'), ...current.records];
  assert.equal(records.length, 4);
  assert.deepEqual(approval.records.map(record => record.id).sort(), records.map(record => record.id).sort());
  const expectedExpiry = {
    'san-ignacio-brujas-20261031': '2026-11-01T09:00:00.000Z',
    'san-ignacio-cumpleanos-202610': '2026-11-01T09:00:00.000Z',
    'san-ignacio-canta-5-2026': '2026-12-03T06:00:00.000Z',
    'san-ignacio-solteras-weekly': null,
  };
  for (const record of approval.records) {
    assert.equal(record.publishFrom, approval.approvedAt);
    assert.equal(record.expiresAt, expectedExpiry[record.id]);
    if (record.expiresAt) assert.ok(Date.parse(record.expiresAt) > Date.parse(record.publishFrom));
  }
  // Publication approves the informational announcement, without fabricating dates or hours.
  const solteras = records.find(record => record.id === 'san-ignacio-solteras-weekly');
  assert.equal(solteras.recurrence.startsOn, null); assert.equal(solteras.recurrence.endsOn, null);
  return { approval, records };
}
export function projectGdlAgenda(root, { now, commit } = {}) {
  const config = loadGdlApproval(root);
  if (!config) return { files: new Map(), metadata: null };
  const evaluatedAt = resolveProgrammingClock(now), instant = Date.parse(evaluatedAt);
  const visible = config.approval.records.filter(record => instant >= Date.parse(record.publishFrom) && (!record.expiresAt || instant < Date.parse(record.expiresAt)));
  const next = config.approval.records.flatMap(record => [record.publishFrom, record.expiresAt].filter(value => value && Date.parse(value) > instant));
  if (Date.parse(participationUntil) > instant) next.push(participationUntil);
  next.sort();
  const file = 'guadalajara.html', source = readFileSync(resolve(root, file), 'utf8');
  const range = elementRange(source, 'section', 'programacion-san-ignacio');
  assert.ok(range, 'Approved Guadalajara agenda missing from source');
  const html = arrangeGdlAgenda(renderGdlAgenda({ records: config.records, visibleIds: visible.map(record => record.id), windows: visible, commit, approvalDigest: config.approval.sourceDigest }));
  let page = source.slice(0, range.start) + html + source.slice(range.end);
  if (!html) page = page.replace(/<a class="hh-nav-agenda"[^>]*>[\s\S]*?<\/a>/, '');
  page = refreshGdlFeature(page,{now:evaluatedAt});
  const files = new Map([[file,page]]);
  const detail = 'guadalajara/canta-por-tu-cuenta-2026/index.html';
  if(existsSync(resolve(root,detail))) files.set(detail,refreshGdlFeature(readFileSync(resolve(root,detail),'utf8'),{now:evaluatedAt}));
  return { files, metadata: { approvalDigest: config.approval.sourceDigest,
    evaluatedAt, visibleIds: visible.map(record => record.id), nextTransitionAt: next[0] ?? null } };
}
