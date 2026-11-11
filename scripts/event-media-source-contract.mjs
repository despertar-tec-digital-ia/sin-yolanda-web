import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
export const eventMediaSource=JSON.parse(readFileSync(new URL('./event-media-source-patches.json',import.meta.url)));
// Remove only this approved allowlist delta before testing earlier releases.
export function restoreEventMediaSource(file,source) {
  if(file!==eventMediaSource.file||!source.includes('20261110-event-media'))return source;
  for(const patch of [...eventMediaSource.patches].reverse()) {
    assert.equal(source.split(patch.after).length-1,1,'Event media source patch changed or became ambiguous');
    source=source.replace(patch.after,()=>patch.before);
  }
  return source;
}
