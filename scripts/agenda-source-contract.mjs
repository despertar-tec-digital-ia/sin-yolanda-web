import { readFileSync,existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const file=new URL('./agenda-source-patches.json',import.meta.url);
const contract=existsSync(file)?JSON.parse(readFileSync(file)):null;
export function restoreAgendaSource(file,source){
  for(const patch of[...(contract?.files[file]?.patches??[])].reverse()){
    assert.equal(source.split(patch.after).length-1,1,'Approved agenda source changed outside its contract: '+file);
    source=source.replace(patch.after,patch.before);
  }
  return source;
}
