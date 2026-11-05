// Local full-site review, composing the already reviewed Texas navigation/Catering pass.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildUsaUiReview} from './usa-ui-review.mjs';

export const siteUiAsset = 'assets/css/site-ui-review.css';
export const cateringCopy = {
  es: ['Comida mexicana, un brindis y una canción para compartir. Catering para tu celebración en Houston.',
    'Comida mexicana, un brindis y una canción para compartir. Catering para tu celebración. Consulta disponibilidad según tu ciudad.'],
  en: ['Mexican food, a toast and a song to share. Catering for your celebration in Houston.',
    'Mexican food, a toast and a song to share. Catering for your celebration. Ask about availability in your city.']
};
const hash = data => createHash('sha256').update(data).digest('hex');

export function buildSiteUiReview({root,out,now} = {}) {
  root = resolve(root);out = resolve(out);
  const report = buildUsaUiReview({root,out,now});
  const publicRoot = resolve(out,'public');
  const changes = JSON.parse(readFileSync(resolve(out,'changes.json'),'utf8'));
  const files = Object.keys(report.hashes), pages = files.filter(file => file.endsWith('.html'));
  const patch = (file,before,after) => {
    const path = resolve(publicRoot,file), source = readFileSync(path,'utf8');
    assert.equal(source.split(before).length,2,'Expected one full-site UI boundary in '+file);
    (changes[file] ??= []).push({before,after});
    writeFileSync(path,source.replace(before,()=>after));
  };
  for (const file of pages) {
    const html = readFileSync(resolve(publicRoot,file),'utf8');
    const body = html.match(/<body\b[^>]*>/)?.[0];
    assert.ok(body && !body.includes('data-site-ui-review'),'Expected a fresh HTML page');
    patch(file,body,body.replace('>',' data-site-ui-review="subtle">'));
    patch(file,'</head>',`<link rel="stylesheet" href="/${siteUiAsset}?v=20261105-site-ui"></head>`);
  }
  // Only this non-hero paragraph changes. Keep the home translation key and value in sync.
  patch('assets/js/site.js',...cateringCopy.es);
  patch('assets/js/i18n.js',...cateringCopy.es);
  patch('assets/js/i18n.js',...cateringCopy.en);
  copyFileSync(resolve(root,siteUiAsset),resolve(publicRoot,siteUiAsset));
  files.push(siteUiAsset);
  report.hashes = Object.fromEntries(files.map(file=>[file,hash(readFileSync(resolve(publicRoot,file)))]));
  report.fileCount = files.length;
  report.publicDigest = hash(JSON.stringify(report.hashes));
  report.uiReview = {...report.uiReview,scope:'full-site-subtle',reviewedPages:pages,
    changedPages:pages,changedScripts:['assets/js/site.js','assets/js/i18n.js']};
  writeFileSync(resolve(out,'changes.json'),JSON.stringify(changes,null,2)+'\n');
  writeFileSync(resolve(out,'release.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildSiteUiReview({root:resolve(import.meta.dirname,'..'),out:process.argv[2]});
  console.log(JSON.stringify({audience:report.audience,fileCount:report.fileCount,
    productionIntegrated:false,reviewedPages:report.uiReview.reviewedPages.length}));
}
