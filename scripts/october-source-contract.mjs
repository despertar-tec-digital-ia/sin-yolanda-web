import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { restoreHomeSelection } from './home-selection-source-contract.mjs';
const contract = JSON.parse(readFileSync(new URL('./october-source-patches.json', import.meta.url)));
export function restoreOctober(file, source) {
  source = restoreHomeSelection(file, source);
  for (const patch of [...(contract.files[file]?.patches ?? [])].reverse()) {
    const count = source.split(patch.after).length - 1;
    if (count === 0 && source.split(patch.before).length - 1 === 1) continue;
    assert.equal(count, 1, 'October update patch changed or became ambiguous: ' + file);
    source = source.replace(patch.after, () => patch.before);
  }
  return source;
}
