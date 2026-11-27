// Newest public-source layer: peel exactly the Ciudad Juárez grand-opening delta before older guards.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {restoreCiudadJuarezSocial} from '../ciudad-juarez-social/source-contract.mjs';
export const cjInaugurationSource = JSON.parse(readFileSync(new URL('./source-patches.json', import.meta.url)));
export function restoreCiudadJuarezInauguration(file, source) {
  source = restoreCiudadJuarezSocial(file, source);
  const entry = cjInaugurationSource.files[file];
  if (!entry) return source;
  source = source.replaceAll('\r\n', '\n');
  if (!source.includes(entry.marker)) return source;
  for (const patch of [...entry.patches].reverse()) {
    assert.equal(source.split(patch.after).length - 1, 1, 'Ciudad Juárez inauguration patch changed or became ambiguous: ' + file);
    source = source.replace(patch.after, () => patch.before);
  }
  return source;
}
