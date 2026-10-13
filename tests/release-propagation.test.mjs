import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyWithPropagation } from '../scripts/release-propagation.mjs';
const fixture = problems => ({ passed: !problems.length, summary: { failedChecks: problems.length }, observations: [{ problems }] });
test('ready release uses one strict verification and no delay', async () => {
  let calls = 0, states = 0;
  const report = await verifyWithPropagation({ verify: async () => { calls++; return fixture([]); },
    assertCurrent: async () => states++, sleep: async () => assert.fail('No wait needed') });
  assert.equal(report.passed, true); assert.equal(calls, 1); assert.equal(states, 2);
});
test('partial cached deployment is retried without accepting old bytes or uploading again', async () => {
  const queue = [fixture(['hash-mismatch']), fixture(['release-file-not-200']), fixture([])], pauses = [];
  const report = await verifyWithPropagation({ verify: async () => queue.shift(), assertCurrent: async () => {},
    sleep: async ms => pauses.push(ms) });
  assert.deepEqual(pauses, [5000, 10000]); assert.equal(report.passed, true);
  assert.deepEqual(report.propagation.attempts.map(item => item.passed), [false, false, true]);
});
test('persistent mismatch exhausts the bounded attempts and remains failed', async () => {
  let calls = 0;
  const report = await verifyWithPropagation({ verify: async () => { calls++; return fixture(['hash-mismatch']); },
    assertCurrent: async () => {}, sleep: async () => {} });
  assert.equal(calls, 4); assert.equal(report.passed, false);
});
for (const problem of ['excluded-route-not-404', 'home-is-noindex', 'redirect-outside-file-aliases', 'html-content-type-mismatch'])
  test('real contract failure stops immediately: ' + problem, async () => {
    let calls = 0;
    const report = await verifyWithPropagation({ verify: async () => { calls++; return fixture([problem]); },
      assertCurrent: async () => {}, sleep: async () => assert.fail('Not a propagation wait') });
    assert.equal(report.passed, false); assert.equal(calls, 1);
  });
test('concurrent production change aborts rather than confirming or rolling back it', async () => {
  let checks = 0;
  await assert.rejects(verifyWithPropagation({ verify: async () => fixture(['hash-mismatch']),
    assertCurrent: async () => { if (++checks === 2) throw new Error('production changed'); }, sleep: async () => {} }), /production changed/);
});
test('retry budget is bounded and the deployed path still invokes the full verifier', async () => {
  await assert.rejects(verifyWithPropagation({ verify: async () => fixture([]), assertCurrent: async () => {}, delays: Array(50).fill(1000) }));
  const source = readFileSync(new URL('../scripts/pages-release.mjs', import.meta.url), 'utf8');
  assert.match(source, /verify:\(\)=>verifyRelease\(\{origin,metadata\}\)/);
  assert.match(source, /Production changed during release verification/);
  assert.match(source, /assert.equal\(smoke.passed,true/);
});
