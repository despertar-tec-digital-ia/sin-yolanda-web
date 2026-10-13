// Mechanical canonical-route migration. Menus and branch identifiers stay unchanged.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const read=f=>readFileSync(f,'utf8');
const write=(f,s)=>writeFileSync(f,s);
const json=f=>JSON.parse(read(f));
const save=(f,v)=>write(f,JSON.stringify(v,null,2)+'\n');
assert.ok(!existsSync('guadalajara.html'),'Do not overwrite a previously migrated branch');
const oldHtml=read('san-ignacio.html');
const paths=s=>s.replaceAll('san-ignacio.html','guadalajara.html')
 .replace(/https:\/\/sin-yolanda\.com\/san-ignacio(?=["#])/g,'https://sin-yolanda.com/guadalajara')
 .replace(/href="\/san-ignacio\/?(?=["#])/g,'href="/guadalajara');
write('guadalajara.html',paths(oldHtml));
const manifest=json('scripts/public-manifest.json');
const menus=manifest.pages.filter(p=>p.includes('/menu/'));
const hashes=Object.fromEntries(menus.map(p=>[p,createHash('sha256').update(read(p)).digest('hex')]));
manifest.pages=manifest.pages.map(p=>p==='san-ignacio.html'?'guadalajara.html':p);
manifest.assetVersion='20261012-root-routing';
manifest.assetVersions['assets/js/public-data.js']='20261012-root-routing';
save('scripts/public-manifest.json',manifest);
write('assets/js/public-data.js',paths(read('assets/js/public-data.js')));
let analytics=read('assets/js/site-analytics.js');
analytics=analytics.replace('"/el-paso", "/san-ignacio",','"/el-paso", "/guadalajara", "/san-ignacio",');
write('assets/js/site-analytics.js',analytics);
const imports=json('scripts/branch-import-manifest.json');
const branch=imports['san-ignacio'].routes.find(r=>r.kind!=='menu');
branch.to='guadalajara.html';branch.canonical='https://sin-yolanda.com/guadalajara';
save('scripts/branch-import-manifest.json',imports);
const index=json('scripts/indexation-policy.json');
index.pages=index.pages.map(p=>p==='san-ignacio.html'?'guadalajara.html':p);
save('scripts/indexation-policy.json',index);
const baseline=json('scripts/seo-baseline.json');
baseline['guadalajara.html']={...baseline['san-ignacio.html'],head:paths(baseline['san-ignacio.html'].head)};
save('scripts/seo-baseline.json',baseline);
// Rename only branch links on non-menu pages; do not alter any menu payload.
for(const p of manifest.pages.filter(p=>!menus.includes(p))) write(p,paths(read(p)));
const redirects=json('scripts/legacy-redirects/sin-yolanda-legacy-redirects/redirects.json');
redirects.sites['sinyolandagdl.com']['/']='/guadalajara';
save('scripts/legacy-redirects/sin-yolanda-legacy-redirects/redirects.json',redirects);
write('_redirects',read('_redirects')+'\n# Branch canonical rename; original menu routes are deliberately unchanged.\n/san-ignacio /guadalajara 301\n/san-ignacio/ /guadalajara 301\n/san-ignacio.html /guadalajara 301\n');
for(const p of menus) assert.equal(createHash('sha256').update(read(p)).digest('hex'),hashes[p],p);
console.log('Guadalajara canonical prepared; all '+menus.length+' menu payloads unchanged.');
