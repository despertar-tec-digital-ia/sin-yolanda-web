import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { restoreGdlFocus } from '../scripts/gdl-focus-source-contract.mjs';
import { restoreSanDiegoOpening } from '../scripts/san-diego-opening-source-contract.mjs';

const read = file => restoreSanDiegoOpening(file, readFileSync(new URL('../' + file, import.meta.url), 'utf8'));
const hash = source => createHash('sha256').update(source).digest('hex');

test('the authorized GDL deltas restore complete prior release bytes without hiding unknown changes', () => {
  const contract = JSON.parse(read('scripts/gdl-focus-source-patches.json'));
  assert.equal(contract.version, 1);
  assert.match(contract.baselineCommit, /^[a-f0-9]{40}$/);
  assert.ok(Object.keys(contract.files).includes('guadalajara.html'));
  assert.ok(Object.keys(contract.files).includes('san-ignacio/menu/index.html'));
  for (const [file, entry] of Object.entries(contract.files)) {
    const source = read(file);
    assert.equal(hash(source), entry.afterSha256, file + ': reviewed bytes');
    assert.equal(hash(restoreGdlFocus(file, source)), entry.beforeSha256, file + ': complete historical bytes');
    assert.notEqual(hash(restoreGdlFocus(file, source + 'unapproved edit')), entry.beforeSha256);
    assert.throws(() => restoreGdlFocus(file, source + entry.patches.at(-1).after), /GDL focus source/);
    assert.throws(() => restoreGdlFocus(file, source.replace(entry.patches[0].after, 'unapproved edit')), /GDL focus source/);
  }
  assert.equal(restoreGdlFocus('unrelated-file', 'Preserved'), 'Preserved');
});

test('other existing public pages receive only the two shared measurement cache versions', () => {
  const contract = JSON.parse(read('scripts/gdl-focus-source-patches.json'));
  for (const [file, entry] of Object.entries(contract.files)) {
    if (!file.endsWith('.html') || ['guadalajara.html', 'san-ignacio/menu/index.html'].includes(file)) continue;
    const source = read(file), historical = restoreGdlFocus(file, source);
    const expected = historical.replace(/(\/assets\/js\/(?:site-measurement|ga4-consent)\.js\?v=)20261016-gdl-agenda/g,
      (_, prefix) => prefix + '20261019-gdl-contest');
    assert.equal(source, expected, file + ': surrounding content remains exact');
    assert.match(entry.beforeSha256, /^[a-f0-9]{64}$/);
  }
});
