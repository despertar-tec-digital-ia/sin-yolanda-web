import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const contract = JSON.parse(readFileSync(new URL('./ga4-source-patches.json', import.meta.url)));
export function restoreGa4Source(file, source) {
  for (const patch of [...(contract.files[file]?.patches ?? [])].reverse()) {
    assert.equal(source.split(patch.after).length - 1, 1, 'GA4 patch changed or became ambiguous: ' + file);
    source = source.replace(patch.after, patch.before);
  }
  return source;
}
