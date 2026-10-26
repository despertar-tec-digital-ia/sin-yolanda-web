import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { restoreSanDiegoOpening } from '../scripts/san-diego-opening-source-contract.mjs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');

test('San Diego changes restore exact prior bytes and reject unknown or ambiguous changes', () => {
  const contract = JSON.parse(read('scripts/san-diego-opening-source-patches.json'));
  for (const [file, entry] of Object.entries(contract.files)) {
    const source = read(file);
    assert.equal(hash(source), entry.afterSha256, file);
    assert.equal(hash(restoreSanDiegoOpening(file, source)), entry.baselineSha256, file);
    assert.notEqual(hash(restoreSanDiegoOpening(file, source + 'unapproved edit')), entry.baselineSha256);
    assert.throws(() => restoreSanDiegoOpening(file, source + entry.patches.at(-1).after), /San Diego patch/);
  }
  assert.equal(restoreSanDiegoOpening('unrelated', 'preserved'), 'preserved');
});
