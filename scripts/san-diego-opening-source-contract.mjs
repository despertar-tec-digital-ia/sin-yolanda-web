import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const contract = JSON.parse(readFileSync(new URL('./san-diego-opening-source-patches.json', import.meta.url)));

// Restore only the exact authorized San Diego announcement and cache changes.
export function restoreSanDiegoOpening(file, source) {
  for (const patch of [...(contract.files[file]?.patches ?? [])].reverse()) {
    assert.equal(source.split(patch.after).length - 1, 1, 'San Diego patch changed or became ambiguous: ' + file);
    source = source.replace(patch.after, patch.before);
  }
  return source;
}
