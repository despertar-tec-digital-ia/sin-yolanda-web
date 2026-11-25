// Local review uses the exact final projection shared by the normal build and scheduler.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packagePublic} from './package-public.mjs';
import {projectPublicRelease} from './editorial/public-release.mjs';
import {hoursDataForReview} from './site-quality/hours-proposal.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
export function buildSiteQualityReview({root, out, now = new Date().toISOString(), hoursProposal} = {}) {
  root = resolve(root); out = resolve(out);
  assert.ok(out.startsWith(resolve(root, '.artifacts') + '/'), 'Review must stay in ignored local artifacts');
  assert.ok(!existsSync(out), 'Use a fresh review directory');
  const hoursData = hoursProposal ? hoursDataForReview(hoursProposal, {now}) : undefined;
  const publicRoot = resolve(out, 'public');
  const baseline = packagePublic({root, destination: publicRoot, metadata: resolve(out, 'baseline-release.json'), audience: 'review', quality: false, now});
  const projection = projectPublicRelease(root, {now, commit: baseline.commit, hoursData});
  assert.ok(projection.quality, 'The normal build must include the incremental projection');
  for (const [file, text] of projection.files) {
    assert.ok(Object.hasOwn(baseline.hashes, file), 'Projection must stay inside the public manifest');
    writeFileSync(resolve(publicRoot, file), text);
  }
  const hashes = Object.fromEntries(Object.keys(baseline.hashes).map(file => [file, hash(readFileSync(resolve(publicRoot, file)))]));
  const report = {...baseline, hashes, publicDigest: hash(JSON.stringify(hashes)), agenda: projection.metadata,
    publicationEnabled: false, productionIntegrated: false, qualityBuildIntegrated: true,
    qualityReview: {...projection.quality, base: baseline.commit, hoursProposalUsed: !!hoursProposal}};
  writeFileSync(resolve(out, 'release.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = name => {const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1];};
  const proposal = arg('--hours-proposal');
  const report = buildSiteQualityReview({root: resolve(import.meta.dirname, '..'), out: process.argv[2],
    now: arg('--at') ?? (process.argv[3]?.startsWith('--') ? undefined : process.argv[3]),
    hoursProposal: proposal ? JSON.parse(readFileSync(resolve(proposal), 'utf8')) : undefined});
  console.log(JSON.stringify({audience: report.audience, fileCount: report.fileCount, publicationEnabled: false, pilotPages: report.qualityReview.pilotPages, seo: report.qualityReview.seo}));
}
