import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { restoreOctober } from './october-source-contract.mjs';

const contract = JSON.parse(readFileSync(new URL('./central-seo-source-patches.json', import.meta.url)));
export function restoreCentralSeo(file, source) {
  source = restoreOctober(file, source);
  for (const patch of [...(contract.files[file]?.patches ?? [])].reverse()) {
    assert.equal(source.split(patch.after).length - 1, 1, 'Central SEO patch changed or became ambiguous: ' + file);
    source = source.replace(patch.after, () => patch.before);
  }
  return source;
}
