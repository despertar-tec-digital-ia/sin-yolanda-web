// Newest public-source layer: peel exactly the Ciudad Juárez Instagram and card delta before older guards.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
export const cjSocialSource = JSON.parse(readFileSync(new URL('./source-patches.json', import.meta.url)));
export function restoreCiudadJuarezSocial(file, source) {
  const entry = cjSocialSource.files[file];
  if (!entry) return source;
  source = source.replaceAll('\r\n', '\n');
  if (!source.includes(entry.marker)) return source;
  for (const patch of [...entry.patches].reverse()) {
    assert.equal(source.split(patch.after).length - 1, 1, 'Ciudad Juárez social patch changed or became ambiguous: ' + file);
    source = source.replace(patch.after, () => patch.before);
  }
  return source;
}
