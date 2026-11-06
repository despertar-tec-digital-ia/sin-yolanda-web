import assert from 'node:assert/strict';

export const texasBranches = ['houston','the-woodlands','san-antonio','el-paso'];
export const uiAssets = ['assets/css/branch-ui-review.css','assets/js/branch-ui-review.js'];
const version = '20261105-ui-review';
const grid = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1"></rect><rect x="15" y="3" width="6" height="6" rx="1"></rect><rect x="3" y="15" width="6" height="6" rx="1"></rect><rect x="15" y="15" width="6" height="6" rx="1"></rect></svg>';

export function refineTexasPage(html,{branch,language,teaser}) {
  assert.ok(texasBranches.includes(branch));
  assert.ok(!html.includes('data-usa-ui-review='),'Do not overlay a candidate twice');
  const en = language === 'en', changes = [];
  const replace = (before,after) => {
    assert.equal(html.split(before).length,2,'Expected one exact UI boundary');
    changes.push({before,after});html = html.replace(before,() => after);
  };
  const body = html.match(/<body\b[^>]*>/)[0];
  assert.ok(body.includes(`data-branch="${branch}"`));
  replace(body,body.replace('>',` data-usa-ui-review="${branch}">`));
  const oldScript = html.match(/<script type="module" src="\/_astro\/BranchLanding\.astro_astro_type_script_index_0_lang\.[^"]+"><\/script>/)[0];
  replace(oldScript,`<script type="module" src="/${uiAssets[1]}?v=${version}"></script>`);
  replace('</head>',`<link rel="stylesheet" href="/${uiAssets[0]}?v=${version}"></head>`);
  const locations = html.match(/<a class="hh-nav-locations"[\s\S]*?<\/a>/)[0];
  replace(locations,`<a class="hh-nav-locations" href="/#ubicaciones" aria-label="${en ? 'View locations' : 'Ver sucursales'}">${en ? 'Locations' : 'Sucursales'}${grid}</a>`);
  const visitLink = html.match(/<a class="hh-nav-visit"[^>]*>[\s\S]*?<\/a>/)[0];
  replace(visitLink,`<a class="hh-nav-catering" href="#catering-${branch}">Catering</a>`+visitLink);
  if (branch !== 'houston') {
    assert.ok(!html.includes('data-catering-teaser='));
    const marker = '<section class="visit-editorial';
    const description = teaser.match(/<p class="bct-description"[^>]*>(.*?)<\/p>/)[1];
    assert.ok(description.includes('Houston'),'Expected the original Houston-specific teaser');
    const section = teaser.replaceAll('catering-houston',`catering-${branch}`)
      .replace('data-catering-teaser="houston"',`data-catering-teaser="${branch}"`)
      .replace(description,en ? 'Explore our catering menus and ask about availability for your event.' :
        'Explora los menús de Catering y consulta disponibilidad para tu evento.');
    replace(marker,section+marker);
  }
  return {html,changes};
}

export function refineCateringPage(html,language) {
  const changes = [], pairs = language === 'en' ? [
    ['Mexican Catering in Houston','Mexican Catering for Your Event'],
    ['for your Houston celebration:','for your celebration:'],
    ['Catering for your celebration in Houston.','Catering for your celebration. Ask about availability in your city.']
  ] : [
    ['Catering mexicano en Houston','Catering mexicano para tu evento'],
    ['para tu celebración en Houston:','para tu celebración:'],
    ['Catering para tu celebración en Houston.','Catering para tu celebración. Consulta disponibilidad según tu ciudad.']
  ];
  for (const [before,after] of pairs) {
    assert.ok(html.includes(before),'Expected existing Catering copy');
    // One patch per occurrence, allowing the same text in metadata and JSON-LD.
    while (html.includes(before)) { changes.push({before,after});html = html.replace(before,() => after); }
  }
  const area = '"areaServed":{"@type":"City","name":"Houston"},"provider":';
  assert.equal(html.split(area).length,2);changes.push({before:area,after:'"provider":'});html = html.replace(area,'"provider":');
  return {html,changes};
}


export const siteUiAsset = 'assets/css/site-ui-review.css';
export const cateringCopy = {
  es: ['Comida mexicana, un brindis y una canción para compartir. Catering para tu celebración en Houston.',
    'Comida mexicana, un brindis y una canción para compartir. Catering para tu celebración. Consulta disponibilidad según tu ciudad.'],
  en: ['Mexican food, a toast and a song to share. Catering for your celebration in Houston.',
    'Mexican food, a toast and a song to share. Catering for your celebration. Ask about availability in your city.']
};
