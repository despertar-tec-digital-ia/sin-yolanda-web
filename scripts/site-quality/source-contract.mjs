// Peel exactly the prepared allowlist addition before checking immutable historical approvals.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {restoreCiudadJuarezInauguration} from '../ciudad-juarez-inauguration/source-contract.mjs';
export const qualitySource = JSON.parse(readFileSync(new URL('./source-patches.json', import.meta.url)));
const markers = qualitySource.patches.flatMap(patch => [...patch.after.matchAll(/"([^"]+)"/g)]
  .map(match => match[1]).filter(value => !patch.before.includes('"' + value + '"')));
export function restoreQualitySource(file, source) {
  source = restoreCiudadJuarezInauguration(file, source);
  if (file !== qualitySource.file || !markers.some(value => source.includes(value))) return source;
  for (const patch of [...qualitySource.patches].reverse()) {
    assert.equal(source.split(patch.after).length - 1, 1, 'Incremental quality allowlist patch changed or became ambiguous');
    source = source.replace(patch.after, () => patch.before);
  }
  return source;
}
