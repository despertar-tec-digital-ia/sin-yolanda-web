// One-time, hash-pinned reconciliation. Never rebuild a donor or overwrite native menus/QR.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const source=path.resolve(process.argv[2]||'');
const receiver=path.resolve(source,'..');
const baseline='60456cd8f8eb47f393ddfbe16559e38223c9de8b';
const sourceCommit='3a3ce446a901ce3bb167bef0bc636c71b4ee8ff4';
const sourceDigest='59c68b47586c62c7295856de0651756febc1fa9f6d97724f987bfb373228b3b7';
const digest=value=>createHash('sha256').update(value).digest('hex');
const read=file=>fs.readFileSync(path.join(root,file));
const write=(file,content)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);};
assert.equal(path.basename(source),'visual-release','Provide the exact checked-in receiver package');
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),baseline);
assert.equal(execFileSync('git',['status','--porcelain'],{cwd:receiver,encoding:'utf8'}).trim(),'','Receiver must be clean');
const visual=JSON.parse(fs.readFileSync(path.join(receiver,'deploy/visual-manifest.json')));
assert.equal(visual.sourceCommit,sourceCommit);assert.equal(visual.sourcePublicDigest,sourceDigest);
const sorted=Object.fromEntries(Object.keys(visual.sourceHashes).sort().map(file=>[file,visual.sourceHashes[file]]));
const originalHeaders=execFileSync('git',['show',sourceCommit+':_headers'],{cwd:root,encoding:'utf8'});
assert.equal(sorted._headers,digest(originalHeaders+'\n/*\n  X-Robots-Tag: noindex, nofollow\n'),
 'Receiver metadata must contain only the documented CI preview suffix');
assert.equal(digest(JSON.stringify({...sorted,_headers:digest(originalHeaders)})),sourceDigest);
assert.deepEqual(visual.transformedFiles,['robots.txt']);
assert.equal(fs.readFileSync(path.join(source,'robots.txt'),'utf8'),'User-agent: *\nDisallow: /\n');
assert.equal(sorted['robots.txt'],digest(execFileSync('git',['show',sourceCommit+':robots.txt'],{cwd:root})));
// The VPS omits Cloudflare controls. Validate all actual served bytes; controls remain native.
for(const [file,hash]of Object.entries(sorted))if(!['_headers','_redirects','robots.txt'].includes(file)){
 assert.ok(!file.split('/').some(part=>part==='..'||part.startsWith('.')));
 assert.equal(digest(fs.readFileSync(path.join(source,file))),hash,'Receiver mismatch: '+file);
}
const manifest=JSON.parse(read('scripts/public-manifest.json'));
const beforeFiles=[...manifest.pages,...manifest.assets];
const beforeHashes=Object.fromEntries(beforeFiles.map(file=>[file,digest(read(file))]));
const nativeMenus=manifest.pages.filter(file=>file.includes('/menu/'));
const protectedFiles=['_redirects','_headers','robots.txt','sitemap.xml','assets/js/site-analytics.js',
 'aviso-de-privacidad.html','el-paso.html','en/el-paso/index.html',...nativeMenus,
 'images/el-paso-menu-en-v6.webp','menus/el-paso-menu-en-v6.pdf'];
const pages=['index.html','locations.html','la-cantina.html','eventos.html','tienda.html','404.html',
 'houston.html','en/houston/index.html','catering.html','en/catering/index.html'];
const shared=['assets/js/site.js','assets/js/i18n.js','assets/js/public-data.js'];
const added=Object.keys(sorted).filter(file=>!beforeFiles.includes(file));
assert.ok(added.every(file=>/^(?:_astro\/|assets\/(?:css\/visual-pilot\.css|media\/)|images\/catering-review\/logo\.webp)/.test(file)));
for(const file of [...pages,...shared,...added])write(file,fs.readFileSync(path.join(source,file)));

// El Paso is the newer native implementation, not the outdated demo's reservation/phone.
const context={window:{}};vm.runInNewContext(read('assets/js/public-data.js').toString(),context);
const data=JSON.parse(JSON.stringify(context.window.SY_DATA));
const selection=JSON.parse(read('scripts/branch-import-manifest.json'));
const elPaso=data.branches.find(branch=>branch.id==='el-paso');
Object.assign(elPaso,{phone:'(915) 363-6330',phoneIntl:selection['el-paso'].facts.phone.e164,
 reserveUrl:selection['el-paso'].facts.reservation.url,reserveChannel:'opentable',status:'active',
 statusLabel:'Abierta',hours:'Horario por confirmar'});
data.updatedAt='2026-10-12';
write('assets/js/public-data.js','window.SY_DATA = '+JSON.stringify(data,null,2)+';\n');
selection.catering.sourceRef='1e629895830d1ace93e7f32584d08efdce7f93b9';
selection.houston.presentationSourceRef='8335c9cd6cb0991d314edded76f137cf4dea95e5';
write('scripts/branch-import-manifest.json',JSON.stringify(selection,null,2)+'\n');
manifest.assets.push(...added);
manifest.assetVersions={
 'assets/js/site.js':'20261011-demo-polish','assets/js/i18n.js':'20261010-visual-details',
 'assets/css/visual-pilot.css':'20261011-demo-polish','assets/js/public-data.js':'20261011-demo-polish'
};
write('scripts/public-manifest.json',JSON.stringify(manifest,null,2)+'\n');
for(const file of protectedFiles)assert.equal(digest(read(file)),beforeHashes[file],'Protected file changed: '+file);
const changed=beforeFiles.filter(file=>digest(read(file))!==beforeHashes[file]);
const preserved=Object.fromEntries(beforeFiles.filter(file=>!changed.includes(file)).map(file=>[file,beforeHashes[file]]));
const exactDemo=Object.fromEntries([...pages,...shared.filter(file=>file!=='assets/js/public-data.js'),...added].map(file=>[file,digest(read(file))]));
write('scripts/demo-promotion.json',JSON.stringify({version:1,baseline,sourceCommit,sourceDigest,
 authorization:'Luis confirms Karina approved promoting the current gray demo to sin-yolanda.com, 2026-10-12. Human review and the protected release environment remain required.',
 exactDemo,changed,added,preserved,protectedFiles,
 reconciled:['El Paso retains native PR18/19: original photo, now-open badge, phone, OpenTable, English V6 image/PDF menu.',
 'Home registry now agrees with the native El Paso contact and reservation.',
 'Native QR, WordPress menu destinations, privacy, analytics, robots and release controls are preserved.'],
 limitations:['No new prices, hours, promotions, contact campaign, registration backend or menu migration.',
 'Existing page-specific noindex flags and Guadalajara legacy physical routes remain unchanged.']},null,2)+'\n');
console.log(JSON.stringify({changed:changed.length,added:added.length,preserved:Object.keys(preserved).length,protectedFiles:protectedFiles.length,production:false}));
