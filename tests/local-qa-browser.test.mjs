import test from 'node:test';
import assert from 'node:assert/strict';
import {localQaBrowserPath} from '../scripts/local-qa-browser.mjs';

test('local QA uses installed Brave and refuses Chrome, missing executables and implicit downloads', () => {
  const exists = () => true;
  assert.match(localQaBrowserPath({env: {}, platform: 'darwin', exists}), /Brave Browser\.app/);
  assert.equal(localQaBrowserPath({env: {SY_QA_BROWSER_PATH: '/usr/bin/brave-browser'}, platform: 'linux', exists}), '/usr/bin/brave-browser');
  assert.throws(() => localQaBrowserPath({env: {SY_QA_BROWSER_PATH: '/opt/Google Chrome for Testing/chrome'}, exists}), /prohibited/);
  assert.throws(() => localQaBrowserPath({env: {}, platform: 'linux', exists}), /Provide an installed Brave/);
  assert.throws(() => localQaBrowserPath({env: {}, platform: 'darwin', exists: () => false}), /not installed/);
});
