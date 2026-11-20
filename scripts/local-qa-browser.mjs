import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {basename} from 'node:path';

export function localQaBrowserPath({env = process.env, platform = process.platform, exists = existsSync} = {}) {
  const executablePath = env.SY_QA_BROWSER_PATH || (platform === 'darwin' ? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' : '');
  assert.ok(executablePath, 'Provide an installed Brave executable in SY_QA_BROWSER_PATH');
  assert.ok(/^(?:Brave Browser|brave|brave-browser|brave\.exe)$/i.test(basename(executablePath)) && !/chrome.for.testing/i.test(executablePath), 'Local QA requires installed Brave; Chrome for Testing is prohibited');
  assert.ok(exists(executablePath), 'The selected Brave executable is not installed; do not download a test browser');
  return executablePath;
}
