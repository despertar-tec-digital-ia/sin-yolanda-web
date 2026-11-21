import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareHoursProposal} from './site-quality/hours-proposal.mjs';

export function writeHoursProposal({root, snapshotFile, out, now} = {}) {
  const destination = resolve(out), artifacts = resolve(root, '.artifacts') + '/';
  assert.ok(destination.startsWith(artifacts) && !existsSync(destination), 'Write a new proposal under ignored artifacts');
  const report = prepareHoursProposal({snapshot: JSON.parse(readFileSync(snapshotFile, 'utf8')), now});
  writeFileSync(destination, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  return report;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = name => {const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1];};
  const report = writeHoursProposal({root: resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    snapshotFile: process.argv[2], out: arg('--out'), now: arg('--now')});
  console.log(JSON.stringify({status: report.status, observedAt: report.observedAt,
    changedBranches: report.changes.map(change => change.branchId), reviewRequired: true, publicationEnabled: false}));
}
