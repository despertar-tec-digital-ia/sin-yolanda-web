// Single final projection for packaging and scheduled refresh. Building never grants publication.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {projectPublicSite} from './public-site.mjs';
import {projectSiteQuality, qualityAssets} from '../site-quality/projection.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
export function projectPublicRelease(root, options = {}) {
  const base = projectPublicSite(root, options);
  // Historical presentation fixtures and explicitly isolated review baselines keep their contracts.
  // A standalone fixture without editorial approvals remains a plain static package.
  if (options.quality === false || options.ui === false || !base.socialFeed) return base;
  const now = options.now ?? new Date().toISOString();
  const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/public-manifest.json'), 'utf8'));
  for (const file of qualityAssets) assert.ok(manifest.assets.includes(file), 'Incremental release asset missing from manifest: ' + file);
  const read = file => base.files.get(file) ?? readFileSync(resolve(root, file), 'utf8');
  const pages = new Map([...manifest.pages].sort().map(file => [file, read(file)]));
  const quality = projectSiteQuality({root, pages, read, now, hoursData: options.hoursData});
  const files = new Map([...base.files, ...quality.files]);
  files.set('houston.html', files.get('houston.html').replace(/ data-agenda-render-digest="[a-f0-9]+"/, ''));
  // Bind the scheduler probe to all final projected bytes, including data, attribution and quality assets.
  const renderDigest = hash(JSON.stringify([...files].sort(([a], [b]) => a.localeCompare(b)).map(([file, text]) => [file, hash(text)])));
  files.set('houston.html', files.get('houston.html').replace('class="sy-agenda"', 'class="sy-agenda" data-agenda-render-digest="' + renderDigest + '"'));
  const transitions = [base.metadata.nextTransitionAt, quality.metadata.eventClock.nextTransitionAt].filter(Boolean).sort();
  return {...base, files, quality: quality.metadata,
    metadata: {...base.metadata, renderDigest, nextTransitionAt: transitions[0] ?? null}};
}
