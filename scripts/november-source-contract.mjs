import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {restoreEventMediaSource} from './event-media-source-contract.mjs';

export const novemberSource = JSON.parse(readFileSync(new URL('./november-source-patches.json', import.meta.url)));

// Peel only the three authorized November resources before historical guards.
// Unknown edits stay visible; do not re-sign any earlier release's hashes.
export function restoreNovemberSource(file, source) {
  source=restoreEventMediaSource(file,source);
  if (file !== novemberSource.file || !source.includes('20261110-november-agenda')) return source;
  for (const patch of [...novemberSource.patches].reverse()) {
    const count = source.split(patch.after).length - 1;
    assert.equal(count, 1, 'November source patch changed or became ambiguous');
    source = source.replace(patch.after, () => patch.before);
  }
  return source;
}
