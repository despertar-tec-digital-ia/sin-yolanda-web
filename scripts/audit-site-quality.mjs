// Offline observation of a packaged site, using the existing release allowlist/hash validation.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadReviewPackage} from './serve-review.mjs';
import {inspectProjectedSeo} from './site-quality/seo-projection.mjs';
import {compareGbpHours} from './site-quality/gbp-hours.mjs';
import {inspectReviewAttribution} from './site-quality/attribution.mjs';
import {inspectCommercialData} from './site-quality/commercial-data.mjs';

export function auditSiteQuality({artifact, hoursSnapshot, now = new Date().toISOString()} = {}) {
  const {root, files, metadata} = loadReviewPackage(artifact);
  const read = file => {
    assert.ok(files.includes(file), 'Read only files in the validated artifact');
    return readFileSync(resolve(root, file), 'utf8');
  };
  const pages = new Map(files.filter(file => file.endsWith('.html')).map(file => [file, read(file)]));
  const seo = inspectProjectedSeo({pages, read, publicFiles: new Set(files), reviewFiles: metadata.reviewPages ?? []});
  const hours = hoursSnapshot ? compareGbpHours({snapshot: hoursSnapshot, pages,
    discovery: JSON.parse(read('discovery.json')), now}) : null;
  return {version: 1, observedAt: now, artifactCommit: metadata.commit,
    artifactDirty: metadata.dirty, audience: metadata.audience, fileCount: files.length,
    indexationVerified: false, seo, hours,
    commercial: metadata.qualityReview?.commercial ? inspectCommercialData({pages, read}) : {applicable: false, passed: true},
    attribution: inspectReviewAttribution({read, pages, metadata: metadata.qualityReview?.attribution}), publicationEnabled: false};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
  const snapshot = arg('--hours');
  const report = auditSiteQuality({artifact: process.argv[2],
    hoursSnapshot: snapshot ? JSON.parse(readFileSync(resolve(snapshot), 'utf8')) : undefined,
    now: arg('--now')});
  const output = arg('--out');
  if (output) {
    const path = resolve(output), artifacts = resolve(import.meta.dirname, '../.artifacts') + '/';
    assert.ok(path.startsWith(artifacts) && !existsSync(path), 'Write a new report under ignored artifacts');
    writeFileSync(path, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify(report));
  // Observation is useful with documented existing debt; enforcement is explicit and testable.
  if (process.argv.includes('--fail-on-findings') && (!report.seo.passed || !report.attribution.passed || !report.commercial.passed || (report.hours && !report.hours.ok))) process.exitCode = 1;
}
