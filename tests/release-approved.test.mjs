import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { options, validatePull, validateRequiredChecks, validateProof, waitForRun, waitForPullChecks } from '../scripts/release-approved.mjs';
import { target } from '../scripts/cloudflare-ops.mjs';
const head = 'a'.repeat(40), commit = 'b'.repeat(40);
const pull = () => ({ head: { sha: head, repo: { full_name: target.repository } },
  base: { ref: 'main', repo: { full_name: target.repository } }, state: 'open', merged: false });
const checks = (status = 'completed', conclusion = 'success') => ({ check_runs: [
  { id: 100, name: 'Public artifact checks', app: { id: 15368 }, status, conclusion },
] });
const proof = () => ({ version: 1, origin: 'https://' + target.domain, commit, passed: true, getOnly: true,
  summary: { files: 215, aliases: 47, excludedRoutes: 10, failedChecks: 0, hashMismatches: 0 },
  observations: [{ problems: [] }], publicDigest: 'c'.repeat(64),
  deploymentId: '36ac4319-b165-4294-b808-7dd3efbcd784', previousProductionId: '3bbc0983-7c3f-42b7-8c6b-d569bee23767' });
test('default is inspect-only; mutation requires exact PR/head and explicit publish flag', () => {
  assert.equal(options(['--pr', '30', '--head', head]).publish, false);
  assert.equal(options(['--pr', '30', '--head', head, '--publish']).publish, true);
  for (const args of [[], ['--pr', '30'], ['--pr', '30', '--head', 'main'],
    ['--pr', '30', '--head', head, '--publish', '--publish'], ['--pr', '30', '--head', head, '--force'],
    ['--pr', '30', '--head', head, '--timeout-seconds', '999999']]) assert.throws(() => options(args));
});
test('PR validation rejects changes since review, wrong repo/base, forks and unmerged closed PR', () => {
  assert.doesNotThrow(() => validatePull(pull(), head));
  for (const change of [p => p.head.sha = commit, p => p.base.ref = 'other', p => p.base.repo.full_name = 'other/repo',
    p => p.head.repo.full_name = 'someone/fork', p => p.state = 'closed']) {
    const p = pull(); change(p); assert.throws(() => validatePull(p, head));
  }
});
test('resume of already merged PR is idempotent and keeps its actual merge SHA', () => {
  const p = { ...pull(), state: 'closed', merged: true, merge_commit_sha: commit };
  assert.equal(validatePull(p, head).merge_commit_sha, commit);
});
test('required CI is not replaced by local results, a spoofed check or a failed check', () => {
  validateRequiredChecks(checks());
  assert.throws(() => validateRequiredChecks(checks('in_progress', null)));
  assert.throws(() => validateRequiredChecks(checks('completed', 'failure')));
  const spoof = checks(); spoof.check_runs[0].app.id = 999;
  assert.throws(() => validateRequiredChecks(spoof));
});
test('pending PR CI waits automatically; changed head or failed CI stops without merge', async () => {
  let calls = 0, pauses = 0;
  const request = async path => path.startsWith('pulls/') ? pull() : (++calls === 1 ? checks('in_progress', null) : checks());
  await waitForPullChecks({ pr: 30, head, request, delay: async () => pauses++, deadline: Date.now() + 1000 });
  assert.equal(pauses, 1);
  await assert.rejects(waitForPullChecks({ pr: 30, head, request: async path => path.startsWith('pulls/')
    ? { ...pull(), head: { sha: commit } } : checks(), deadline: Date.now() + 1000 }));
  await assert.rejects(waitForPullChecks({ pr: 30, head, request: async path => path.startsWith('pulls/')
    ? pull() : checks('completed', 'failure'), deadline: Date.now() + 1000 }));
});
test('only the correct main push workflow run is followed, with a bounded wait', async () => {
  let calls = 0, pauses = 0;
  const run = status => ({ id: 42, head_sha: commit, head_branch: 'main', event: 'push',
    path: '.github/workflows/quality.yml', status, conclusion: status === 'completed' ? 'success' : null });
  const request = async path => path === 'branches/main' ? { commit: { sha: commit } }
    : { workflow_runs: [run(++calls === 1 ? 'in_progress' : 'completed')] };
  const result = await waitForRun({ workflow: 'quality.yml', commit, event: 'push', request,
    delay: async () => pauses++, deadline: Date.now() + 1000 });
  assert.equal(result.id, 42); assert.equal(pauses, 1);
  await assert.rejects(waitForRun({ workflow: 'quality.yml', commit, event: 'push', request, deadline: Date.now() - 1 }), /Timed out/);
});
test('advanced main or failed CD cannot become success or trigger another upload', async () => {
  await assert.rejects(waitForRun({ workflow: 'quality.yml', commit, event: 'push',
    request: async () => ({ commit: { sha: head } }), deadline: Date.now() + 1000 }), /Main advanced/);
  const request = async path => path === 'branches/main' ? { commit: { sha: commit } } : { workflow_runs: [
    { id: 55, head_sha: commit, head_branch: 'main', event: 'workflow_run', path: '.github/workflows/pages-release.yml', status: 'completed', conclusion: 'failure' },
  ] };
  await assert.rejects(waitForRun({ workflow: 'pages-release.yml', commit, event: 'workflow_run', request,
    deadline: Date.now() + 1000 }), /failed/);
});
test('receipt must certify this exact official release with no failed checks', () => {
  validateProof(proof(), commit);
  for (const change of [p => p.commit = head, p => p.passed = false, p => p.origin = 'https://other.example',
    p => p.summary.hashMismatches = 1, p => p.summary.failedChecks = 1, p => p.observations[0].problems.push('hash-mismatch')]) {
    const p = proof(); change(p); assert.throws(() => validateProof(p, commit));
  }
});
test('entrypoint uses protected merge and CI evidence, not dashboard, tokens, rebuilds or bypass', () => {
  const source = readFileSync(new URL('../scripts/release-approved.mjs', import.meta.url), 'utf8');
  assert.ok(source.includes("'--match-head-commit', input.head"));
  assert.ok(source.includes("'production-receipt-' + receipt.releaseRunId"));
  assert.doesNotMatch(source, /'--admin'|'--force'|CLOUDFLARE_API_TOKEN|doppler|wrangler|npm ci|npm run check/);
});
