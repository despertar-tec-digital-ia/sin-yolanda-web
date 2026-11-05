import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function loadApprovedSocialMotion(root) {
  const path = resolve(root,'scripts/editorial/approved-social-motion.json');
  if (!existsSync(path)) return null;
  const config = JSON.parse(readFileSync(path,'utf8'));
  assert.equal(config.version,1); assert.equal(config.authorizer,'Luis');
  assert.ok(Number.isFinite(Date.parse(config.approvedAt))); assert.ok(config.authorization.trim());
  assert.equal(config.selectionDigest,hash(readFileSync(resolve(root,'scripts/editorial/houston-social-selection.json'))));
  assert.deepEqual(config.items.map(item => [item.id,item.kind]),[
    ['DfDHlMMgeCK','reel'],['De7If21xS3t','reel'],['De2S1RsmNNq','carousel']]);
  assert.equal(config.items[2].photos.length,3,'Four original photos, including the existing cover');
  const manifest = JSON.parse(readFileSync(resolve(root,'scripts/public-manifest.json')));
  assert.equal(config.stylesheet,'assets/css/branch-social-motion.css');
  assert.equal(config.script,'assets/js/branch-social-motion.js');
  for (const file of [config.stylesheet,config.script]) assert.equal(manifest.assetVersions[file],config.assetVersion);
  const media = config.items.flatMap(item => item.kind === 'reel' ? [item.video] : item.photos.flatMap(photo => photo.media));
  assert.deepEqual(Object.keys(config.files).sort(),[config.stylesheet,config.script,...media.map(item => item.file)].sort());
  for (const [file,expected] of Object.entries(config.files)) {
    assert.match(file,/^assets\/(?:css\/branch-social-motion\.css|js\/branch-social-motion\.js|social-feed-houston\/[A-Za-z0-9_-]+\.(?:mp4|webp))$/);
    assert.ok(manifest.assets.includes(file),'Motion asset must be explicitly allowlisted');
    const bytes = readFileSync(resolve(root,file));
    assert.equal(bytes.length,expected.bytes); assert.equal(hash(bytes),expected.sha256,'Motion asset changed outside review');
  }
  for (const item of config.items) {
    if (item.kind === 'reel') {
      assert.equal(item.video.audioTracks,0); assert.equal(item.video.codec,'h264');
      assert.ok(item.video.duration > 0 && item.video.duration < 60);
    } else for (const photo of item.photos) {
      assert.ok(photo.alt.es && photo.alt.en); assert.equal(photo.media.length,2);
      for (const image of photo.media) assert.ok(image.width > 0 && image.height > 0);
    }
  }
  return config;
}

export function enhanceSocialMotionHtml(html,config,language) {
  const en = language === 'en';
  for (const item of config.items) {
    let matches = 0;
    html = html.replace(/<article class="sy-social-post"><a ([^>]+)><div class="sy-social-photo">([\s\S]*?)<\/div>(<div class="sy-social-copy">[\s\S]*?<\/div>)<\/a><\/article>/g,(whole,attributes,photo) => {
      if (!attributes.includes('/'+item.id+'/')) return whole;
      matches++;
      let content = photo;
      if (item.kind === 'reel') {
        const poster = photo.match(/<img src="([^"]+)"/)[1];
        content += `<video class="sy-social-video" muted loop playsinline preload="none" poster="${poster}" data-src="/${item.video.file}" aria-hidden="true"></video>`;
      } else {
        const extras = item.photos.map(image => {
          const [small,large] = image.media;
          return `<img data-src="/${large.file}" data-srcset="/${small.file} ${small.width}w, /${large.file} ${large.width}w" sizes="(max-width: 640px) calc((100vw - 44px)/2), (max-width: 900px) calc((100vw - 88px)/3), 400px" width="${large.width}" height="${large.height}" alt="${escape(image.alt[language])}" decoding="async" hidden>`;
        }).join('');
        content += extras;
      }
      content = content.replace(/<span class="sy-social-(?:format|open)">[\s\S]*?<\/span>/g,'');
      const hintId = 'sy-motion-hint-'+item.id;
      const hint = en ? 'Space: pause or play. Enter: open on Instagram.' : 'Espacio: pausar o reproducir. Enter: abrir en Instagram.';
      const arrows = item.kind === 'carousel' ? (en ? ' Left/right: change photo.' : ' Izquierda/derecha: cambiar foto.') : '';
      const shortcuts = item.kind === 'carousel' ? 'Space ArrowLeft ArrowRight' : 'Space';
      return `<article class="sy-social-post" data-motion-kind="${item.kind}"><div class="sy-social-photo"><a class="sy-social-media-link" ${attributes} aria-keyshortcuts="${shortcuts}" aria-describedby="${hintId}">${content}</a><span class="sy-motion-keyboard-hint" id="${hintId}">${hint}${arrows}</span></div></article>`;
    });
    assert.equal(matches,1,'Expected the exact selected Instagram post once: '+item.id);
  }
  return html.replace('data-social-selection="houston-20261104"','data-social-selection="houston-20261104" data-social-motion="20261104"');
}

export function projectApprovedSocialMotion(root,inputFiles) {
  const config = loadApprovedSocialMotion(root),files = new Map(inputFiles);
  if (!config) return {files};
  for (const [file,language] of [['houston.html','es'],['en/houston/index.html','en']]) {
    const html = files.get(file);
    assert.ok(html && !html.includes('data-social-motion='),'Expected original reviewed static feed');
    const tags = `<link rel="stylesheet" href="/${config.stylesheet}?v=${config.assetVersion}"><script type="module" src="/${config.script}?v=${config.assetVersion}"></script>`;
    files.set(file,enhanceSocialMotionHtml(html,config,language).replace('</head>',tags+'</head>'));
  }
  return {files,metadata:{version:1,reels:2,carouselPhotos:4,silent:true,autoplay:'visible-only'}};
}
