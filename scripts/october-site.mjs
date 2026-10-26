import { readFileSync } from 'node:fs';
export const photoExports = JSON.parse(readFileSync(new URL('./october-photos.json', import.meta.url)));
export const photoPlans = {
  'san-antonio': {
    hero: ['san-antonio-people', 'Dos invitadas con sombreros y micrófonos junto a la barra de San Antonio.', 'Two guests with hats and microphones at the San Antonio bar.'],
    food: ['san-antonio-food', 'Tres tacos con carne, cebolla y aguacate.', 'Three tacos with meat, onion and avocado.'],
    footer: ['san-antonio-facade', '', '']
  },
  houston: {
    food: ['houston-food', 'Tres tacos en soportes sobre un plato azul, con salsa y limones.', 'Three tacos in holders on a blue plate, with salsa and limes.'],
    footer: ['houston-neon', '', '']
  },
  'el-paso': {
    hero: ['el-paso-people', 'Un grupo de invitadas canta con micrófonos en Sin Yolanda El Paso.', 'A group of guests sings with microphones at Sin Yolanda El Paso.'],
    food: ['el-paso-food', 'Tacos servidos en una mesa de Sin Yolanda El Paso.', 'Tacos served at a table at Sin Yolanda El Paso.'],
    footer: ['el-paso-people', '', '']
  }
};
const fileFor = (name, width = 1200) => '/images/approved-20261026/' + name + '-' + width + '.webp';
function photoTag(tag, plan, language, footer) {
  const [name, es, english] = plan, entry = photoExports.find(item => item.name === name);
  const [width, height] = entry.sourceDimensions;
  let result = tag.replace(/src="[^"]+"/, 'src="' + fileFor(name) + '"')
    .replace(/width="\d+"/, 'width="' + width + '"').replace(/height="\d+"/, 'height="' + height + '"')
    .replace(/alt="[^"]*"/, 'alt="' + (language === 'en' ? english : es) + '"');
  const srcset = [480, 800, 1200, 1600].map(w => fileFor(name, w) + ' ' + w + 'w').join(', ');
  if (!footer) result = result.includes('srcset=') ? result.replace(/srcset="[^"]+"/, 'srcset="' + srcset + '"') : result.replace(' src=', ' srcset="' + srcset + '" src=');
  return result;
}
export function applyOctoberSiteHtml(file, html) {
  const id = file.startsWith('en/') ? file.split('/')[1] : file.replace('.html', ''), language = file.startsWith('en/') ? 'en' : 'es';
  const plan = photoPlans[id];
  if (plan) {
    let index = 0;
    html = html.replace(/<img\b[^>]*>/g, tag => {
      if (!/(?:images\/(?:branch-review|intake-a|houston-entry-study)|images\/approved-20261026)/.test(tag)) return tag;
      const slot = tag.includes('bf-ambience') ? 'footer' : index++ === 0 ? 'hero' : 'food';
      return plan[slot] ? photoTag(tag, plan[slot], language, slot === 'footer') : tag;
    });
    if (plan.hero) {
      const hero = fileFor(plan.hero[0]);
      html = html.replace(/--hero-backdrop:url\('[^']+'\)/, "--hero-backdrop:url('" + fileFor(plan.hero[0],800) + "')");
      html = html.replace(/<link\b[^>]*rel="preload"[^>]*>/g, tag => /images\/(?:branch-review|intake-a)/.test(tag) ? tag.replace(/href="[^"]+"/, 'href="' + hero + '"').replace(/imagesrcset="[^"]+"/, 'imagesrcset="' + [480,800,1200,1600].map(w => fileFor(plan.hero[0],w) + ' ' + w + 'w').join(', ') + '"') : tag);
      html = html.replace(/<meta (?:property="og:image"|name="twitter:image") content="[^"]+"\s*\/?>/g, tag => tag.replace(/content="[^"]+"/, 'content="https://sin-yolanda.com' + hero + '"'));
      html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (tag, content) => {
        const value = JSON.parse(content); if (value['@type'] !== 'Restaurant') return tag;
        value.image = ['https://sin-yolanda.com' + hero, 'https://sin-yolanda.com' + fileFor(plan.food[0])];
        return '<script type="application/ld+json">' + JSON.stringify(value) + '</script>';
      });
    }
  }
  if (id === 'houston') html = html.replace(/(<h2 id="catering-houston-title"[^>]*>)[\s\S]*?<\/h2>/, '$1' + (language === 'en' ? 'We bring the Sin Yolanda experience to your place' : 'Te llevamos la experiencia Sin Yolanda hasta tu lugar') + '</h2>');
  const texas = ['houston', 'san-antonio', 'the-woodlands', 'el-paso'].includes(id) && !file.includes('/menu/');
  if ((texas || html.includes('id="site-shell"')) && !html.includes('/assets/js/october-hours.js')) html = html.replace('</head>', '<script src="/assets/js/october-hours.js?v=20261026-approved-update"></script></head>');
  if ((texas || file === 'guadalajara.html' || html.includes('id="site-shell"')) && !html.includes('/assets/css/october-update.css')) html = html.replace('</head>', '<link rel="stylesheet" href="/assets/css/october-update.css?v=20261026-approved-update"></head>');
  return html;
}
