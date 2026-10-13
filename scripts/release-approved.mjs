// One operator entrypoint after explicit authorization. GitHub CLI only; no dashboard,
// Cloudflare/DNS tokens, code execution from downloaded artifacts, or forced merge.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync, readdirSync, lstatSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { target } from './cloudflare-ops.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const exec = promisify(execFile);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function gh(args) {
  try { return (await exec('gh', args, { cwd: root, timeout: 60000, maxBuffer: 5 * 1024 * 1024 })).stdout; }
  catch (error) {
    const failure = new Error('GitHub command failed; no credentials or provider output logged');
    failure.httpStatus = Number(error.stderr?.match(/HTTP (\d{3})/)?.[1]) || null;
    throw failure;
  }
}
export async function readGitHub({ load, delay = sleep }) {
  for (let attempt = 0; ; attempt++) {
    try { return JSON.parse(await load()); }
    catch (error) {
      // Only GET metadata is repeated; an uncertain merge/write is never retried.
      if (attempt >= 2 || error instanceof SyntaxError || [401, 403, 404, 422].includes(error.httpStatus)) throw error;
      await delay([500, 1500][attempt]);
    }
  }
}
const api = path => readGitHub({ load: () => gh(['api', `repos/${target.repository}/${path}`]) });
export function options(args) {
  const result = { publish: false, timeoutSeconds: 1200 };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    assert.ok(['--pr', '--head', '--publish', '--timeout-seconds'].includes(key) && !seen.has(key), 'Unknown or duplicate option');
    seen.add(key);
    if (key === '--publish') { result.publish = true; continue; }
    const value = args[++index];
    assert.ok(value && !value.startsWith('--'), 'Missing option value');
    if (key === '--pr') { assert.match(value, /^[1-9][0-9]*$/); result.pr = Number(value); assert.ok(Number.isSafeInteger(result.pr)); }
    if (key === '--head') { assert.match(value, /^[a-f0-9]{40}$/); result.head = value; }
    if (key === '--timeout-seconds') { assert.match(value, /^\d+$/); result.timeoutSeconds = Number(value); }
  }
  assert.ok(result.pr && result.head, 'Provide the exact PR and reviewed head SHA');
  assert.ok(result.timeoutSeconds >= 30 && result.timeoutSeconds <= 1800, 'Timeout must be 30–1800 seconds');
  return result;
}
export function validatePull(pr, head) {
  assert.equal(pr.head.sha, head, 'PR changed after review; do not publish a different head');
  assert.equal(pr.base.ref, 'main');
  assert.equal(pr.base.repo.full_name, target.repository);
  assert.equal(pr.head.repo.full_name, target.repository, 'External fork is not this publication lane');
  assert.ok(pr.merged === true || pr.state === 'open', 'PR is closed without a merge');
  if (pr.merged) assert.match(pr.merge_commit_sha, /^[a-f0-9]{40}$/);
  return pr;
}
export function validateRequiredChecks(checks) {
  const required = checks.check_runs.filter(check => check.name === 'Public artifact checks' && check.app?.id === 15368);
  assert.ok(required.length, 'Required GitHub Actions check is missing');
  assert.ok(required.every(check => check.status === 'completed' && check.conclusion === 'success'), 'Required CI has not passed; no merge');
}
export async function waitForPullChecks({ pr, head, request = api, delay = sleep, deadline, emit = () => {} }) {
  let last;
  while (Date.now() < deadline) {
    validatePull(await request('pulls/' + pr), head);
    const checks = await request(`commits/${head}/check-runs?per_page=100`);
    const required = checks.check_runs.filter(check => check.name === 'Public artifact checks' && check.app?.id === 15368);
    const state = required.map(check => `${check.id}:${check.status}:${check.conclusion || ''}`).join(',') || 'awaiting-check';
    if (state !== last) { emit({ phase: 'required-pr-ci', status: state }); last = state; }
    if (required.length && required.every(check => check.status === 'completed')) { validateRequiredChecks(checks); return; }
    await delay(10000);
  }
  throw new Error('Timed out waiting for required PR CI; no merge was attempted');
}
export function validateProof(proof, commit) {
  assert.equal(proof.version, 1);
  assert.equal(proof.origin, 'https://' + target.domain);
  assert.equal(proof.commit, commit);
  assert.equal(proof.passed, true, 'Publication is not verified');
  assert.equal(proof.getOnly, true);
  assert.equal(proof.summary.failedChecks, 0);
  assert.equal(proof.summary.hashMismatches, 0);
  assert.ok(proof.summary.files > 0 && proof.summary.excludedRoutes > 0);
  assert.ok(Array.isArray(proof.observations) && proof.observations.length > 0
    && proof.observations.every(item => Array.isArray(item.problems) && !item.problems.length));
  assert.match(proof.publicDigest, /^[a-f0-9]{64}$/);
  for (const key of ['deploymentId', 'previousProductionId']) assert.match(proof[key], /^[a-f0-9-]{36}$/);
  return proof;
}
export async function waitForRun({ workflow, commit, event, request = api, delay = sleep, deadline, emit = () => {} }) {
  let last;
  while (Date.now() < deadline) {
    assert.equal((await request('branches/main')).commit.sha, commit, 'Main advanced; do not claim an older release is current');
    const runs = await request(`actions/workflows/${workflow}/runs?branch=main&event=${event}&per_page=30`);
    const run = runs.workflow_runs.find(run => run.head_sha === commit && run.head_branch === 'main'
      && run.event === event && run.path === '.github/workflows/' + workflow);
    const state = run ? `${run.id}:${run.status}:${run.conclusion || ''}` : 'awaiting-run';
    if (state !== last) { emit({ phase: workflow, status: run?.status || 'awaiting-run', runId: run?.id }); last = state; }
    if (run?.status === 'completed') {
      assert.equal(run.conclusion, 'success', `${workflow} failed (run ${run.id}); inspect before any retry, upload or rollback`);
      return run;
    }
    await delay(10000);
  }
  throw new Error('Timed out waiting for CI/CD; nothing was reuploaded or rolled back. Resume with the same PR/head.');
}
async function main() {
  const input = options(process.argv.slice(2)), deadline = Date.now() + input.timeoutSeconds * 1000;
  let pr = validatePull(await api('pulls/' + input.pr), input.head);
  if (!input.publish) { console.log(JSON.stringify({ mode: 'inspect-only', pr: input.pr, head: input.head, merged: pr.merged, draft: pr.draft })); return; }
  const output = resolve(root, '.artifacts', `approved-release-${input.pr}-${Date.now()}`);
  mkdirSync(output, { recursive: true, mode: 0o700 });
  const receipt = { version: 1, pr: input.pr, reviewedHead: input.head, authorizedPublish: true, passed: false };
  const emit = state => console.log(JSON.stringify(state));
  try {
    if (!pr.merged) {
      await waitForPullChecks({ pr: input.pr, head: input.head, deadline, emit });
      if (pr.draft) await gh(['pr', 'ready', String(input.pr), '--repo', target.repository]);
      validatePull(await api('pulls/' + input.pr), input.head);
      await gh(['pr', 'merge', String(input.pr), '--repo', target.repository, '--merge', '--match-head-commit', input.head]);
      pr = validatePull(await api('pulls/' + input.pr), input.head);
      assert.equal(pr.merged, true, 'Merge was not confirmed');
    }
    const commit = receipt.commit = pr.merge_commit_sha;
    emit({ phase: 'merged', pr: input.pr, commit });
    receipt.qualityRunId = (await waitForRun({ workflow: 'quality.yml', commit, event: 'push', deadline, emit })).id;
    receipt.releaseRunId = (await waitForRun({ workflow: 'pages-release.yml', commit, event: 'workflow_run', deadline, emit })).id;
    const proofDirectory = resolve(output, 'proof');
    await gh(['run', 'download', String(receipt.releaseRunId), '--repo', target.repository,
      '--name', 'production-receipt-' + receipt.releaseRunId, '--dir', proofDirectory]);
    assert.deepEqual(readdirSync(proofDirectory), ['production-proof.json'], 'Unexpected receipt contents');
    const proofPath = resolve(proofDirectory, 'production-proof.json');
    assert.ok(lstatSync(proofPath).isFile() && !lstatSync(proofPath).isSymbolicLink());
    const proof = validateProof(JSON.parse(readFileSync(proofPath, 'utf8')), commit);
    assert.equal((await api('branches/main')).commit.sha, commit, 'Main changed before final confirmation');
    Object.assign(receipt, { passed: true, url: proof.origin, publicDigest: proof.publicDigest,
      deploymentId: proof.deploymentId, previousProductionId: proof.previousProductionId, summary: proof.summary });
    emit({ ...receipt, receipt: resolve(output, 'receipt.json') });
  } finally { writeFileSync(resolve(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(error => { console.error(error.name === 'AssertionError' ? error.message.split('\n')[0] : error.message); process.exitCode = 1; });
