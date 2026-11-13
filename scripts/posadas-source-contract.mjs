import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
export const posadasSource=JSON.parse(readFileSync(new URL('./posadas-source-patches.json',import.meta.url)));
// Peel only the new production route, assets and cache versions before historical guards.
export function restorePosadasSource(file,source){
  const entry=posadasSource.files[file];
  if(!entry||!source.includes(entry.marker))return source;
  for(const patch of [...entry.patches].reverse()){
    assert.equal(source.split(patch.after).length-1,1,'Posadas source patch changed or became ambiguous: '+file);
    source=source.replace(patch.after,()=>patch.before);
  }
  return source;
}
