import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

export const homeSelection = JSON.parse(readFileSync(new URL('./home-selection-source-patches.json', import.meta.url)));

// Peel only this approved photo/cache delta before checking earlier complete-file hashes.
// An earlier source may already be restored by a caller; unrelated bytes remain visible.
export function restoreHomeSelection(file, source) {
  // Historical callers may have already peeled several releases. With no marker
  // from this authorization, leave their source (including unknown edits) intact
  // so their original full-file hash checks continue to detect every difference.
  if (!source.includes('20261029-home-photos') && !source.includes('images/home-20261029/')) return source;
  for (const patch of [...(homeSelection.files[file]?.patches ?? [])].reverse()) {
    const count = source.split(patch.after).length - 1;
    if (count === 0 && source.includes(patch.before)) continue;
    assert.equal(count, 1, 'Home selection patch changed or became ambiguous: ' + file);
    source = source.replace(patch.after, () => patch.before);
  }
  return source;
}
