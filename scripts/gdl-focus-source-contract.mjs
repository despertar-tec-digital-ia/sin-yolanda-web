import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const contract = JSON.parse(readFileSync(new URL('./gdl-focus-source-patches.json', import.meta.url)));
assert.equal(contract.version, 1, 'Unsupported Guadalajara focus source contract');

// Undo only the exact authorized Guadalajara focus/menu/publication deltas before
// checking historical release hashes. Additional or ambiguous edits stay rejected.
export function restoreGdlFocus(file, source) {
  for (const patch of [...(contract.files[file]?.patches ?? [])].reverse()) {
    assert.equal(source.split(patch.after).length - 1, 1,
      'GDL focus source changed or became ambiguous: ' + file);
    source = source.replace(patch.after, patch.before);
  }
  return source;
}
