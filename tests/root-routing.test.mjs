import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {inspectPlugin} from '../scripts/legacy-redirects/sin-yolanda-root-routing/package.mjs';
import {parseArguments,rootCredentials} from '../scripts/legacy-redirects/deploy-root-routing.mjs';
import {parseQrRedirects,branchAliasSources} from '../scripts/qr-redirects.mjs';
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'scripts/legacy-redirects/sin-yolanda-root-routing');
const php=fs.existsSync('/Applications/XAMPP/xamppfiles/bin/php')?'/Applications/XAMPP/xamppfiles/bin/php':'php';
const routes={'sinyolandatx.com':'locations','sinyolandausa.com':'locations','maricarmengdl.com':'locations','sinyolandagdl.com':'guadalajara'};
function resolve(server){
 const code="require $argv[1];require $argv[2];echo json_encode(\\SinYolanda\\RootRouting\\resolve(json_decode(stream_get_contents(STDIN),true)),JSON_UNESCAPED_SLASHES);";
 return JSON.parse(execFileSync(php,['-r',code,path.join(dir,'attribution.php'),path.join(dir,'root-engine.php')],{input:JSON.stringify(server),encoding:'utf8'}));
}
test('four home routes work independently of legacy redirects and menu pause plugins',()=>{
 assert.equal(inspectPlugin().routes,4);
 for(const [host,target]of Object.entries(routes))for(const prefix of['','www.'])for(const method of['GET','HEAD']){
  assert.equal(resolve({HTTP_HOST:prefix+host,REQUEST_URI:'/',REQUEST_METHOD:method}),'https://sin-yolanda.com/'+target);
 }
 for(const file of ['root-engine.php','attribution.php','sin-yolanda-root-routing.php'])assert.match(execFileSync(php,['-l',path.join(dir,file)],{encoding:'utf8'}),/No syntax errors/);
 assert.match(fs.readFileSync(path.join(dir,'sin-yolanda-root-routing.php'),'utf8'),/Cache-Control: no-store, max-age=0, must-revalidate/);
});
test('menus, forms, logged-in endpoints, ambiguous paths and methods are not redirected',()=>{
 for(const host of Object.keys(routes))for(const uri of['/menu/','/english/','/houston/menu/','/cocteles-shots/','/wp-admin/','/wp-json/','//','/?name=test','/?preview=true','/?rest_route=users']){
  assert.equal(resolve({HTTP_HOST:host,REQUEST_URI:uri,REQUEST_METHOD:'GET'}),null,host+uri);
 }
 for(const method of['POST','PUT','DELETE','OPTIONS'])assert.equal(resolve({HTTP_HOST:'sinyolandatx.com',REQUEST_URI:'/',REQUEST_METHOD:method}),null);
 for(const host of['sinyolandatx.com.evil.example','evil.example','sinyolandatx.com:443'])assert.equal(resolve({HTTP_HOST:host,REQUEST_URI:'/',REQUEST_METHOD:'GET'}),null);
 assert.equal(resolve({HTTP_HOST:'sinyolandatx.com',REQUEST_URI:'/?utm_source=instagram&utm_medium=social',REQUEST_METHOD:'GET'}),'https://sin-yolanda.com/locations?utm_source=instagram&utm_medium=social');
 assert.equal(resolve({HTTP_HOST:'sinyolandatx.com',REQUEST_URI:'/?utm_source=person%40example.com&fbclid=private',REQUEST_METHOD:'GET'}),'https://sin-yolanda.com/locations');
});
test('installer has fixed domains and the dedicated Maricarmen credential reference',()=>{
 for(const site of['gdl','tx','usa','maricarmen'])assert.equal(parseArguments(['--site',site,'--inspect']).site,site);
 assert.throws(()=>parseArguments(['--site','unknown','--inspect']));
 assert.equal(rootCredentials('maricarmen',{MARICARMEN_WP_USER:'fixture',MARICARMEN_WP_PASS:'fixture'}).origin,'https://maricarmengdl.com');
 assert.throws(()=>rootCredentials('maricarmen',{}));
});
test('old branch aliases redirect only the ficha, never its menu or the QR',()=>{
 const rules=parseQrRedirects(fs.readFileSync(path.join(root,'_redirects'),'utf8'));
 assert.equal(rules.filter(r=>branchAliasSources.includes(r.source)).length,3);
 assert.ok(rules.filter(r=>r.source.startsWith('/q/')).every(r=>r.status===302));
 assert.ok(!rules.some(r=>r.source==='/san-ignacio/menu/'));
 const after=fs.readFileSync(path.join(root,'san-ignacio/menu/index.html'));
 const restored=after.toString().replaceAll('site-analytics.js?v=20261012-root-routing','site-analytics.js?v=20261008-migration-measurement');
 // Complete file SHA captured from main 496c040, before this route-only change.
 assert.equal(createHash('sha256').update(restored).digest('hex'),'53f382bbccfd99df420b161cc3e7ffb5262f0271d7588b70018acaaf5851cc3d','Only the shared tracker cache token may change; the complete menu must remain identical');
});
