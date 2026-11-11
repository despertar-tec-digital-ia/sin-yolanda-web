import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, copyFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packagePublic} from './package-public.mjs';
import {projectNovemberProgramming, config} from './editorial/november-2026-programming.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export function buildNovemberReview(destination, {now = new Date().toISOString()} = {}) {
  const output = resolve(destination);
  assert.ok(output.startsWith(resolve(root, '.artifacts') + '/'), 'Local review only');
  assert.equal(config.publicationEnabled, false, 'Review builder cannot replace an approved release');
  const report = packagePublic({root, destination: output, audience: 'review', now});
  const files = new Map(Object.keys(report.hashes).filter(file => file.endsWith('.html')).map(file => [file, readFileSync(resolve(output, file), 'utf8')]));
  const projection = projectNovemberProgramming(root, files, now, {review: true});
  const changed = [];
  for (const [file, content] of files) {
    if (content !== readFileSync(resolve(output, file), 'utf8')) {writeFileSync(resolve(output, file), content); changed.push(file);}
  }
  const newAssets = ['assets/js/agenda-visibility.js', 'assets/css/november-agenda.css', ...config.records.filter(r => r.artwork).map(r => r.artwork.file)];
  for (const file of newAssets) {mkdirSync(dirname(resolve(output, file)), {recursive: true}); copyFileSync(resolve(root, file), resolve(output, file));}
  const hash = value => createHash('sha256').update(value).digest('hex');
  const hashes = Object.fromEntries([...new Set([...Object.keys(report.hashes), ...newAssets])].sort().map(file => [file, hash(readFileSync(resolve(output, file)))]));
  const reviewReport = {...report, audience: 'local-november-event-review', publicationEnabled: false, fileCount: Object.keys(hashes).length, hashes, publicDigest: hash(JSON.stringify(hashes)), november: projection.metadata, changedBaseFiles: changed};
  writeFileSync(resolve(dirname(output), 'release.json'), JSON.stringify(reviewReport, null, 2) + '\n');
  return {output, changedBaseFiles: changed, shown: projection.metadata.visibleIds.length, publicationEnabled: false};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(buildNovemberReview(process.argv[2], {now: process.argv[3]})));
