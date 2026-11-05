// An isolated, local review overlay. This is deliberately not part of package-public/production.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packagePublic} from './package-public.mjs';

export const texasBranches = ['houston','the-woodlands','san-antonio','el-paso'];
export const uiAssets = ['assets/css/branch-ui-review.css','assets/js/branch-ui-review.js'];
const version = '20261105-ui-review';
const hash = data => createHash('sha256').update(data).digest('hex');
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

export function buildUsaUiReview({root,out,now} = {}) {
  root = resolve(root);out = resolve(out);
  assert.ok(out.startsWith(resolve(root,'.artifacts')+'/'),'Review must remain an ignored local artifact');
  assert.ok(!existsSync(out),'Use a fresh review directory');
  const publicRoot = resolve(out,'public');
  const baseline = packagePublic({root,destination:publicRoot,audience:'review',now});
  writeFileSync(resolve(out,'baseline-release.json'),JSON.stringify(baseline,null,2)+'\n');
  const changes = {}, read = file => readFileSync(resolve(publicRoot,file),'utf8');
  const teasers = {};
  for (const language of ['es','en']) {
    const source = read(language === 'es' ? 'houston.html' : 'en/houston/index.html');
    teasers[language] = source.match(/<div><section class="bct"[\s\S]*?<\/section><\/div>/)[0];
  }
  for (const branch of texasBranches) for (const language of ['es','en']) {
    const file = language === 'es' ? branch+'.html' : 'en/'+branch+'/index.html';
    const result = refineTexasPage(read(file),{branch,language,teaser:teasers[language]});
    writeFileSync(resolve(publicRoot,file),result.html);changes[file] = result.changes;
  }
  for (const [file,language] of [['catering.html','es'],['en/catering/index.html','en']]) {
    const result = refineCateringPage(read(file),language);
    writeFileSync(resolve(publicRoot,file),result.html);changes[file] = result.changes;
  }
  for (const file of uiAssets) copyFileSync(resolve(root,file),resolve(publicRoot,file));
  const files = [...Object.keys(baseline.hashes),...uiAssets];
  const hashes = Object.fromEntries(files.map(file => [file,hash(readFileSync(resolve(publicRoot,file)))]));
  const report = {...baseline,fileCount:files.length,hashes,publicDigest:hash(JSON.stringify(hashes)),
    reviewOnly:true,productionIntegrated:false,uiReview:{version,branches:texasBranches,changedPages:Object.keys(changes)}};
  writeFileSync(resolve(out,'changes.json'),JSON.stringify(changes,null,2)+'\n');
  writeFileSync(resolve(out,'release.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(import.meta.dirname,'..');
  const report = buildUsaUiReview({root,out:process.argv[2]});
  console.log(JSON.stringify({audience:report.audience,fileCount:report.fileCount,productionIntegrated:false,changedPages:report.uiReview.changedPages}));
}
