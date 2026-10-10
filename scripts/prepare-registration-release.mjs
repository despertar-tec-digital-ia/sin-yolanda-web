// Local preparation only. This helper never uploads, commits or creates an approval.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectPublic, packagePublic, projectRoot, publicSourceDigest } from './package-public.mjs';
import { assertRegistrationRedirectPatch } from './qr-redirects.mjs';

export const registrationBaselineDeployment = '32633a4f-b3ff-4d9c-9e78-8471d7773a66';
const sha256 = value => createHash('sha256').update(value).digest('hex');

function artifactFiles(directory) {
  assert.ok(lstatSync(directory).isDirectory() && !lstatSync(directory).isSymbolicLink(), 'Baseline must be a regular directory');
  const files = [];
  function visit(path) {
    for (const entry of readdirSync(path)) {
      const item = join(path, entry), stat = lstatSync(item);
      assert.ok(!stat.isSymbolicLink(), 'Baseline cannot contain symlinks');
      if (stat.isDirectory()) visit(item);
      else { assert.ok(stat.isFile(), 'Baseline contains a nonregular file'); files.push(relative(directory, item)); }
    }
  }
  visit(directory);
  return files.sort();
}

export function prepareRegistrationRelease({ root = projectRoot, baseline, destination, approval } = {}) {
  assert.ok(baseline && destination, 'Provide baseline release directory and fresh output directory');
  root = resolve(root);
  const source = resolve(baseline), out = resolve(destination), publicOut = join(out, 'public');
  const artifactRoot = resolve(root, '.artifacts');
  assert.ok(out.startsWith(artifactRoot + sep), 'Output must be a fresh directory inside repository .artifacts');
  let parent = root;
  for (const segment of relative(root, dirname(out)).split(sep)) {
    parent = join(parent, segment);
    if (existsSync(parent)) assert.ok(lstatSync(parent).isDirectory() && !lstatSync(parent).isSymbolicLink(),
      'Output parent must be a regular directory');
  }
  assert.ok(!existsSync(out), 'Refuse to overwrite an existing output directory');
  assert.ok(lstatSync(source).isDirectory() && !lstatSync(source).isSymbolicLink(), 'Baseline release must be a regular directory');
  const baselineReportPath = join(source, 'release.json');
  assert.ok(lstatSync(baselineReportPath).isFile() && !lstatSync(baselineReportPath).isSymbolicLink(), 'Baseline receipt must be a regular JSON file');
  const baselineReport = JSON.parse(readFileSync(baselineReportPath, 'utf8'));
  assert.equal(baselineReport.version, 1, 'Unsupported baseline receipt');
  assert.equal(baselineReport.dirty, false, 'Baseline must be a clean release');
  assert.equal(baselineReport.audience, 'limited-production', 'Use the previously authorized limited production baseline');
  assert.match(baselineReport.commit ?? '', /^[a-f0-9]{40}$/, 'Baseline needs a full commit SHA');
  const { files, manifest } = inspectPublic(root);
  assert.deepEqual(Object.keys(baselineReport.hashes ?? {}).sort(), files, 'Source manifest must preserve the complete baseline');
  assert.equal(baselineReport.fileCount, files.length, 'Baseline file count differs');
  const baselinePublic = join(source, 'public');
  assert.deepEqual(artifactFiles(baselinePublic), files, 'Baseline public directory has missing or unlisted files');
  const baselineHashes = Object.fromEntries(files.map(path => [path, sha256(readFileSync(join(baselinePublic, path)))]));
  assert.deepEqual(baselineHashes, baselineReport.hashes, 'Baseline bytes differ from recorded hashes');
  assert.equal(publicSourceDigest(baselineHashes), baselineReport.publicDigest, 'Baseline digest differs');
  const hashes = Object.fromEntries(files.map(path => [path, sha256(readFileSync(join(root, path)))]));
  const patch = assertRegistrationRedirectPatch({ baselineHashes, candidateHashes: hashes,
    baselineRedirects: readFileSync(join(baselinePublic, '_redirects'), 'utf8'),
    candidateRedirects: readFileSync(join(root, '_redirects'), 'utf8') });

  let report;
  if (approval !== undefined) {
    // The existing release gate checks real clean HEAD, human approval and exact digest.
    // A baseline approval is never inherited by the new candidate.
    report = packagePublic({ root, destination: publicOut, metadata: join(out, 'release.json'),
      audience: 'limited-production', approval });
  } else {
    let commit = null, dirty = true;
    try {
      commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      dirty = Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
    } catch {}
    // Copy the full baseline, substituting only the checked redirect control file.
    mkdirSync(publicOut, { recursive: true });
    for (const path of files) {
      mkdirSync(dirname(join(publicOut, path)), { recursive: true });
      copyFileSync(join(path === '_redirects' ? root : baselinePublic, path), join(publicOut, path));
    }
    report = { version: 1, commit, dirty, audience: 'local-candidate', releaseApproved: false,
      fileCount: files.length, reviewPages: manifest.reviewPages ?? [], hashes, publicDigest: publicSourceDigest(hashes) };
    writeFileSync(join(out, 'candidate.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  }
  // Verify the actual copied bytes, not only the intended source hashes.
  const outputHashes = Object.fromEntries(files.map(path => [path, sha256(readFileSync(join(publicOut, path)))]));
  assert.deepEqual(artifactFiles(publicOut), files, 'Output public directory contains unexpected files');
  assert.deepEqual(outputHashes, report.hashes, 'Output bytes differ from the checked candidate');
  const receipt = { version: 1, preparedAt: new Date().toISOString(), baselineDeployment: registrationBaselineDeployment,
    baselineCommit: baselineReport.commit, baselinePublicDigest: baselineReport.publicDigest,
    publicDigest: report.publicDigest, changedFiles: patch.changedFiles, preservedFileCount: patch.preservedFileCount,
    rules: patch.rules, releaseApproved: approval !== undefined, remoteBaselineRevalidationRequired: true,
    ghlCaptureVerifiedByThisHelper: false, deployed: false };
  writeFileSync(join(out, 'registration-patch.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return { ...receipt, publicDirectory: publicOut };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 2 || (args.length === 4 && args[2] === '--approval'),
    'Usage: node scripts/prepare-registration-release.mjs BASELINE_RELEASE NEW_OUTPUT [--approval HUMAN_APPROVAL_JSON]');
  const result = prepareRegistrationRelease({ baseline: args[0], destination: args[1], approval: args[3] });
  console.log(JSON.stringify(result));
}
