// Current hours/cache projection; historical source approvals remain unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {octoberHours} from './october-2026-update.mjs';

export const hoursAssetVersion = '20261118-usa-hours';
export function projectCurrentUsaHours(root, files, now) {
  const ids = Object.keys(octoberHours.zones).filter(id => octoberHours.updated(id, now));
  if (!ids.length) return;
  const read = file => files.get(file) ?? readFileSync(resolve(root, file), 'utf8');
  const translations = new Map(ids.map(id => [octoberHours.summaryFor(id, 'es', now), octoberHours.summaryFor(id, 'en', now)]));
  const dictionary = 'const DICT = {';
  const script = read('assets/js/i18n.js');
  assert.equal(script.split(dictionary).length, 2, 'Expected one shared translation dictionary');
  files.set('assets/js/i18n.js', script.replace(dictionary, dictionary + '\n' + [...translations].map(([es, en]) => '    ' + JSON.stringify(es) + ': ' + JSON.stringify(en) + ',').join('\n')));
  // These assets are cached for thirty days. Refresh only their consumers, after
  // the approved UI has projected its own translation script and cache keys.
  const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/public-manifest.json'), 'utf8'));
  for (const file of manifest.pages) {
    const source = read(file);
    const html = source.replace(/(src="\/?assets\/js\/(?:october-hours|i18n)\.js)\?v=[^"\s]+/g, '$1?v=' + hoursAssetVersion);
    if (source !== html) files.set(file, html);
  }
}
