import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const contract = JSON.parse(readFileSync(new URL('./ciudad-juarez-opening-source-patches.json', import.meta.url)));
const hash = value => createHash('sha256').update(value).digest('hex');

// This is the newest public-source layer. Normalize checkout line endings before
// matching the exact approved fragments, then hand the source to older guards.
export function restoreCiudadJuarezOpening(file, source) {
  const entry = contract.files[file];
  if (!entry) return source;
  source = source.replaceAll('\r\n', '\n');
  if (hash(source) === entry.beforeSha256) return source;
  const hasCurrentPatch = entry.patches.some(patch => source.split(patch.after).length - 1 > 0);
  // Historical callers can pass a source already restored below this release.
  // In that case the older contract remains responsible for its own hashes.
  if (!hasCurrentPatch) return source;
  for (const patch of [...entry.patches].reverse()) {
    const count = source.split(patch.after).length - 1;
    if (count === 0 && source.includes(patch.before)) continue;
    assert.equal(count, 1, 'Ciudad Juárez opening patch changed or became ambiguous: ' + file);
    source = source.replace(patch.after, () => patch.before);
  }
  return source;
}
