import {existsSync,readFileSync}from'node:fs';
import assert from'node:assert/strict';
const file=new URL('./measurement-source-patches.json',import.meta.url);
const contract=existsSync(file)?JSON.parse(readFileSync(file)):null;
export function restoreMeasurementSource(file,source){
  for(const patch of[...(contract?.files[file]?.patches??[])].reverse()){
    assert.equal(source.split(patch.after).length-1,1,'Measurement source changed outside its contract: '+file);
    source=source.replace(patch.after,patch.before);
  }
  return source;
}
