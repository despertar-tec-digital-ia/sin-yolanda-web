import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

export const socialMotionSource = JSON.parse(readFileSync(new URL('./social-motion-source-patches.json',import.meta.url)));
export function restoreSocialMotionSource(file,source) {
  if (file !== socialMotionSource.file || !source.includes('20261104-instagram-motion')) return source;
  for (const patch of [...socialMotionSource.patches].reverse()) {
    assert.equal(source.split(patch.after).length-1,1,'Social motion manifest patch changed or became ambiguous');
    source = source.replace(patch.after,() => patch.before);
  }
  return source;
}
