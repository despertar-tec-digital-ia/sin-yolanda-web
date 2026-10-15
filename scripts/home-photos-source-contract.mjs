import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const contract = JSON.parse(readFileSync(new URL('./home-photos-source-patches.json', import.meta.url)));

// Restore only the exact authorized photograph and cache changes for older baseline checks.
export function restoreHomePhotos(file, source) {
  for (const patch of [...(contract.files[file]?.patches ?? [])].reverse()) {
    assert.equal(source.split(patch.after).length - 1, 1, 'Home photo patch changed or became ambiguous: ' + file);
    source = source.replace(patch.after, patch.before);
  }
  return source;
}
