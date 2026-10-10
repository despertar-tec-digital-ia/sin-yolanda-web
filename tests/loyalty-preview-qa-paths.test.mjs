import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { linkSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { projectRoot } from '../scripts/package-intake-preview.mjs';

test('visual QA rejects linked fixture/evidence paths and redacts invalid auth JSON before launching a browser', t => {
  const parent = resolve(projectRoot, '.artifacts');
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(resolve(parent, 'intake-qa-paths-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const marker = 'fictional-not-for-error-output';
  const auth = resolve(directory, 'auth.json');
  writeFileSync(auth, marker, { mode: 0o600 });
  const linkedAuth = resolve(directory, 'linked-auth.json');
  symlinkSync(auth, linkedAuth);
  const hardAuth = resolve(directory, 'hard-auth.json');
  linkSync(auth, hardAuth);
  const realParent = resolve(directory, 'real-parent');
  mkdirSync(realParent);
  const linkedParent = resolve(directory, 'linked-parent');
  symlinkSync(realParent, linkedParent);
  const fixtures = [
    { auth: linkedAuth, output: resolve(directory, 'symlink-out'), expected: 'local_qa_links_rejected' },
    { auth: hardAuth, output: resolve(directory, 'hardlink-out'), expected: 'local_qa_fixture_auth_invalid' },
    { auth, output: resolve(linkedParent, 'outside'), expected: 'local_qa_links_rejected' },
  ];
  rmSync(hardAuth);
  // Invalid JSON in an otherwise regular private file must not appear in parser diagnostics.
  fixtures.push({ auth, output: resolve(directory, 'invalid-json-out'), expected: 'local_qa_fixture_auth_invalid' });
  for (const [index, fixture] of fixtures.entries()) {
    if (index === 1) linkSync(auth, hardAuth);
    const result = spawnSync(process.execPath, ['scripts/qa-intake-preview.mjs', fixture.output], {
      cwd: projectRoot, encoding: 'utf8', timeout: 5000,
      env: { ...process.env, SY_QA_PACKAGE_ROOT: '/no-browser-required', SY_QA_AUTH_FILE: fixture.auth, SY_QA_ORIGIN: 'http://127.0.0.1:8798/' },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(fixture.expected));
    assert.ok(!(result.stdout + result.stderr).includes(marker));
    if (index === 1) rmSync(hardAuth);
  }
});
