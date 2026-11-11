import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {restoreNovemberSource} from './november-source-contract.mjs';
export const approvedPreviewsSource=JSON.parse(readFileSync(new URL('./approved-previews-source-patches.json',import.meta.url)));
export function restoreApprovedPreviewsSource(file,source) {
  source=restoreNovemberSource(file,source);
  const entry=approvedPreviewsSource.files[file];
  if(!entry)return source;
  for(const patch of [...entry.patches].reverse()) {
    const count=source.split(patch.after).length-1;
    if(!count&&source.includes(patch.before))continue;
    if(!count)return source;
    assert.equal(count,1,'Approved preview source patch is ambiguous: '+file);
    source=source.replace(patch.after,()=>patch.before);
  }
  return source;
}
