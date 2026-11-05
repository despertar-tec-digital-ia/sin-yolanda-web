import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {restoreSocialMotionSource} from './social-motion-source-contract.mjs';

export const socialFeedSource=JSON.parse(readFileSync(new URL('./social-feed-source-patches.json',import.meta.url)));
// Preserve all earlier complete-file guards by peeling only this approved allowlist delta.
export function restoreSocialFeedSource(file,source) {
  source=restoreSocialMotionSource(file,source);
  if(file!==socialFeedSource.file||!source.includes('20261104-instagram-houston'))return source;
  for(const patch of [...socialFeedSource.patches].reverse()){
    const count=source.split(patch.after).length-1;
    assert.equal(count,1,'Social feed manifest patch changed or became ambiguous');
    source=source.replace(patch.after,()=>patch.before);
  }
  return source;
}
