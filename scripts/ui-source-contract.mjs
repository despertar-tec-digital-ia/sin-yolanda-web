import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {restoreCiudadJuarezOpening} from './ciudad-juarez-opening-source-contract.mjs';
export const uiSource=JSON.parse(readFileSync(new URL('./ui-source-patches.json',import.meta.url)));
export function restoreUiSource(file,source) {
  source=restoreCiudadJuarezOpening(file,source);
  if(file!==uiSource.file||!source.includes('assets/css/site-ui-review.css'))return source;
  for(const patch of [...uiSource.patches].reverse()){
    assert.equal(source.split(patch.after).length-1,1,'UI source patch changed or became ambiguous');
    source=source.replace(patch.after,()=>patch.before);
  }
  return source;
}
