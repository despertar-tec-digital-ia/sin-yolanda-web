import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const contract = JSON.parse(readFileSync(new URL('./site-intake-a-patches.json', import.meta.url)));

// Undo only the exact local A01–A04 patches before applying historical hash checks.
// Unknown edits cannot be normalized away: every candidate chunk must occur once.
export function restoreSiteIntake(file, source) {
  for (const patch of [...(contract.files[file]?.patches ?? [])].reverse()) {
    assert.equal(source.split(patch.after).length - 1, 1, 'Intake patch changed or became ambiguous: ' + file);
    source = source.replace(patch.after, patch.before);
  }
  return source;
}
