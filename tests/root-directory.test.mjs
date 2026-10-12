import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {inspectPlugin} from '../scripts/legacy-redirects/sin-yolanda-root-directory/package.mjs';
import {actionLink,parseArguments,verifyUnchangedInventory,stablePageContent} from '../scripts/legacy-redirects/deploy-root-directory.mjs';
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'scripts/legacy-redirects/sin-yolanda-root-directory');
const php=fs.existsSync('/Applications/XAMPP/xamppfiles/bin/php')?'/Applications/XAMPP/xamppfiles/bin/php':'php';
const config=JSON.parse(fs.readFileSync(path.join(root,'scripts/legacy-redirects/sin-yolanda-legacy-redirects/redirects.json')));
const resolver=path.join(root,'scripts/legacy-redirects/sin-yolanda-legacy-redirects/redirect-engine.php');
test('page parity permits only Divi generated arithmetic captcha values',()=>{
 const captcha=(a,b)=>`<h2>Original</h2><span class="et_pb_contact_captcha_question">${a} + ${b}</span><input data-first_digit="${a}" data-second_digit="${b}">`;
 assert.equal(stablePageContent(captcha(2,4)),stablePageContent(captcha(14,15)));
 assert.notEqual(stablePageContent(captcha(2,4)),stablePageContent(captcha(2,4).replace('Original','Edited')));
 assert.notEqual(stablePageContent('<input name="price" value="4">'),stablePageContent('<input name="price" value="14">'));
});
function resolve(server,location){
 const code=`$d=json_decode(stream_get_contents(STDIN),true);require $argv[1];require $argv[2];echo json_encode(\\SinYolanda\\RootDirectory\\directoryTarget($d['server'],$d['location'],$d['config']),JSON_UNESCAPED_SLASHES);`;
 return JSON.parse(execFileSync(php,['-r',code,resolver,path.join(dir,'root-engine.php')],
 {input:JSON.stringify({server,location,config}),encoding:'utf8'}));
}
test('root override has only two PHP files, valid syntax and an isolated namespace',()=>{
 assert.equal(inspectPlugin().routes,2);
 for(const f of ['root-engine.php','sin-yolanda-root-directory.php']){
  assert.match(execFileSync(php,['-l',path.join(dir,f)],{encoding:'utf8'}),/No syntax errors/);
 }
});
test('both multi-location root domains and www use the directory for GET and HEAD',()=>{
 for(const [host,previous]of [['sinyolandatx.com','san-antonio'],['sinyolandausa.com','the-woodlands']])
 for(const prefix of ['','www.'])for(const method of ['GET','HEAD'])
 assert.equal(resolve({HTTP_HOST:prefix+host,REQUEST_URI:'/',REQUEST_METHOD:method},'https://sin-yolanda.com/'+previous),
 'https://sin-yolanda.com/locations');
});
test('directory override preserves validated attribution while excluding forms, methods and unrelated hosts',()=>{
 const server={HTTP_HOST:'sinyolandatx.com',REQUEST_URI:'/?utm_source=instagram&utm_medium=social',REQUEST_METHOD:'GET'};
 assert.equal(resolve(server,'https://sin-yolanda.com/san-antonio?utm_source=instagram&utm_medium=social'),
 'https://sin-yolanda.com/locations?utm_source=instagram&utm_medium=social');
 for(const change of [{REQUEST_METHOD:'POST'},{HTTP_HOST:'sinyolandagdl.com'},{HTTP_HOST:'evil.example'},
  {REQUEST_URI:'/menu/'},{REQUEST_URI:'/houston/'},{REQUEST_URI:'/?name=test'},{REQUEST_URI:'/wp-admin/'},{REQUEST_URI:'//'}])
 assert.equal(resolve({...server,...change},'https://sin-yolanda.com/san-antonio'),null);
 assert.equal(resolve({...server,REQUEST_URI:'/'},'https://evil.example/san-antonio'),null);
});
test('additive installer restricts site/actions and detects unrelated plugin state changes',()=>{
 assert.throws(()=>parseArguments(['--site','gdl','--install-activate']));
 assert.throws(()=>parseArguments(['--site','tx','--install-activate','--inspect']));
 assert.deepEqual(parseArguments(['--site','usa','--inspect']),{mode:'inspect',site:'usa'});
 const old=[{file:'sin-yolanda-menu-redirect-pause/sin-yolanda-menu-redirect-pause.php',active:true,version:'1.0.0'}];
 assert.doesNotThrow(()=>verifyUnchangedInventory(old,[...old,{file:'sin-yolanda-root-directory/sin-yolanda-root-directory.php',active:true,version:'1.0.0'}]));
 assert.throws(()=>verifyUnchangedInventory(old,[{...old[0],active:false}]));
 assert.throws(()=>actionLink('https://evil.example/wp-admin/plugins.php?action=activate','https://sinyolandatx.com'));
});
