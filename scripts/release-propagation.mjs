// Retry read-only propagation failures, never uploads or relaxed hash checks.
import assert from 'node:assert/strict';
const transient = new Set(['hash-mismatch', 'release-file-not-200', 'request-timeout', 'request-failed', 'preview-robots-header-missing']);
export async function verifyWithPropagation({ verify, assertCurrent, delays = [5000, 10000, 20000],
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), onAttempt = () => {} }) {
  assert.ok(typeof verify === 'function' && typeof assertCurrent === 'function');
  assert.ok(Array.isArray(delays) && delays.length <= 3 && delays.every(ms => Number.isInteger(ms) && ms >= 0 && ms <= 30000));
  const attempts = [], started = Date.now();
  for (let index = 0; ; index++) {
    await assertCurrent();
    const report = await verify();
    attempts.push({ attempt: index + 1, passed: report.passed, summary: report.summary });
    onAttempt(attempts.at(-1));
    const problems = report.observations.flatMap(item => item.problems);
    if (report.passed || index >= delays.length || !problems.length || problems.some(problem => !transient.has(problem))) {
      await assertCurrent();
      return { ...report, propagation: { attempts, elapsedMs: Date.now() - started } };
    }
    await sleep(delays[index]);
  }
}
