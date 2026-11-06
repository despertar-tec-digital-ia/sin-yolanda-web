// An isolated, local review overlay. This is deliberately not part of package-public/production.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packagePublic} from './package-public.mjs';

import {texasBranches,uiAssets,refineTexasPage,refineCateringPage} from './editorial/ui-refinements.mjs';
export {texasBranches,uiAssets,refineTexasPage,refineCateringPage};
const hash = data => createHash('sha256').update(data).digest('hex');
const version = '20261105-ui-review';

export function buildUsaUiReview({root,out,now} = {}) {
  root = resolve(root);out = resolve(out);
  assert.ok(out.startsWith(resolve(root,'.artifacts')+'/'),'Review must remain an ignored local artifact');
  assert.ok(!existsSync(out),'Use a fresh review directory');
  const publicRoot = resolve(out,'public');
  const baseline = packagePublic({root,destination:publicRoot,audience:'review',presentation:'baseline',now});
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
  const files = [...new Set([...Object.keys(baseline.hashes),...uiAssets])];
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
