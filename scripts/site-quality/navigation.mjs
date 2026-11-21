// Normalize existing native links to the published canonical map, preserving intent and attribution.
import assert from 'node:assert/strict';

const attr = (tag, name) => tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
export function projectQualityNavigation({pages} = {}) {
  assert.ok(pages instanceof Map, 'Supply final HTML pages');
  const routes = new Map(), identities = new Map();
  for (const [file, html] of pages) {
    const tag = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => match[0]).find(tag => attr(tag, 'rel') === 'canonical');
    if (!tag) continue;
    const url = new URL(attr(tag, 'href'));
    assert.equal(url.origin, 'https://sin-yolanda.com');
    assert.ok(!url.search && !url.hash && !identities.has(url.href), 'Canonical map must be unambiguous');
    identities.set(url.href, file);
    const key = url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '');
    assert.ok(!routes.has(key), 'Canonical aliases must be unambiguous');
    routes.set(key, url.pathname);
  }
  const files = new Map(), changes = [];
  for (const [file, html] of pages) {
    const base = [...identities].find(([, name]) => name === file)?.[0];
    if (!base) continue;
    let count = 0;
    const normalize = value => {
      if (!value || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(value)) return value;
      const [, head, suffix = ''] = value.match(/^([^?#]*)([?#][\s\S]*)?$/) ?? [];
      if (!head) return value;
      let url;
      try {url = new URL(head, base);} catch {return value;}
      if (url.origin !== 'https://sin-yolanda.com') return value;
      const target = routes.get(url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, ''));
      if (!target || target === url.pathname) return value;
      count++;
      return (/^https?:/i.test(head) ? url.origin : '') + target + suffix;
    };
    // A link-looking template string in a script is not a native DOM anchor.
    const result = html.split(/(<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>)/gi)
      .map(part => /^<(?:script|style)\b/i.test(part) ? part : part.replace(/<a\b[^>]*>/gi,
        tag => tag.replace(/(\s)(href|data-i18n-href-(?:es|en))\s*=\s*(["'])(.*?)\3/gi,
          (match, space, name, quote, value) => {
            const next = normalize(value);
            return next === value ? match : `${space}${name}=${quote}${next}${quote}`;
          }))).join('');
    if (result !== html) {files.set(file, result); changes.push({file, kind: 'canonical-native-links', count});}
  }
  return {files, changes, metadata: {version: 1, linksNormalized: changes.reduce((sum, change) => sum + change.count, 0), pages: files.size}};
}
