import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

export const ciudadJuarezPriority = JSON.parse(readFileSync(new URL('./ciudad-juarez-priority-source-patches.json', import.meta.url)));
const hash = value => createHash('sha256').update(value).digest('hex');

// This small correction is layered over the opening release. It restores the
// exact prior opening source before the historical guards inspect it.
export function restoreCiudadJuarezPriority(file, source) {
  const entry = ciudadJuarezPriority.files[file];
  if (!entry) return source;
  source = source.replaceAll('\r\n', '\n');
  if (hash(source) === entry.beforeSha256) return source;
  const hasCurrentPatch = entry.patches.some(patch => source.split(patch.after).length - 1 > 0);
  if (!hasCurrentPatch) return source;
  for (const patch of [...entry.patches].reverse()) {
    const count = source.split(patch.after).length - 1;
    if (count === 0 && source.includes(patch.before)) continue;
    assert.equal(count, 1, 'Ciudad Juárez priority patch changed or became ambiguous: ' + file);
    source = source.replace(patch.after, () => patch.before);
  }
  return source;
}
