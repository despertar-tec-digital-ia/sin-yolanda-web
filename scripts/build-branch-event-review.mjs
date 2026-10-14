// Compose the sourced agenda into the current branch pages, in a fresh local artifact only.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, lstatSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { packagePublic } from './package-public.mjs';
import { integrateAgenda, renderBranchAgenda, escapeHtml } from './editorial/branch-agenda.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
assert.equal(process.argv[2], '--asset-root', 'Supply the explicit private artwork directory.');
const assetRoot = resolve(process.argv[3]);
const output = resolve(root, process.argv[4] || '.artifacts/branch-event-context/public');
assert.ok(output.startsWith(resolve(root, '.artifacts') + '/'), 'Only ignored review artifacts may be written');
const data = JSON.parse(readFileSync(resolve(root, 'scripts/editorial/front-b-review.json')));
const registry = JSON.parse(readFileSync(resolve(root, 'scripts/editorial/front-b-sources.json')));
assert.equal(data.publicationEnabled, false); assert.equal(data.schedulerEnabled, false);
const report = packagePublic({ root, destination: output, audience: 'review' });
const files = new Set(Object.keys(report.hashes));
mkdirSync(resolve(output, 'assets/review-agenda'), { recursive: true });
const cssFile = 'assets/review-agenda/branch-agenda.css';
copyFileSync(resolve(root, 'scripts/editorial/branch-agenda.css'), resolve(output, cssFile)); files.add(cssFile);
const reconciliation = { version: 1, asOf: data.observedOn, baseCommit: report.commit, sourceDigest: report.publicDigest, publicationEnabled: false, schedulerEnabled: false, branches: {}, changedBaseFiles: [] };
for (const [id, branch] of Object.entries(data.branches)) {
  const projection = renderBranchAgenda({ id, branch, registry, language: 'es', asOf: data.observedOn });
  reconciliation.branches[id] = { shown: projection.visible.map(unit => unit.id), held: projection.held, withheldArt: projection.withheldArt };
  for (const unit of projection.visible) {
    if (!unit.artwork) continue;
    const artwork = unit.artwork, source = resolve(assetRoot, artwork.file), destination = 'assets/review-agenda/' + artwork.file;
    assert.equal(dirname(source), assetRoot); assert.ok(lstatSync(source).isFile() && !lstatSync(source).isSymbolicLink());
    assert.equal(createHash('sha256').update(readFileSync(source)).digest('hex'), artwork.sha256, 'Verified artwork required');
    if (!files.has(destination)) { copyFileSync(source, resolve(output, destination)); files.add(destination); }
  }
  for (const language of ['es', 'en']) {
    const file = language === 'es' ? id + '.html' : 'en/' + id + '/index.html';
    assert.ok(files.has(file));
    const source = readFileSync(resolve(output, file), 'utf8');
    const { html } = renderBranchAgenda({ id, branch, registry, language, asOf: data.observedOn });
    let composed = integrateAgenda(source, id, html, language);
    composed = composed.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex,nofollow">');
    const links = Object.entries(data.branches).map(([other, info]) => `<a href="${language === 'en' ? '/en/' + other + '/' : '/' + other}#programacion-${other}"${other === id ? ' aria-current="page"' : ''}>${escapeHtml(info.name)}</a>`).join('');
    composed = composed.replace('</body>', `<details class="sy-review-controls"><summary>${language === 'en' ? 'Local review · not published' : 'Revisión local · sin publicar'}</summary><nav aria-label="${language === 'en' ? 'Review branches' : 'Revisar sucursales'}">${links}</nav><p>${data.observedOn}</p></details></body>`);
    writeFileSync(resolve(output, file), composed); reconciliation.changedBaseFiles.push(file);
  }
}
// Keep the local home teaser consistent with the reread calendars, without broadening the hero change.
const home = resolve(output, 'index.html'); let source = readFileSync(home, 'utf8');
const campaignPattern = /<article class="home-campaign" data-campaign="catrinas-2026">[\s\S]*?<\/article>/;
const campaign = source.match(campaignPattern); assert.ok(campaign, 'Expected one existing Catrinas teaser');
const intake = JSON.parse(readFileSync(resolve(root, 'scripts/editorial/front-b-events.json')));
const catrinasDates = new Map();
let corrected = campaign[0];
for (const id of ['houston', 'san-antonio', 'the-woodlands']) {
  const records = intake.records.filter(record => record.branchId === id && record.id.includes('-catrinas-'));
  assert.equal(records.length, 1); const date = records[0].date; catrinasDates.set(id, date);
  const part = new RegExp('(<a href="' + id + '" data-agenda-branch="' + id + '"><span>[^<]+</span>)<time datetime="[^"]+">[^<]+<span>[^<]+</span></time>');
  assert.ok(part.test(corrected)); corrected = corrected.replace(part, '$1<time datetime="' + date + '">' + Number(date.slice(8)) + ' <span>' + (date.slice(5, 7) === '10' ? 'oct' : 'nov') + '</span></time>');
}
const orderedDates = [...catrinasDates.values()].sort();
const compactDate = date => `<time datetime="${date}">${Number(date.slice(8))} <span>${date.slice(5, 7) === '10' ? 'oct' : 'nov'}</span></time>`;
corrected = corrected.replace(/<div class="campaign-dates">[\s\S]*?<\/div>/, '<div class="campaign-dates">' + compactDate(orderedDates[0]) + '<span aria-hidden="true">—</span>' + compactDate(orderedDates.at(-1)) + '</div>');
writeFileSync(home, source.replace(campaignPattern, corrected)); reconciliation.changedBaseFiles.push('index.html');
// The home regenerates from SY_DATA on language changes. Reconcile that exact campaign too.
const publicDataFile = 'assets/js/public-data.js', publicDataSource = readFileSync(resolve(output, publicDataFile), 'utf8');
const prefix = 'window.SY_DATA = '; assert.ok(publicDataSource.startsWith(prefix));
const publicData = JSON.parse(publicDataSource.slice(prefix.length).trim().replace(/;$/, ''));
const campaignData = publicData.events.filter(event => event.id === 'catrinas-2026'); assert.equal(campaignData.length, 1);
for (const occurrence of campaignData[0].occurrences) { assert.ok(catrinasDates.has(occurrence.branchId)); occurrence.date = catrinasDates.get(occurrence.branchId); }
writeFileSync(resolve(output, publicDataFile), prefix + JSON.stringify(publicData, null, 2) + ';\n'); reconciliation.changedBaseFiles.push(publicDataFile);
const hashes = Object.fromEntries([...files].sort().map(file => [file, createHash('sha256').update(readFileSync(resolve(output, file))).digest('hex')]));
writeFileSync(resolve(dirname(output), 'release.json'), JSON.stringify({ ...report, audience: 'local-branch-agenda-review', fileCount: files.size, hashes, publicationEnabled: false, schedulerEnabled: false }, null, 2) + '\n');
writeFileSync(resolve(dirname(output), 'reconciliation.json'), JSON.stringify(reconciliation, null, 2) + '\n');
console.log(JSON.stringify({ output, fileCount: files.size, changedBaseFiles: reconciliation.changedBaseFiles, shown: Object.values(reconciliation.branches).reduce((n, branch) => n + branch.shown.length, 0), held: Object.values(reconciliation.branches).reduce((n, branch) => n + branch.held.length, 0), publicationEnabled: false }));
