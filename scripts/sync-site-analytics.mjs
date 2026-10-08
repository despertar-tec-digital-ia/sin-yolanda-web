import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const analyticsAsset = 'assets/js/site-analytics.js';
export const analyticsExclusions = Object.freeze({ '404.html': 'Unknown request paths are deliberately not measured.' });
const collector = 'https://analytics.despertartdigital.cloud/script.js';
const websiteId = 'cbfa7fb3-230e-405c-a0b8-06c762d6216b';
const scriptTags = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const attr = (tag, name) => tag.match(new RegExp('\\b' + name + '=["\']([^"\']*)["\']', 'i'))?.[1];

// Pure transformation: the caller owns applying/reviewing HTML and manifest edits.
export function syncSiteAnalyticsHtml(html, page, version) {
  assert.match(version, /^\d{8}-[a-z0-9-]+$/, 'An explicit shared asset version is required.');
  assert.match(html, /<\/head>/i, 'Analytics insertion needs an existing head: ' + page);
  let existingHook;
  const retainHook = tag => {
    const hook = attr(tag, 'data-before-send');
    if (!hook) return;
    assert.match(hook, /^[A-Za-z_$][\w$]*$/, 'Review the existing beforeSend hook name: ' + page);
    assert.ok(!existingHook || existingHook === hook, 'Competing beforeSend hooks need review: ' + page);
    existingHook = hook;
  };
  const cleaned = html.replace(scriptTags, tag => {
    const source = attr(tag, 'src');
    if (!source) return tag;
    if (source.split('?')[0].replace(/^\//, '') === analyticsAsset) { retainHook(tag); return ''; }
    if (source === collector) {
      assert.equal(attr(tag, 'data-website-id'), websiteId, 'Review a different website tracker before replacing it: ' + page);
      retainHook(tag);
      return '';
    }
    return tag;
  }).replace(/<meta\b[^>]*name=["']sy-analytics["'][^>]*>\s*/gi, '');
  const insertion = Object.hasOwn(analyticsExclusions, page)
    ? '<meta name="sy-analytics" content="excluded:404">'
    : `<script defer src="/${analyticsAsset}?v=${version}"${existingHook ? ` data-before-send="${existingHook}"` : ''}></script>`;
  return cleaned.replace(/<\/head>/i, insertion + '</head>');
}

export function checkAnalyticsCoverage(root = fileURLToPath(new URL('..', import.meta.url))) {
  const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/public-manifest.json'), 'utf8'));
  assert.ok(manifest.assets.includes(analyticsAsset), 'The shared analytics loader must be public.');
  let measured = 0;
  for (const page of manifest.pages) {
    const html = readFileSync(resolve(root, page), 'utf8');
    const tags = [...html.matchAll(scriptTags)].map(match => match[0]);
    const analytics = tags.filter(tag => attr(tag, 'src')?.split('?')[0] === '/' + analyticsAsset);
    assert.ok(!tags.some(tag => attr(tag, 'src') === collector), 'Inline Umami tracker remains: ' + page);
    if (Object.hasOwn(analyticsExclusions, page)) {
      assert.equal(analytics.length, 0, 'Explicit excluded page must not load measurement: ' + page);
      assert.match(html, /<meta name="sy-analytics" content="excluded:404">/, 'Document the 404 exclusion.');
    } else {
      assert.equal(analytics.length, 1, 'Exactly one shared analytics loader per public page: ' + page);
      assert.equal(attr(analytics[0], 'src'), `/${analyticsAsset}?v=${manifest.assetVersion}`, 'Stale analytics cache version: ' + page);
      assert.match(analytics[0], /\bdefer\b/, 'Do not block first paint.');
      measured++;
    }
  }
  return { measuredPages: measured, exclusions: Object.keys(analyticsExclusions) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv[2], '--check', 'This helper is read-only. Import syncSiteAnalyticsHtml to apply reviewed edits.');
  console.log(JSON.stringify(checkAnalyticsCoverage(process.argv[3])));
}
