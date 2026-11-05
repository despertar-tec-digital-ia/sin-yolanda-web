// Reviewed presentation only. Live publication additionally requires the hash-bound approval.
import assert from 'node:assert/strict';

const HOUSTON_ACCOUNT = '6acfe61478e7110cac2c9fb6_uWMoUoRh3GNepEFH28Vn_17841436324015470_profile';
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function validateSocialSelection(selection) {
  assert.equal(selection.version, 1);
  assert.equal(selection.reviewOnly, true, 'Use the immutable reviewed selection snapshot');
  assert.equal(selection.branch, 'houston');
  assert.equal(selection.profile, 'sinyolandahouston');
  assert.ok(Number.isFinite(Date.parse(selection.generatedAt)));
  assert.ok(Array.isArray(selection.items) && selection.items.length > 0 && selection.items.length <= 6);
  const ids = new Set();
  for (const item of selection.items) {
    assert.match(item.id, /^[A-Za-z0-9_-]+$/);
    assert.ok(!ids.has(item.id), 'Duplicate post'); ids.add(item.id);
    if (item.origin === 'instagram-visible') {
      assert.equal(item.author, 'sinyolandahouston', 'Manual selection still requires the correct author');
      assert.ok(Number.isFinite(Date.parse(item.observedAt)), 'Manual origin needs an observation timestamp');
      assert.equal(item.accountId, undefined, 'Do not invent a GHL association for a native post');
    } else {
      assert.equal(item.origin, 'ghl');
      assert.equal(item.accountId, HOUSTON_ACCOUNT, 'Foreign account cannot enter Houston');
    }
    assert.equal(item.branch, 'houston');
    assert.equal(item.status, 'published', 'Drafts and scheduled posts are excluded');
    assert.equal(item.deleted, false);
    assert.ok(['ambience', 'recap'].includes(item.category), 'Events and offers stay in editorial review');
    assert.ok(['reel', 'carousel', 'image'].includes(item.kind));
    assert.ok(Number.isFinite(Date.parse(item.publishedAt)));
    const url = new URL(item.permalink);
    assert.equal(url.origin, 'https://www.instagram.com');
    assert.equal(url.username, ''); assert.equal(url.password, '');
    assert.equal(url.search, ''); assert.equal(url.hash, '');
    assert.ok([`/p/${item.id}/`, `/reel/${item.id}/`].includes(url.pathname));
    for (const language of ['es', 'en']) {
      assert.ok(typeof item.title?.[language] === 'string' && item.title[language].length > 0);
      assert.ok(typeof item.alt?.[language] === 'string' && item.alt[language].length > 0);
    }
    assert.equal(item.media.length, 2);
    for (const media of item.media) {
      assert.match(media.file, new RegExp('^' + item.id + '-(?:400|800)\\.webp$'));
      assert.ok(Number.isInteger(media.width) && media.width > 0 && media.width <= 800);
      assert.ok(Number.isInteger(media.height) && media.height > 0 && media.height <= 1400);
      assert.ok(media.bytes > 0 && media.bytes <= 200000, 'Oversized preview media');
      assert.match(media.sha256, /^[a-f0-9]{64}$/);
    }
    assert.ok(item.media[0].width < item.media[1].width, 'Responsive sources must have distinct ascending widths');
  }
  return selection;
}

const arrow = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" stroke="currentColor" stroke-width="1.5"/></svg>';
export function renderSocialFeed(selection, language = 'es') {
  validateSocialSelection(selection); assert.ok(['es','en'].includes(language));
  const en = language === 'en', date = new Intl.DateTimeFormat(en ? 'en-US' : 'es-MX', {day:'numeric', month:'long', year:'numeric', timeZone:'America/Chicago'});
  const items = [...selection.items].sort((a,b) => Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).map(item => {
    const [small, large] = item.media, base = '/assets/social-feed-review/';
    const kind = item.kind === 'reel' ? 'Reel' : item.kind === 'carousel' ? (en ? 'Photos' : 'Fotos') : 'Instagram';
    const label = item.category === 'recap' ? (en ? 'Memories' : 'Recuerdos') : (en ? 'At the cantina' : 'En la cantina');
    return `<article class="sy-social-post"><a href="${escape(item.permalink)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(item.title[language])} · Instagram · ${en ? 'opens in a new tab' : 'abre otra pestaña'}"><div class="sy-social-photo"><img src="${base}${large.file}" srcset="${base}${small.file} ${small.width}w, ${base}${large.file} ${large.width}w" sizes="(max-width: 640px) calc((100vw - 44px)/2), (max-width: 900px) calc((100vw - 88px)/3), 400px" width="${large.width}" height="${large.height}" alt="${escape(item.alt[language])}" loading="lazy" decoding="async"><span class="sy-social-format">${kind}</span><span class="sy-social-open">${arrow}</span></div><div class="sy-social-copy"><p>${label}<time datetime="${escape(item.publishedAt)}">${date.format(new Date(item.publishedAt))}</time></p><h3>${escape(item.title[language])}</h3></div></a></article>`;
  }).join('');
  return `<section class="sy-social-feed" id="instagram-houston" aria-labelledby="instagram-houston-title" data-social-review="true"><div class="sy-social-inner"><div class="sy-social-heading"><div><h2 id="instagram-houston-title">${en ? 'This is Sin Yolanda.' : 'Así se vive Sin Yolanda.'}</h2><p>${en ? 'Houston. Songs, friends and a good toast.' : 'Houston. Entre canciones, amigos y brindis.'}</p></div><a class="sy-social-profile" href="https://www.instagram.com/sinyolandahouston/" target="_blank" rel="noopener noreferrer" aria-label="${en ? 'Houston Instagram · opens in a new tab' : 'Instagram de Houston · abre otra pestaña'}">@sinyolandahouston ${arrow}</a></div><div class="sy-social-grid">${items}</div></div></section>`;
}

export const socialFeedCss = `
.sy-social-feed{background:var(--wine,#8b1820);color:var(--paper,#fff4de);font:400 16px/1.5 HoustonSlab,Georgia,serif;scroll-margin-top:88px}
.sy-social-feed *{box-sizing:border-box}.sy-social-inner{max-width:1336px;padding:68px 48px 72px;margin:auto}
.sy-social-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;margin-bottom:34px}
.sy-social-feed h2{font:400 clamp(56px,6vw,84px)/.98 HoustonDisplay,Impact,sans-serif;max-width:700px;margin:0 0 18px;text-wrap:balance}
.sy-social-heading p{margin:0;font-size:15px;line-height:1.5}.sy-social-feed a{color:inherit;text-decoration:none;touch-action:manipulation}
.sy-social-feed a:focus-visible{outline:3px solid var(--paper,#fff4de);outline-offset:6px}
.sy-social-profile{display:inline-flex;gap:15px;align-items:center;white-space:nowrap;border-bottom:1px solid currentColor;min-height:44px;font-size:14px;padding:7px 0}
.sy-social-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.sy-social-post{min-width:0}.sy-social-post>a{display:block}
.sy-social-photo{position:relative;aspect-ratio:4/5;overflow:hidden;background:#30201c}.sy-social-photo img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 0%}
.sy-social-format{position:absolute;top:12px;left:12px;background:var(--paper,#fff4de);color:var(--ink,#30201c);font-size:11px;line-height:1.3;padding:6px 9px}
.sy-social-open{position:absolute;right:12px;bottom:12px;display:grid;place-items:center;width:34px;height:34px;background:var(--paper,#fff4de);color:var(--ink,#30201c)}
.sy-social-copy{padding-top:17px}.sy-social-copy p{font-size:12px;margin:0 0 7px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.sy-social-copy time{opacity:.9}
.sy-social-feed h3{font:400 21px/1.28 HoustonSlab,Georgia,serif;margin:0;max-width:23ch}.sy-social-post a:hover h3{text-decoration:underline;text-underline-offset:5px}
@media(max-width:900px){.sy-social-inner{padding:50px 32px 54px}.sy-social-heading{display:block}.sy-social-profile{margin-top:16px}.sy-social-grid{gap:18px}.sy-social-feed h3{font-size:18px}}
@media(max-width:640px){.sy-social-inner{padding:42px 16px 46px}.sy-social-feed h2{font-size:52px;max-width:330px}.sy-social-heading{margin-bottom:26px}.sy-social-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:26px 12px}.sy-social-heading p{font-size:13px}.sy-social-feed h3{font-size:16px}.sy-social-copy{padding-top:12px}.sy-social-copy p{font-size:12px;display:block}.sy-social-copy time{display:block;margin-top:3px}.sy-social-format{top:8px;left:8px;padding:4px 7px}.sy-social-open{right:8px;bottom:8px;width:28px;height:28px}}
`;

export function integrateSocialFeed(html, selection, language) {
  assert.ok(!html.includes('data-social-review='), 'Do not inject the feed twice');
  const marker = '<div><section class="bct"';
  assert.equal(html.split(marker).length, 2, 'Expected the original Catering block after agenda');
  return html.replace('</head>', `<style data-social-review-css>${socialFeedCss}</style></head>`)
    .replace(marker, renderSocialFeed(selection, language) + marker);
}
